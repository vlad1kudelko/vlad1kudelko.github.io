---
title: "Prometheus: advanced, Recording rules, federation"
description: "Настройте Prometheus: advanced с Recording rules, federation. Масштабируемый сбор метрик для больших кластеров."
pubDate: "2026-03-18"
---

# Prometheus advanced: Recording rules

Recording rules предварительно вычисляют дорогие PromQL-выражения и сохраняют результаты как новые метрики. Дашборды читают готовые данные вместо пересчёта при каждом запросе -- это разница между дашбордом, который загружается за 1 секунду, и дашбордом, который грузится 10 секунд.

Базовый Prometheus хорошо работает до определённого масштаба. Когда дашбордов много, запросы сложные, а данных миллиарды точек, начинаются проблемы: дашборды грузятся медленно, alerting lag растёт. Recording rules и federation решают это без смены стека.

> **Key Takeaways**
> - Recording rules предвычисляют дорогие запросы (rate, quantile) -- дашборды читают готовое за microseconds вместо seconds
> - Соглашение по именованию `level:metric:operations` помогает понять что за метрика и как посчитана
> - Federation: глобальный Prometheus собирает только recording rules, не сырые метрики -- данные остаются в регионах
> - Thanos добавляет долгосрочное хранение в S3 и дедупликацию реплик без изменения Prometheus
> - `remote_write` в Grafana Mimir или VictoriaMetrics -- альтернатива Thanos для мультитенантного хранения

---

Антон администрировал мониторинг в компании с 40 микросервисами. Grafana дашборды грузились по 15-20 секунд -- команды разработки жаловались и не использовали их. Проблема: каждый дашборд выполнял `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))` при каждом обновлении. 40 дашбордов, 10 панелей каждый -- 400 дорогих запросов каждые 30 секунд. После добавления recording rules для p50/p99/p999 latency и error rate дашборды стали загружаться за 0.5 секунды. Команды начали использовать мониторинг.

## Recording Rules

Recording rules предварительно вычисляют дорогие выражения и сохраняют как новую метрику. Дашборд читает готовые данные вместо пересчёта:

```yaml
# prometheus-rules.yaml
groups:
  - name: api_aggregations
    interval: 1m    # пересчитывать каждую минуту
    rules:
      # P99 latency по сервису (дорогой запрос с histogram_quantile)
      - record: job:http_request_duration_seconds:p99
        expr: >
          histogram_quantile(0.99,
            sum by (job, le) (
              rate(http_request_duration_seconds_bucket[5m])
            )
          )

      # P50 latency
      - record: job:http_request_duration_seconds:p50
        expr: >
          histogram_quantile(0.50,
            sum by (job, le) (
              rate(http_request_duration_seconds_bucket[5m])
            )
          )

      # Rate запросов по статусу
      - record: job:http_requests_total:rate5m
        expr: sum by (job, status) (rate(http_requests_total[5m]))

      # Error rate в процентах
      - record: job:http_errors:rate5m_ratio
        expr: >
          sum by (job) (rate(http_requests_total{status=~"5.."}[5m]))
          /
          sum by (job) (rate(http_requests_total[5m]))

      # CPU usage по namespace
      - record: namespace:container_cpu_usage:rate5m
        expr: >
          sum by (namespace) (
            rate(container_cpu_usage_seconds_total{container!=""}[5m])
          )
```

Соглашение по именованию: `level:metric:operations`. Это позволяет быстро понять что за метрика и как она посчитана.

```yaml
# В конфиге Prometheus
rule_files:
  - /etc/prometheus/rules/*.yaml
```

## Alerting Rules

```yaml
groups:
  - name: api_alerts
    rules:
      # Использует recording rule -- быстро
      - alert: HighErrorRate
        expr: job:http_errors:rate5m_ratio > 0.05
        for: 5m    # должно выполняться 5 минут перед срабатыванием
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "High error rate on {{ $labels.job }}"
          description: "Error rate {{ $value | humanizePercentage }} for {{ $labels.job }}"
          runbook: "https://runbooks.internal/high-error-rate"

      - alert: P99LatencyHigh
        expr: job:http_request_duration_seconds:p99 > 1.0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99 latency > 1s for {{ $labels.job }}"

      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} is crash looping"
```

## Federation

Federation -- механизм агрегации данных с нескольких Prometheus в один глобальный:

```yaml
# global-prometheus.yaml
scrape_configs:
  - job_name: federate
    scrape_interval: 1m
    honor_labels: true
    metrics_path: /federate
    params:
      match[]:
        - '{job="api"}'
        - 'job:http_requests_total:rate5m'        # только recording rules
        - 'job:http_request_duration_seconds:p99'
        - 'namespace:container_cpu_usage:rate5m'
    static_configs:
      - targets:
          - prometheus-eu-west:9090
          - prometheus-us-east:9090
          - prometheus-ap-south:9090
```

Глобальный Prometheus собирает только агрегированные данные (recording rules), не все сырые метрики. Сырые данные остаются в региональных инстансах -- это снижает трафик в 100-1000 раз.

## Thanos для долгосрочного хранения

Prometheus хранит данные локально, обычно 15 дней. Thanos расширяет это до лет через S3-совместимое хранилище:

```yaml
# thanos-sidecar добавляется к каждому Prometheus
containers:
  - name: thanos-sidecar
    image: thanosio/thanos:v0.34.0
    args:
      - sidecar
      - --tsdb.path=/prometheus
      - --objstore.config-file=/etc/thanos/s3.yaml
      - --prometheus.url=http://localhost:9090
    volumeMounts:
      - name: prometheus-data
        mountPath: /prometheus
```

```yaml
# /etc/thanos/s3.yaml
type: S3
config:
  bucket: prometheus-long-term
  endpoint: s3.eu-central-1.amazonaws.com
  region: eu-central-1
  access_key: ${AWS_ACCESS_KEY_ID}
  secret_key: ${AWS_SECRET_ACCESS_KEY}
```

Thanos Querier объединяет данные из всех Prometheus и S3 в единый endpoint, дедуплицирует реплики:

```bash
thanos query \
  --store=prometheus-eu-west:10901 \
  --store=prometheus-us-east:10901 \
  --store=thanos-store-gateway:10901   # исторические данные из S3
```

---

Юля настраивала compliance: все метрики должны храниться год для аудита. Prometheus с дефолтными 15 днями не подходил. Thanos с S3: региональные Prometheus как обычно, sidecar загружает 2-часовые блоки в S3. Thanos Store Gateway читает из S3 для исторических запросов. Год данных в S3 стоил $30/месяц -- дешевле, чем диск для Prometheus с таким же объёмом.

## Remote Write

Альтернатива Thanos -- remote write в Grafana Mimir, VictoriaMetrics или Cortex:

```yaml
remote_write:
  - url: https://mimir.internal/api/v1/push
    queue_config:
      max_samples_per_send: 5000
      max_shards: 30
      capacity: 10000
    write_relabel_configs:
      # Отправлять только важные метрики (снизить объём)
      - source_labels: [__name__]
        regex: "(job:|namespace:|alert).*"
        action: keep
      # Удалить шумные лейблы
      - action: labeldrop
        regex: "(pod_template_hash|controller_revision_hash)"
```

VictoriaMetrics как замена Thanos -- проще в операции, лучше сжатие данных:

```bash
# VictoriaMetrics single node (до 10M samples/sec)
docker run -v /victoria-metrics-data:/storage \
  -p 8428:8428 \
  victoriametrics/victoria-metrics \
  -retentionPeriod=12   # 12 месяцев
```

## Оптимизация производительности

**Cardinality** -- главная причина проблем с Prometheus. Высокая cardinality (миллионы уникальных label combinations) убивает производительность:

```yaml
# Плохо: user_id как label -- миллионы уникальных значений
http_requests_total{user_id="12345", path="/api/v1"}

# Хорошо: агрегировать по endpoint, не по пользователю
http_requests_total{path="/api/v1", method="POST", status="200"}
```

```bash
# Найти метрики с высокой cardinality
curl http://prometheus:9090/api/v1/query \
  --data 'query=topk(10, count by (__name__)({__name__=~".+"}))'
```

**Scrape интервалы**: не все метрики нужно собирать каждые 15 секунд:

```yaml
scrape_configs:
  - job_name: "kubernetes-pods"
    scrape_interval: 15s    # application metrics
  - job_name: "node-exporter"
    scrape_interval: 60s    # infrastructure metrics -- реже
  - job_name: "slow-jobs"
    scrape_interval: 5m     # batch jobs
```

## Итог

Recording rules -- первый инструмент при проблемах с производительностью Prometheus. Предвычисленные метрики делают дашборды быстрыми и снижают нагрузку на Prometheus. Federation разделяет данные по регионам без потери глобальной видимости. Thanos или VictoriaMetrics решают долгосрочное хранение за разумные деньги.

Для команд, которые только начинают: одна хорошая recording rule для p99 latency и error rate -- уже 80% пользы от этой статьи.
