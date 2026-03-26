---
title: "API Gateways: Kong, Envoy, NGINX"
description: "API Gateway как точка входа: маршрутизация, аутентификация, rate limiting"
heroImage: "../../../../assets/imgs/2026/02/18-api-gateways.webp"
pubDate: "2026-02-18"
---

API Gateway управляет входящими запросами.

```yaml
# Kong declarative config
_format_version: "3.0"
services:
  - name: user-service
    url: http://user-service:3000
    routes:
      - name: users
        paths:
          - /api/users
    plugins:
      - name: rate-limiting
        config:
          minute: 100
      - name: jwt
```