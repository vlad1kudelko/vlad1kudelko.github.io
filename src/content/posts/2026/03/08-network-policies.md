---
title: "Network Policies в Kubernetes"
description: "Kubernetes Network Policies: изоляция трафика, firewall между подами"
heroImage: "../../../../assets/imgs/2026/03/08-network-policies.webp"
pubDate: "2026-03-08"
---

Network Policies для изоляции.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-allow
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - protocol: TCP
          port: 8080
  egress:
    - to:
        - podSelector:
            matchLabels:
              app: database
      ports:
        - protocol: TCP
          port: 5432
```