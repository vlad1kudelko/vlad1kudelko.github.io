---
title: "Мониторинг: Prometheus + Grafana — настройка с нуля"
description: "Настройте мониторинг инфраструктуры с Prometheus и Grafana. Сбор метрик, алерты, дашборды — обеспечьте надёжность продакшена."
heroImage: "../../../../assets/imgs/2025/12/06-prometheus-grafana.webp"
pubDate: "2025-12-06"
---

# Prometheus и Grafana: мониторинг инфраструктуры

Мониторинг — критически важная часть production-инфраструктуры. Prometheus + Grafana — стандартная связка для сбора метрик и визуализации. Prometheus собирает и хранит метрики, а Grafana предоставляет мощный интерфейс для создания дашбордов и алертов. Вместе они образуют полноценную систему мониторинга.

## Архитектура

Prometheus использует pull-модель — сервер сам запрашивает метрики у целевых приложений. Это отличает его от систем с push-моделью.

```
┌─────────────────────────────────────────────────────────────┐
│                      Prometheus Server                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ ServiceDisc │  │  Storage    │  │  Alert Manager      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ scrape
          ┌─────────────────┼─────────────────┐
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │  App 1   │      │  App 2   │      │ Node Ex  │
    │ (metrics)│      │ (metrics)│      │ (node)   │
    └──────────┘      └──────────┘      └──────────┘
                                              │
                                    ┌──────────────────┐
                                    │   Grafana        │
                                    │   (dashboards)   │
                                    └──────────────────┘
```

## Prometheus

### Установка

```bash
# Docker
docker run -d \
  -p 9090:9090 \
  -v prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus

# или через docker-compose
```

### prometheus.yml

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

rule_files:
  - "alerts.yml"

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'myservice'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['myservice:8080']
```

## Метрики и экспортеры

### Node Exporter

```bash
# Установка
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xzf node_exporter-1.7.0.linux-amd64.tar.gz
./node_exporter

# Метрики: cpu, memory, disk, network, load
```

### MySQL Exporter

```yaml
# docker-compose.yml
mysqld_exporter:
  image: prom/mysqld-exporter
  environment:
    DATA_SOURCE_NAME: "user:password@(mysql:3306)/"
  ports:
    - "9104:9104"
```

### Redis Exporter

```yaml
redis_exporter:
  image: oliver006/redis_exporter
  environment:
    REDIS_ADDR: "redis://redis:6379"
  ports:
    - "9121:9121"
```

## Метрики в приложении

### Go

```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "net/http"
)

var (
    requestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total HTTP requests",
        },
        []string{"method", "path", "status"},
    )
    
    requestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration",
            Buckets: []float64{.005, .01, .025, .05, .0.1, .25, .5, 1},
        },
        []string{"method", "path"},
    )
)

func init() {
    prometheus.MustRegister(requestsTotal, requestDuration)
}

func middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        
        rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
        next.ServeHTTP(rw, r)
        
        duration := time.Since(start).Seconds()
        requestsTotal.WithLabelValues(r.Method, r.URL.Path, fmt.Sprintf("%d", rw.statusCode)).Inc()
        requestDuration.WithLabelValues(r.Method, r.URL.Path).Observe(duration)
    })
}

func main() {
    http.Handle("/metrics", promhttp.Handler())
    http.ListenAndServe(":8080", middleware(router))
}
```

### Node.js

```javascript
const promClient = require('prom-client');

const register = new promClient.Registry();

promClient.collectDefaultMetrics({ register });

const httpRequestsTotal = new promClient.Counter({
    name: 'http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'path', 'status'],
    registers: [register]
});

const httpRequestDuration = new promClient.Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration',
    labelNames: ['method', 'path'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    registers: [register]
});

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        httpRequestsTotal.inc({ 
            method: req.method, 
            path: req.route?.path || req.path,
            status: res.statusCode 
        });
        httpRequestDuration.observe({ 
            method: req.method, 
            path: req.route?.path || req.path 
        }, duration);
    });
    next();
});

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});
```

### Python

```python
from prometheus_client import Counter, Histogram, generate_latest
from flask import Flask, Response

app = Flask(__name__)

http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'path', 'status']
)

http_request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration',
    ['method', 'path'],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0)
)

@app.before_request
def before_request():
    g.start_time = time.time()

@app.after_request
def after_request(response):
    duration = time.time() - g.start_time
    http_requests_total.labels(
        method=request.method,
        path=request.path,
        status=response.status_code
    ).inc()
    http_request_duration.labels(
        method=request.method,
        path=request.path
    ).observe(duration)
    return response

@app.route('/metrics')
def metrics():
    return Response(generate_latest(), mimetype='text/plain')
```

## PromQL

### Базовые запросы

```promql
# Все метрики типа
http_requests_total

# С фильтром по лейблам
http_requests_total{status="200"}

# Скорость запросов в секунду
rate(http_requests_total[5m])

# Процентили
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# CPU использование
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Использование памяти
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100

# Свободное место на диске
100 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} * 100)

# Количество запущенных контейнеров
count(container_last_seen{name!=""})
```

### Агрегации

```promql
# Сумма по лейблам
sum(rate(http_requests_total[5m]))

# Среднее
avg(rate(http_requests_total[5m]))

# Максимум
max(node_memory_MemTotal_bytes)

# По всем значениям лейбла
sum by (status) (rate(http_requests_total[5m]))

# Без определённого лейбла
sum without (instance) (rate(http_requests_total[5m]))
```

## Alerting

### alerts.yml

```yaml
groups:
  - name: alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | printf \"%.2f\" }}"

      - alert: HighCPUUsage
        expr: 100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage"
          description: "CPU usage is {{ $value | printf \"%.1f\" }}% on {{ $labels.instance }}"

      - alert: HighMemoryUsage
        expr: (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100 > 85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage"

      - alert: DiskSpaceLow
        expr: 100 - (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} * 100) > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Disk space low"
```

### Alertmanager

```yaml
# alertmanager.yml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'email'
  routes:
    - match:
        severity: critical
      receiver: 'slack-critical'
      continue: true

receivers:
  - name: 'email'
    email_configs:
      - to: 'alerts@example.com'
        send_resolved: true

  - name: 'slack-critical'
    slack_configs:
      - channel: '#alerts'
        send_resolved: true
        api_url: 'https://hooks.slack.com/services/xxx'
        title: '🚨 Critical Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

## Grafana

### Подключение к Prometheus

```yaml
#provisioning/datasources/datasources.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
```

### Dashboard JSON

```json
{
  "dashboard": {
    "title": "Application Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "gridPos": {"x": 0, "y": 0, "w": 12, "h": 8},
        "targets": [
          {
            "expr": "sum by (path) (rate(http_requests_total[5m]))",
            "legendFormat": "{{path}}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "stat",
        "gridPos": {"x": 12, "y": 0, "w": 6, "h": 4},
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status=~\"5..\"}[5m]))"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {"value": 0, "color": "green"},
                {"value": 0.01, "color": "red"}
              ]
            }
          }
        }
      },
      {
        "title": "Request Duration (p95)",
        "type": "graph",
        "gridPos": {"x": 12, "y": 4, "w": 12, "h": 8},
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum by (le, path) (rate(http_request_duration_seconds_bucket[5m])))",
            "legendFormat": "p95 - {{path}}"
          }
        ]
      }
    ]
  }
}
```

### Полезные переменные

```json
{
  "templating": {
    "list": [
      {
        "name": "instance",
        "type": "query",
        "query": "label_values(node_cpu_seconds_total, instance)",
        "refresh": 1
      },
      {
        "name": "service",
        "type": "query",
        "query": "label_values(http_requests_total, service)",
        "refresh": 1
      }
    ]
  }
}
```

### Примеры панелей

```promql
# CPU Load
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[$__rate_interval])) * 100)

# Memory Usage
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) / node_memory_MemTotal_bytes * 100

# Network Traffic
sum by (instance) (rate(node_network_receive_bytes_total[5m])) 

# Disk I/O
rate(node_disk_reads_completed_total[5m])
rate(node_disk_writes_completed_total[5m])

# Uptime
time() - process_start_time_seconds{service="$service"}
```

## Docker Compose полного стека

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alerts.yml:/etc/prometheus/alerts.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    ports:
      - "9090:9090"

  alertmanager:
    image: prom/alertmanager:latest
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
    ports:
      - "9093:9093"

  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro

  grafana:
    image: grafana/grafana:latest
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
      - grafana_data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    ports:
      - "3000:3000"

volumes:
  prometheus_data:
  grafana_data:
```

## Best Practices

1. **Именование метрик** — используйте snake_case, добавляйте суффиксы (_total, _seconds)
2. **Лейблы** — не используйте слишком много кардинальных значений
3. **Alerts** — настраивайте for, избегайте ложных срабатываний
4. **Retention** — настраивайте период хранения данных
5. **Dashboards** — создавайте иерархию (overview → service → instance)
6. **Recording rules** — для часто запрашиваемых запросов

## Заключение

Prometheus + Grafana — мощный стек для мониторинга. Правильная настройка метрик, алертинга и дашбордов позволяет оперативно обнаруживать и решать проблемы в production.
