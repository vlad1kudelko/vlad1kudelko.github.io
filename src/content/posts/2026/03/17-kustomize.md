---
title: "Kustomize: нативный Kubernetes"
description: "Kustomize: наложение конфигураций, overlays, environment-specific"
heroImage: "../../../../assets/imgs/2026/03/17-kustomize.webp"
pubDate: "2026-03-17"
---

Kustomize для Kubernetes.

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml

namespace: production

replicas:
  - name: myapp
    count: 5

images:
  - name: myapp
    newTag: v2.0.0
```