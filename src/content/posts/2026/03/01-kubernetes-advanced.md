---
title: "Kubernetes: продвинутые техники"
description: "Продвинутый Kubernetes: Custom Resources, Operators, Service Mesh"
heroImage: "../../../../assets/imgs/2026/03/01-kubernetes-advanced.webp"
pubDate: "2026-03-01"
---

Продвинутые возможности Kubernetes.

```yaml
# CRD example
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: backups.database.example.com
spec:
  group: database.example.com
  names:
    kind: Backup
    plural: backups
  scope: Namespaced
  versions:
    - name: v1
      served: true
      storage: true
      schema:
        openAPIV3Schema:
          type: object
          properties:
            spec:
              type: object
              properties:
                database:
                  type: string
```