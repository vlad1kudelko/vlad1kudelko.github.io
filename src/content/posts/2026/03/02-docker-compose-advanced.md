---
title: "Docker Compose: продвинутый, Profiles, overrides"
description: "Используйте Docker Compose: продвинутый, Profiles, overrides. Управляйте мультиконтейнерными приложениями."
pubDate: "2026-03-02"
---

# Docker Compose: продвинутый

Docker Compose покрывает весь жизненный цикл разработки -- от локальной среды до CI -- если использовать profiles, override-файлы и healthchecks вместо одного монолитного `docker-compose.yml`. Один файл с правильной структурой заменяет набор скриптов и ручных инструкций в README.

Базовый `docker-compose.yml` для запуска приложения с базой -- это просто. Сложнее покрыть одной конфигурацией локальную разработку, CI и продакшен-подобное окружение без дублирования. Compose предоставляет несколько механизмов именно для этого.

> **Key Takeaways**
> - Profiles позволяют подключать сервисы по требованию (`--profile debug`) без дублирования файлов
> - `docker-compose.override.yml` автоматически применяется при локальном запуске и перекрывает базовую конфигурацию
> - `depends_on` без `condition: service_healthy` не гарантирует готовность сервиса -- нужен явный healthcheck
> - Compose Watch (v2.22+) заменяет bind mount умной синхронизацией: sync, rebuild, sync+restart в зависимости от типа файла
> - `.env` файл автоматически подгружается; для разных окружений используют `--env-file .env.staging`

## Profiles

Profiles позволяют включать сервисы по требованию. Типичный случай -- инструменты для отладки, которые не нужны в CI:

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
# Базовый запуск (без отладочных инструментов)
docker compose up -d

# С pgAdmin для работы с базой
docker compose --profile debug up -d

# С несколькими profiles
docker compose --profile debug --profile tools up -d
```

Profiles можно задавать через переменную окружения:

```bash
COMPOSE_PROFILES=debug,tools docker compose up -d
```

## Override файлы

`docker-compose.override.yml` автоматически сливается с `docker-compose.yml` при запуске без указания файлов. Это стандартный паттерн для разделения конфигурации по окружениям:

```yaml
# docker-compose.yml -- база для всех окружений
services:
  app:
    build: .
    environment:
      DATABASE_URL: postgresql://app:secret@db:5432/mydb
      REDIS_URL: redis://redis:6379/0

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: secret

  redis:
    image: redis:7-alpine
```

```yaml
# docker-compose.override.yml -- локальная разработка (автозагрузка)
services:
  app:
    build:
      target: development    # multi-stage: dev стейдж с hot-reload
    volumes:
      - .:/app               # маунт исходников для live-reload
    environment:
      DEBUG: "true"
      LOG_LEVEL: DEBUG
    ports:
      - "8000:8000"
      - "5678:5678"          # debugpy для VS Code remote debug

  db:
    ports:
      - "5432:5432"          # открываем порт локально для psql/DBeaver
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

```yaml
# docker-compose.prod.yml -- продакшен-подобная конфигурация
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
    environment:
      DEBUG: "false"
```

```bash
# Локально (автоматически применяется override)
docker compose up -d

# CI (только базовый файл, без маунтов и отладчика)
docker compose -f docker-compose.yml up -d

# Prod-подобное окружение
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Слияние конфигурации

При слиянии файлов Compose объединяет словари и переопределяет скалярные значения. Список `environment` объединяется, а не заменяется -- это удобно для добавления переменных в override без полного дублирования.

## Переменные окружения и .env

Compose автоматически подгружает `.env` из текущей директории:

```bash
# .env
POSTGRES_VERSION=16-alpine
APP_PORT=8000
SECRET_KEY=dev-only-key-change-in-prod
```

```yaml
services:
  app:
    ports:
      - "${APP_PORT}:8000"
  db:
    image: postgres:${POSTGRES_VERSION}
    environment:
      POSTGRES_PASSWORD: ${SECRET_KEY}
```

Для разных окружений используют несколько `.env` файлов:

```bash
# Staging
docker compose --env-file .env.staging up -d

# Production
docker compose --env-file .env.prod up -d
```

Файл `.env` не должен попасть в git с реальными секретами. Храните `.env.example` с placeholder-значениями, а реальные секреты передавайте через CI/CD или Secrets Manager.

## Healthchecks и depends_on

`depends_on` без `condition` проверяет только запуск контейнера, не готовность сервиса. PostgreSQL стартует секунды, а не мгновенно -- без healthcheck приложение падает при попытке подключиться к ещё не готовой базе:

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
      start_period: 10s      # не считать failures первые 10 секунд

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 3

  elasticsearch:
    image: elasticsearch:8.12.0
    healthcheck:
      test: ["CMD-SHELL", "curl -sf http://localhost:9200/_cluster/health || exit 1"]
      interval: 10s
      timeout: 10s
      retries: 5
      start_period: 60s      # ES запускается долго
```

`start_period` даёт сервису время на первоначальный запуск. В этот период failures не считаются -- это важно для тяжёлых сервисов вроде Elasticsearch или Kafka.

## Watch mode

Compose Watch (добавлен в v2.22) отслеживает изменения файлов и выполняет умную реакцию без полного перезапуска:

```yaml
services:
  app:
    build: .
    develop:
      watch:
        - action: sync          # скопировать файл без пересборки
          path: ./src
          target: /app/src
          ignore:
            - __pycache__
            - "*.pyc"
        - action: rebuild       # пересобирать образ при изменении зависимостей
          path: requirements.txt
        - action: rebuild
          path: pyproject.toml
        - action: sync+restart  # синхронизировать и перезапустить контейнер
          path: ./config
          target: /app/config
```

```bash
docker compose watch
```

Это гибче, чем простой bind mount: изменение `requirements.txt` вызывает `docker build`, изменение исходного файла Python -- только копирование без пересборки.

## Сети и volume

По умолчанию Compose создаёт одну сеть для всех сервисов. Для изоляции групп сервисов -- явные сети:

```yaml
networks:
  frontend:
  backend:
  monitoring:

services:
  nginx:
    networks: [frontend]

  app:
    networks: [frontend, backend]   # app виден с обеих сторон

  db:
    networks: [backend]             # db недоступен из frontend-сети

  prometheus:
    networks: [monitoring, backend] # мониторинг видит backend
```

Named volumes для персистентных данных:

```yaml
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  # External volume, созданный вне Compose (например, в продакшене)
  uploads:
    external: true
    name: production-uploads
```

## Полезные команды

```bash
# Логи конкретного сервиса в реальном времени
docker compose logs -f app

# Перезапустить только один сервис
docker compose restart app

# Пересобрать образ без кэша и перезапустить
docker compose up -d --build --no-cache app

# Запустить одноразовую команду (миграции, seed)
docker compose run --rm app python manage.py migrate

# Статус и порты
docker compose ps

# Удалить всё включая volumes
docker compose down -v
```

## Итог

Profiles, override-файлы и healthchecks превращают Compose из инструмента для запуска контейнеров в полноценный инструмент управления окружениями. Одна команда `docker compose up -d` должна работать одинаково для нового разработчика и в CI.

Когда приложение вырастает за пределы одного хоста, следующий шаг -- [Kubernetes для production-оркестрации](/posts/2026/03/03-kubernetes-networking).
