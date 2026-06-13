---
title: "Docker best practices 2026 — Оптимизация образов"
description: "Освойте Docker best practices 2026: Оптимизация образов, multi-stage. Создавайте лёгкие контейнеры для продакшена."
pubDate: "2026-03-01"
---

# Docker best practices 2026

Образ на 1.2 ГБ с `node:latest` и секретами в слоях — типичная история для проекта, где Docker добавили быстро. В продакшене это превращается в медленные деплои, уязвимости и утечки данных. Собрать правильный образ с первого раза проще, чем потом разбираться, почему он такой большой.

## Multi-stage builds

Самое большое влияние на размер образа — multi-stage сборка. Все инструменты сборки остаются в первом стейдже, в финальный образ идёт только результат:

```dockerfile
# Стейдж сборки
FROM python:3.12-slim AS builder
WORKDIR /app

RUN pip install --user --no-cache-dir uv
COPY pyproject.toml uv.lock ./
RUN python -m uv pip install --system --no-cache-dir -r pyproject.toml

COPY . .
RUN python -m compileall -q .

# Финальный образ
FROM python:3.12-slim
WORKDIR /app

# Копируем только установленные зависимости
COPY --from=builder /usr/local/lib/python3.12 /usr/local/lib/python3.12
COPY --from=builder /app .

# Непривилегированный пользователь
RUN useradd --no-create-home --shell /bin/false appuser
USER appuser

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0"]
```

Для Go это ещё эффективнее — бинарник компилируется статически:

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o server .

FROM scratch
COPY --from=builder /app/server /server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
ENTRYPOINT ["/server"]
```

Образ на базе `scratch` весит единицы мегабайт.

## Слои и кэш

Каждая инструкция `RUN`, `COPY`, `ADD` создаёт слой. Docker инвалидирует кэш при изменении слоя и всех последующих. Зависимости меняются реже кода — их нужно копировать раньше:

```dockerfile
# Плохо: код меняется → перекачка всех зависимостей
COPY . .
RUN pip install -r requirements.txt

# Хорошо: зависимости кэшируются отдельно
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
```

Объединяйте связанные команды в один `RUN` — это уменьшает количество слоёв и гарантирует чистку в том же слое:

```dockerfile
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       libpq5 \
       curl \
    && rm -rf /var/lib/apt/lists/*
```

## Базовые образы

`ubuntu:latest` тянет за собой сотни пакетов. Для продакшена:

- `python:3.12-slim` вместо `python:3.12` — убирает dev-утилиты, экономит ~200 МБ
- `python:3.12-alpine` — минимальный, но с нюансами (musl libc, проблемы с некоторыми пакетами)
- `distroless` от Google — только runtime, без shell и пакетного менеджера

```dockerfile
FROM gcr.io/distroless/python3-debian12
COPY --from=builder /app /app
WORKDIR /app
CMD ["main.py"]
```

В distroless нет `/bin/sh`, что делает отладку неудобной, зато поверхность атаки минимальна.

## Безопасность

**Никогда не храните секреты в образе**. `ENV DB_PASSWORD=secret` попадёт в `docker history` и реестр:

```dockerfile
# Плохо
ENV DB_PASSWORD=secret123

# Хорошо — секрет передаётся в runtime
# docker run -e DB_PASSWORD=... или через Secrets API
```

**BuildKit secrets** для секретов при сборке (например, приватные pip-репозитории):

```dockerfile
# syntax=docker/dockerfile:1
RUN --mount=type=secret,id=pip_token \
    pip install --index-url "https://$(cat /run/secrets/pip_token)@private.pypi.org/simple/" \
    private-package
```

```bash
docker build --secret id=pip_token,src=.pip_token .
```

Секрет не попадает в слои образа.

## .dockerignore

```gitignore
.git
.gitignore
__pycache__
*.pyc
*.pyo
.pytest_cache
.venv
node_modules
*.log
.env
.env.*
dist/
build/
```

Без `.dockerignore` `COPY . .` отправляет в контекст сборки `.git` и `node_modules`, замедляя даже локальные сборки.

## Проверка образа

```bash
# Анализ слоёв и размеров
dive my-image:latest

# Сканирование уязвимостей
trivy image my-image:latest

# Проверка Dockerfile на best practices
hadolint Dockerfile
```

`trivy` интегрируется в CI и блокирует деплой при критических CVE.
