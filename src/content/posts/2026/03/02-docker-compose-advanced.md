---
title: "Docker Compose: продвинутый — Profiles, overrides"
description: "Используйте Docker Compose: продвинутый, Profiles, overrides. Управляйте мультиконтейнерными приложениями."
pubDate: "2026-03-02"
---

# Docker Compose: продвинутый

Базовый `docker-compose.yml` для запуска приложения с базой — это просто. Сложнее, когда нужно одним файлом покрыть локальную разработку, CI и продакшен-подобное окружение, не дублируя конфигурацию. Compose предоставляет для этого несколько механизмов.

## Profiles

Profiles позволяют включать сервисы по требованию. Типичный случай — инструменты для отладки, которые не нужны в CI:

```yaml
services:
  app:
    build: .
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mydb
      POSTGRES_PASSWORD: secret
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine

  # Запускается только с --profile debug
  pgadmin:
    image: dpage/pgadmin4
    profiles: [debug]
    ports:
      - "5050:80"
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@local.dev
      PGADMIN_DEFAULT_PASSWORD: admin

  # Запускается только с --profile tools
  redis-commander:
    image: rediscommander/redis-commander
    profiles: [tools]
    ports:
      - "8081:8081"
    environment:
      REDIS_HOSTS: "local:redis:6379"
```

```bash
# Базовый запуск (без pgadmin и redis-commander)
docker compose up -d

# С инструментами отладки
docker compose --profile debug --profile tools up -d
```

## Override файлы

`docker-compose.override.yml` автоматически сливается с `docker-compose.yml` при запуске. Это стандартный паттерн для разделения конфигурации по окружениям:

```yaml
# docker-compose.yml — база для всех окружений
services:
  app:
    build: .
    environment:
      DATABASE_URL: postgresql://app:secret@db:5432/mydb

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret
```

```yaml
# docker-compose.override.yml — локальная разработка (автозагрузка)
services:
  app:
    build:
      target: development  # multi-stage: dev стейдж с hot-reload
    volumes:
      - .:/app             # маунт исходников
    environment:
      DEBUG: "true"
    ports:
      - "8000:8000"
      - "5678:5678"        # debugpy

  db:
    ports:
      - "5432:5432"        # открываем порт локально для psql
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

```yaml
# docker-compose.prod.yml — продакшен-подобная конфигурация
services:
  app:
    restart: always
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

```bash
# Локально — автоматически применяется override
docker compose up -d

# CI — только базовый файл
docker compose -f docker-compose.yml up -d

# Prod-подобное окружение
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Переменные окружения и .env

Compose автоматически подгружает `.env` из текущей директории:

```bash
# .env
POSTGRES_VERSION=16-alpine
APP_PORT=8000
SECRET_KEY=dev-only-key
```

```yaml
services:
  app:
    ports:
      - "${APP_PORT}:8000"
  db:
    image: postgres:${POSTGRES_VERSION}
```

Для разных окружений — несколько `.env` файлов:

```bash
docker compose --env-file .env.staging up -d
```

## Healthchecks и depends_on

`depends_on` без `condition` проверяет только запуск контейнера, не готовность сервиса. Правильный вариант:

```yaml
services:
  app:
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 10s

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 3
```

`start_period` даёт сервису время на первоначальный запуск, не считая этот период как failed.

## Watch mode

Compose Watch (появился в v2.22) отслеживает изменения файлов и перестраивает/перезапускает только нужные сервисы:

```yaml
services:
  app:
    build: .
    develop:
      watch:
        - action: sync          # копировать файл без пересборки
          path: ./src
          target: /app/src
        - action: rebuild       # пересобирать образ
          path: requirements.txt
        - action: sync+restart  # синхронизировать и перезапустить
          path: ./config
          target: /app/config
```

```bash
docker compose watch
```

Это заменяет bind mount для случаев, где нужна более тонкая логика реакции на изменения.
