---
title: "Terraform: state management — Remote state, locking"
description: "Управляйте Terraform: state management с Remote state, locking. Безопасное хранение состояния инфраструктуры."
pubDate: "2026-03-10"
---

# Terraform state: Remote state, locking

State-файл Terraform — это карта между конфигурацией и реальными ресурсами в облаке. Потеря state означает, что Terraform не знает, что уже создано, и попытается создать всё заново. Хранить `terraform.tfstate` в Git — распространённая ошибка: файл содержит секреты в открытом виде, а при работе в команде конфликты неизбежны.

## Remote Backend

Стандартное решение — хранить state удалённо с блокировкой:

```hcl
# S3 + DynamoDB (AWS)
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "production/app/terraform.tfstate"
    region         = "eu-central-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"  # для locking
  }
}
```

```bash
# Создать DynamoDB таблицу для locking
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

```hcl
# GCS (GCP)
terraform {
  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "production/app"
  }
}
```

GCS поддерживает locking нативно через object versioning.

## Workspace

Workspaces позволяют хранить несколько state-файлов в одном backend — удобно для staging/production:

```bash
# Создать workspace
terraform workspace new staging
terraform workspace new production

# Переключиться
terraform workspace select staging

# Список
terraform workspace list
```

В конфигурации:

```hcl
locals {
  env = terraform.workspace

  instance_type = {
    staging    = "t3.small"
    production = "m5.large"
  }
}

resource "aws_instance" "app" {
  instance_type = local.instance_type[local.env]
}
```

Но workspaces имеют ограничение: все окружения используют один набор провайдеров и модулей. Для кардинально разных конфигураций лучше отдельные директории.

## State operations

```bash
# Импорт существующего ресурса в state
terraform import aws_s3_bucket.main my-existing-bucket

# Просмотр state
terraform state list
terraform state show aws_s3_bucket.main

# Переименовать ресурс в state без пересоздания
terraform state mv aws_s3_bucket.old_name aws_s3_bucket.new_name

# Удалить из state без удаления ресурса
terraform state rm aws_s3_bucket.main

# Обновить state согласно реальному состоянию (без изменений)
terraform refresh
```

`terraform state mv` незаменим при рефакторинге конфигурации — позволяет переименовывать ресурсы или перемещать их в модули без destroy/create.

## Remote State как Data Source

Один Terraform-проект может читать outputs другого через `terraform_remote_state`:

```hcl
# networking/outputs.tf
output "vpc_id" {
  value = aws_vpc.main.id
}
output "subnet_ids" {
  value = aws_subnet.private[*].id
}
```

```hcl
# app/main.tf
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "production/networking/terraform.tfstate"
    region = "eu-central-1"
  }
}

resource "aws_instance" "app" {
  subnet_id = data.terraform_remote_state.networking.outputs.subnet_ids[0]
  vpc_security_group_ids = [aws_security_group.app.id]
}
```

## Шифрование state

State содержит пароли, ключи API и другие секреты в plain text (base64 для некоторых провайдеров). Обязательно включайте шифрование в backend и ограничивайте доступ через IAM:

```hcl
# S3 с принудительным шифрованием
resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

# Запретить публичный доступ
resource "aws_s3_bucket_public_access_block" "state" {
  bucket                  = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```
