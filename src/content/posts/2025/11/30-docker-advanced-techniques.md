---
title: "Docker: продвинутые техники в 2026"
description: "Продвинутые техники Docker: Multi-stage сборка, volumes, networks, docker-compose. Оптимизация образов для production."
heroImage: "../../../../assets/imgs/2025/11/30-docker-advanced-techniques.webp"
pubDate: "2025-11-30"
---

# Docker: продвинутые техники

Поговорим о продвинутых техниках работы с Docker, которые помогут создавать эффективные и безопасные контейнеры для продакшена.

После освоения базовых команд Docker возникает вопрос: как оптимизировать образы, организовать хранение данных и настроить сеть? В этой статье рассмотрим multi-stage сборку, volumes, networks и best practices для production.

## Multi-stage Build

Многоэтапная сборка позволяет использовать несколько промежуточных образов, чтобы итоговый образ содержал только необходимые файлы.

### Пример для Python-приложения

```dockerfile
# Этап 1: сборка
FROM python:3.11-slim as builder

WORKDIR /app

# Установка зависимостей в отдельном слое
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Этап 2: production образ
FROM python:3.11-slim

WORKDIR /app

# Копируем только зависимости из builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

# Копируем исходный код
COPY . .

# Запуск от непривилегированного пользователя
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

CMD ["python", "main.py"]
```

### Пример для Node.js

```dockerfile
# Сборка
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
USER node
CMD ["node", "dist/main.js"]
```

## Оптимизация размера образов

### Используй минимальные базовые образы

```dockerfile
# Плохо
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y python3

# Хорошо
FROM python:3.11-slim  # ~150MB вместо ~800MB
```

### Слои и кеширование

```dockerfile
# Плохо: каждый RUN создаёт новый слой
RUN apt-get update
RUN apt-get install -y python3
RUN apt-get install -y git
RUN apt-get clean

# Хорошо: объединяем в один слой
RUN apt-get update && \
    apt-get install -y python3 git && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

### .dockerignore

```
# Игнорируем всё лишнее
node_modules
.git
__pycache__
*.pyc
.env
.env.local
tests/
docs/
*.md
Dockerfile
.dockerignore
```

## Работа с томами (Volumes)

### Именованные тома для данных

```bash
# Создание именованного тома
docker volume create postgres_data

# Использование в compose
volumes:
  postgres_data:
    external: true  # или создаст автоматически
```

### bind mount для разработки

```yaml
# docker-compose.yml
services:
  app:
    build: .
    volumes:
      - ./src:/app/src  # синхронизация кода
      - /app/node_modules  # анонимный том
```

### tmpfs для чувствительных данных

```yaml
services:
  app:
    image: myapp
    tmpfs:
      - /run/secrets:size=10M,mode=700
```

## Networking

### Кастомные сети

```yaml
# docker-compose.yml
services:
  app:
    networks:
      - frontend
      - backend
  
  db:
    networks:
      - backend

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # изолированная сеть
```

### Alias и DNS

```yaml
services:
  app:
    networks:
      backend:
        aliases:
          - myapp.local
```

## Docker Compose: продвинутые возможности

### Profiles

```yaml
services:
  app:
    image: myapp
  
  # Запускается только с: docker compose --profile debug up
  debug:
    image: myapp-debug
    profiles:
      - debug
    command: sleep infinity
  
  # Запускается только с: docker compose --profile prod up  
  monitoring:
    image: myapp-monitor
    profiles:
      - prod
```

### Overrides

```yaml
# docker-compose.yml (базовый)
services:
  app:
    build: .
    ports:
      - "8000:8000"

# docker-compose.override.yml (локальная разработка)
services:
  app:
    volumes:
      - .:/app
    environment:
      - DEBUG=1
```

### Запуск нескольких файлов

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up
```

## Секреты (Secrets)

```yaml
services:
  db:
    image: postgres:15
    secrets:
      - db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

## Healthchecks

```yaml
services:
  app:
    image: myapp
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Лучшие практики для продакшена

1. **Не запускай от root** — используй USER
2. **Минимальные образы** — python:alpine, node:alpine
3. **Один процесс** — один контейнер = один процесс
4. **Логирование** — пиши в stdout/stderr
5. **Сигналы** — корректная обработка SIGTERM
6. **Healthchecks** — проверяй готовность сервиса

## Заключение

Продвинутые техники Docker помогают создавать компактные, безопасные и эффективные контейнеры. Multi-stage build, правильное кеширование и работа с сетями — ключ к профессиональной работе с Docker.