---
title: "Vault: секреты с Secrets engines и auth методами, Обзор"
description: "Внедрите Vault: секреты с Secrets engines, auth методами. Управляйте секретами безопасно и централизованно."
pubDate: "2026-03-14"
---

# Vault: Secrets engines, auth

HashiCorp Vault централизует управление секретами и генерирует временные учётные данные вместо статических паролей. Ключевое свойство: каждый запрос к `database/creds/app-role` создаёт уникального пользователя в PostgreSQL, который автоматически удаляется по истечении TTL.

HashiCorp Vault -- централизованное хранилище секретов с динамической генерацией учётных данных, шифрованием и детальным аудитом. В отличие от AWS Secrets Manager или Kubernetes Secrets, Vault не привязан к одному облаку и умеет генерировать временные учётные данные вместо хранения статических паролей.

> **Key Takeaways**
> - Database Engine генерирует временные учётные данные PostgreSQL с TTL -- никаких статических паролей в приложениях
> - Kubernetes Auth привязывает ServiceAccount к политике Vault -- поды получают токен без хранения секретов в кластере
> - Vault Agent Sidecar автоматически обновляет секреты в файловой системе пода при истечении TTL
> - KV v2 поддерживает версионирование секретов -- можно откатить к предыдущей версии
> - Каждый запрос логируется в audit log: кто, что, когда -- полная трассировка доступа к секретам

## Secrets Engines

Vault поддерживает несколько движков хранения секретов.

**KV v2** -- простое хранение с версионированием:

```bash
# Включить KV v2 по пути secret/
vault secrets enable -path=secret kv-v2

# Записать секрет
vault kv put secret/myapp/database \
  username=app_user \
  password=s3cr3t

# Прочитать
vault kv get secret/myapp/database

# Конкретная версия
vault kv get -version=2 secret/myapp/database

# История версий
vault kv metadata get secret/myapp/database

# Откатить к версии 1
vault kv rollback -version=1 secret/myapp/database
```

**Database Engine** -- динамические временные учётные данные:

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

Теперь каждый запрос к `database/creds/app-role` создаёт уникального пользователя в PostgreSQL, который автоматически удаляется по истечении TTL. Никаких статических паролей в приложениях.

```bash
# Получить временные учётные данные
vault read database/creds/app-role
# Key            Value
# lease_id       database/creds/app-role/AbCd1234
# username       v-token-app-AbCd
# password       A1B2-C3D4-E5F6
```

## Auth Methods

**Kubernetes Auth** -- поды в кластере аутентифицируются через ServiceAccount JWT токен:

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

**AppRole** -- для CI/CD и сервисов без Kubernetes:

```bash
vault auth enable approle

vault write auth/approle/role/ci-role \
  token_policies=ci-policy \
  token_ttl=20m \
  token_max_ttl=30m \
  secret_id_ttl=10m

# Получить RoleID и SecretID
ROLE_ID=$(vault read auth/approle/role/ci-role/role-id -field=role_id)
SECRET_ID=$(vault write -f auth/approle/role/ci-role/secret-id -field=secret_id)

# Аутентификация
vault write auth/approle/login role_id=$ROLE_ID secret_id=$SECRET_ID
```

## Использование в приложении

```python
import hvac

client = hvac.Client(url="https://vault.internal:8200")

# Аутентификация через Kubernetes ServiceAccount token
with open("/var/run/secrets/kubernetes.io/serviceaccount/token") as f:
    jwt = f.read()

client.auth.kubernetes.login(role="my-app", jwt=jwt)

# Чтение KV секрета
secret = client.secrets.kv.v2.read_secret_version(
    path="myapp/database",
    mount_point="secret"
)
db_password = secret["data"]["data"]["password"]

# Динамические учётные данные базы данных
db_creds = client.secrets.database.generate_credentials(name="app-role")
db_user = db_creds["data"]["username"]
db_pass = db_creds["data"]["password"]

# Аренда: обновить TTL до истечения
client.sys.renew_self_token(increment="1h")
```

## Vault Agent Sidecar

В Kubernetes Vault Agent работает как sidecar, автоматически обновляя секреты в файловой системе пода:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "my-app"
        vault.hashicorp.com/agent-inject-secret-database: "secret/data/myapp/database"
        vault.hashicorp.com/agent-inject-template-database: |
          {{- with secret "secret/data/myapp/database" -}}
          DB_USERNAME={{ .Data.data.username }}
          DB_PASSWORD={{ .Data.data.password }}
          {{- end }}
```

Vault Agent Injector монтирует секрет в `/vault/secrets/database`. При обновлении или истечении TTL файл автоматически перезаписывается.

Для приложения секрет доступен как файл:

```python
from pathlib import Path

def get_db_credentials():
    config = {}
    for line in Path("/vault/secrets/database").read_text().splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            config[key] = value
    return config["DB_USERNAME"], config["DB_PASSWORD"]
```

## Audit и мониторинг

```bash
# Включить аудит-лог в файл
vault audit enable file file_path=/var/log/vault/audit.log

# Каждый запрос логируется:
# {"type":"request","time":"2026-03-14T10:00:00Z",
#  "auth":{"client_token":"...","accessor":"..."},
#  "request":{"id":"...","path":"database/creds/app-role","operation":"read"}}

# Проверить аренды
vault list sys/leases/lookup/database/creds/app-role

# Принудительно отозвать аренду при инциденте
vault lease revoke -prefix database/creds/app-role
```

Мониторинг Vault через Prometheus:

```bash
# Включить telemetry в Vault config
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname = true
}
```

Ключевые метрики: `vault_core_active`, `vault_token_count`, `vault_token_ttl`, `vault_database_createuser_time_count`.

## Итог

Vault решает три ключевые проблемы безопасности: статические пароли в конфигах (Database Engine с временными учётными данными), ручная ротация секретов (TTL + автоматическое истечение), отсутствие аудита (каждый запрос логируется). Kubernetes Auth + Vault Agent Sidecar дают удобный паттерн для подов без хранения секретов в кластере.

Следующий шаг -- [Consul для service discovery в распределённых системах](/posts/2026/03/15-consul/).
