---
title: "GitHub Actions: продвинутый CI/CD — матрицы и workflows"
description: "Освойте продвинутые техники GitHub Actions: матрицы, кэширование, reusable workflows. Постройте эффективный пайплайн для вашего проекта."
heroImage: "../../../../assets/imgs/2025/12/05-github-actions-advanced.webp"
pubDate: "2025-12-05"
---

# GitHub Actions: продвинутые техники CI/CD

GitHub Actions — мощный инструмент CI/CD, встроенный в GitHub. Рассмотрим продвинутые техники для построения эффективных пайплайнов. Помимо базовых workflows, GitHub Actions поддерживает матрицы сборок, кэширование зависимостей, reusable workflows и секреты для безопасного хранения чувствительных данных.

## Базовый пример

Типичный workflow для CI/CD включает триггеры (push, PR), джобы и шаги. Каждый шаг выполняется последовательно.

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
```

## Матрицы (Matrix)

### Несколько версий

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
        # Несколько ОС
        os: [ubuntu-latest, windows-latest]
        # Исключить комбинацию
        exclude:
          - node-version: 22
            os: windows-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      
      - name: Install and test
        run: |
          npm ci
          npm test
```

### Матрица с базами данных

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        database: [postgres:14, postgres:15, mysql:8]
    services:
      database:
        image: ${{ matrix.database }}
        env:
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      
      - name: Test with ${{ matrix.database }}
        run: npm test
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/test
```

## Кэширование

### Кэш npm

```yaml
- name: Cache npm dependencies
  uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-npm-
```

### Кэш pip

```yaml
- name: Cache pip dependencies
  uses: actions/cache@v4
  with:
    path: ~/.cache/pip
    key: ${{ runner.os }}-pip-${{ hashFiles('**/requirements.txt') }}
    restore-keys: |
      ${{ runner.os }}-pip-
```

### Кэш Docker слоёв

```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build and push
  uses: docker/build-push-action@v5
  with:
    context: .
    push: false
    load: true
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

### Кэш Go модулей

```yaml
- name: Set up Go
  uses: actions/setup-go@v5
  with:
    go-version: '1.21'
    cache: true
```

## Reusable Workflows

### Создание reusable workflow

```yaml
# .github/workflows/test.yml
name: Reusable Test Workflow

on:
  workflow_call:
    inputs:
      node-version:
        type: string
        default: '20'
      test-flags:
        type: string
        default: ''
    secrets:
      npm-token:
        required: true

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ inputs.node-version }}
          registry-url: 'https://registry.npmjs.org'
      
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm test ${{ inputs.test-flags }}
        env:
          NPM_TOKEN: ${{ secrets.npm-token }}
```

### Использование reusable workflow

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    uses: ./.github/workflows/test.yml
    with:
      node-version: '20'
      test-flags: '--coverage'
    secrets:
      npm-token: ${{ secrets.NPM_TOKEN }}
```

## Conditional Execution

### Условия в steps

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run on main branch
        if: github.ref == 'refs/heads/main'
        run: echo "Running on main"
      
      - name: Run on PR
        if: github.event_name == 'pull_request'
        run: echo "Running on PR"
```

### Условия в jobs

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    if: github.event_name != 'workflow_dispatch'
    steps:
      - run: echo "Running tests"
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - run: echo "Deploying"
```

## Secrets и Variables

### Создание secret

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        env:
          API_KEY: ${{ secrets.API_KEY }}
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
        run: ./deploy.sh
```

### Organization secrets

```yaml
# Использование secrets организации
env:
  ORG_SECRET: ${{ secrets.ORG_MY_SECRET }}
```

### Variables

```yaml
# Variable (не секрет)
jobs:
  build:
    runs-on: ubuntu-latest
    env:
      NODE_VERSION: 20
    steps:
      - run: echo "Version: ${{ vars.NODE_VERSION }}"
```

## Deployment

### Deploy to AWS ECS

```yaml
name: Deploy to ECS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2
      
      - name: Build and push image
        run: |
          docker build -t $ECR_REGISTRY/app:${{ github.sha }} .
          docker push $ECR_REGISTRY/app:${{ github.sha }}
      
      - name: Deploy to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: task-definition.json
          service: my-service
          cluster: my-cluster
```

### Deploy to Kubernetes

```yaml
- name: Deploy to Kubernetes
  uses: azure/k8s-set-context@v4
  with:
    kubeconfig: ${{ secrets.KUBE_CONFIG }}

- name: Deploy image
  uses: azure/k8s-deploy@v5
  with:
    namespace: production
    manifests: |
      deployment.yml
      service.yml
    images: |
      myregistry.azurecr.io/app:${{ github.sha }}
```

## Concurrency и Cancel

```yaml
name: CI

on: [push]

# Отменять предыдущие запуски для того же PR
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  test:
    runs-on: ubuntu-latest
    # ...
```

## Artifacts

### Загрузка артефактов

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build
        run: npm run build
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/
          retention-days: 30

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Download artifacts
        uses: actions/download-artifact@v4
        with:
          name: build-output
```

## Timeout и Retry

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30  # Таймаут джобы
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Unstable test
        uses: nick-fields/retry@v3
        with:
          timeout_seconds: 60
          max_attempts: 3
          command: npm run unstable-test
          warning_on_retry: true
```

## Composite Actions

### Создание composite action

```yaml
# action.yml
name: 'My Custom Action'
description: 'Does something useful'
inputs:
  token:
    description: 'GitHub token'
    required: true
  message:
    description: 'Message to print'
    default: 'Hello'
outputs:
  result:
    description: 'The result'
    value: ${{ steps.run.outputs.result }}
runs:
  using: composite
  steps:
    - id: run
      shell: bash
      run: |
        echo "result=processed" >> $GITHUB_OUTPUT
        echo "${{ inputs.message }}"
    
    - uses: actions/checkout@v4
      with:
        token: ${{ inputs.token }}
```

## Notification

### Slack уведомления

```yaml
- name: Send Slack notification
  uses: slackapi/slack-github-action@v1.25.0
  with:
    payload: |
      {
        "text": "Build ${{ job.status }}",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "Build *${{ job.status }}* for <${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}|workflow>"
            }
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
  if: always()
```

## Best Practices

1. **Кэшируйте зависимости** — ускоряет пайплайн
2. **Используйте матрицы** — тестируйте на нескольких версиях
3. **Reusable workflows** — избегайте дублирования
4. **Concurrency** — отменяйте устаревшие запуски
5. **Timeouts** — ставьте таймауты для долгих задач
6. **Secrets** — не храните secrets в коде
7. **Idempotency** — пайплайн должен быть воспроизводимым

## Заключение

GitHub Actions предоставляет богатый инструментарий для CI/CD. Продвинутые техники — матрицы, кэширование, reusable workflows — позволяют строить эффективные и масштабируемые пайплайны.