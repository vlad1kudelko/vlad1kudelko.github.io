---
title: "Monitoring Best Practices"
description: "Мониторинг: alerts, dashboards, runbooks"
heroImage: "../../../../assets/imgs/2026/03/20-monitoring-best-practices.webp"
pubDate: "2026-03-20"
---

Best practices для мониторинга.

```yaml
# Prometheus alerting rules
groups:
  - name: application
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate"
```