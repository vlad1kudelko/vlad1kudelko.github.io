---
title: "Terraform: инфраструктура как код — полное руководство"
description: "Автоматизируйте инфраструктуру с Terraform: провайдеры, ресурсы, модули, состояние. Начните управлять облаком декларативно уже сегодня."
heroImage: "../../../../assets/imgs/2025/12/03-terraform-iac.webp"
pubDate: "2025-12-03"
---

# Terraform: декларативное управление инфраструктурой

Terraform — инструмент для декларативного описания инфраструктуры и управления ею. С его помощью можно создавать, изменять и версионировать инфраструктуру. Вместо ручного создания ресурсов через консоль облака вы описываете желаемое состояние в коде, а Terraform самостоятельно определяет, какие изменения нужно применить.

## Установка

Terraform распространяется как единый бинарный файл. После установки убедитесь, что файл доступен в PATH.

```bash
# macOS
brew install terraform

# Linux
curl -fsSL https://www.terraform.io/downloads | tar -xz
sudo mv terraform /usr/local/bin/

# Windows
winget install HashiCorp.Terraform
```

Проверьте установку:

```bash
terraform version
```

## Базовый синтаксис

Конфигурация Terraform пишется на языке HCL (HashiCorp Configuration Language). Это декларативный язык, где вы описываете желаемое состояние, а не шаги для его достижения.

### Файл конфигурации (.tf)

Файлы с расширением `.tf` содержат описание инфраструктуры. Terraform автоматически читает все такие файлы в директории.

```hcl
# main.tf

# Провайдер
provider "aws" {
  region = "eu-west-1"
}

# Переменные
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

# Ресурс
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = var.instance_type

  tags = {
    Name = "web-server"
  }
}

# Вывод
output "instance_ip" {
  value = aws_instance.web.public_ip
}
```

Этот код создаёт EC2 инстанс с указанным типом. Обратите внимание на синтаксис: `var.instance_type` ссылается на переменную, а `aws_instance.web.public_ip` — на атрибут ресурса.

## Провайдеры

Провайдер — это плагин, который управляет ресурсами конкретной платформы. Terraform использует провайдеры для взаимодействия с API облачных платформ.

Каждый провайдер имеет свою конфигурацию и набор ресурсов. Провайдеры загружаются автоматически при инициализации проекта.

```hcl
# AWS
provider "aws" {
  region = "eu-west-1"
  access_key = var.aws_access_key
  secret_key = var.aws_secret_key
}

# GCP
provider "google" {
  project = "my-project"
  region  = "us-central1"
}

# Azure
provider "azurerm" {
  features {}
  subscription_id = var.subscription_id
}
```

Для работы с несколькими регионами или аккаунтами одного провайдера используйте алиасы:

```hcl
provider "aws" {
  alias  = "us-east"
  region = "us-east-1"
}

resource "aws_instance" "example" {
  provider = aws.us-east
  # ...
}
```

Также можно использовать несколько провайдеров одновременно для мульти-облачных развертываний:

```hcl
provider "azurerm" {
  features {}
  subscription_id = var.azure_subscription_id
}

# Kubernetes
provider "kubernetes" {
  config_path = "~/.kube/config"
}
```

## Типы данных

Terraform поддерживает различные типы данных для переменных: примитивы, коллекции и сложные структуры.

### Переменные

```hcl
variable "regions" {
  type        = list(string)
  default     = ["eu-west-1", "us-east-1"]
}

variable "tags" {
  type        = map(string)
  default = {
    Environment = "production"
    Project     = "myapp"
  }
}

variable "config" {
  type = object({
    instance_type = string
    disk_size     = number
    encrypted     = bool
  })
  default = {
    instance_type = "t3.micro"
    disk_size     = 20
    encrypted     = true
  }
}
```

### Outputs

```hcl
output "instance_id" {
  value       = aws_instance.web.id
  description = "ID EC2 instance"
}

output "all_ips" {
  value = { for instance in aws_instance.all : instance.id => instance.private_ip }
}
```

### Locals

```hcl
locals {
  common_tags = {
    Project     = "myapp"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
  
  full_name = "${var.project}-${var.environment}-${var.component}"
}
```

## Ресурсы

### Вычисления (AWS)

```hcl
# EC2
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.public.id

  user_data = <<-EOF
              #!/bin/bash
              yum install -y nginx
              systemctl start nginx
              EOF

  tags = local.common_tags
}

# Auto Scaling Group
resource "aws_launch_template" "web" {
  name_prefix   = "web-"
  image_id      = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tag_specifications {
    resource_type = "instance"
    tags          = local.common_tags
  }
}

resource "aws_autoscaling_group" "web" {
  name                = "web-asg"
  vpc_zone_identifier = [aws_subnet.public.id]
  desired_capacity    = 2
  max_size            = 5
  min_size            = 1

  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }
}
```

### Сеть

```hcl
# VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = local.common_tags
}

# Subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "eu-west-1a"

  tags = local.common_tags
}

# Security Group
resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Security group for web servers"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.common_tags
}
```

### Базы данных

```hcl
# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier           = "mydb"
  engine               = "postgres"
  engine_version       = "15.3"
  instance_class       = "db.t3.micro"
  allocated_storage    = 20
  max_allocated_storage = 100

  db_name  = "mydb"
  username = var.db_username
  password = var.db_password

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  backup_retention_period = 7
  skip_final_snapshot     = true

  tags = local.common_tags
}
```

## Модули

### Создание модуля

```hcl
# modules/vpc/main.tf
variable "cidr_block" {
  type = string
}

variable "name" {
  type = string
}

resource "aws_vpc" "main" {
  cidr_block = var.cidr_block
  tags = {
    Name = var.name
  }
}

output "vpc_id" {
  value = aws_vpc.main.id
}
```

### Использование модуля

```hcl
module "vpc_prod" {
  source = "./modules/vpc"

  cidr_block = "10.0.0.0/16"
  name       = "production"
}

module "vpc_dev" {
  source = "./modules/vpc"

  cidr_block = "10.1.0.0/16"
  name       = "development"
}
```

### Terraform Registry

```hcl
# AWS VPC module
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "my-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["eu-west-1a", "eu-west-1b"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true
}
```

## Работа с состоянием

### Terraform Backend

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "eu-west-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

### Блокировки

```hcl
# S3 + DynamoDB для блокировок
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "eu-west-1"
    dynamodb_table = "terraform-locks"
  }
}
```

## Команды

```bash
# Инициализация
terraform init

# Формат и валидация
terraform fmt
terraform validate

# План
terraform plan -out=tfplan

# Применение
terraform apply tfplan
terraform apply -var-file=prod.tfvars

# Дифф
terraform show

# Удаление
terraform destroy
terraform destroy -var-file=prod.tfvars

# Импорт
terraform import aws_instance.web i-1234567890abcdef0

# Graphs
terraform graph | dot -Tpng > graph.png
```

## Workspace

```bash
# Создать workspace
terraform workspace new prod

# Переключиться
terraform workspace select prod

# Список
terraform workspace list
```

## Best Practices

1. **Используйте remote backend** — состояние в S3 с блокировками
2. **Версионируйте .tfstate** — не храните локально
3. **Используйте модули** — для повторяемости
4. **Применяйте tfvars** — для разных environments
5. **Используйте format** — `terraform fmt`
6. **Безопасность** — не храните secrets в коде, используйте Vault или SSM

## Заключение

Terraform — мощный инструмент для управления инфраструктурой. Правильное использование модулей, бэкендов и workspaces позволяет эффективно управлять инфраструктурой любого масштаба.