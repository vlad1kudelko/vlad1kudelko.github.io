---
title: "Helm: создание чартов, Templates, hooks, tests"
description: "Создавайте Helm: создание чартов, Templates, hooks, tests. Пакуйте приложения для Kubernetes в продакшене."
pubDate: "2026-03-06"
---

# Helm: создание чартов

Helm -- пакетный менеджер для Kubernetes. Один `helm upgrade my-app ./chart --values prod.yaml` заменяет ручное применение десяти манифестов, управляет версиями релизов и откатывает при ошибке с `--atomic`. Это стандартный инструмент для деплоя production-приложений в кластер.

Без Helm деплой приложения из десяти манифестов превращается в ручную работу с `kubectl apply -f` по файлам. Helm собирает всё в один пакет с шаблонизацией, управляет зависимостями и версиями релизов.

> **Key Takeaways**
> - `helm upgrade --atomic` гарантирует откат при неудачном деплое -- обязателен в CI/CD
> - `pre-upgrade` хук для миграций базы данных запускается до обновления приложения и блокирует деплой при ошибке
> - `helm history` и `helm rollback` позволяют откатить релиз к любой предыдущей версии за секунды
> - `helm lint` и `helm template` обнаруживают ошибки шаблонов без деплоя в кластер
> - `values.yaml` -- значения по умолчанию; `values.prod.yaml` переопределяет для продакшена

---

Команда Ивана деплоила новую версию API в production. Деплой пошёл, но миграции базы данных упали на середине: одна из таблиц заблокировалась долгим запросом. Старая версия была уже остановлена, новая не запустилась -- downtime на 15 минут в прайм-тайм. После инцидента переписали пайплайн: миграции как `pre-upgrade` хук в Helm, `--atomic` флаг для автоотката. При следующей проблеме Helm автоматически откатил весь релиз, приложение продолжило работать на предыдущей версии.

## Структура чарта

```
my-app/
├── Chart.yaml           # метаданные: имя, версия, зависимости
├── values.yaml          # значения по умолчанию
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── _helpers.tpl     # переиспользуемые шаблоны
│   ├── NOTES.txt        # текст после установки
│   └── tests/
│       └── test-connection.yaml
└── charts/              # зависимые чарты
```

```yaml
# Chart.yaml
apiVersion: v2
name: my-app
description: My application Helm chart
type: application
version: 1.2.0        # версия чарта (семантическое версионирование)
appVersion: "2.5.1"   # версия приложения (информативно)
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
  tag: ""   # берётся appVersion из Chart.yaml
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 8000

ingress:
  enabled: false
  host: ""
  annotations: {}

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
# templates/_helpers.tpl -- переиспользуемые фрагменты
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

Hooks запускают Jobs в определённые моменты жизненного цикла релиза. Основное применение -- миграции базы данных перед обновлением:

```yaml
# templates/migrations-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: "{{ include "my-app.fullname" . }}-migrations"
  annotations:
    "helm.sh/hook": pre-upgrade,pre-install
    "helm.sh/hook-weight": "-5"                      # порядок при нескольких хуках
    "helm.sh/hook-delete-policy": before-hook-creation,hook-succeeded
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: migrations
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          command: ["python", "manage.py", "migrate", "--noinput"]
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: {{ include "my-app.fullname" . }}-postgresql
                  key: database-url
```

Если `pre-upgrade` хук завершится с ошибкой, Helm отменит деплой. С `--atomic` будет выполнен автоматический откат к предыдущей версии.

Типы хуков: `pre-install`, `post-install`, `pre-upgrade`, `post-upgrade`, `pre-delete`, `post-delete`, `pre-rollback`, `post-rollback`.

## Тесты

Helm поддерживает встроенные тесты -- поды, которые запускаются после деплоя для проверки работоспособности:

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
    - name: test-http
      image: curlimages/curl
      command:
        - curl
        - "-sf"
        - "http://{{ include "my-app.fullname" . }}:{{ .Values.service.port }}/health"
    - name: test-db
      image: postgres:16-alpine
      command:
        - pg_isready
        - "-h"
        - "{{ include "my-app.fullname" . }}-postgresql"
```

```bash
helm test my-release -n production
```

---

Игорь отвечал за деплой нового микросервиса. После каждого деплоя он вручную запускал curl и проверял логи. Это занимало 10 минут после каждого деплоя. Он перенёс проверки в `helm test`: HTTP healthcheck, проверка базы, тест очереди. Теперь CI/CD автоматически запускает `helm upgrade ... && helm test` после каждого деплоя. Если что-то не так -- Helm тест падает, команда получает алерт. Игорь освободил 30-40 минут в день на другие задачи.

## Работа с чартами

```bash
# Просмотр финальных манифестов без деплоя
helm template my-release ./my-app --values values.prod.yaml

# Проверка синтаксиса
helm lint ./my-app --values values.prod.yaml

# Установка
helm install my-release ./my-app \
  --namespace production \
  --create-namespace \
  --values values.prod.yaml \
  --set image.tag=2.5.1

# Обновление с автооткатом при ошибке
helm upgrade my-release ./my-app \
  --namespace production \
  --values values.prod.yaml \
  --atomic \
  --timeout 10m

# История релизов
helm history my-release -n production
# REVISION  UPDATED      STATUS    CHART           APP VERSION
# 1         Mar 06 10:00 superseded my-app-1.1.0  2.4.0
# 2         Mar 06 14:00 deployed   my-app-1.2.0  2.5.1

# Откат к предыдущей версии
helm rollback my-release 1 -n production

# Удаление
helm uninstall my-release -n production
```

## Переменные окружения и секреты

Не храните секреты в `values.yaml`. Передавайте их через `--set` из CI/CD:

```bash
helm upgrade my-release ./my-app \
  --set database.password=$DB_PASSWORD \
  --set api.secretKey=$SECRET_KEY
```

Или используйте Helm Secrets плагин с SOPS для шифрования `values.secrets.yaml`:

```bash
helm plugin install https://github.com/jkroepke/helm-secrets
helm upgrade my-release ./my-app -f values.prod.yaml -f secrets://values.secrets.yaml
```

## Публикация чарта

```bash
# Создать пакет
helm package ./my-app --version 1.2.0

# Запушить в OCI-реестр (Docker Hub, GHCR, ECR)
helm push my-app-1.2.0.tgz oci://registry.example.com/charts

# Установить из реестра
helm install my-release oci://registry.example.com/charts/my-app \
  --version 1.2.0
```

## Итог

Helm упрощает управление сложными Kubernetes-приложениями: одна команда для установки и обновления, встроенный откат, хуки для миграций и тесты для проверки. `--atomic` в CI/CD -- не опция, а необходимость для safe deployment.

Следующий шаг -- [Kustomize как альтернатива Helm для управления манифестами](/posts/2026/03/07-kustomize).
