---
title: "Multi-stage Docker build: как уменьшить образ и ускорить CI/CD"
description: "Практика multi-stage Dockerfile для Node.js и Go: builder/runtime stages, distroless/alpine, кеш слоёв, безопасность и размер production image."
heroImage: "../../../../assets/imgs/2026/05/06-docker-multistage-small-images.png"
pubDate: "2026-05-06"
---

# Практический разбор: Multi-stage Docker build: как уменьшить образ и ускорить CI/CD

Большой Docker image — это не только лишние мегабайты. Он медленнее собирается, дольше передаётся в registry, тормозит deploy и приносит больше CVE из ненужных системных пакетов. Multi-stage build позволяет оставить в production-образе только runtime и артефакты сборки.

## Идея multi-stage

В одном Dockerfile создаются разные стадии. Builder устанавливает зависимости и собирает приложение. Final stage копирует только готовый binary или dist.

```dockerfile
FROM node:22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

## Что это даёт

- меньше image size;
- быстрее pull/push;
- меньше attack surface;
- меньше noise в security scanner;
- чище production runtime.

## Кеш слоёв

Важно копировать dependency manifests до исходников. Тогда `npm ci`, `go mod download` или аналогичный шаг кешируется и не запускается при каждом изменении кода.

## Runtime без build tools

В финальном образе не нужны компиляторы, package managers и dev dependencies. Для Go можно использовать distroless или scratch, для Node — slim/alpine с production dependencies.

## Итог

Multi-stage Docker build — простой способ улучшить CI/CD без изменения кода приложения. Маленький образ быстрее доставляется, проще сканируется и содержит меньше лишнего. Это один из самых дешёвых DevOps-выигрышей.
