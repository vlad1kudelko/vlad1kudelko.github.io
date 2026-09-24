---
title: "CI/CD на GitHub Actions для FastAPI и PostgreSQL: от линтера до деплоя по SSH"
description: "Один workflow на пять задач: Ruff и yamllint, pip-audit и Bandit, интеграционные тесты на живом PostgreSQL в Docker Compose, сборка образа в GHCR с кэшем и деплой на VPS через SSH."
heroImage: "../../../../assets/imgs/2026/09/24-github-actions-ci-cd-fastapi-postgresql.png"
pubDate: "2026-09-24"
github: "https://github.com/canntstand/cicd-practice"
---

# Пайплайн для FastAPI-сервиса: пять задач в одном ci-cd.yml

Стенд небольшой: FastAPI на Python 3.13, PostgreSQL 18, SQLAlchemy с миграциями Alembic, JWT-аутентификация и около 90 тестов на pytest. Всё запускается через Docker Compose на обычном VDS. Этого хватает, чтобы собрать полноценный пайплайн: линтинг, проверки безопасности, тесты с реальной базой, публикация образа и выкатка на сервер. Ниже — устройство пайплайна по шагам и список мест, которые стоит доработать перед продом.

## Compose-файл под тесты и под прод

В `docker-compose.yml` пять сервисов:

- `main_db` — рабочий PostgreSQL с томом `pg_main_data`;
- `backend` — приложение, образ берётся из `${BACKEND_IMAGE:-ghcr.io/.../backend:latest}`;
- `pgadmin4` — веб-интерфейс к базе на порту 5050;
- `test_db` — отдельный PostgreSQL для тестов, проброшен на 5433, чтобы не конфликтовать с основной базой;
- `tests` — контейнер из `Dockerfile.tests`, который прогоняет миграции и pytest.

Ключевая деталь — healthcheck на обеих базах:

```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${TEST_DB_NAME}"]
  interval: 5s
  timeout: 5s
  retries: 5
```

И `depends_on` с условием `service_healthy`. Без этого контейнер с тестами стартует раньше, чем PostgreSQL принимает соединения, и первый же `alembic upgrade head` падает с ошибкой подключения. Команда тестового контейнера выглядит так:

```sh
sh -c "set -e; cd backend && alembic upgrade head; cd .. && pytest"
```

`set -e` здесь обязателен: если миграция упала, pytest не запустится и job честно покраснеет. Backend при старте тоже сначала накатывает миграции, потом поднимает Uvicorn.

## CI: три независимые задачи

Workflow `.github/workflows/ci-cd.yml` срабатывает на push и pull request в `main`. Задачи `lint`, `security` и `tests` не зависят друг от друга и идут параллельно.

### Линтинг

yamllint проверяет `docker-compose.yml`, Ruff — весь Python-код:

```yaml
lint:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: karancode/yamllint-github-action@v2.1.1
      with:
        yamllint_file_or_dir: "docker-compose.yml"
        yamllint_strict: false
    - uses: actions/setup-python@v5
      with:
        python-version: "3.13"
    - run: |
        pip install ruff
        ruff check .
```

### Безопасность

Две проверки: `pypa/gh-action-pip-audit` сверяет `backend/requirements.txt` с базой известных уязвимостей, `PyCQA/bandit-action` ищет опасные паттерны в коде. Job получает минимальные права: `contents: read` и `security-events: write` для отправки отчётов.

В pip-audit одна уязвимость добавлена в игнор — `PYSEC-2026-1325` в `ecdsa`, которая тянется транзитивно через `python-jose` и не имеет исправленной версии. Это типичная ситуация, и `ignore-vulns` решает её локально. Полезная привычка: рядом с каждым исключением писать комментарий с причиной и периодически пересматривать список. Если фикс в апстриме так и не появляется, исключение превращается в постоянную дыру, и библиотеку стоит менять.

### Тесты на живой базе

Job `tests` генерирует `.env` из секретов и переменных репозитория, поднимает базы и запускает тестовый контейнер:

```yaml
- name: Start services
  run: docker compose up -d --wait main_db test_db
- name: Run tests via Docker Compose
  run: docker compose run --rm tests
```

Флаг `--wait` заставляет `docker compose up` дождаться статуса healthy у всех перечисленных сервисов. `--rm` удаляет контейнер после прогона. Тесты работают против того же PostgreSQL 18, что и в проде, поэтому ошибки в миграциях и SQL всплывают ещё на этапе pull request.

В генерации `.env` используется конструкция `${{ secrets.DB_PASSWORD || 'example123' }}` — значение по умолчанию на случай, если секрет не задан. Для тестового прогона в форке это удобно. Для деплоя опасно: забытый секрет молча превратится в пароль `example123` на боевом сервере. Об этом ниже.

## CD: образ в GHCR и выкатка по SSH

### Сборка образа

Job `build-and-push` ждёт все три CI-задачи (`needs: [lint, tests, security]`) и запускается только на прямой push в `main`:

```yaml
if: github.ref == 'refs/heads/main' && github.event_name == 'push'
permissions:
  contents: read
  packages: write
```

Для pull request сборка и деплой не выполняются. Авторизация в `ghcr.io` идёт через встроенный `GITHUB_TOKEN`, отдельный токен для публикации не нужен. `docker/metadata-action` вешает на образ два тега: `latest` и короткий SHA коммита (`type=sha,prefix=`). Сборку делает `docker/build-push-action` через Buildx с кэшем GitHub Actions:

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

`mode=max` кэширует все промежуточные слои. Если меняется только код, слой с `pip install` берётся из кэша, и сборка заметно ускоряется.

### Деплой

Первичную подготовку сервера пайплайн не делает: Git, Docker Engine и клон репозитория в `/opt/cicd-practice` ставятся заранее, руками или через Ansible. Пайплайн отвечает только за обновление. Деплой через `appleboy/ssh-action` выполняет на сервере скрипт:

```sh
set -e
cd /opt/cicd-practice
git pull origin main
cat << EOF > .env   # секреты + BACKEND_IMAGE=ghcr.io/.../backend:latest
...
EOF
echo "$TOKEN" | docker login ghcr.io -u "$ACTOR" --password-stdin
docker compose pull backend
docker compose up -d --remove-orphans backend pgadmin4 main_db
```

`git pull` нужен, чтобы подтянуть свежий compose-файл и миграции, образ приходит из registry. `--remove-orphans` убирает контейнеры сервисов, которые исчезли из compose-файла.

## Секреты и переменные

В GitHub разделены два типа значений:

| Secrets (маскируются в логах) | Variables (видны в логах) |
|---|---|
| `SERVER_HOST`, `SERVER_USER`, `SSH_PRIVATE_KEY` | `POSTGRES_USER` |
| `DB_PASSWORD` | `DB_NAME`, `TEST_DB_NAME` |
| `SECRET_KEY`, `REFRESH_SECRET_KEY` | `ALGORITHM`, `REFRESH_ALGORITHM` |

Правило простое: всё, что даёт доступ, — в Secrets; всё, что описывает конфигурацию, — в Variables. Коммитить `.env` в репозиторий нельзя, файл генерируется на лету и в CI, и на сервере.

## Что доработать перед продом

Схема рабочая, но у неё есть места, которые на реальном сервисе стоит закрыть:

- **Убрать дефолты в деплое.** `|| 'example123'` в скрипте выкатки нужно заменить проверкой: если секрет пустой, job падает. Дефолты оставить только в тестовом job.
- **Деплоить по SHA.** Сейчас сервер тянет `:latest`. Если передать в `BACKEND_IMAGE` тег коммита, откат сводится к перезапуску с предыдущим SHA, а в логах видно, какая версия реально работает.
- **Не поднимать pgAdmin на проде без защиты.** Порт 5050 и порт PostgreSQL 5432 в compose-файле проброшены на все интерфейсы. На VDS с публичным IP их стоит привязать к `127.0.0.1` и ходить через SSH-туннель.
- **Убрать `--reload` из прода.** Uvicorn запускается с `--reload` и монтированием `./backend` — это режим разработки. На сервере код должен браться из образа, иначе смысл сборки в GHCR теряется: работает то, что лежит в клоне репозитория.
- **Закрепить версии.** `dpage/pgadmin4:latest` и actions по мажорным тегам (`@v4`, `@v5`) обновляются без вашего ведома. Для сторонних actions вроде `appleboy/ssh-action` надёжнее фиксировать полный SHA коммита.

Полный код стенда с compose-файлами и workflow лежит в репозитории [canntstand/cicd-practice](https://github.com/canntstand/cicd-practice) — его удобно взять за основу и доработать по списку выше.
