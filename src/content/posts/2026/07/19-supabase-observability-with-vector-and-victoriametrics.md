---
title: "Наблюдаемость self-hosted Supabase: Vector, VictoriaMetrics и Grafana"
description: "Как собрать метрики и логи self-hosted Supabase на двух серверах: exporters, vmagent, Vector, VictoriaLogs и Grafana."
heroImage: "../../../../assets/imgs/2026/07/19-supabase-observability-with-vector-and-victoriametrics.png"
pubDate: "2026-07-19"
---

# Контур метрик и логов для Supabase в Docker

Self-hosted Supabase обычно разворачивают как набор контейнеров: PostgreSQL, Kong, Auth, PostgREST, Storage, Realtime, Edge Functions и сопутствующие сервисы. Когда API начинает обслуживать реальные запросы, одного просмотра `docker logs` уже недостаточно. Нужны ответы на два вопроса: доступен ли сервис и что происходило в момент ошибки.

Для этой задачи удобно разделить наблюдаемость на метрики и логи. Метрики показывают состояние хоста, PostgreSQL и HTTP-доступность компонентов. Логи дают контекст: сообщение Edge Function, ошибку авторизации или ответ прокси. Связка VictoriaMetrics, VictoriaLogs, Vector и Grafana собирает эти данные без отдельного агента для каждого контейнера.

## Разделение на сервер приложения и сервер мониторинга

Практичная схема использует две машины. На первой работает Docker Compose со стеком Supabase и Vector. На второй размещаются VictoriaMetrics, VictoriaLogs, Grafana и Nginx. Такое разделение сохраняет данные наблюдаемости, если с сервером приложения возникнут проблемы, и не открывает хранилище логов напрямую в интернет.

```text
Сервер приложения                     Сервер мониторинга

Supabase + Docker logs                Nginx → VictoriaLogs
        │                                      ↑
        ├─ Vector ───── HTTPS JSONLine ────────┘
        │
        └─ exporters → vmagent → VictoriaMetrics
                                      │
                                   Grafana
```

Grafana подключается к VictoriaMetrics как к Prometheus-совместимому источнику и к VictoriaLogs как к отдельному datasource. На одном экране можно увидеть падение health-check, открыть тот же временной диапазон в Explore и найти записи конкретного сервиса.

## Какие метрики собирать

Для базового контроля достаточно трёх уровней.

- `node-exporter` отдаёт CPU, память, диск, сеть и состояние операционной системы.
- `postgres-exporter` публикует метрики PostgreSQL.
- `blackbox-exporter` выполняет HTTP-проверки Kong, Auth, PostgREST и Storage.

`vmagent` работает по привычной Prometheus-модели: забирает endpoint'ы по расписанию и отправляет ряды в VictoriaMetrics через remote write. Поэтому конфигурация остаётся понятной командам, которые уже используют `scrape_configs`, PromQL и готовые дашборды.

```yaml
scrape_configs:
  - job_name: node_exporter
    static_configs:
      - targets: ["app.example.net:9100"]

  - job_name: postgres_exporter
    static_configs:
      - targets: ["app.example.net:9187"]

  - job_name: supabase_health
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
          - http://kong:8000/health
          - http://auth:9999/health
          - http://rest:3000/ready
          - http://storage:5000/status
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: blackbox:9115
```

Для каждой успешной проверки blackbox-exporter отдаёт `probe_success` со значением `1`. Сетевой сбой, таймаут или неподходящий HTTP-статус дают `0`; это удобная основа для алерта и быстрого поиска затронутого компонента.

## Vector как единый вход для логов

В Docker-стеке Supabase уже может присутствовать Vector. Он читает `stdout` и `stderr` контейнеров через Docker API, поэтому отдельный HTTP-адаптер для каждого вида логов быстро становится лишней точкой поддержки. Vector способен собрать разные форматы, привести их к единой структуре и передать события в VictoriaLogs пакетами.

После `docker_logs` одно событие может выглядеть так:

```json
{
  "message": "{\"level\":\"error\",\"msg\":\"payment webhook failed\"}",
  "container_name": "supabase-edge-functions",
  "timestamp": "2026-07-19T10:00:00Z"
}
```

Для поиска и дашбордов полезнее стабильный контракт: `service`, `appname`, `project`, `event_message` и `metadata.level`. Имя контейнера остаётся инфраструктурной деталью, а поле `service` позволяет сохранить запросы Grafana при переименовании контейнера.

## Нормализация сообщений через VRL

VRL — встроенный язык преобразований Vector. В нём можно разделять потоки, безопасно разбирать JSON, добавлять поля и отбрасывать технический шум. Ниже упрощённая конфигурация: первая ветка обрабатывает Edge Functions, вторая принимает остальные контейнеры Supabase.

```yaml
sources:
  docker_host:
    type: docker_logs
    exclude_containers: [supabase-vector]

transforms:
  project_logs:
    type: remap
    inputs: [docker_host]
    source: |
      .appname = .container_name ?? "unknown"
      .project = "default"
      .timestamp = .timestamp ?? now()
      .event_message = string!(.message)

  functions_logs:
    type: remap
    inputs: [project_logs]
    source: |
      if .appname != "supabase-edge-functions" { abort }
      .service = "functions"
      parsed, err = parse_json(.event_message)
      if err == null {
        .event_message = parsed.event_message ?? parsed.msg ?? .event_message
        .metadata = parsed.metadata ?? {}
      }
      .metadata.level = .metadata.level ?? "INFO"

sinks:
  victoria_logs:
    type: http
    inputs: [functions_logs]
    method: post
    uri: "https://logs.example.net/insert/jsonline?_stream_fields=service,appname,project&_msg_field=event_message&_time_field=timestamp"
    encoding:
      codec: json
      framing:
        method: newline_delimited
    compression: gzip
    headers:
      Content-Type: application/stream+json
```

`parse_json` возвращает результат и ошибку. Проверка `err == null` сохраняет исходное текстовое сообщение, если контейнер вывел обычную строку. Оператор `??` задаёт fallback для отсутствующих полей. Эта обработка важна для смешанных логов: разные сервисы пишут структурированный JSON, plain text и вложенные объекты.

Пустое поле сообщения стоит обработать явно. Можно записать служебное значение `empty log`, если важен факт события, либо завершить обработку через `abort`, когда такие записи создают лишний шум. Для потенциально ошибочных операций VRL требует явной обработки: например, перед преобразованием поля в строку нужно убедиться, что поле существует и имеет ожидаемый тип.

## Безопасная доставка на сервер мониторинга

VictoriaLogs следует слушать только на loopback-интерфейсе сервера мониторинга. Внешний Vector отправляет данные по HTTPS на Nginx, а тот проксирует запрос локально. IP allowlist в Nginx добавляет прикладной барьер: ingestion разрешён лишь с адреса сервера приложения.

```nginx
location /insert/ {
    allow 203.0.113.10;
    deny all;

    proxy_pass http://127.0.0.1:9428;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_request_buffering off;
    proxy_read_timeout 60s;
}
```

Allowlist дополняет firewall, TLS и контроль доступа к самому серверу. Версии контейнерных образов лучше фиксировать вместо `latest`, а retention выбирать по скорости поступления логов, доступному диску и требуемой глубине расследований.

## Проверка pipeline и работа в Grafana

Перед перезапуском Vector конфигурацию нужно валидировать:

```bash
docker exec supabase-vector vector validate /etc/vector/vector.yml
docker compose restart vector
docker logs supabase-vector --tail=100 -f
```

На стороне VictoriaLogs можно запросить последние записи через LogSQL API. В Grafana для Edge Functions пригодятся фильтры `service:functions`, `metadata.level:ERROR` и поиск по `_msg`. Расследование получается последовательным: график показывает изменение `probe_success`, затем Explore открывает логи того же сервиса за тот же интервал.

Такой контур покрывает состояние сервера, PostgreSQL, доступность API и содержимое контейнерных логов. Он сохраняет единый путь данных от Docker до Grafana и оставляет правила разбора в конфигурации Vector, где их проще проверять и сопровождать.
