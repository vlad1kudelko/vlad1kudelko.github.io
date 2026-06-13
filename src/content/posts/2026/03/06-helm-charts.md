---
title: "Helm: создание чартов — Templates, hooks, tests"
description: "Создавайте Helm: создание чартов, Templates, hooks, tests. Пакуйте приложения для Kubernetes в продакшене."
pubDate: "2026-03-06"
---

# Helm: создание чартов

Helm — пакетный менеджер для Kubernetes. Без него деплой приложения из десяти манифестов превращается в ручную работу с `kubectl apply -f` по файлам. Helm собирает всё в один пакет с шаблонизацией и управляет версиями релизов.

## Структура чарта

```
my-app/
├── Chart.yaml          # метаданные чарта
├── values.yaml         # значения по умолчанию
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── _helpers.tpl    # переиспользуемые шаблоны
│   ├── NOTES.txt       # текст после установки
│   └── tests/
│       └── test-connection.yaml
└── charts/             # зависимые чарты
```

```yaml
# Chart.yaml
apiVersion: v2
name: my-app
description: My application Helm chart
type: application
version: 1.2.0       # версия чарта
appVersion: "2.5.1"  # версия приложения
dependencies:
  - name: postgresql
    version: "13.x.x"
    repository: https://charts.bitnami.com/bitnami
    condition: postgresql.enabled
```

## Шаблоны и values

```yaml
# values.yaml
replicaCount: 2
image:
  repository: my-registry/my-app
  tag: ""  # по умолчанию берётся appVersion
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 8000

ingress:
  enabled: false
  host: ""

resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    cpu: 500m
    memory: 512Mi

postgresql:
  enabled: true
  auth:
    database: myapp
```

```yaml
# templates/_helpers.tpl
{{- define "my-app.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" }}
{{- end }}

{{- define "my-app.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
{{- end }}
```

```yaml
# templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "my-app.fullname" . }}
  labels:
    {{- include "my-app.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app.kubernetes.io/name: {{ .Chart.Name }}
      app.kubernetes.io/instance: {{ .Release.Name }}
  template:
    metadata:
      labels:
        {{- include "my-app.labels" . | nindent 8 }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: {{ .Values.service.port }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          {{- if .Values.postgresql.enabled }}
          env:
            - name: DATABASE_URL
              value: "postgresql://postgres:$(POSTGRES_PASSWORD)@{{ include "my-app.fullname" . }}-postgresql:5432/{{ .Values.postgresql.auth.database }}"
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: {{ include "my-app.fullname" . }}-postgresql
                  key: postgres-password
          {{- end }}
```

## Hooks

Hooks запускают задачи в определённые моменты жизненного цикла релиза:

```yaml
# templates/migrations-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: "{{ include "my-app.fullname" . }}-migrations"
  annotations:
    "helm.sh/hook": pre-upgrade,pre-install
    "helm.sh/hook-weight": "-5"   # порядок выполнения
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrations
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          command: ["python", "manage.py", "migrate"]
```

Типы хуков: `pre-install`, `post-install`, `pre-upgrade`, `post-upgrade`, `pre-delete`, `post-delete`.

## Тесты

```yaml
# templates/tests/test-connection.yaml
apiVersion: v1
kind: Pod
metadata:
  name: "{{ include "my-app.fullname" . }}-test"
  annotations:
    "helm.sh/hook": test
spec:
  restartPolicy: Never
  containers:
    - name: test
      image: curlimages/curl
      command: ["curl", "-sf", "http://{{ include "my-app.fullname" . }}:{{ .Values.service.port }}/health"]
```

```bash
helm test my-release
```

## Работа с чартами

```bash
# Установка
helm install my-release ./my-app \
  --namespace production \
  --create-namespace \
  --values values.prod.yaml \
  --set image.tag=2.5.1

# Обновление
helm upgrade my-release ./my-app \
  --namespace production \
  --values values.prod.yaml \
  --atomic          # откат при ошибке
  --timeout 5m

# История релизов
helm history my-release -n production

# Откат
helm rollback my-release 2 -n production

# Lint
helm lint ./my-app --values values.prod.yaml
```

`--atomic` гарантирует откат при неудачном деплое — незаменимо в CI.
