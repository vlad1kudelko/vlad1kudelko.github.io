---
title: "Service Mesh: Istio, Linkerd"
description: "Service Mesh для микросервисов: traffic management, observability, security"
heroImage: "../../../../assets/imgs/2026/03/03-service-mesh.webp"
pubDate: "2026-03-03"
---

Service Mesh управляет трафиком между сервисами.

```yaml
# Istio VirtualService
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
    - my-service
  http:
    - match:
        - headers:
            version:
              exact: v2
      route:
        - destination:
            host: my-service
            subset: v2
    - route:
        - destination:
            host: my-service
            subset: v1
```