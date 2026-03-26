---
title: "HashiCorp Vault: управление secrets"
description: "Vault: dynamic secrets, encryption, secrets rotation"
heroImage: "../../../../assets/imgs/2026/03/12-vault-secrets.webp"
pubDate: "2026-03-12"
---

Управление secrets с Vault.

```bash
# KV secrets
vault kv put secret/myapp/config \
  db_password=supersecret \
  api_key=key123

# Dynamic secrets
vault read database/creds/my-role

# Policy
path "secret/data/myapp/*" {
  capabilities = ["read"]
}
```