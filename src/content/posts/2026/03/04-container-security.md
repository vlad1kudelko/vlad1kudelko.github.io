---
title: "Container Security"
description: "Безопасность контейнеров: scanning, runtime security, secrets management"
heroImage: "../../../../assets/imgs/2026/03/04-container-security.webp"
pubDate: "2026-03-04"
---

Безопасность контейнеров.

```dockerfile
# Non-root user
FROM node:18-alpine
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
USER nextjs

# Read-only filesystem
securityContext:
  readOnlyRootFilesystem: true
  allowPrivilegeEscalation: false
  runAsNonRoot: true

# Scan for vulnerabilities
# trivy image --severity HIGH,CRITICAL myimage
```