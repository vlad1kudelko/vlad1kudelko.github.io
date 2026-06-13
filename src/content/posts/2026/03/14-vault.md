---
title: "Vault: секреты с Secrets engines и auth методами — Обзор"
description: "Внедрите Vault: секреты с Secrets engines, auth методами. Управляйте секретами безопасно и централизованно."
pubDate: "2026-03-14"
---

# Vault: Secrets engines, auth

HashiCorp Vault — централизованное хранилище секретов с динамической генерацией учётных данных, шифрованием и детальным аудитом. В отличие от AWS Secrets Manager или Kubernetes Secrets, Vault не привязан к одному облаку и умеет генерировать временные учётные данные вместо хранения статических паролей.

## Secrets Engines

Vault поддерживает несколько движков хранения секретов:

**KV (Key-Value) v2** — простое хранение с версионированием:

```bash
# Включить KV v2 по пути secret/
vault secrets enable -path=secret kv-v2

# Записать секрет
vault kv put secret/myapp/database \
  username=app_user \
  password=s3cr3t

# Прочитать
vault kv get secret/myapp/database

# История версий
vault kv metadata get secret/myapp/database
vault kv get -version=2 secret/myapp/database
```

**Database Engine** — динамические учётные данные:

```bash
vault secrets enable database

vault write database/config/postgresql \
  plugin_name=postgresql-database-plugin \
  connection_url="postgresql://{{username}}:{{password}}@postgres:5432/mydb" \
  allowed_roles="app-role" \
  username="vault_admin" \
  password="vault_password"

vault write database/roles/app-role \
  db_name=postgresql \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"
```

Теперь каждый запрос к `database/creds/app-role` создаёт уникального пользователя в PostgreSQL, который автоматически удаляется по истечении TTL.

## Auth Methods

Vault поддерживает разные способы аутентификации:

**Kubernetes Auth** — для подов в кластере:

```bash
vault auth enable kubernetes

vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443" \
  kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

# Политика доступа
vault policy write my-app - <<EOF
path "secret/data/myapp/*" {
  capabilities = ["read"]
}
path "database/creds/app-role" {
  capabilities = ["read"]
}
EOF

# Привязать роль к ServiceAccount
vault write auth/kubernetes/role/my-app \
  bound_service_account_names=my-app \
  bound_service_account_namespaces=production \
  policies=my-app \
  ttl=1h
```

**AppRole** — для CI/CD и сервисов без Kubernetes:

```bash
vault auth enable approle

vault write auth/approle/role/ci-role \
  token_policies=ci-policy \
  token_ttl=20m \
  token_max_ttl=30m

# Получить RoleID и SecretID
vault read auth/approle/role/ci-role/role-id
vault write -f auth/approle/role/ci-role/secret-id
```

## Использование в приложении

```python
import hvac

client = hvac.Client(url="https://vault.internal:8200")

# Аутентификация через Kubernetes ServiceAccount token
with open("/var/run/secrets/kubernetes.io/serviceaccount/token") as f:
    jwt = f.read()

client.auth.kubernetes.login(role="my-app", jwt=jwt)

# Чтение секрета
secret = client.secrets.kv.v2.read_secret_version(
    path="myapp/database",
    mount_point="secret"
)
db_password = secret["data"]["data"]["password"]

# Динамические учётные данные БД
db_creds = client.secrets.database.generate_credentials(name="app-role")
db_user = db_creds["data"]["username"]
db_pass = db_creds["data"]["password"]
```

## Vault Agent Sidecar

В Kubernetes Vault Agent работает как sidecar, автоматически обновляя секреты в файловой системе пода:

```yaml
annotations:
  vault.hashicorp.com/agent-inject: "true"
  vault.hashicorp.com/role: "my-app"
  vault.hashicorp.com/agent-inject-secret-database: "secret/data/myapp/database"
  vault.hashicorp.com/agent-inject-template-database: |
    {{- with secret "secret/data/myapp/database" -}}
    DATABASE_URL=postgresql://{{ .Data.data.username }}:{{ .Data.data.password }}@postgres:5432/mydb
    {{- end }}
```

Vault Agent Injector монтирует секрет в `/vault/secrets/database`. При обновлении секрета файл автоматически перезаписывается.

## Audit и мониторинг

```bash
# Включить аудит-лог
vault audit enable file file_path=/var/log/vault/audit.log

# Каждый запрос логируется: кто, что, когда
# {"type":"request","time":"2026-03-14T10:00:00Z","auth":{"client_token":"...","accessor":"..."},"request":{"id":"...","path":"secret/data/myapp/database","operation":"read"}}
```
