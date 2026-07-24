---
title: "ArgoCD: GitOps с Sync, health checks и rollback, Обзор"
description: "Внедрите ArgoCD: GitOps с Sync, health checks, rollback. Автоматизируйте деплой в Kubernetes надёжно и безопасно."
pubDate: "2026-03-08"
---

# ArgoCD GitOps: Sync, health, rollback

ArgoCD делает Git единственным источником правды о состоянии Kubernetes-кластера: всё, что есть в репозитории -- должно быть в кластере, и ничего лишнего. Любое ручное изменение через kubectl будет автоматически отменено. Это и есть GitOps.

GitOps -- подход, при котором Git-репозиторий является единственным источником истины о желаемом состоянии инфраструктуры. ArgoCD реализует это для Kubernetes: наблюдает за репозиторием и синхронизирует кластер с тем, что описано в манифестах.

> **Key Takeaways**
> - `selfHeal: true` отменяет любые ручные изменения в кластере -- Git всегда выигрывает
> - Sync Waves (`argocd.argoproj.io/sync-wave`) контролируют порядок применения ресурсов: ConfigMap перед Deployment, миграции перед приложением
> - `argocd app rollback my-app 5` откатывает к конкретному revision истории синхронизаций за секунды
> - ApplicationSet создаёт Application для нескольких кластеров/окружений из одного шаблона
> - Для уведомлений в Slack/Teams/PagerDuty использует встроенный Notification Controller

## Как работает ArgoCD

ArgoCD постоянно сравнивает состояние кластера с желаемым из Git. Если есть расхождение, Application помечается как `OutOfSync`. Синхронизация может быть ручной или автоматической.

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
      prune: true       # удалять ресурсы, которых нет в Git
      selfHeal: true    # откатывать ручные изменения в кластере
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

`selfHeal: true` означает, что любое ручное изменение кластера будет отменено ArgoCD в течение нескольких минут. Это ключевое свойство GitOps: кластер всегда соответствует Git.

## Установка

```bash
# Установка ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Получить начальный пароль
kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d

# Port-forward для веб-интерфейса
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Войти через CLI
argocd login localhost:8080 --username admin
```

## Health checks

ArgoCD проверяет состояние ресурсов по встроенным правилам. Для Deployment -- `healthy` когда все реплики Ready. Для CRD (custom resources) можно написать Lua-скрипт:

```yaml
# ConfigMap argocd-cm
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

Порядок применения ресурсов контролируется через аннотации. Типичный случай: ConfigMap перед Deployment, миграции базы перед приложением:

```yaml
# Wave -1: сначала ConfigMap и Secrets
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
---
# Wave 0: Job с миграциями (PreSync hook)
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrations
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
    argocd.argoproj.io/sync-wave: "0"
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrate
          image: my-app:2.5.1
          command: ["python", "manage.py", "migrate"]
---
# Wave 1: Deployment запускается после успешных миграций
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  annotations:
    argocd.argoproj.io/sync-wave: "1"
```

Если `PreSync` хук завершится с ошибкой, синхронизация остановится и не применит Deployment.

## Rollback

ArgoCD хранит историю синхронизаций. Откат -- это синхронизация на конкретный revision:

```bash
# Список истории
argocd app history my-app
# ID  DATE                           REVISION
# 1   2026-03-08T10:00:00Z  abc1234 (HEAD)
# 2   2026-03-07T14:00:00Z  def5678
# 3   2026-03-06T11:00:00Z  ghi9012

# Откат к revision 2 (предыдущий деплой)
argocd app rollback my-app 2

# Через UI: History & Rollback в веб-интерфейсе
```

После отката автосинхронизация временно отключается. ArgoCD не будет автоматически "исправлять" кластер обратно до следующего ручного включения.

## ApplicationSet

ApplicationSet создаёт множество Application из одного шаблона -- по одному на каждый кластер или окружение:

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
      project: default
      source:
        repoURL: https://github.com/my-org/k8s-manifests
        targetRevision: HEAD
        path: "apps/my-app/overlays/{{cluster}}"
      destination:
        server: "{{url}}"
        namespace: my-app
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
```

Добавить новое окружение -- одна строчка в `elements`.

## Интеграция с CI

Типичный pipeline: CI собирает образ → обновляет тег в Git-репозитории манифестов → ArgoCD замечает изменение → синхронизирует кластер:

```bash
# В CI: обновить тег образа в kustomization.yaml
cd k8s-manifests
kustomize edit set image my-registry/my-app=my-registry/my-app:$CI_SHA
git add .
git commit -m "deploy: update my-app to $CI_SHA"
git push

# ArgoCD обнаружит изменение за ~3 минуты (polling)
# или мгновенно через webhook:
# Settings -> Repositories -> Add webhook
```

Для немедленной синхронизации из CI:

```bash
argocd app sync my-app --revision $CI_SHA --server argocd.internal
```

## Уведомления

```yaml
# ConfigMap argocd-notifications-cm
data:
  service.slack: |
    token: $slack-token
  trigger.on-deployed: |
    - when: app.status.operationState.phase in ['Succeeded']
      send: [app-deployed]
  trigger.on-health-degraded: |
    - when: app.status.health.status == 'Degraded'
      send: [app-degraded]
  template.app-deployed: |
    message: |
      :white_check_mark: {{.app.metadata.name}} deployed to {{.app.spec.destination.namespace}}
```

## Итог

ArgoCD превращает Git в единственный источник правды для Kubernetes. `selfHeal` устраняет drift, Sync Waves решают проблему порядка применения ресурсов, история синхронизаций делает откат тривиальным. Цена -- строгий workflow: все изменения только через Git.

Следующий шаг -- [Flux CD как альтернатива ArgoCD для GitOps](/posts/2026/03/09-flux-cd/).
