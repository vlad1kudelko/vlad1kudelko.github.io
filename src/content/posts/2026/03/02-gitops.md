---
title: "GitOps: инфраструктура как код"
description: "GitOps подход: ArgoCD, Flux, declarative infrastructure"
heroImage: "../../../../assets/imgs/2026/03/02-gitops.webp"
pubDate: "2026-03-02"
---

GitOps — инфраструктура как код с Git.

```yaml
# ArgoCD Application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/my-app
    targetRevision: main
    path: k8s
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```