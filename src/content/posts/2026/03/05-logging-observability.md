---
title: "Logging и Observability в Kubernetes"
description: "Централизованный логгинг: ELK, EFK, Loki, observability stack"
heroImage: "../../../../assets/imgs/2026/03/05-logging-observability.webp"
pubDate: "2026-03-05"
---

Observability в Kubernetes.

```yaml
# Loki config
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-config
data:
  config.yaml: |
    auth_enabled: false
    server:
      http_listen_port: 3100
    schema_config:
      configs:
        - from: 2020-05-15
          store: boltdb-shipper
          object_store: filesystem
          schema: v11
          index:
            prefix: index_
            period: 24h
```