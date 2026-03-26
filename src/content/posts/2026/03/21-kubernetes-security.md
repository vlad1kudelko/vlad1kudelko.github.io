---
title: "Kubernetes Security Best Practices"
description: "Безопасность K8s: RBAC, Pod Security, runtime protection"
heroImage: "../../../../assets/imgs/2026/03/21-kubernetes-security.webp"
pubDate: "2026-03-21"
---

Best practices для безопасности Kubernetes.

```yaml
# RBAC
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: production
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list", "watch"]
---
# Pod Security Standards
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
```