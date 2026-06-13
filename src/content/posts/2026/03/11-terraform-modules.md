---
title: "Terraform: модули, Создание, версионирование"
description: "Создавайте Terraform: модули с созданием, версионированием. Переиспользуйте инфраструктурный код в проектах."
pubDate: "2026-03-11"
---

# Terraform модули: создание, версионирование

Terraform модуль -- это набор ресурсов с входными переменными и outputs, которые можно переиспользовать. Один модуль `eks-cluster` с правильными параметрами заменяет 200 строк копипаста между staging и production.

Без модулей Terraform-конфигурация растёт в один большой файл. Скопировать `aws_eks_cluster` с 50 параметрами в staging и production означает поддерживать два места с одинаковым кодом. Модули решают это: инкапсулируют набор ресурсов с входными переменными и выходными значениями.

> **Key Takeaways**
> - Модуль: три файла -- `variables.tf` (входные параметры), `main.tf` (ресурсы), `outputs.tf` (выходные значения)
> - `?ref=v2.1.0` в Git source фиксирует версию; без него `terraform init` всегда берёт HEAD
> - `~> 4.0` в Terraform Registry -- pessimistic constraint: принимает `4.x`, не принимает `5.0`
> - Terragrunt устраняет дублирование backend/provider конфигурации между окружениями
> - Разделяйте state по слоям: networking → databases → applications; teams работают независимо

## Структура модуля

```
modules/
└── eks-cluster/
    ├── main.tf         # ресурсы
    ├── variables.tf    # входные параметры
    ├── outputs.tf      # выходные значения
    └── versions.tf     # требования к версиям провайдеров
```

```hcl
# modules/eks-cluster/variables.tf
variable "cluster_name" {
  description = "Имя EKS кластера"
  type        = string
}

variable "kubernetes_version" {
  description = "Версия Kubernetes"
  type        = string
  default     = "1.29"
}

variable "node_groups" {
  description = "Конфигурация node groups"
  type = map(object({
    instance_type = string
    min_size      = number
    max_size      = number
    desired_size  = number
  }))
  default = {
    default = {
      instance_type = "m5.large"
      min_size      = 1
      max_size      = 5
      desired_size  = 2
    }
  }
}

variable "tags" {
  type    = map(string)
  default = {}
}
```

```hcl
# modules/eks-cluster/outputs.tf
output "cluster_endpoint" {
  description = "Endpoint для kubectl"
  value       = aws_eks_cluster.this.endpoint
}

output "cluster_name" {
  value = aws_eks_cluster.this.name
}

output "kubeconfig_certificate_authority_data" {
  value     = aws_eks_cluster.this.certificate_authority[0].data
  sensitive = true
}

output "oidc_issuer_url" {
  description = "OIDC issuer для IRSA"
  value       = aws_eks_cluster.this.identity[0].oidc[0].issuer
}
```

```hcl
# modules/eks-cluster/versions.tf
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
```

## Вызов модуля

```hcl
# production/main.tf
module "eks" {
  source = "../../modules/eks-cluster"
  # Или из Terraform Registry:
  # source  = "terraform-aws-modules/eks/aws"
  # version = "~> 20.0"

  cluster_name       = "prod-cluster"
  kubernetes_version = "1.29"

  node_groups = {
    general = {
      instance_type = "m5.xlarge"
      min_size      = 2
      max_size      = 10
      desired_size  = 3
    }
    spot = {
      instance_type = "m5.large"
      min_size      = 0
      max_size      = 20
      desired_size  = 5
    }
  }

  tags = {
    Environment = "production"
    Team        = "platform"
    CostCenter  = "infra"
  }
}

# Использование outputs модуля
output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

# Передача в другой модуль
module "monitoring" {
  source      = "../../modules/monitoring"
  cluster_arn = module.eks.cluster_endpoint
}
```

## Версионирование через Git

```hcl
# Из конкретного тега Git-репозитория
module "vpc" {
  source = "git::https://github.com/my-org/terraform-modules.git//modules/vpc?ref=v2.1.0"

  cidr_block  = "10.0.0.0/16"
  environment = "production"
}

# Из конкретного commit (для максимального pinning)
module "eks" {
  source = "git::https://github.com/my-org/terraform-modules.git//modules/eks-cluster?ref=abc1234"
}
```

Двойной слэш `//` разделяет URL репозитория и путь к модулю внутри него. Тег `?ref=v2.1.0` фиксирует версию. Без него `terraform init` всегда берёт HEAD.

## Terraform Registry

Публичные модули из Terraform Registry не требуют указания URL:

```hcl
module "s3_bucket" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "~> 4.0"

  bucket = "my-application-bucket"
  acl    = "private"

  versioning = {
    enabled = true
  }

  server_side_encryption_configuration = {
    rule = {
      apply_server_side_encryption_by_default = {
        sse_algorithm = "aws:kms"
      }
    }
  }
}
```

`~> 4.0` -- pessimistic constraint: принимает `4.x`, не принимает `5.0`. Фиксируйте версии в продакшене.

## Организация больших проектов

```
infra/
├── modules/
│   ├── networking/
│   ├── eks-cluster/
│   ├── rds/
│   └── monitoring/
├── environments/
│   ├── staging/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── backend.tf
│   └── production/
│       ├── main.tf
│       ├── variables.tf
│       └── backend.tf
└── global/
    ├── iam/
    └── dns/
```

Каждое окружение -- отдельный Terraform root module со своим backend. Это изолирует state: изменение production не затрагивает staging.

## Terragrunt для DRY

Terragrunt устраняет дублирование backend и provider конфигурации:

```hcl
# terragrunt.hcl (корень проекта)
remote_state {
  backend = "s3"
  config = {
    bucket         = "terraform-state-${local.account_id}"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = "eu-central-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}

generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "aws" {
  region = "eu-central-1"
}
EOF
}
```

```hcl
# environments/production/eks/terragrunt.hcl
include "root" {
  path = find_in_parent_folders()
}

terraform {
  source = "../../../modules/eks-cluster"
}

inputs = {
  cluster_name = "prod-cluster"
  node_groups = {
    general = {
      instance_type = "m5.xlarge"
      min_size      = 2
      max_size      = 10
      desired_size  = 3
    }
  }
}
```

С Terragrunt не нужно дублировать backend и provider в каждом окружении. `run-all apply` применяет изменения в правильном порядке с учётом зависимостей.

## Итог

Terraform модули -- ключ к управляемой инфраструктуре в команде. Структура `variables.tf` / `main.tf` / `outputs.tf` стандартна и читаема. Версионирование через Git tags даёт воспроизводимые деплои. Разделение на слои (networking/databases/apps) позволяет командам работать независимо.

Следующий шаг -- [Pulumi: инфраструктура на Python без HCL](/posts/2026/03/12-pulumi).
