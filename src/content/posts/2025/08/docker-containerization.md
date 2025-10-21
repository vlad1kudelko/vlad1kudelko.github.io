---
title: "Docker: контейнеризация приложений"
description: "Подробный обзор принципов контейнеризации, Dockerfile, docker-compose, лучшие практики и примеры развертывания."
heroImage: "/imgs/2025/08/docker-containerization.webp"
pubDate: "2025-08-25"
---

# Docker: контейнеризация приложений

**Docker** — это платформа для разработки, доставки и запуска приложений в контейнерах. Контейнеризация позволяет упаковать приложение вместе со всеми зависимостями, конфигурацией и окружением в единый переносимый образ, который можно запускать одинаково на любой машине.

## 1. Почему Docker?

- **Изоляция** — каждый контейнер работает в своей изолированной среде, исключая конфликты версий библиотек.
- **Консистентность** — одинаковое поведение в разработке, тестировании и продакшене.
- **Упрощение развертывания** — один образ запускается везде: локально, в CI, в облаке.
- **Масштабируемость** — легко масштабировать приложение, запуская несколько экземпляров.
- **Безопасность** — контейнеры запускаются с минимальными привилегиями и изолированными ресурсами.

## 2. Структура проекта

```
my-app/
├── src/
│   └── main.py
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
└── requirements.txt
```

- `src/` — исходный код.
- `requirements.txt` — список зависимостей.
- `Dockerfile` — инструкция для сборки образа.
- `docker-compose.yml` — оркестрация сервисов.
- `.dockerignore` — файлы, которые не попадают в контекст сборки.

## 3. Dockerfile

```dockerfile
# Базовый образ
FROM python:3.11-slim

# Рабочая директория
WORKDIR /app

# Копируем зависимости
COPY requirements.txt .

# Устанавливаем зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код
COPY src/ .

# Создаем непривилегированного пользователя
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
USER appuser

# Открываем порт
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -f http://localhost:8000/health || exit 1

# Запуск приложения
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Многоэтапная сборка

Для продакшена можно использовать два этапа: сборка зависимостей и финальный образ.

```dockerfile
# Этап сборки
FROM python:3.11-slim as builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Финальный образ
FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY src/ .
ENV PATH=/root/.local/bin:$PATH
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 4. docker-compose.yml

```yaml
version: "3.8"

services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DEBUG=False
    volumes:
      - ./src:/app
    restart: unless-stopped
    depends_on:
      - db
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

## 5. .dockerignore

```
__pycache__
*.pyc
.env
.git
```

## 6. Быстрый старт

```bash
# Сборка образа
docker build -t my-app .

# Запуск контейнера
docker run -d -p 8000:8000 --name my-app-container my-app

# Проверка
curl http://localhost:8000/
```

## 7. Лучшие практики

1. **Минимальный базовый образ** — `python:slim` или `alpine`. Это уменьшает размер образа и поверхность атаки.
2. **Не храните секреты в Dockerfile** — используйте переменные окружения и `.env` файлы. Docker‑secrets или внешние менеджеры (HashiCorp Vault, AWS Secrets Manager) повышают безопасность.
3. **Проверяйте уязвимости** — `docker scan` или внешние сервисы (Snyk, Trivy). Регулярно обновляйте базовый образ.
4. **Обновляйте зависимости** — регулярно пересобирайте образы, чтобы получать патчи безопасности.
5. **Логи** — перенаправляйте stdout/stderr в систему логирования (ELK, Loki). Это упрощает отладку и мониторинг.
6. **Секреты** — используйте Docker secrets или переменные окружения, а не hard‑код в Dockerfile.

## 8. CI/CD пример

В примере ниже показан GitHub Actions workflow, который автоматически собирает Docker‑образ и публикует его в Docker Hub при каждом пуше в ветку `main`.  

```yaml
# .github/workflows/docker.yml
name: Docker CI

on:
  push:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USER }}
          password: ${{ secrets.DOCKER_PASS }}
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ secrets.DOCKER_USER }}/my-app:latest
```

**Пояснение к коду:**

- `actions/checkout@v3` — скачивает репозиторий.
- `docker/setup-buildx-action@v2` — настраивает Buildx, который позволяет создавать многоплатформенные образы.
- `docker/login-action@v2` — авторизует Docker Hub с помощью секретов, хранящихся в репозитории.
- `docker/build-push-action@v5` — собирает образ из текущего контекста (`.`), сразу публикует его в Docker Hub и помечает тегом `latest`.

Таким образом, при каждом пуше в `main` образ автоматически пересобирается и доступен для развертывания.

## 9. Трассировка и мониторинг

- **Prometheus** — экспортируйте метрики из приложения (например, через `prometheus_client` в Python). Метрики можно собирать с помощью `node_exporter` для системных показателей.
- **Grafana** — визуализируйте метрики, создавая дашборды для мониторинга производительности и доступности.
- **Jaeger** — распределённый трейсинг, позволяющий отслеживать запросы через микросервисы. Интеграция с `opentelemetry` в Python позволяет автоматически собирать трассировки.
- **ELK** — стек Elastic для сбора, индексации и визуализации логов. Логи Docker‑контейнеров можно отправлять через `filebeat` в Elasticsearch.

## 10. Трудности и решения

- **Контейнер не запускается** — проверяйте логи (`docker logs`), убедитесь, что порт открыт и приложение слушает `0.0.0.0`.
- **Ошибка зависимостей** — убедитесь, что `requirements.txt` актуален и все пакеты доступны в PyPI. При конфликте версий используйте `pip-tools` или `poetry`.
- **Большой размер образа** — используйте многоэтапную сборку, удаляйте лишние файлы (`.git`, `__pycache__`) и минимальный базовый образ.
- **Уязвимости в образе** — запустите `docker scan` или `trivy` после сборки, обновите базовый образ и зависимости.
- **Проблемы с сетью** — убедитесь, что контейнер имеет доступ к внешним сервисам (база данных, API). В `docker-compose.yml` можно задать `network_mode: bridge` или создать пользовательскую сеть.

## 11. Заключение

Контейнеризация с Docker упрощает разработку, тестирование и развертывание приложений, повышает их надёжность и масштабируемость. Следуя приведённым примерам и рекомендациям, вы сможете быстро создать и развернуть собственный контейнеризированный сервис, а также интегрировать его в CI/CD pipeline и мониторинговую инфраструктуру.
