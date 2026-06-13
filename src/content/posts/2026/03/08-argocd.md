---
title: "ArgoCD: GitOps с Sync, health checks и rollback — Обзор"
description: "Внедрите ArgoCD: GitOps с Sync, health checks, rollback. Автоматизируйте деплой в Kubernetes надёжно и безопасно."
pubDate: "2026-03-08"
---

# ArgoCD GitOps: Sync, health, rollback

GitOps — подход, при котором Git-репозиторий является единственным источником истины о желаемом состоянии инфраструктуры. ArgoCD реализует это для Kubernetes: наблюдает за репозиторием и синхронизирует кластер с тем, что описано в манифестах.

## Как работает ArgoCD

ArgoCD постоянно сравнивает состояние кластера с желаемым из Git. Если есть расхождение — Application помечается как `OutOfSync`. Синхронизация может быть ручной или автоматической.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default

  source:
    repoURL: https://github.com/my-org/k8s-manifests
    targetRevision: HEAD
    path: apps/my-app/overlays/production

  destination:
    server: https://kubernetes.default.svc
    namespace: production

  syncPolicy:
    automated:
      prune: true      # удалять ресурсы, которых нет в Git
      selfHeal: true   # откатывать ручные изменения в кластере
    syncOptions:
      - CreateNamespace=true
      - ServerSideApply=true
    retry:
      limit: 3
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

`selfHeal: true` означает, что любое ручное изменение кластера будет отменено ArgoCD. Это ключевое свойство GitOps: кластер всегда соответствует Git.

## Health checks

ArgoCD проверяет состояние ресурсов по встроенным правилам. Для Deployment — `healthy` когда все реплики Ready. Для кастомных ресурсов можно написать Lua-скрипт:

```yaml
# argocd-cm ConfigMap
data:
  resource.customizations.health.apps_Canary: |
    hs = {}
    if obj.status ~= nil then
      if obj.status.phase == "Progressing" then
        hs.status = "Progressing"
        hs.message = obj.status.canaryWeight .. "% traffic on canary"
      elseif obj.status.phase == "Succeeded" then
        hs.status = "Healthy"
      elseif obj.status.phase == "Failed" then
        hs.status = "Degraded"
        hs.message = obj.status.message
      end
    end
    return hs
```

## Sync Waves и Hooks

Порядок применения ресурсов контролируется через аннотации:

```yaml
# Сначала применяем ConfigMap (wave -1)
apiVersion: v1
kind: ConfigMap
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
---
# Потом Job с миграциями (wave 0)
apiVersion: batch/v1
kind: Job
metadata:
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
    argocd.argoproj.io/sync-wave: "0"
---
# Последним — Deployment (wave 1)
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    argocd.argoproj.io/sync-wave: "1"
```

## Rollback

ArgoCD хранит историю синхронизаций. Откат — это синхронизация на конкретный revision:

```bash
# Список истории
argocd app history my-app

# Откат к конкретному revision
argocd app rollback my-app 5

# Через UI — кнопка History в веб-интерфейсе
```

После отката автосинхронизация временно отключается, чтобы ArgoCD не вернул "новое" состояние из HEAD.

## ApplicationSet

ApplicationSet позволяет создавать множество Application из одного шаблона — например, по одному на каждый namespace или по каждой ветке Git:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: cluster-apps
spec:
  generators:
    - list:
        elements:
          - cluster: staging
            url: https://staging.k8s.local
          - cluster: production
            url: https://prod.k8s.local
  template:
    metadata:
      name: "my-app-{{cluster}}"
    spec:
      source:
        repoURL: https://github.com/my-org/k8s-manifests
        targetRevision: HEAD
        path: "apps/my-app/overlays/{{cluster}}"
      destination:
        server: "{{url}}"
        namespace: my-app
```

## Интеграция с CI

Типичный pipeline: CI собирает образ → обновляет тег в Git-репозитории манифестов → ArgoCD замечает изменение → синхронизирует кластер:

```bash
# В CI: обновить тег образа в kustomization.yaml
cd k8s-manifests
kustomize edit set image my-registry/my-app=my-registry/my-app:$CI_SHA

git add .
git commit -m "deploy: update my-app to $CI_SHA"
git push

# ArgoCD обнаружит изменение за ~3 минуты (polling) или мгновенно через webhook
```
