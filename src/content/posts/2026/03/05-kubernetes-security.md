---
title: "Kubernetes: security — RBAC, PodSecurityPolicy"
description: "Обеспечьте Kubernetes: security с RBAC, PodSecurityPolicy. Защитите кластер от угроз и несанкционированного доступа."
pubDate: "2026-03-05"
---

# Kubernetes security: RBAC, PodSecurity

По умолчанию Kubernetes достаточно открытый: поды могут читать секреты всего namespace, приложения работают от root, сервис-аккаунт имеет широкие права. В продакшене это превращается в проблему безопасности.

## RBAC: Role-Based Access Control

RBAC контролирует, кто что может делать с ресурсами кластера.

**Три объекта**: Role (права в namespace), ClusterRole (права на уровне кластера), RoleBinding/ClusterRoleBinding (привязка роли к субъекту).

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

Проверить права можно через:
```bash
kubectl auth can-i update deployments --namespace staging --as system:serviceaccount:staging:ci-service-account
```

## ServiceAccount и IRSA

Каждый под использует ServiceAccount. По умолчанию — `default`, у которого в новых кластерах минимальные права. Явно отключайте автомонтирование токена там, где API не нужен:

```yaml
spec:
  serviceAccountName: my-app
  automountServiceAccountToken: false  # если pod не обращается к k8s API
```

В облаках (AWS EKS, GCP GKE) привязывайте ServiceAccount к IAM-роли (IRSA/Workload Identity) вместо хранения облачных ключей в Secrets:

```yaml
# AWS IRSA
apiVersion: v1
kind: ServiceAccount
metadata:
  name: s3-reader
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/s3-read-role
```

## Pod Security Standards

PodSecurityPolicy устарела и удалена в Kubernetes 1.25. Замена — Pod Security Admission с тремя уровнями:

- `privileged` — без ограничений
- `baseline` — базовые защиты: нет privileged контейнеров, нет host network
- `restricted` — строгий: non-root, read-only filesystem, seccomp

```yaml
# Применяем restricted ко всем подам в namespace
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/warn: restricted
```

При `restricted` поды должны явно указывать контекст безопасности:

```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
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

## Secrets и шифрование

По умолчанию Secrets хранятся в etcd в base64 — фактически открытым текстом. Включайте Encryption at Rest:

```yaml
# kube-apiserver --encryption-provider-config
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources: [secrets]
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-32-byte-key>
      - identity: {}
```

Для внешних секретов — External Secrets Operator с Vault, AWS Secrets Manager, GCP Secret Manager:

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: db-credentials
  data:
    - secretKey: DB_PASSWORD
      remoteRef:
        key: production/db
        property: password
```

## Сканирование и аудит

```bash
# kube-bench — проверка CIS Kubernetes Benchmark
kubectl apply -f https://raw.githubusercontent.com/aquasecurity/kube-bench/main/job.yaml
kubectl logs -l app=kube-bench

# Trivy operator — непрерывное сканирование образов
kubectl apply -f https://raw.githubusercontent.com/aquasecurity/trivy-operator/main/deploy/static/trivy-operator.yaml

# Falco — runtime detection (аномальное поведение подов)
helm install falco falcosecurity/falco --set falco.grpc.enabled=true
```

Falco перехватывает системные вызовы и алертит при аномальном поведении: pod запускает `curl`, читает `/etc/shadow`, открывает shell.
