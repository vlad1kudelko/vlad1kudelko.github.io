---
title: "Docker best practices 2026, Оптимизация образов"
description: "Освойте Docker best practices 2026: Оптимизация образов, multi-stage. Создавайте лёгкие контейнеры для продакшена."
pubDate: "2026-03-01"
---

# Docker best practices 2026

Правильный продакшн-образ Docker весит 50-200 МБ, собирается за 30 секунд с кэшем и не содержит секретов. Большинство команд доходит до этого через боль: 2-гигабайтные образы, 10-минутные сборки и инциденты безопасности.

Образ на 1.2 ГБ с `node:latest` и секретами в истории слоёв -- типичная картина для проекта, где Docker добавили быстро. В продакшене это превращается в медленные деплои, уязвимые контейнеры и потенциальные утечки данных. Собрать правильный образ с первого раза проще, чем потом разбираться, почему он такой большой.

> **Key Takeaways**
> - Multi-stage builds убирают build-инструменты из финального образа; Python-образ с ними весит 900 МБ, без них -- 120 МБ
> - Порядок инструкций критичен: `COPY requirements.txt` перед `COPY . .` кэширует зависимости между сборками
> - `ENV DB_PASSWORD=secret` попадает в `docker history` и реестр -- секреты передавать только в runtime через `-e` или Secrets API
> - `trivy image` и `hadolint Dockerfile` находят CVE и ошибки конфигурации до деплоя
> - Непривилегированный пользователь через `USER appuser` -- обязательная практика для продакшена

---

Павел запустил Python-сервис с образом `python:3.11` и `COPY . .` в начале Dockerfile. Первая сборка шла 8 минут, потому что pip пересобирал 40 зависимостей при каждом изменении кода. После переработки Dockerfile -- зависимости перед кодом, multi-stage сборка, `python:3.11-slim` -- сборка с прогретым кэшем стала занимать 12 секунд, образ похудел с 1.1 ГБ до 180 МБ. Время деплоя в Kubernetes сократилось с 4 минут до 45 секунд.

## Multi-stage builds

Самое большое влияние на размер образа даёт multi-stage сборка. Все инструменты сборки остаются в первом стейдже, в финальный образ идёт только результат:

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

# Копируем только установленные зависимости и код
COPY --from=builder /usr/local/lib/python3.12 /usr/local/lib/python3.12
COPY --from=builder /app .

# Непривилегированный пользователь
RUN useradd --no-create-home --shell /bin/false appuser
USER appuser

EXPOSE 8000
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0"]
```

Для Go multi-stage даёт максимальный результат -- статически скомпилированный бинарник в образе `scratch`:

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server .

FROM scratch
COPY --from=builder /app/server /server
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
ENTRYPOINT ["/server"]
```

Образ на базе `scratch` весит 10-20 МБ против 800 МБ с `golang:1.22`.

## Слои и кэш

Каждая инструкция `RUN`, `COPY`, `ADD` создаёт слой. Docker инвалидирует кэш при изменении слоя и всех последующих. Зависимости меняются реже кода -- их нужно копировать раньше:

```dockerfile
# Плохо: код меняется каждый push -> pip пересобирает все зависимости
COPY . .
RUN pip install -r requirements.txt

# Хорошо: requirements кэшируется отдельно от кода
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
```

Объединяйте связанные команды в один `RUN`. Это уменьшает количество слоёв и гарантирует чистку apt-кэша в том же слое (иначе кэш попадает в предыдущий слой и не удаляется):

```dockerfile
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libpq5 \
        curl \
    && rm -rf /var/lib/apt/lists/*
```

### BuildKit для параллельных стейджей

```bash
# Включить BuildKit (по умолчанию в Docker 23+)
export DOCKER_BUILDKIT=1

# Или в docker-compose
COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose build
```

BuildKit параллельно собирает независимые стейджи и монтирует кэш между сборками.

## Базовые образы

`ubuntu:latest` тянет за собой сотни пакетов. Для продакшена:

- `python:3.12-slim` вместо `python:3.12` -- убирает dev-утилиты, экономит ~200 МБ
- `python:3.12-alpine` -- минимальный, но с нюансами: musl libc вместо glibc, некоторые C-расширения не собираются
- `distroless` от Google -- только runtime, без shell и пакетного менеджера

```dockerfile
# distroless: минимальная поверхность атаки
FROM gcr.io/distroless/python3-debian12
COPY --from=builder /app /app
WORKDIR /app
CMD ["main.py"]
```

В distroless нет `/bin/sh`, что делает `docker exec` для отладки невозможным. Зато поверхность атаки минимальна: `trivy` на distroless-образах находит в разы меньше CVE.

Для Node.js:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM gcr.io/distroless/nodejs20-debian12
COPY --from=builder /app /app
WORKDIR /app
CMD ["server.js"]
```

## Безопасность

**Никогда не храните секреты в образе.** `ENV DB_PASSWORD=secret` попадает в историю слоёв и публичный реестр:

```dockerfile
# Плохо: секрет виден в docker history и в реестре
ENV DB_PASSWORD=secret123
RUN curl -H "Authorization: Bearer $API_KEY" ...

# Хорошо: секрет передаётся в runtime
# docker run -e DB_PASSWORD=... 
# или через Docker Swarm/Kubernetes Secrets
```

**BuildKit secrets** для секретов при сборке (приватные pip/npm репозитории):

```dockerfile
# syntax=docker/dockerfile:1
FROM python:3.12-slim AS builder
RUN --mount=type=secret,id=pip_token \
    pip install \
      --index-url "https://$(cat /run/secrets/pip_token)@private.pypi.org/simple/" \
      private-package
```

```bash
docker build --secret id=pip_token,src=.pip_token .
```

Секрет не попадает ни в один слой образа.

**Непривилегированный пользователь** -- обязательно для продакшена:

```dockerfile
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser
USER appuser
```

Если контейнер скомпрометирован, процесс не сможет выйти за пределы контейнера через root-эскалацию.

**Readonly filesystem** где возможно:

```bash
docker run --read-only --tmpfs /tmp my-image
```

## .dockerignore

```text
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
.DS_Store
```

Без `.dockerignore` команда `COPY . .` отправляет в контекст сборки `.git` (сотни мегабайт для больших проектов) и `node_modules`, замедляя даже локальные сборки.

## Проверка образа

```bash
# Анализ слоёв, размеров и эффективности
dive my-image:latest

# Сканирование уязвимостей (CVE)
trivy image my-image:latest

# Проверка Dockerfile на best practices
hadolint Dockerfile

# Инспекция истории слоёв
docker history my-image:latest --no-trunc
```

`trivy` интегрируется в CI и блокирует деплой при критических CVE:

```yaml
# .github/workflows/docker.yml
- name: Scan for vulnerabilities
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: my-image:${{ github.sha }}
    exit-code: '1'
    severity: 'CRITICAL,HIGH'
```

---

Команда Ивана три месяца игнорировала предупреждения `trivy` о HIGH-severity CVE в базовом образе. Когда один из уязвимых пакетов (`libssl`) был использован в реальной атаке, пришлось срочно пересобирать и деплоить все 12 сервисов в ночное время. После инцидента настроили автоматическое сканирование в CI с блокировкой на `CRITICAL` и еженедельный ребилд образов для подтягивания патчей безопасности. Следующий подобный патч прошёл в плановом обновлении за 20 минут.

## Оптимизация для продакшена

**HEALTHCHECK** -- Docker сам проверяет состояние контейнера:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:8000/health || exit 1
```

**Сигналы и graceful shutdown:**

```dockerfile
# Использовать exec-форму CMD (не shell-форму)
# Shell-форма: SIGTERM получает sh, а не приложение
CMD ["python", "server.py"]  # правильно
CMD python server.py          # неправильно: SIGTERM не доходит
```

**Ограничение ресурсов в compose:**

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          memory: 256M
```

**Прикрепление тегов** -- никогда не используйте `latest` в продакшене:

```bash
# Собирать с immutable тегом
docker build -t my-image:$(git rev-parse --short HEAD) .

# В Kubernetes pinning по digest
image: my-image@sha256:abc123...
```

## Итог

Хороший Docker-образ для продакшена строится на трёх принципах: минимальный базовый образ, правильный порядок слоёв для кэширования, и ноль секретов внутри. Multi-stage builds -- самый эффективный инструмент для уменьшения размера. BuildKit secrets решают проблему секретов при сборке без компромиссов по безопасности.

Готовы запустить это в оркестрации? Следующий шаг -- [Docker Compose для локальной разработки и staging-окружений](/posts/2026/03/02-docker-compose-advanced).
