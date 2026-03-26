---
title: "Kubernetes Autoscaling"
description: "HPA, VPA, Cluster Autoscaler: автоматическое масштабирование"
heroImage: "../../../../assets/imgs/2026/03/22-kubernetes-autoscaling.webp"
pubDate: "2026-03-22"
---

Autoscaling в Kubernetes.

```yaml
# HPA
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: myapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```