---
title: "Chaos Engineering"
description: "Chaos Engineering: Litmus, Gremlin, тестирование отказоустойчивости"
heroImage: "../../../../assets/imgs/2026/03/11-chaos-engineering.webp"
pubDate: "2026-03-11"
---

Chaos Engineering тестирует устойчивость к сбоям.

```yaml
# Litmus experiment
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: pod-kill
spec:
  appinfo:
    appns: production
    applabel: "app=frontend"
  chaosServiceAccount: litmus-admin
  experiments:
    - name: pod-delete
      spec:
        components:
          env:
            - name: TOTAL_CHAOS_DURATION
              value: '30'
```