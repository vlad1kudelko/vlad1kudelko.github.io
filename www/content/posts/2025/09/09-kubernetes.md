+++
lang = "ru"
title = "Kubernetes для начинающих: Развертывание приложений"
description = "Kubernetes (часто сокращается как k8s) — это система оркестрации контейнеров с открытым исходным кодом, разработанная Google."
template = "posts"
thumb = "/imgs/2025/09/09-kubernetes.avif"
publication_date = "2025-09-09"
+++

# Kubernetes для начинающих: Развертывание и управление контейнеризированными приложениями

В современном мире разработки программного обеспечения контейнеризация стала стандартом для упаковки и развертывания приложений. Docker позволил нам легко создавать контейнеры, но что делать, когда у вас десятки или сотни контейнеров? Здесь на сцену выходит Kubernetes — мощная платформа для автоматизации развертывания, масштабирования и управления контейнеризированными приложениями.

## Что такое Kubernetes?

Kubernetes (часто сокращается как k8s) — это система оркестрации контейнеров с открытым исходным кодом, разработанная Google. Он автоматизирует множество процессов, связанных с развертыванием и управлением контейнеризированными приложениями, включая балансировку нагрузки, масштабирование, мониторинг и восстановление после сбоев.

### Зачем нужен Kubernetes?

Представьте, что у вас есть веб-приложение, состоящее из фронтенда, бэкенда, базы данных и кеша Redis. Каждый компонент работает в своем контейнере. Без Kubernetes вам пришлось бы:

- Вручную запускать каждый контейнер на серверах
- Следить за состоянием контейнеров
- Перезапускать упавшие контейнеры
- Управлять сетевыми соединениями между контейнерами
- Масштабировать приложение при увеличении нагрузки

Kubernetes берет на себя все эти задачи, позволяя разработчикам сосредоточиться на написании кода.

## Основные концепции Kubernetes

### Поды (Pods)

Под — это самая маленькая развертываемая единица в Kubernetes. Под представляет собой группу из одного или нескольких контейнеров, которые:

- Разделяют сетевое пространство (IP-адрес и порты)
- Разделяют хранилище
- Всегда развертываются на одном узле
- Живут и умирают вместе

Чаще всего под содержит один контейнер. Несколько контейнеров в одном поде используются только когда они тесно связаны и должны работать вместе.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app-pod
spec:
  containers:
  - name: my-app
    image: nginx:1.20
    ports:
    - containerPort: 80
```

### Деплойменты (Deployments)

Деплоймент управляет подами и обеспечивает декларативные обновления приложений. Он гарантирует, что определенное количество реплик вашего приложения всегда работает.

Основные возможности деплойментов:

- **Реплицирование**: Запуск нескольких экземпляров приложения
- **Обновления**: Плавное обновление приложения без простоя
- **Откат**: Возврат к предыдущей версии при проблемах
- **Масштабирование**: Увеличение или уменьшение количества реплик

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-deployment
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
      - name: my-app
        image: nginx:1.20
        ports:
        - containerPort: 80
```

### Сервисы (Services)

Поды в Kubernetes имеют динамические IP-адреса и могут быть пересозданы в любой момент. Сервисы решают эту проблему, предоставляя стабильный способ доступа к группе подов.

Типы сервисов:

- **ClusterIP**: Доступ только внутри кластера (по умолчанию)
- **NodePort**: Доступ через порт на каждом узле
- **LoadBalancer**: Использует внешний балансировщик нагрузки облачного провайдера
- **ExternalName**: Перенаправляет на внешний DNS

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app-service
spec:
  selector:
    app: my-app
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
```

## Развертывание простого приложения

Давайте развернем простое веб-приложение на Nginx, чтобы увидеть Kubernetes в действии.

### Создание деплоймента

Создайте файл `nginx-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.20
        ports:
        - containerPort: 80
```

Применим конфигурацию:

```bash
kubectl apply -f nginx-deployment.yaml
```

### Создание сервиса

Создайте файл `nginx-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  selector:
    app: nginx
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

Применим сервис:

```bash
kubectl apply -f nginx-service.yaml
```

### Проверка развертывания

Проверим состояние подов:

```bash
kubectl get pods
```

Посмотрим на деплоймент:

```bash
kubectl get deployments
```

Проверим сервисы:

```bash
kubectl get services
```

## Использование Minikube для локальной разработки

Minikube — это инструмент, который позволяет запустить локальный кластер Kubernetes на вашей машине. Это идеальное решение для изучения Kubernetes и локальной разработки.

### Установка Minikube

#### macOS:
```bash
brew install minikube
```

#### Windows:
```bash
choco install minikube
```

#### Linux:
```bash
curl -Lo minikube https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube /usr/local/bin/
```

### Запуск Minikube

Запустите локальный кластер:

```bash
minikube start
```

Minikube автоматически настроит kubectl для работы с локальным кластером.

### Полезные команды Minikube

Просмотр dashboard:

```bash
minikube dashboard
```

Получение IP-адреса кластера:

```bash
minikube ip
```

Доступ к сервису:

```bash
minikube service nginx-service --url
```

Остановка Minikube:

```bash
minikube stop
```

Удаление кластера:

```bash
minikube delete
```

## Практический пример: Развертывание веб-приложения с базой данных

Давайте создадим более сложный пример — веб-приложение с базой данных PostgreSQL.

### База данных PostgreSQL

Создайте файл `postgres-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:13
        env:
        - name: POSTGRES_DB
          value: "myapp"
        - name: POSTGRES_USER
          value: "user"
        - name: POSTGRES_PASSWORD
          value: "password"
        ports:
        - containerPort: 5432
---
apiVersion: v1
kind: Service
metadata:
  name: postgres-service
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

### Веб-приложение

Создайте файл `webapp-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp-deployment
spec:
  replicas: 2
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
      - name: webapp
        image: nginx:1.20
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: webapp-service
spec:
  selector:
    app: webapp
  ports:
  - port: 80
    targetPort: 80
  type: LoadBalancer
```

Развертывание:

```bash
kubectl apply -f postgres-deployment.yaml
kubectl apply -f webapp-deployment.yaml
```

## Основные команды kubectl

kubectl — это инструмент командной строки для взаимодействия с Kubernetes API.

### Управление ресурсами

```bash
# Создание ресурсов из файла
kubectl apply -f deployment.yaml

# Получение списка подов
kubectl get pods

# Подробная информация о поде
kubectl describe pod <pod-name>

# Просмотр логов пода
kubectl logs <pod-name>

# Подключение к поду
kubectl exec -it <pod-name> -- /bin/bash

# Удаление ресурсов
kubectl delete -f deployment.yaml
```

### Отладка

```bash
# Проверка событий в кластере
kubectl get events

# Просмотр состояния узлов
kubectl get nodes

# Информация о кластере
kubectl cluster-info
```

## Мониторинг и отладка

### Проверка состояния приложения

Kubernetes предоставляет несколько способов проверки здоровья приложений:

**Liveness проверки** — определяют, нужно ли перезапустить контейнер:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
```

**Readiness проверки** — определяют, готов ли под принимать трафик:

```yaml
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Масштабирование

Масштабирование приложения в Kubernetes очень простое:

```bash
# Увеличить количество реплик до 5
kubectl scale deployment nginx-deployment --replicas=5

# Автомасштабирование на основе CPU
kubectl autoscale deployment nginx-deployment --cpu-percent=70 --min=2 --max=10
```

## Лучшие практики для начинающих

### Организация ресурсов

- Используйте пространства имен (namespaces) для разделения окружений
- Применяйте метки (labels) для группировки связанных ресурсов
- Используйте аннотации для дополнительных метаданных

### Безопасность

- Не запускайте контейнеры от root пользователя
- Используйте секреты (secrets) для хранения паролей и ключей
- Ограничивайте ресурсы контейнеров

```yaml
resources:
  requests:
    memory: "64Mi"
    cpu: "250m"
  limits:
    memory: "128Mi"
    cpu: "500m"
```

### Конфигурация

Используйте ConfigMaps для конфигурации приложений:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  database_url: "postgresql://postgres:5432/myapp"
  redis_url: "redis://redis:6379"
```

## Заключение

Kubernetes может показаться сложным на первый взгляд, но понимание основных концепций — подов, деплойментов и сервисов — дает прочную основу для дальнейшего изучения. Minikube предоставляет отличную возможность экспериментировать с Kubernetes локально, не тратя деньги на облачную инфраструктуру.

Начните с простых примеров, постепенно добавляя сложности. Изучите документацию Kubernetes, экспериментируйте с различными типами ресурсов и не бойтесь делать ошибки — в локальном окружении их легко исправить.

Следующими шагами в изучении Kubernetes могут быть:

- Изучение Ingress контроллеров для управления трафиком
- Работа с Persistent Volumes для хранения данных
- Настройка мониторинга с помощью Prometheus и Grafana
- Изучение Helm для управления пакетами Kubernetes
- Настройка CI/CD пайплайнов для автоматического развертывания

Kubernetes — это мощный инструмент, который изменит ваш подход к развертыванию и управлению приложениями. Инвестиции времени в его изучение обязательно окупятся в будущих проектах.
