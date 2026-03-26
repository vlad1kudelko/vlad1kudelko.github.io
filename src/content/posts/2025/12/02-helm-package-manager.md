---
title: "Helm: пакетный менеджер K8s — руководство по чартам"
description: "Управляйте Kubernetes-приложениями с Helm: создание чартов, шаблоны, репозитории. Научитесь развёртывать приложения в K8s быстро и эффективно."
heroImage: "../../../../assets/imgs/2025/12/02-helm-package-manager.webp"
pubDate: "2025-12-02"
---

# Helm: управление приложениями в Kubernetes

Helm — это менеджер пакетов для Kubernetes, который упрощает развёртывание и управление приложениями. Представьте его как apt или yum для K8s.

## Установка

Helm устанавливается как обычный бинарный файл. После установки вы получите доступ к команде `helm` в терминале.

```bash
# macOS
brew install helm

# Linux
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Windows
winget install Helm.Helm
```

После установки проверьте версию:

```bash
helm version
```

## Основные понятия

Helm оперирует двумя ключевыми понятиями: Chart и Release. Понимание разницы между ними критически важно для эффективной работы.

### Chart

**Chart** — это пакет Kubernetes-ресурсов. Содержит:

- `Chart.yaml` — метаинформация
- `values.yaml` — значения по умолчанию
- `templates/` — шаблоны манифестов
- `charts/` — зависимости

Chart можно сравнить с пакетом в apt или npm — это описание приложения со всеми зависимостями.

### Release

**Release** — это экземпляр чарта, запущенный в кластере.

Один и тот же чарт может быть установлен несколько раз с разными параметрами, создавая несколько Release. Например, чарт `nginx` можно установить как `nginx-dev`, `nginx-staging` и `nginx-prod` с разными конфигурациями.

## Структура чарта

```
mychart/
├── Chart.yaml          # Метаданные чарта
├── values.yaml         # Значения по умолчанию
├── values.schema.json  # JSON Schema для валидации
├── templates/          # Шаблоны манифестов
│   ├── deployment.yaml
│   ├── service.yaml
│   └── _helpers.tpl    # Вспомогательные шаблоны
└── charts/             # Зависимости
```

## Создание своего чарта

Команда `helm create` генерирует базовую структуру чарта с примерами шаблонов. Это отличная отправная точка для изучения.

```bash
helm create mychart
```

После создания вы получите готовую структуру с примерами deployment, service и ingress. Изучите сгенерированные файлы, чтобы понять синтаксис шаблонов.

### Chart.yaml

Файл `Chart.yaml` содержит метаданные чарта. Это обязательный файл для любого чарта.

```yaml
apiVersion: v2
name: mychart
description: My Kubernetes application
type: application
version: 1.0.0
appVersion: "1.0"
```

Поле `version` — это версия чарта (по семверу), а `appVersion` — версия приложения внутри чарта.

### values.yaml

Файл `values.yaml` содержит значения по умолчанию. Пользователи могут переопределять их при установке.

```yaml
replicaCount: 3

image:
  repository: nginx
  pullPolicy: IfNotPresent
  tag: "latest"
```

Использование `values.yaml` позволяет устанавливать один чарт с разными конфигурациями без изменения шаблонов.

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  hosts:
    - host: myapp.local
      paths:
        - path: /
          pathType: Prefix

resources:
  limits:
    cpu: 500m
    memory: 128Mi
  requests:
    cpu: 250m
    memory: 64Mi
```

### templates/deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}
  labels:
    app: {{ .Chart.Name }}
    version: {{ .Chart.Version }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ .Chart.Name }}
  template:
    metadata:
      labels:
        app: {{ .Chart.Name }}
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        imagePullPolicy: {{ .Values.image.pullPolicy }}
        ports:
        - name: http
          containerPort: {{ .Values.service.port }}
        resources:
          {{- toYaml .Values.resources | nindent 10 }}
```

## Использование Helm

### Установка чарта

```bash
# Из локальной директории
helm install my-release ./mychart

# Из репозитория
helm install my-release bitnami/nginx

# С переопределением значений
helm install my-release ./mychart --set replicaCount=5

# С custom values file
helm install my-release ./mychart -f values-prod.yaml
```

### Обновление

```bash
helm upgrade my-release ./mychart --set image.tag=v2.0.0
```

### Откат

```bash
# Посмотреть историю
helm history my-release

# Откатить к предыдущей версии
helm rollback my-release

# Откатить к конкретной версии
helm rollback my-release 2
```

### Удаление

```bash
helm uninstall my-release
```

## Встроенные функции шаблонизации

### Функции Go template

```yaml
# Доступ к значениям
{{ .Values.key }}
{{ .Values.nested.key }}

# Функции
{{ .Values.image | default "nginx:latest" }}
{{ .Values.name | upper }}
{{ .Values.replicas | toJson }}

# Логика
{{- if .Values.ingress.enabled }}
...
{{- end }}

{{- if eq .Values.environment "production" }}
...
{{- end }}

# Циклы
{{- range .Values.ingress.hosts }}
- host: {{ .host }}
{{- end }}
```

### Функции Sprig

```yaml
# Математика
{{ add 1 2 }}           # 3
{{ mul 2 3 }}           # 6
{{ div 10 2 }}          # 5

# Работа со строками
{{ "hello" | upper }}   # HELLO
{{ "HELLO" | lower }}   # hello
{{ "hello" | title }}   # Hello
{{ "foo" | quote }}     # "foo"

# Работа с датами
{{ now | date "2006-01-02" }}
```

## Хуки

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ .Release.Name }}-config
  annotations:
    "helm.sh/hook": pre-install,pre-upgrade
    "helm.sh/hook-delete-policy": before-hook-creation
data:
  key: value
```

## Репозитории

```bash
# Добавить репозиторий
helm repo add bitnami https://charts.bitnami.com/bitnami

# Обновить
helm repo update

# Поиск
helm search repo nginx
helm search hub wordpress

# Скачать чарт
helm pull bitnami/wordpress --untar
```

## Продвинутые техники

### Library Charts

```yaml
# Chart.yaml
apiVersion: v2
name: mylib
type: library
```

### dependent charts

```yaml
# Chart.yaml
dependencies:
  - name: postgresql
    version: "12.x.x"
    repository: "https://charts.bitnami.com/bitnami"
    condition: postgresql.enabled
```

### Тестирование

```bash
# Валидация чарта
helm lint ./mychart

# Проверка рендеринга
helm template my-release ./mychart

# Тесты (test-hook)
helm test my-release
```

## Практические примеры

### Многоenvironment

```bash
# values-dev.yaml
replicaCount: 1
resources:
  limits:
    cpu: 250m
    memory: 128Mi

# values-prod.yaml
replicaCount: 5
resources:
  limits:
    cpu: 2000m
    4Gi

# Установка
helm install myapp ./mychart -f values-dev.yaml
helm upgrade myapp ./mychart -f values-prod.yaml
```

## Заключение

Helm — незаменимый инструмент для работы с Kubernetes. Он превращает набор манифестов в переиспользуемые пакеты с версионированием, шаблонизацией и удобным управлением.
