---
title: "Kustomize: альтернатива Helm, Overlays, patches"
description: "Используйте Kustomize: альтернатива Helm, Overlays, patches. Кастомизируйте манифесты K8s для проектов."
pubDate: "2026-03-07"
---

# Kustomize: альтернатива Helm

Kustomize позволяет хранить Kubernetes-манифесты в чистом YAML без шаблонов Go, используя patch-файлы для кастомизации под каждое окружение. Встроен в `kubectl` начиная с 1.14: `kubectl apply -k overlays/production` без установки дополнительных инструментов.

Helm мощный, но требует изучения шаблонизации Go. Kustomize предлагает другой подход: никаких шаблонов, только декларативные патчи поверх существующих YAML-файлов. Каждый манифест остаётся валидным Kubernetes YAML, который можно применить напрямую.

> **Key Takeaways**
> - Base + overlay: базовая конфигурация общая для всех окружений, overlay -- только отличия (реплики, ресурсы, image tag)
> - `configMapGenerator` добавляет хэш к имени ConfigMap -- изменение конфига автоматически запускает rolling update
> - JSON Patch для точечных операций (`op: add`, `op: replace`) без полного переопределения ресурса
> - `kubectl diff -k overlays/production` показывает разницу с текущим состоянием кластера до деплоя
> - Kustomize подходит для патчинга публичных манифестов (например, официальных YAML Nginx) без форка

## Концепция

Kustomize работает с двумя понятиями: **base** (базовая конфигурация, общая для всех окружений) и **overlay** (патчи для конкретного окружения).

```
k8s/
├── base/
│   ├── kustomization.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   └── configmap.yaml
└── overlays/
    ├── staging/
    │   ├── kustomization.yaml
    │   └── patch-replicas.yaml
    └── production/
        ├── kustomization.yaml
        ├── patch-replicas.yaml
        └── patch-resources.yaml
```

## Base

```yaml
# base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
commonLabels:
  app: my-app
```

```yaml
# base/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: my-registry/my-app:latest
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
```

## Overlays

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base

# Изменить тег образа без редактирования base
images:
  - name: my-registry/my-app
    newTag: "2.5.1"

# Добавить namespace ко всем ресурсам
namespace: production

# Добавить prefix к именам ресурсов
namePrefix: prod-

# Применить патчи
patches:
  - path: patch-replicas.yaml
  - path: patch-resources.yaml
```

```yaml
# overlays/production/patch-replicas.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
```

```yaml
# overlays/production/patch-resources.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: app
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 2
              memory: 2Gi
```

```yaml
# overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base

images:
  - name: my-registry/my-app
    newTag: "2.5.1-rc1"

namespace: staging

patches:
  - path: patch-replicas.yaml

# Добавить аннотации только для staging
commonAnnotations:
  environment: staging
  cost-center: dev
```

## Strategic Merge Patch и JSON Patch

Kustomize поддерживает два вида патчей:

**Strategic Merge Patch** -- декларативный, понятный. Описываете только то, что нужно изменить. Kubernetes понимает, как правильно слить изменения (добавить к списку или заменить).

**JSON Patch** -- точечные операции для тонкой работы:

```yaml
# Добавить переменную окружения без полного переопределения контейнера
patches:
  - target:
      kind: Deployment
      name: my-app
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/env/-
        value:
          name: LOG_LEVEL
          value: INFO
      - op: replace
        path: /spec/template/spec/containers/0/imagePullPolicy
        value: Always
      - op: add
        path: /spec/template/metadata/annotations
        value:
          prometheus.io/scrape: "true"
          prometheus.io/port: "8000"
```

## ConfigMap и Secret Generator

```yaml
# kustomization.yaml
configMapGenerator:
  - name: app-config
    literals:
      - LOG_LEVEL=INFO
      - MAX_WORKERS=4
      - TIMEOUT=30
    files:
      - config/app.conf

secretGenerator:
  - name: db-credentials
    literals:
      - DB_PASSWORD=secret      # в реальности из переменной окружения
    options:
      disableNameSuffixHash: false   # хэш для rolling update
```

Kustomize добавляет хэш к имени ConfigMap/Secret. При изменении конфига хэш меняется, Deployment получает новое имя ConfigMap в envFrom -- автоматический rolling update без ручного `kubectl rollout restart`.

В CI передавайте секреты через переменные окружения:

```bash
PGPASSWORD=$DB_PASSWORD kubectl kustomize overlays/production | kubectl apply -f -
# или через kustomize секреты из env
```

## Применение и диагностика

```bash
# Просмотр финального YAML без деплоя
kubectl kustomize overlays/production

# Показать разницу с текущим состоянием кластера
kubectl diff -k overlays/production

# Деплой
kubectl apply -k overlays/production

# Удаление всех ресурсов из kustomization
kubectl delete -k overlays/production
```

## Использование внешних ресурсов

Kustomize умеет патчить публичные манифесты напрямую:

```yaml
# kustomization.yaml
resources:
  # Официальные манифесты Nginx Ingress
  - https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
  # Локальные дополнения
  - custom-ingress-class.yaml

patches:
  - target:
      kind: ConfigMap
      name: ingress-nginx-controller
    patch: |
      - op: add
        path: /data/proxy-body-size
        value: "50m"
```

## Когда Kustomize лучше Helm

Kustomize проще для команд, которые не хотят изучать Go-шаблоны. Хорошо работает для:
- Патчинга публичных чартов без форка
- Проектов с несколькими окружениями и небольшими отличиями
- Команд, предпочитающих чистый YAML без шаблонного синтаксиса

Helm выигрывает при сложной условной логике, циклах, зависимостях между чартами, встроенных тестах и распространении через реестр. В ArgoCD и Flux оба инструмента поддерживаются нативно -- можно выбирать по задаче.

## Итог

Kustomize -- прагматичная альтернатива Helm для команд, которым нужна кастомизация без шаблонизатора. Base + overlay структура читается как plain YAML, диф с кластером показывает `kubectl diff -k`, деплой -- `kubectl apply -k`. Начать можно без новых зависимостей -- инструмент уже встроен в kubectl.

Следующий шаг -- [ArgoCD для GitOps: непрерывный деплой из Git](/posts/2026/03/08-argocd/).
