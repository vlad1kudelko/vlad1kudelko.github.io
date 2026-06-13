---
title: "Kustomize: альтернатива Helm — Overlays, patches"
description: "Используйте Kustomize: альтернатива Helm, Overlays, patches. Кастомизируйте манифесты K8s для проектов."
pubDate: "2026-03-07"
---

# Kustomize: альтернатива Helm

Helm мощный, но требует изучения шаблонизации Go. Kustomize предлагает другой подход: никаких шаблонов — только декларативные патчи поверх существующих YAML-файлов. Kustomize встроен в `kubectl` начиная с версии 1.14.

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
bases:
  - ../../base

# Изменить тег образа
images:
  - name: my-registry/my-app
    newTag: "2.5.1"

# Добавить namespace ко всем ресурсам
namespace: production

# Добавить prefixк именам
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

## Strategic Merge Patch и JSON Patch

Kustomize поддерживает два вида патчей. Strategic Merge Patch (выше) — декларативный, понятный. JSON Patch — точечные операции:

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
```

## ConfigMap и Secret Generator

```yaml
# kustomization.yaml
configMapGenerator:
  - name: app-config
    literals:
      - LOG_LEVEL=INFO
      - MAX_WORKERS=4
    files:
      - config/app.conf

secretGenerator:
  - name: db-credentials
    literals:
      - DB_PASSWORD=secret
    options:
      disableNameSuffixHash: false  # автоматический хэш для rolling update
```

Kustomize добавляет хэш к имени ConfigMap/Secret. При изменении конфига хэш меняется → Deployment получает новое имя → автоматический rolling update.

## Применение

```bash
# Просмотр результирующих манифестов
kubectl kustomize overlays/production

# Деплой
kubectl apply -k overlays/production

# Разница с текущим состоянием
kubectl diff -k overlays/production
```

## Когда Kustomize лучше Helm

Kustomize проще для команд, которые не хотят изучать Go-шаблоны. Он хорошо работает, когда base — это публичный чарт (например, официальные манифесты Nginx) и нужно только добавить аннотации или изменить реплики.

Helm выигрывает при сложной условной логике, циклах, зависимостях между чартами и когда нужен `helm test`. В ArgoCD и Flux оба инструмента поддерживаются нативно.
