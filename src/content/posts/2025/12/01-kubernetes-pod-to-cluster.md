---
title: "Kubernetes: от Pod до кластера. Основные понятия"
description: "Полное руководство по архитектуре Kubernetes — от базовых сущностей до организации кластера"
heroImage: "../../../../assets/imgs/2025/12/01-kubernetes-pod-to-cluster.webp"
pubDate: "2025-12-01"
---

# Kubernetes: от Pod до кластера

Kubernetes (K8s) — это оркестратор контейнеров, ставший стандартом де-факто для управления контейнеризированными приложениями. Давайте разберёмся, как он устроен.

## Core Concepts

### Pod

**Pod** — минимальная единица развёртывания в Kubernetes. Это группа из одного или нескольких контейнеров, которые:

- Делят хранилище и сеть
- Запускаются на одном узле
- Живут и умирают вместе

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  containers:
  - name: app
    image: nginx:latest
    ports:
    - containerPort: 80
```

### ReplicaSet

Обеспечивает желаемое количество реплик Pod:

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: my-app-rs
spec:
  replicas: 3
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
        image: nginx:latest
```

### Deployment

Добавляет управление версиями и rollback:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
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
        image: nginx:latest
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

## Архитектура кластера

### Control Plane (Master Node)

- **kube-apiserver** — API-сервер, единственная точка входа
- **etcd** — распределённое хранилище состояния
- **kube-scheduler** — планировщик, выбирает узел для Pod
- **kube-controller-manager** — набор контроллеров
- **cloud-controller-manager** — интеграция с облаком

### Worker Nodes

- **kubelet** — агент на узле, управляет Pod
- **kube-proxy** — сетевой прокси, правила iptables
- **container runtime** — Docker, containerd, CRI-O

## Services и Networking

### Service

Стабильный IP для набора Pod:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-svc
spec:
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP  # или LoadBalancer, NodePort
```

### Ingress

HTTP/HTTPS маршрутизация:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app-ingress
spec:
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: my-app-svc
            port:
              number: 80
```

## ConfigMap и Secrets

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  database_url: "postgres://db:5432/app"
  config.yaml: |
    log_level: info

---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  api_key: "your-api-key"
```

## Volumes

### PersistentVolume

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: my-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  storageClassName: standard
  hostPath:
    path: /mnt/data
```

### PersistentVolumeClaim

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: my-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi
```

## Namespace

Логическое разделение кластера:

```bash
kubectl create namespace myapp
kubectl get pods -n myapp
```

## Основные команды

```bash
# Деплой
kubectl apply -f deployment.yaml

# Масштабирование
kubectl scale deployment my-app --replicas=5

# Логи
kubectl logs -f deployment/my-app

# Отладка
kubectl exec -it my-app-pod -- /bin/bash

# Проверка статуса
kubectl get pods,svc,deployments

# Удаление
kubectl delete -f deployment.yaml
```

## Как это работает вместе

Давайте соберём всё в единую картину. Типичный поток развёртывания выглядит так:

1. **Вы создаёте Deployment** — описываете желаемое состояние приложения (сколько реплик, какой образ)
2. **Deployment создаёт ReplicaSet** — который гарантирует нужное количество Pod
3. **Scheduler выбирает узел** — на основе доступных ресурсов и политик
4. **Kubelet запускает Pod** — через container runtime
5. **Service предоставляет доступ** — стабильный IP для подключения к Pod
6. **Ingress маршрутизирует трафик** — снаружи кластера внутрь

```
┌───────────────────────────────────────┐
│                Cluster                │
│  ┌─────────────┐     ┌─────────────┐  │
│  │ Control     │     │ Worker Node │  │
│  │ Plane       │     │             │  │
│  │             │     │  ┌───────┐  │  │
│  │  API Server │◄────┼─►│ Pod 1 │  │  │
│  │             │     │  │       │  │  │
│  │  Scheduler  │     │  ├───────┤  │  │
│  │             │     │  │ Pod 2 │  │  │
│  │  etcd       │     │  │       │  │  │
│  └─────────────┘     │  ├───────┤  │  │
│                      │  │ Pod 3 │  │  │
│  ┌─────────────┐     │  └───────┘  │  │
│  │ Service     │     └─────────────┘  │
│  │ (ClusterIP) │                      │
│  └─────────────┘                      │
│         ▲                             │
│         │                             │
│  ┌──────┴──────┐                      │
│  │   Ingress   │◄────── Internet      │
│  └─────────────┘                      │
└───────────────────────────────────────┘
```

## Практические рекомендации

### Для начинающих

- **Начните с minikube или kind** — локальный кластер для обучения
- **Используйте kubectl alias** — сократите команды (`k`, `kgp`, `kgl`)
- **Изучите YAML** — большая часть работы — это манифесты
- **Практикуйтесь на примерах** — развёртывайте простые приложения

### Для продакшена

- **Включите Resource Quotas** — лимиты CPU и памяти для namespace
- **Настройте Health Checks** — liveness и readiness пробы
- **Используйте Network Policies** — изоляция трафика между Pod
- **Включите RBAC** — контроль доступа к API
- **Настройте мониторинг** — Prometheus + Grafana
- **Автоматизируйте деплой** — GitOps с ArgoCD или Flux

### Частые ошибки

- **Нет limits/requests** — приводит к нехватке ресурсов
- **Один большой Pod** — нарушает принцип единой ответственности
- **Игнорирование readiness probe** — трафик идёт на неготовые Pod
- **Хранение секретов в коде** — используйте Secrets или внешние vault
- **Отсутствие тегов образов** — `latest` усложняет откат

## Что дальше

После освоения базовых концепций стоит изучить:

- **Helm** — менеджер пакетов для Kubernetes
- **Operators** — кастомные контроллеры для сложных приложений
- **Service Mesh** — Istio или Linkerd для продвинутой сети
- **GitOps** — декларативное управление инфраструктурой
- **Kustomize** — нативная кастомизация манифестов

## Заключение

Kubernetes предоставляет мощный инструментарий для управления контейнерами в продакшене. Понимание базовых концепций — Pod, Deployment, Service, Ingress — позволяет эффективно развёртывать и масштабировать приложения.

Главное помнить: Kubernetes — это не просто технология, это экосистема с собственными паттернами и best practices. Начните с малого, экспериментируйте в локальном кластере, и постепенно переходите к более сложным сценариям.
