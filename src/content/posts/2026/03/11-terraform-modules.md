---
title: "Terraform: модули — Создание, версионирование"
description: "Создавайте Terraform: модули с созданием, версионированием. Переиспользуйте инфраструктурный код в проектах."
pubDate: "2026-03-11"
---

# Terraform модули: создание, версионирование

Без модулей Terraform-конфигурация растёт в один большой файл. Скопировать `aws_eks_cluster` с 50 параметрами в staging и production — значит поддерживать два места с одинаковым кодом. Модули решают это: инкапсулируют набор ресурсов с входными переменными и выходными значениями.

## Структура модуля

```
modules/
└── eks-cluster/
    ├── main.tf        # ресурсы
    ├── variables.tf   # входные параметры
    ├── outputs.tf     # выходные значения
    └── versions.tf    # требования к версиям
```

```hcl
# modules/eks-cluster/variables.tf
variable "cluster_name" {
  description = "Имя EKS кластера"
  type        = string
}

variable "node_groups" {
  description = "Конфигурация node groups"
  type = map(object({
    instance_type  = string
    min_size       = number
    max_size       = number
    desired_size   = number
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
```

## Вызов модуля

```hcl
# production/main.tf
module "eks" {
  source  = "../../modules/eks-cluster"
  # или из Terraform Registry:
  # source  = "terraform-aws-modules/eks/aws"
  # version = "~> 20.0"

  cluster_name = "prod-cluster"

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
  }
}

# Использование outputs модуля
output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}
```

## Версионирование через Git

```hcl
# Из конкретного тега Git-репозитория
module "vpc" {
  source = "git::https://github.com/my-org/terraform-modules.git//modules/vpc?ref=v2.1.0"

  cidr_block   = "10.0.0.0/16"
  environment  = "production"
}
```

Двойной слэш `//` разделяет репозиторий и путь к модулю внутри него. Тег `?ref=v2.1.0` фиксирует версию — без него `terraform init` каждый раз берёт HEAD.

## Terraform Registry

Публичные модули доступны из Terraform Registry без указания URL:

```hcl
module "s3_bucket" {
  source  = "terraform-aws-modules/s3-bucket/aws"
  version = "~> 4.0"

  bucket = "my-application-bucket"
  acl    = "private"

  versioning = {
    enabled = true
  }
}
```

`~> 4.0` — pessimistic constraint: принимает `4.x`, не принимает `5.0`. Фиксируйте версии в продакшне.

## Организация больших проектов

Типичная структура для нескольких окружений:

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

Каждое окружение — отдельный Terraform root module со своим backend. Это изолирует state: изменение production не затрагивает staging.

## Terragrunt для DRY

Terragrunt уменьшает дублирование конфигурации backend и provider:

```hcl
# terragrunt.hcl (корень)
remote_state {
  backend = "s3"
  config = {
    bucket  = "terraform-state-${local.account_id}"
    key     = "${path_relative_to_include()}/terraform.tfstate"
    region  = "eu-central-1"
    encrypt = true
  }
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
}
```
