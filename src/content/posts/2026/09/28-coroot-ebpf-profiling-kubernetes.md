---
title: "Coroot в Kubernetes: eBPF-профилирование Node.js, Python, Go и Java без правки кода"
description: "Установка Coroot CE через оператор, retention на час, трейсы через OpenTelemetry Collector и что нужно каждому рантайму, чтобы во флеймграфе были имена функций и номера строк."
heroImage: "../../../../assets/imgs/2026/09/28-coroot-ebpf-profiling-kubernetes.jpg"
pubDate: "2026-09-28"
github: "https://github.com/coroot/coroot"
---

# Флеймграф до строки кода: Coroot на четырёх сломанных сервисах

Метрики покажут, что контейнер съедает два ядра. Какая функция их съедает, из метрик не узнать. Coroot закрывает этот вопрос: open-source платформа собирает метрики, логи, трейсы и профили в одном UI, а CPU-профили всех процессов на ноде снимает через eBPF без изменений в приложении. Ниже — установка Coroot Community Edition в кластер и разбор, какие настройки нужны Node.js, Python, Go и Java, чтобы профиль был читаемым.

## Чем отличается от Pyroscope, Parca и Pixie

Pyroscope, Parca и Perforator от Yandex хранят только профили. Pixie даёт eBPF-метрики, запросы и CPU-профили, но хранит данные локально и недолго. В Coroot поверх профилей есть SLO-алертинг, Service Map и набор инспекций, которые автоматически ловят типовые проблемы: утечки памяти, CPU-троттлинг, блокировки. Pyroscope без Alloy/OTel требует SDK в приложении; Coroot для CPU и Go heap ничего не требует.

Профили собираются двумя путями:

- **eBPF** — CPU любого процесса на ноде, любой язык;
- **языковые профилировщики** — память и блокировки. Для Go node-agent читает `runtime.MemProfile` прямо из `/proc/<pid>/mem`, а cluster-agent умеет скрейпить `/debug/pprof`. Для Java node-agent находит HotSpot JVM и подгружает `libasync-profiler.so` через JVM Attach API. Python-фреймы резолвит встроенный в node-agent eBPF-профайлер Pyroscope.

## Установка

Компоненты разворачивает `coroot-operator`: сервер Coroot (UI, API, инспекции), `coroot-node-agent` как DaemonSet, `coroot-cluster-agent` как Deployment, Prometheus для метрик и ClickHouse с keeper для логов, трейсов и профилей.

```bash
kubectl create namespace coroot
kubectl -n coroot create secret generic coroot-admin-secret \
  --from-literal=admin-password=<пароль>

helm install coroot-operator oci://ghcr.io/coroot/charts/coroot-operator \
  --version 0.9.10 -n coroot
helm install coroot oci://ghcr.io/coroot/charts/coroot-ce \
  --version 0.3.3 -n coroot -f coroot-values.yaml
```

Для демо-стенда удобно ограничить хранение одним часом:

```yaml
metricsRefreshInterval: "30s"
cacheTTL: "1h"
tracesTTL: "1h"
logsTTL: "1h"
profilesTTL: "1h"
authBootstrapAdminPasswordSecret:
  name: coroot-admin-secret
  key: admin-password
clickhouse:
  shards: 1
  replicas: 1
  keeper:
    replicas: 1
  storage:
    size: "20Gi"
prometheus:
  retention: "1h"
  storage:
    size: "10Gi"
nodeAgent:
  env:
    - name: ENABLE_JAVA_ASYNC_PROFILER
      value: "true"
```

Retention задаётся в трёх местах: TTL таблиц ClickHouse, метрический кэш и retention Prometheus. Prometheus пишет двухчасовыми блоками, поэтому при `retention: "1h"` метрики фактически живут 2–4 часа.

После установки логин `admin`, проект `default` уже создан, Prometheus и ClickHouse сконфигурированы.

Для продакшена: `clickhouse.shards/replicas: 2`, `keeper.replicas: 3` и две реплики Coroot. Для нескольких реплик конфигурацию придётся перенести из SQLite в PostgreSQL через `postgres.*` в CR.

### Как читать страницу Applications

`shortage` в колонке CPU показывает, сколько времени процессы ждали процессор и не получили его. Причина — троттлинг по лимиту или соседи на ноде. Процент загрузки там не отображается.

`Latency` — время ответа приложения клиентам. `Net` — TCP round-trip до зависимостей, без времени обработки. Сервис с Latency 5ms и Net <0.1ms быстрый сам по себе, и сеть его не тормозит.

Инциденты строятся от SLO: по умолчанию 99% запросов без ошибок и 99% быстрее 500 мс. Алерты уходят в Slack, Teams, PagerDuty, Opsgenie или webhook через Project Settings → Integrations.

## Трейсы через OpenTelemetry Collector

Если коллектор в кластере уже есть, достаточно добавить экспортер в Coroot и обнулить лишние дефолтные pipelines:

```yaml
mode: deployment
fullnameOverride: otel-collector
image:
  repository: otel/opentelemetry-collector-contrib
config:
  receivers:
    otlp:
      protocols:
        http:
          endpoint: 0.0.0.0:4318
  exporters:
    otlp_http/coroot:
      endpoint: "http://coroot-coroot.coroot:8080"
  service:
    pipelines:
      logs: null
      metrics: null
      traces:
        receivers: [otlp]
        processors: [batch]
        exporters: [otlp_http/coroot]
```

Приложения шлют спаны на `http://otel-collector.otel:4318/v1/traces`. В разделе трейсов самые полезные вкладки — Error Causes (группирует ошибочные спаны в выделенной области) и Latency Explorer (latency-флеймграф с подсветкой замедлившихся операций). Compare Attributes помогает, когда проблема есть только у части клиентов или за конкретным feature flag.

## Что нужно каждому рантайму

### Node.js

eBPF снимает нативные стеки, но имена JS-функций без perf-map не резолвятся. Node умеет генерировать его сам:

```dockerfile
ENV NODE_OPTIONS="--perf-basic-prof-only-functions --interpreted-frames-native-stack"
```

Работает с Node 18.19+ / 20.10+ / 21.1+. На тестовом эндпоинте с наивным `fib(35)` флеймграф показал стек `uv__io_poll → uv__read → uv__stream_io`, затем Nitro, и около трети CPU — в рекурсивном `fib` с номером строки. Трейсы — через `NodeSDK` с `HttpInstrumentation` в Nitro-плагине.

### Python

Никаких флагов: eBPF-профайлер резолвит Python-фреймы сам, и во флеймграфе виден `naive_fib` и busy-loop с `math.sqrt`. Трейсы — через `opentelemetry-instrument` в CMD. На этом сервисе Latency SLO горел с burn rate 100x: `/cpu` стабильно не укладывался в 500 мс. Режим Comparison подсвечивает функции, которые стали есть больше CPU по сравнению с прошлым интервалом.

### Go

CPU даёт eBPF, heap — чтение `/proc/<pid>/mem`, код трогать не надо. Для blocking, mutex и goroutine нужен pprof:

```go
import _ "net/http/pprof"
```

и аннотации пода:

```yaml
podAnnotations:
  coroot.com/profile-scrape: "true"
  coroot.com/profile-port: "8080"
```

При включённом скрейпе heap приходит дважды; флаг `--go-heap-profiler=disabled` у node-agent убирает дубль. Автоинструментации трейсов для Go нет — роутер оборачивается в `otelhttp.NewHandler`. Учтите привязку версий: `opentelemetry-go` v1.46.0 требует Go 1.25, v1.47.0+ — Go 1.26.

На тестовом сервисе с фоновой утечкой 1 MiB/сек memory-профиль указал точно на `main.growLeak` с `append` в `leakBuf`. Утечка горутин видна косвенно — по росту их числа и деградации SLO.

### Java

После `ENABLE_JAVA_ASYNC_PROFILER=true` появляются шесть типов профилей: CPU (eBPF), Java CPU, Java Lock (contentions и delay), Java Memory (alloc_objects и alloc_space). Код не меняется. Без JVM-флагов часть горячих сэмплов уходит в `[unknown]`, а заинлайненные методы исчезают из стека. Флаги, которые это исправляют:

```dockerfile
ENTRYPOINT ["java", \
  "-XX:+UnlockDiagnosticVMOptions", \
  "-XX:+DebugNonSafepoints", \
  "-XX:+PreserveFramePointer", \
  "-XX:TieredStopAtLevel=1", \
  "-XX:CompileCommand=dontinline,DemoJava.naiveFib", \
  "-cp", "/app", "DemoJava"]
```

- `DebugNonSafepoints` сохраняет debug-информацию JIT вне safepoint'ов; без `UnlockDiagnosticVMOptions` JVM его не примет.
- `PreserveFramePointer` оставляет RBP для раскрутки стека — и async-profiler, и eBPF без него теряют нативный стек.
- `TieredStopAtLevel=1` ограничивает JIT уровнем C1: его код проще сопоставить с методами.
- `dontinline` для конкретного метода нужен, если его надо видеть отдельным фреймом.

Lock-профиль на эндпоинте, где два потока дерутся за один `synchronized`-блок, показал контеншены ровно в этом месте. Трейсы — через `-javaagent` OpenTelemetry, без правки кода.

## Когда брать

Coroot подходит, если в кластере сервисы на разных языках, а отдельный стек для профилей поднимать не хочется. Для CPU достаточно поставить оператор; для Go-блокировок нужна одна строка импорта, для Java — переменная окружения и, по желанию, JVM-флаги. Если профили нужны на десятки тысяч нод или для PGO-сборки, смотрите в сторону Perforator.

Репозиторий: [github.com/coroot/coroot](https://github.com/coroot/coroot), демо: [demo.coroot.com](https://demo.coroot.com).
