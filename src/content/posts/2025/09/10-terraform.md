---
title: "Terraform: Инфраструктура как код для облачных провайдеров"
description: "Terraform — это инструмент с открытым исходным кодом от HashiCorp, который позволяет описывать и управлять инфраструктурой с помощью декларативного подхода."
heroImage: "../../../../assets/imgs/2025/09/10-terraform.webp"
pubDate: "2025-09-10"
---

# Terraform: Инфраструктура как код для облачных провайдеров

## Введение в Terraform

Terraform — это инструмент с открытым исходным кодом от HashiCorp, который позволяет описывать и управлять инфраструктурой с помощью декларативного подхода. Вместо ручного создания ресурсов через веб-консоли облачных провайдеров, Terraform позволяет определить всю необходимую инфраструктуру в виде кода на языке HCL (HashiCorp Configuration Language).

### Основные преимущества Terraform

Terraform решает ключевые проблемы управления инфраструктурой в облачных средах. Он обеспечивает версионность инфраструктуры через системы контроля версий, что позволяет отслеживать изменения и откатываться к предыдущим состояниям. Благодаря декларативному подходу вы описываете желаемое состояние инфраструктуры, а Terraform самостоятельно определяет, какие действия необходимо выполнить для достижения этого состояния.

Инструмент поддерживает множество облачных провайдеров через единый интерфейс, что упрощает работу в мультиоблачных средах. Terraform также обеспечивает идемпотентность — повторное выполнение одной и той же конфигурации не приведет к нежелательным изменениям.

## Основы работы с Terraform

### Установка и настройка

Terraform распространяется в виде единого исполняемого файла. После скачивания с официального сайта достаточно добавить его в PATH системы. Для проверки установки выполните команду `terraform version`.

### Жизненный цикл управления инфраструктурой

Работа с Terraform включает несколько основных этапов. Сначала создается конфигурация в файлах с расширением `.tf`, где описывается необходимая инфраструктура. Затем выполняется команда `terraform init` для инициализации рабочего каталога и загрузки необходимых провайдеров.

Команда `terraform plan` создает план изменений, показывая, какие ресурсы будут созданы, изменены или удалены. После проверки плана выполняется `terraform apply` для применения изменений. Команда `terraform destroy` используется для удаления всех созданных ресурсов.

### Файл состояния (State)

Terraform хранит информацию о созданной инфраструктуре в файле состояния `terraform.tfstate`. Этот файл содержит сопоставление между конфигурацией и реальными ресурсами в облаке. Для команд важно настроить удаленное хранение состояния, используя backends вроде S3, Azure Storage или Terraform Cloud.

## Синтаксис HCL

### Основные конструкции

HCL использует блочную структуру для описания ресурсов. Каждый блок имеет тип, метки и набор аргументов. Основные типы блоков включают `provider` для настройки облачных провайдеров, `resource` для описания ресурсов, `variable` для входных параметров, `output` для выходных значений и `data` для получения информации о существующих ресурсах.

### Переменные и выражения

Terraform поддерживает различные типы данных: строки, числа, булевы значения, списки, карты и объекты. Переменные могут иметь значения по умолчанию, описания и ограничения типов. HCL также предоставляет богатый набор встроенных функций для работы со строками, списками, картами и другими типами данных.

Интерполяция позволяет использовать значения переменных и атрибутов ресурсов в других местах конфигурации с помощью синтаксиса `${выражение}` или более современного `выражение`.

## Работа с AWS

### Настройка провайдера AWS

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}
```

### Создание базовой инфраструктуры

```hcl
# VPC и сеть
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "main-vpc"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name = "public-subnet"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "main-igw"
  }
}

# Security Group
resource "aws_security_group" "web" {
  name_prefix = "web-"
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
}

# EC2 Instance
resource "aws_instance" "web" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web.id]

  user_data = <<-EOF
              #!/bin/bash
              yum update -y
              yum install -y httpd
              systemctl start httpd
              systemctl enable httpd
              echo "<h1>Hello from Terraform!</h1>" > /var/www/html/index.html
              EOF

  tags = {
    Name = "web-server"
  }
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }
}
```

## Работа с Azure

### Настройка провайдера Azure

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "West Europe"
}
```

### Создание ресурсов Azure

```hcl
# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "rg-terraform-demo"
  location = var.location
}

# Virtual Network
resource "azurerm_virtual_network" "main" {
  name                = "vnet-main"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}

resource "azurerm_subnet" "web" {
  name                 = "subnet-web"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Network Security Group
resource "azurerm_network_security_group" "web" {
  name                = "nsg-web"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  security_rule {
    name                       = "HTTP"
    priority                   = 1001
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "80"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

# Public IP
resource "azurerm_public_ip" "web" {
  name                = "pip-web"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  allocation_method   = "Dynamic"
}

# Virtual Machine
resource "azurerm_linux_virtual_machine" "web" {
  name                = "vm-web"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  size                = "Standard_B1s"
  admin_username      = "adminuser"

  disable_password_authentication = true

  network_interface_ids = [
    azurerm_network_interface.web.id,
  ]

  admin_ssh_key {
    username   = "adminuser"
    public_key = file("~/.ssh/id_rsa.pub")
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Standard_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts"
    version   = "latest"
  }
}

resource "azurerm_network_interface" "web" {
  name                = "nic-web"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.web.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.web.id
  }
}
```

## Работа с Google Cloud Platform

### Настройка провайдера GCP

```hcl
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone"
  type        = string
  default     = "us-central1-a"
}
```

### Создание ресурсов GCP

```hcl
# VPC Network
resource "google_compute_network" "vpc" {
  name                    = "terraform-network"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet" {
  name          = "terraform-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
}

# Firewall rules
resource "google_compute_firewall" "allow_http" {
  name    = "allow-http"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["web-server"]
}

resource "google_compute_firewall" "allow_ssh" {
  name    = "allow-ssh"
  network = google_compute_network.vpc.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["web-server"]
}

# Compute Instance
resource "google_compute_instance" "web" {
  name         = "terraform-web-server"
  machine_type = "e2-micro"
  zone         = var.zone

  tags = ["web-server"]

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network    = google_compute_network.vpc.name
    subnetwork = google_compute_subnetwork.subnet.name

    access_config {
      # Ephemeral public IP
    }
  }

  metadata_startup_script = <<-EOF
                            #!/bin/bash
                            apt update
                            apt install -y apache2
                            systemctl start apache2
                            systemctl enable apache2
                            echo "<h1>Hello from GCP with Terraform!</h1>" > /var/www/html/index.html
                            EOF

  service_account {
    scopes = ["cloud-platform"]
  }
}
```

## Автоматизация развертывания

### Модульная архитектура

Для масштабируемых проектов рекомендуется использовать модульную архитектуру. Модули позволяют переиспользовать код и создавать стандартизированные компоненты инфраструктуры.

```hcl
# modules/vpc/main.tf
resource "aws_vpc" "main" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(var.common_tags, {
    Name = var.vpc_name
  })
}

# modules/vpc/variables.tf
variable "cidr_block" {
  description = "CIDR block for VPC"
  type        = string
}

variable "vpc_name" {
  description = "Name of the VPC"
  type        = string
}

variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}

# modules/vpc/outputs.tf
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

# Использование модуля
module "main_vpc" {
  source = "./modules/vpc"
  
  cidr_block = "10.0.0.0/16"
  vpc_name   = "production-vpc"
  
  common_tags = {
    Environment = "production"
    Project     = "web-app"
  }
}
```

### Управление средами

Для управления различными средами (development, staging, production) используйте отдельные директории или workspace'ы Terraform.

```hcl
# environments/production/main.tf
module "infrastructure" {
  source = "../../modules/web-app"
  
  environment     = "production"
  instance_count  = 3
  instance_type   = "t3.medium"
  enable_backup   = true
  
  tags = {
    Environment = "production"
    Owner       = "ops-team"
  }
}

# environments/development/main.tf
module "infrastructure" {
  source = "../../modules/web-app"
  
  environment     = "development"
  instance_count  = 1
  instance_type   = "t3.micro"
  enable_backup   = false
  
  tags = {
    Environment = "development"
    Owner       = "dev-team"
  }
}
```

### CI/CD интеграция

Интеграция Terraform с системами CI/CD обеспечивает автоматическое развертывание инфраструктуры при изменении кода. Пример конфигурации для GitHub Actions:

```yaml
name: 'Terraform'

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  terraform:
    name: 'Terraform'
    runs-on: ubuntu-latest

    steps:
    - name: Checkout
      uses: actions/checkout@v3

    - name: Setup Terraform
      uses: hashicorp/setup-terraform@v2
      with:
        terraform_version: 1.5.0

    - name: Terraform Init
      run: terraform init

    - name: Terraform Plan
      run: terraform plan -no-color
      if: github.event_name == 'pull_request'

    - name: Terraform Apply
      if: github.ref == 'refs/heads/main' && github.event_name == 'push'
      run: terraform apply -auto-approve
```

## Лучшие практики

### Организация кода

Структурируйте код логически, разделяя его на файлы по назначению: `main.tf` для основных ресурсов, `variables.tf` для переменных, `outputs.tf` для выходных значений, `providers.tf` для настройки провайдеров. Используйте осмысленные имена для ресурсов и переменных.

### Безопасность

Никогда не храните чувствительные данные в коде Terraform. Используйте переменные среды, AWS Systems Manager Parameter Store, Azure Key Vault или HashiCorp Vault для управления секретами. Настройте удаленное хранение состояния с шифрованием и контролем доступа.

### Тестирование

Используйте `terraform plan` для проверки изменений перед применением. Рассмотрите использование инструментов вроде Terratest для автоматизированного тестирования конфигураций Terraform. Применяйте статический анализ с помощью инструментов вроде tflint и checkov.

### Управление состоянием

Настройте блокировки состояния для предотвращения одновременных изменений. Регулярно создавайте резервные копии файлов состояния. Используйте workspaces для управления различными средами, если они имеют схожую архитектуру.

## Заключение

Terraform предоставляет мощные возможности для управления облачной инфраструктурой как кодом. Он позволяет создавать воспроизводимые, версионируемые и автоматизированные развертывания в различных облачных провайдерах. Следуя лучшим практикам и используя модульный подход, можно создать масштабируемую и поддерживаемую инфраструктуру, которая будет эффективно служить потребностям вашего проекта.

Начните с простых конфигураций для одного провайдера, постепенно изучая возможности Terraform и добавляя сложность по мере необходимости. Инвестиции в изучение Infrastructure as Code окупятся повышением надежности, скорости развертывания и общего качества вашей инфраструктуры.
