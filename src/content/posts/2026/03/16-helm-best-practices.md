---
title: "Helm: best practices"
description: "Helm charts: структура, тестирование, версионирование"
heroImage: "../../../../assets/imgs/2026/03/16-helm-best-practices.webp"
pubDate: "2026-03-16"
---

Best practices для Helm чартов.

```yaml
# Chart.yaml
apiVersion: v2
name: myapp
description: My application
version: 1.0.0
appVersion: "1.0.0"

# values.yaml
replicaCount: 3

image:
  repository: myapp
  pullPolicy: IfNotPresent

resources:
  limits:
    cpu: 500m
    memory: 256Mi
```