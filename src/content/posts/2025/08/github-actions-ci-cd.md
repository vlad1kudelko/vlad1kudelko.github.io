---
title: "GitHub Actions: CI/CD"
description: "Полное руководство по настройке CI/CD пайплайнов с использованием GitHub Actions, включая примеры, лучшие практики и расширенные возможности."
heroImage: "../../../../assets/imgs/2025/08/github-actions-ci-cd.webp"
pubDate: "2025-08-26"
---

# GitHub Actions: CI/CD

## Что такое GitHub Actions

GitHub Actions – это сервис CI/CD, встроенный в GitHub, который позволяет автоматизировать сборку, тестирование и развертывание вашего кода. Он использует файлы workflow, описанные в YAML, которые размещаются в репозитории в каталоге .github/workflows.

## Структура workflow

Каждый workflow состоит из:
- `name` – имя workflow
- `on` – события, которые запускают workflow (push, pull_request, schedule и т.д.)
- `jobs` – набор задач, которые выполняются параллельно или последовательно
- `steps` – отдельные шаги внутри задачи, каждый из которых может быть скриптом, установкой зависимостей или использованием готового action

## Пример CI workflow

```yaml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
```

## Пример CD workflow

```yaml
name: CD

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.KEY }}
          script: |
            cd /var/www/myapp
            git pull origin main
            npm ci
            pm2 restart myapp
```

## Советы по работе с GitHub Actions

1. **Разделяйте CI и CD** – храните их в отдельных файлах workflow, чтобы легче управлять правами доступа.
2. **Используйте кэш** – добавьте `actions/cache@v3` для ускорения сборки.
3. **Секреты** – храните ключи и токены в разделе Settings → Secrets → Actions.
4. **Тестируйте локально** – можно использовать `act` для запуска workflow на локальной машине.
5. **Проверяйте лимиты** – бесплатные минуты CI/CD ограничены, планируйте ресурсы.

## Дополнительные возможности GitHub Actions

### 1. Reusable workflows

Reusable workflows позволяют вынести общие шаги в отдельный файл и вызывать его из разных репозиториев, что повышает переиспользуемость и упрощает поддержку.

```yaml
# .github/workflows/reusable-build.yml
name: Reusable Build
on:
  workflow_call:
    inputs:
      node-version:
        required: true
        type: string

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ inputs.node-version }}
      - run: npm ci
      - run: npm test
```

В другом workflow:

```yaml
jobs:
  test:
    uses: ./.github/workflows/reusable-build.yml
    with:
      node-version: '20'
```

### 2. Matrix strategy

Matrix strategy позволяет запускать одни и те же задачи с разными параметрами, например, тестировать приложение на нескольких версиях Node.js одновременно.

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [14, 16, 18]
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      - run: npm ci
      - run: npm test
```

### 3. Caching

Caching сохраняет зависимости и артефакты между запусками, уменьшая время сборки и экономя ресурсы.

```yaml
- name: Cache node modules
  uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-node-
```

### 4. Artifacts

Artifacts позволяют сохранять файлы, созданные во время выполнения workflow, чтобы использовать их в последующих шагах или скачивать вручную.

```yaml
- name: Upload artifact
  uses: actions/upload-artifact@v3
  with:
    name: build
    path: dist/
```

### 5. Concurrency

Concurrency управляет одновременным выполнением workflow, предотвращая конфликтные запуски и позволяя отменять старые задачи.

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

### 6. Environments

Environments предоставляют безопасные зоны развертывания с возможностью проверки и утверждения перед публикацией.

```yaml
environment:
  name: production
  url: https://example.com
  reviewers:
    - octocat
```

## Мониторинг и отладка

- Используйте `actions/checkout@v3` с `fetch-depth: 0` для доступа к истории.
- Добавьте `actions/debugger@v1` для интерактивного отладки.
- Включите `workflow_run` для запуска дополнительных проверок после завершения.

## Заключение

GitHub Actions предоставляет богатый набор возможностей, позволяющих автоматизировать практически любой процесс разработки. Понимание и правильное применение этих функций поможет вам создавать надёжные и масштабируемые пайплайны.