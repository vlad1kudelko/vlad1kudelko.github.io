---
title: "Prometheus Operator"
description: "Prometheus Operator: ServiceMonitor, PodMonitor, Alertmanager"
heroImage: "../../../../assets/imgs/2026/03/13-prometheus-operator.webp"
pubDate: "2026-03-13"
---

Prometheus Operator в Kubernetes.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: my-app
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: my-app
  endpoints:
    - port: metrics
      interval: 30s
```