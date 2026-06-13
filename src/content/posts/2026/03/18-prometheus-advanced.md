---
title: "Prometheus: advanced, Recording rules, federation"
description: "Настройте Prometheus: advanced с Recording rules, federation. Масштабируемый сбор метрик для больших кластеров."
pubDate: "2026-03-18"
---

# Prometheus advanced: Recording rules

Базовый Prometheus хорошо работает до определённого масштаба. Когда дашбордов много, запросы сложные, а данных, миллиарды точек, начинаются проблемы: дашборды грузятся по 10 секунд, alerting lag растёт. Recording rules и федерация решают это без смены стека.

## Recording Rules

Recording rules предварительно вычисляют дорогие выражения и сохраняют результат как новую метрику. Дашборд читает готовые данные вместо пересчёта на каждый запрос:

```yaml
# prometheus-rules.yaml
groups:
 - name: api_aggregations
 interval: 1m # пересчитывать каждую минуту
 rules:
 # Вместо вычисления rate() на каждый запрос дашборда
 - record: job:http_requests_total:rate5m
 expr: sum by (job, status) (rate(http_requests_total[5m]))

 # P99 latency по сервису (дорогой запрос)
 - record: job:http_request_duration_seconds:p99
 expr: >
 histogram_quantile(0.99,
 sum by (job, le) (
 rate(http_request_duration_seconds_bucket[5m])
 )
 )

 # CPU usage по неймспейсу
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
 - alert: HighErrorRate
 expr: job:http_requests_total:rate5m{status=~"5.."} > 0.05
 for: 5m # должно выполняться 5 минут перед срабатыванием
 labels:
 severity: critical
 team: backend
 annotations:
 summary: "High error rate on {{ $labels.job }}"
 description: "Error rate {{ $value | humanizePercentage }} for {{ $labels.job }}"
 runbook: "https://runbooks.internal/high-error-rate"

 - alert: PodCrashLooping
 expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
 for: 5m
 labels:
 severity: warning
 annotations:
 summary: "Pod {{ $labels.namespace }}/{{ $labels.pod }} is crash looping"
```

## Federation

Федерация, механизм агрегации данных с нескольких Prometheus в один глобальный:

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
 - 'namespace:container_cpu_usage:rate5m' # только recording rules
 static_configs:
 - targets:
 - prometheus-eu-west:9090
 - prometheus-us-east:9090
 - prometheus-ap-south:9090
```

Глобальный Prometheus собирает только агрегированные данные (recording rules), не все сырые метрики. Сырые данные остаются в региональных инстансах.

## Thanos для долгосрочного хранения

Prometheus хранит данные локально, обычно 15 дней. Thanos расширяет это до лет через S3-совместимое хранилище:

```yaml
# thanos-sidecar добавляется к Prometheus
containers:
 - name: thanos-sidecar
 image: thanosio/thanos:v0.34.0
 args:
 - sidecar
 - --tsdb.path=/prometheus
 - --objstore.config-file=/etc/thanos/s3.yaml
 - --prometheus.url=http://localhost:9090
```

```yaml
# s3.yaml
type: S3
config:
 bucket: prometheus-long-term
 endpoint: s3.eu-central-1.amazonaws.com
 region: eu-central-1
```

Thanos Querier объединяет данные из всех Prometheus и S3 в единый endpoint, дедуплицирует реплики:

```bash
thanos query \
 --store=prometheus-eu-west:10901 \
 --store=prometheus-us-east:10901 \
 --store=thanos-store-gateway:10901 # исторические данные из S3
```

## Remote Write

Альтернатива Thanos, remote write в Grafana Mimir, VictoriaMetrics или Cortex:

```yaml
remote_write:
 - url: https://mimir.internal/api/v1/push
 queue_config:
 max_samples_per_send: 5000
 max_shards: 30
 write_relabel_configs:
 # Отправлять только важные метрики
 - source_labels: [__name__]
 regex: "(job:|namespace:|alert).*"
 action: keep
```
