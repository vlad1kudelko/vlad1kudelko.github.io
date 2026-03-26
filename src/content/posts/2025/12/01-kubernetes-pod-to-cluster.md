---
title: "Kubernetes: от Pod до кластера"
description: "Полное руководство по архитектуре Kubernetes — от базовых сущностей до организации кластера"
heroImage: "../../../../assets/imgs/2025/12/01-kubernetes-pod-to-cluster.webp"
pubDate: "2025-12-01"
---

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

## Заключение

Kubernetes предоставляет мощный инструментарий для управления контейнерами в продакшене. Понимание базовых концепций — Pod, Deployment, Service, Ingress — позволяет эффективно развёртывать и масштабировать приложения.
