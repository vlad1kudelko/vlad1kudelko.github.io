---
title: "Terraform: state management, Remote state, locking"
description: "Управляйте Terraform: state management с Remote state, locking. Безопасное хранение состояния инфраструктуры."
pubDate: "2026-03-10"
---

# Terraform state: Remote state, locking

Terraform state-файл -- единственное место, где хранится связь между конфигурацией и реальными облачными ресурсами. Потеря state означает, что Terraform не знает, что уже создано, и попытается создать всё заново. Хранение `terraform.tfstate` в Git -- главная ошибка новых команд: файл содержит пароли и ключи, а конфликты при командной работе неизбежны.

Правильный подход -- remote backend с locking: S3 + DynamoDB для AWS, GCS для GCP, Terraform Cloud для облачного решения. Locking предотвращает одновременное применение изменений несколькими разработчиками.

> **Key Takeaways**
> - `terraform.tfstate` в Git -- опасная ошибка: файл содержит пароли в plaintext и вызывает конфликты при командной работе
> - S3 + DynamoDB обеспечивают remote backend с locking; GCS поддерживает locking нативно
> - `terraform state mv` переименовывает ресурсы в state без destroy/create -- обязателен при рефакторинге
> - `terraform_remote_state` data source позволяет читать outputs одного проекта в другом
> - Включайте `encrypt = true` в S3 backend и ограничивайте доступ через IAM -- state содержит секреты

## Remote Backend

S3 + DynamoDB -- стандарт для AWS:

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "production/app/terraform.tfstate"
    region         = "eu-central-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"   # для locking
  }
}
```

```bash
# Создать DynamoDB таблицу для locking (один раз)
aws dynamodb create-table \
  --table-name terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

Для GCP:

```hcl
terraform {
  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "production/app"
  }
}
```

GCS поддерживает locking нативно через object versioning -- DynamoDB не нужна.

Для мультикомандной работы через Terraform Cloud:

```hcl
terraform {
  cloud {
    organization = "my-org"
    workspaces {
      name = "production-app"
    }
  }
}
```

## Workspace

Workspaces позволяют хранить несколько state-файлов в одном backend:

```bash
# Создать workspace для каждого окружения
terraform workspace new staging
terraform workspace new production

# Переключиться
terraform workspace select staging

# Список
terraform workspace list
# * default
#   staging
#   production
```

В конфигурации:

```hcl
locals {
  env = terraform.workspace

  instance_type = {
    staging    = "t3.small"
    production = "m5.large"
  }

  replicas = {
    staging    = 1
    production = 3
  }
}

resource "aws_instance" "app" {
  count         = local.replicas[local.env]
  instance_type = local.instance_type[local.env]

  tags = {
    Environment = local.env
  }
}
```

Ограничение workspaces: все окружения используют один набор провайдеров и модулей. Для кардинально разных конфигураций лучше отдельные директории с разными backends.

## State operations

```bash
# Список ресурсов в state
terraform state list

# Детали конкретного ресурса
terraform state show aws_s3_bucket.main

# Импорт существующего ресурса в state (без создания)
terraform import aws_s3_bucket.main my-existing-bucket-name

# Переименовать ресурс в state без пересоздания (рефакторинг)
terraform state mv \
  aws_s3_bucket.old_name \
  aws_s3_bucket.new_name

# Переместить в модуль
terraform state mv \
  aws_s3_bucket.main \
  module.storage.aws_s3_bucket.main

# Удалить из state без удаления ресурса в облаке
terraform state rm aws_s3_bucket.legacy
```

`terraform state mv` незаменим при рефакторинге: переименовать ресурс или перенести в модуль без `destroy/create`. Без него Terraform удалит и пересоздаст ресурс.

```bash
# Обновить state согласно реальному состоянию облака
terraform refresh

# Планирование без изменений (dry-run)
terraform plan -out=plan.tfplan

# Применить конкретный plan файл
terraform apply plan.tfplan
```

## Remote State как Data Source

Один Terraform-проект может читать outputs другого:

```hcl
# networking/outputs.tf
output "vpc_id" {
  value = aws_vpc.main.id
}

output "private_subnet_ids" {
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
  subnet_id = data.terraform_remote_state.networking.outputs.private_subnet_ids[0]
}

resource "aws_security_group" "app" {
  vpc_id = data.terraform_remote_state.networking.outputs.vpc_id
}
```

Это позволяет разбить инфраструктуру на независимые проекты: networking, databases, applications -- каждый с отдельным state. Команды работают параллельно без конфликтов.

## Шифрование state

State содержит пароли, ключи API и другие секреты в plaintext. Шифрование обязательно:

```hcl
# S3 с KMS-шифрованием
resource "aws_s3_bucket_server_side_encryption_configuration" "state" {
  bucket = aws_s3_bucket.state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.state.arn
    }
  }
}

# Запретить публичный доступ
resource "aws_s3_bucket_public_access_block" "state" {
  bucket = aws_s3_bucket.state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Versioning для истории изменений state
resource "aws_s3_bucket_versioning" "state" {
  bucket = aws_s3_bucket.state.id
  versioning_configuration {
    status = "Enabled"
  }
}
```

Минимальный IAM-policy для CI/CD:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::my-terraform-state/production/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::my-terraform-state"
    },
    {
      "Effect": "Allow",
      "Action": ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"],
      "Resource": "arn:aws:dynamodb:*:*:table/terraform-locks"
    }
  ]
}
```

## Итог

Remote state с locking -- необходимость для командной работы с Terraform. S3 + DynamoDB для AWS, GCS для GCP. `terraform state mv` делает рефакторинг безопасным. `terraform_remote_state` позволяет разбить монолитный проект на независимые части без потери связности.

Следующий шаг -- [Terraform модули: создание, версионирование, Terraform Registry](/posts/2026/03/11-terraform-modules).
