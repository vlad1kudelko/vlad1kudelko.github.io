---
title: "Kubernetes: security, RBAC, PodSecurityPolicy"
description: "Обеспечьте Kubernetes: security с RBAC, PodSecurityPolicy. Защитите кластер от угроз и несанкционированного доступа."
pubDate: "2026-03-05"
---

# Kubernetes security: RBAC, PodSecurity

Безопасный Kubernetes-кластер строится на четырёх слоях: RBAC ограничивает доступ к API, Pod Security Standards запрещают привилегированные контейнеры, шифрование защищает Secrets в etcd, а runtime-мониторинг через Falco обнаруживает атаки после прорыва первых трёх линий.

По умолчанию Kubernetes достаточно открытый: поды читают секреты всего namespace, приложения работают от root, сервис-аккаунты имеют широкие права. В продакшене это создаёт существенные риски безопасности.

> **Key Takeaways**
> - RBAC: минимальные права -- Role в namespace, не ClusterRole; `kubectl auth can-i` для проверки
> - `automountServiceAccountToken: false` для подов, которые не обращаются к Kubernetes API
> - PodSecurityPolicy удалена в 1.25; замена -- Pod Security Admission с уровнями `baseline`/`restricted`
> - Kubernetes Secrets в base64 в etcd -- не шифрование; нужен Encryption at Rest или External Secrets Operator
> - Falco обнаруживает runtime-атаки: pod запускает `curl`, читает `/etc/shadow`, запускает shell

## RBAC: Role-Based Access Control

RBAC контролирует, кто и что может делать с ресурсами кластера. Три ключевых объекта:

- **Role** -- набор прав в рамках namespace
- **ClusterRole** -- набор прав на уровне кластера (все namespace или cluster-scoped ресурсы)
- **RoleBinding / ClusterRoleBinding** -- привязка роли к субъекту (пользователь, группа, ServiceAccount)

```yaml
# Роль для CI/CD: только деплой в namespace staging
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployer
  namespace: staging
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "update", "patch"]
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "create", "update"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ci-deployer
  namespace: staging
subjects:
  - kind: ServiceAccount
    name: ci-service-account
    namespace: staging
roleRef:
  kind: Role
  name: deployer
  apiGroup: rbac.authorization.k8s.io
```

Проверить права:

```bash
kubectl auth can-i update deployments \
  --namespace staging \
  --as system:serviceaccount:staging:ci-service-account
# yes

kubectl auth can-i delete pods \
  --namespace staging \
  --as system:serviceaccount:staging:ci-service-account
# no
```

Никогда не давайте CI/CD `cluster-admin`. Это нарушает принцип минимальных привилегий и означает, что скомпрометированный CI имеет полный доступ к кластеру.

### Роли для разных команд

```yaml
# Read-only для разработчиков: смотреть, не менять
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: developer-readonly
  namespace: production
rules:
  - apiGroups: ["", "apps", "batch"]
    resources: ["pods", "deployments", "jobs", "services", "configmaps"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/log"]
    verbs: ["get"]
  # НЕ включаем: secrets, exec
```

## ServiceAccount и IRSA

Каждый под использует ServiceAccount. По умолчанию токен автоматически монтируется в `/var/run/secrets/kubernetes.io/serviceaccount/token`. Для подов, которые не обращаются к Kubernetes API, это лишний вектор атаки:

```yaml
spec:
  serviceAccountName: my-app
  automountServiceAccountToken: false   # отключить для большинства приложений
```

В облаках (AWS EKS, GCP GKE) вместо хранения облачных ключей в Secrets используйте IRSA (IAM Roles for Service Accounts) или Workload Identity:

```yaml
# AWS IRSA: ServiceAccount привязан к IAM-роли
apiVersion: v1
kind: ServiceAccount
metadata:
  name: s3-reader
  namespace: production
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/s3-read-role
```

```yaml
# GCP Workload Identity
apiVersion: v1
kind: ServiceAccount
metadata:
  name: storage-reader
  namespace: production
  annotations:
    iam.gke.io/gcp-service-account: storage-reader@project.iam.gserviceaccount.com
```

Под с таким ServiceAccount получает временные облачные credentials через OIDC-токен -- без хранения ключей в кластере.

## Pod Security Standards

PodSecurityPolicy устарела и удалена в Kubernetes 1.25. Замена -- Pod Security Admission с тремя уровнями, применяемыми на уровне namespace:

- **privileged** -- без ограничений (для system namespace)
- **baseline** -- базовые защиты: нет privileged контейнеров, нет host network/PID
- **restricted** -- строгий: non-root, read-only filesystem, seccomp profile

```yaml
# Применяем restricted ко всем подам в production namespace
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/audit: restricted
```

При уровне `restricted` поды должны явно указывать securityContext:

```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    runAsGroup: 1000
    fsGroup: 2000
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: app
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]
```

Если сервис пишет временные файлы -- монтируйте tmpfs вместо разрешения записи в filesystem:

```yaml
      volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /app/cache
  volumes:
    - name: tmp
      emptyDir: {}
    - name: cache
      emptyDir:
        medium: Memory
        sizeLimit: 100Mi
```

## Secrets и шифрование

По умолчанию Kubernetes Secrets хранятся в etcd в base64 -- это кодирование, не шифрование. Кто имеет доступ к etcd, читает все секреты.

**Encryption at Rest** шифрует Secrets в etcd через kube-apiserver:

```yaml
# kube-apiserver --encryption-provider-config=/etc/kubernetes/encryption.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources: [secrets, configmaps]
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      - identity: {}   # fallback для незашифрованных данных
```

После включения шифрования нужно пересоздать все существующие Secrets:

```bash
kubectl get secrets --all-namespaces -o json | kubectl replace -f -
```

**External Secrets Operator** -- лучшая альтернатива: хранить секреты в Vault, AWS Secrets Manager или GCP Secret Manager, а в кластере иметь только ссылки:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
  namespace: production
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: db-credentials
    creationPolicy: Owner
  data:
    - secretKey: DB_PASSWORD
      remoteRef:
        key: production/db
        property: password
    - secretKey: DB_USERNAME
      remoteRef:
        key: production/db
        property: username
```

## Сканирование и runtime monitoring

```bash
# kube-bench: проверка на соответствие CIS Kubernetes Benchmark
kubectl apply -f https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job.yaml
kubectl logs -l app=kube-bench | grep FAIL

# Trivy Operator: непрерывное сканирование образов на CVE
helm install trivy-operator aquasecurity/trivy-operator \
  --namespace trivy-system \
  --create-namespace

# Посмотреть результаты сканирования
kubectl get vulnerabilityreports -n production
```

**Falco** обнаруживает runtime-атаки через системные вызовы:

```bash
helm install falco falcosecurity/falco \
  --namespace falco \
  --create-namespace \
  --set falco.grpc.enabled=true
```

Falco генерирует алерты при:
- Запуске shell в контейнере (`kubectl exec ... bash`)
- Чтении sensitive файлов (`/etc/shadow`, `/root/.ssh/id_rsa`)
- Сетевых соединениях из неожиданных контейнеров
- Повышении привилегий через `sudo`

Пример custom правила Falco:

```yaml
- rule: Unexpected outbound connection from api container
  desc: API container making unexpected outbound connection
  condition: >
    outbound and container.name = "api"
    and not fd.sip in (db_allowed_ips)
  output: "Unexpected outbound connection (container=%container.name dest=%fd.rip:%fd.rport)"
  priority: WARNING
```

## Аудит Kubernetes API

Включите audit log для отслеживания всех обращений к API:

```yaml
# kube-apiserver --audit-policy-file
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  - level: Metadata          # логировать метаданные (кто, что, когда)
    resources:
      - group: ""
        resources: ["secrets"]
  - level: Request
    verbs: ["create", "update", "patch", "delete"]
  - level: None              # не логировать healthcheck
    users: ["system:serviceaccount:kube-system:*"]
    verbs: ["get"]
    resources:
      - group: ""
        resources: ["endpoints", "services"]
```

## Итог

Безопасность Kubernetes -- это слои. RBAC с минимальными правами, `automountServiceAccountToken: false`, Pod Security Standards `restricted`, шифрование Secrets, регулярное сканирование образов и runtime-мониторинг через Falco. Ни один уровень не защищает от всего, но вместе они делают атаку значительно сложнее.

Следующий шаг -- [управление конфигурацией Kubernetes через Helm Charts](/posts/2026/03/06-helm-charts/).
