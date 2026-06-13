---
title: "Flux CD: GitOps — Sources, Kustomizations"
description: "Настройте Flux CD: GitOps с Sources, Kustomizations. Непрерывная доставка и автоматизация в K8s для продакшена."
pubDate: "2026-03-09"
---

# Flux CD GitOps: Sources, Kustomizations

Flux — GitOps-инструмент от CNCF, альтернатива ArgoCD. Принципиальное отличие: Flux работает как набор независимых контроллеров, каждый из которых отвечает за свою задачу. Это делает архитектуру более модульной, но требует больше конфигурации.

## Компоненты Flux

- **Source Controller** — отслеживает Git-репозитории, Helm-репозитории, OCI-артефакты
- **Kustomize Controller** — применяет Kustomize/манифесты из Source
- **Helm Controller** — управляет Helm-релизами
- **Notification Controller** — отправляет уведомления о событиях
- **Image Automation Controller** — автоматически обновляет теги образов в Git

## Bootstrap

```bash
# Установка Flux с привязкой к GitHub
flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --personal
```

Flux создаёт репозиторий (если не существует), добавляет свои манифесты и начинает синхронизацию.

## GitRepository Source

```yaml
# Источник: репозиторий с манифестами приложения
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 1m          # как часто проверять
  url: https://github.com/my-org/k8s-manifests
  ref:
    branch: main
  secretRef:
    name: github-credentials  # SSH key или токен
```

## Kustomization

```yaml
# Применить manifests из GitRepository
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/my-app/overlays/production
  prune: true              # удалять ресурсы не из Git
  sourceRef:
    kind: GitRepository
    name: my-app
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
      namespace: production
  timeout: 3m
  # Зависимость: сначала infrastructure, потом приложения
  dependsOn:
    - name: infrastructure
```

## HelmRelease

```yaml
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 1h
  url: https://charts.bitnami.com/bitnami
---
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: postgresql
  namespace: production
spec:
  interval: 1h
  chart:
    spec:
      chart: postgresql
      version: ">=13.0.0 <14.0.0"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  values:
    auth:
      database: myapp
      postgresPassword: ${DB_PASSWORD}  # через Secrets
  valuesFrom:
    - kind: Secret
      name: postgresql-values
      valuesKey: values.yaml
```

## Image Automation

Flux может автоматически обновлять тег образа в Git при появлении новой версии:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: my-registry/my-app
  interval: 5m
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=1.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1beta1
kind: ImageUpdateAutomation
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: flux-bot
        email: flux@example.com
      messageTemplate: "ci: update {{range .Updated.Images}}{{.}}{{end}}"
    push:
      branch: main
```

В файле манифеста добавляется маркер для автообновления:

```yaml
image: my-registry/my-app:1.2.3 # {"$imagepolicy": "flux-system:my-app"}
```

Flux обновит тег при появлении новой версии, соответствующей политике semver.

## Мониторинг

```bash
# Статус всех ресурсов Flux
flux get all -n flux-system

# Логи конкретного контроллера
flux logs --kind=Kustomization --name=my-app

# Принудительная синхронизация
flux reconcile kustomization my-app --with-source
```
