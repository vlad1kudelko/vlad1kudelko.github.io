---
title: "Flux CD: GitOps, Sources, Kustomizations"
description: "Настройте Flux CD: GitOps с Sources, Kustomizations. Непрерывная доставка и автоматизация в K8s для продакшена."
pubDate: "2026-03-09"
---

# Flux CD GitOps: Sources, Kustomizations

Flux -- GitOps-инструмент от CNCF, который разбивает задачи CD на независимые контроллеры: Source Controller отслеживает Git и реестры образов, Kustomize Controller применяет манифесты, Helm Controller управляет Helm-релизами. Эта модульность позволяет комбинировать инструменты под конкретные нужды.

Flux -- альтернатива ArgoCD. Принципиальное отличие: Flux работает как набор независимых контроллеров, каждый из которых отвечает за свою задачу. Это делает архитектуру более модульной, но требует больше начальной конфигурации.

> **Key Takeaways**
> - Flux разбит на контроллеры: Source, Kustomize, Helm, Notification, Image Automation -- можно использовать только нужные
> - `flux bootstrap github` устанавливает Flux и кладёт его манифесты в сам Git-репозиторий -- self-hosted GitOps
> - `dependsOn` в Kustomization гарантирует порядок: infrastructure применяется раньше приложений
> - Image Automation автоматически обновляет тег образа в Git при появлении новой версии
> - `flux reconcile kustomization my-app --with-source` принудительно синхронизирует без ожидания интервала

---

Борис настраивал мультикластерное окружение: 3 кластера (dev, staging, prod) с разными конфигурациями. С ArgoCD потребовался бы отдельный экземпляр ArgoCD для каждого кластера или сложная настройка multicluster. С Flux он использовал один Git-репозиторий с отдельными путями для каждого кластера, а каждый кластер сам синхронизировал свои манифесты. Никаких внешних зависимостей -- каждый кластер автономен.

## Компоненты Flux

- **Source Controller** -- отслеживает Git-репозитории, Helm-репозитории, OCI-артефакты
- **Kustomize Controller** -- применяет Kustomize/манифесты из Source
- **Helm Controller** -- управляет Helm-релизами (HelmRelease CRD)
- **Notification Controller** -- отправляет уведомления о событиях в Slack, Teams, PagerDuty
- **Image Automation Controller** -- автоматически обновляет теги образов в Git

## Bootstrap

```bash
# Предварительно: установить Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Установка Flux с привязкой к GitHub
flux bootstrap github \
  --owner=my-org \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production \
  --personal

# Или к GitLab
flux bootstrap gitlab \
  --owner=my-group \
  --repository=fleet-infra \
  --branch=main \
  --path=clusters/production
```

Flux создаёт репозиторий (если не существует), добавляет свои манифесты в `clusters/production` и начинает синхронизацию. Сам Flux хранится в Git -- его конфигурация тоже управляется GitOps.

## GitRepository Source

```yaml
# Источник: репозиторий с манифестами приложения
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 1m          # как часто проверять Git
  url: https://github.com/my-org/k8s-manifests
  ref:
    branch: main
  secretRef:
    name: github-credentials  # SSH key или Personal Access Token
---
# Секрет для доступа к приватному репозиторию
apiVersion: v1
kind: Secret
metadata:
  name: github-credentials
  namespace: flux-system
type: Opaque
stringData:
  username: git
  password: ghp_token123
```

Для SSH-аутентификации:

```bash
flux create secret git github-credentials \
  --url=ssh://git@github.com/my-org/k8s-manifests \
  --ssh-key-algorithm=ed25519
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
  prune: true           # удалять ресурсы не из Git
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

`dependsOn` гарантирует порядок: если `infrastructure` Kustomization не `Ready`, `my-app` не будет синхронизироваться.

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
  valuesFrom:
    - kind: Secret
      name: postgresql-values
      valuesKey: values.yaml   # секреты из отдельного Secret
  upgrade:
    remediation:
      retries: 3
  rollback:
    cleanupOnFail: true
```

Flux Helm Controller выполняет `helm upgrade` при изменении HelmRelease или появлении новой версии чарта в указанном диапазоне.

---

Марина управляла 15 Helm-зависимостями в production: cert-manager, ingress-nginx, prometheus, loki, и другие. С ручным обновлением уходили часы каждый месяц. После перехода на Flux HelmRelease с диапазонами версий (`>=5.0.0 <6.0.0`): Flux автоматически обновляет чарты при появлении патч-версий. Мажорные обновления требуют ручного изменения диапазона в Git. Теперь большинство security-патчей накатываются автоматически, а рабочее время тратится только на мажорные версии.

## Image Automation

Flux может автоматически обновлять тег образа в Git при появлении новой версии:

```yaml
# Мониторить образ в реестре
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: my-registry/my-app
  interval: 5m
---
# Политика выбора тега
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
# Автоматически коммитить обновления в Git
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

Flux обновит тег при появлении новой версии, соответствующей политике semver, и сделает коммит в Git.

## Уведомления

```yaml
# Уведомления в Slack
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Provider
metadata:
  name: slack
  namespace: flux-system
spec:
  type: slack
  channel: deployments
  secretRef:
    name: slack-token
---
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: flux-alerts
  namespace: flux-system
spec:
  providerRef:
    name: slack
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
```

## Мониторинг и диагностика

```bash
# Статус всех ресурсов Flux
flux get all -n flux-system

# Детальный статус конкретного ресурса
flux get kustomization my-app -n flux-system

# Логи конкретного контроллера
flux logs --kind=Kustomization --name=my-app

# Принудительная синхронизация без ожидания интервала
flux reconcile kustomization my-app --with-source

# Проверка что всё в порядке
flux check
```

## Flux vs ArgoCD

| Аспект | Flux | ArgoCD |
|--------|------|--------|
| Архитектура | Независимые контроллеры | Монолитный сервер |
| UI | Нет встроенного | Богатый веб-интерфейс |
| Мультикластер | Нативный (каждый кластер автономен) | Через ApplicationSet |
| Image Automation | Встроенный | Через Argo Image Updater |
| Сложность настройки | Выше | Ниже |
| CNCF Graduated | Да | Да |

Flux лучше для команд, предпочитающих CLI и не нуждающихся в UI. ArgoCD лучше, когда важна визуализация состояния деплоев в браузере.

## Итог

Flux разбивает GitOps на независимые компоненты: Source Controller отслеживает Git и реестры, Kustomize Controller применяет манифесты, Helm Controller управляет релизами. Image Automation автоматизирует обновление образов без участия человека. Это мощная модель для команд, которые хотят полностью автоматизировать CD-пайплайн.

Следующий шаг -- [Terraform для управления инфраструктурой: state и remote backend](/posts/2026/03/10-terraform-state).
