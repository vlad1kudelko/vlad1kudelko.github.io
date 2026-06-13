---
title: "Pulumi: инфраструктура на Python — IaC без HCL"
description: "Используйте Pulumi: инфраструктура на Python, IaC без HCL. Описывайте облако на любимом языке для проектов."
pubDate: "2026-03-12"
---

# Pulumi: инфраструктура на Python

Terraform требует учить HCL — декларативный язык с ограниченной логикой. Pulumi позволяет описывать инфраструктуру на Python, TypeScript, Go или Java, используя полноценный язык программирования: циклы, функции, классы, тесты.

## Первый проект

```bash
pulumi new aws-python
```

Создаёт структуру:
```
my-infra/
├── __main__.py
├── Pulumi.yaml
├── Pulumi.dev.yaml      # конфигурация для stack "dev"
└── requirements.txt
```

```python
# __main__.py
import pulumi
import pulumi_aws as aws

# Конфигурация
config = pulumi.Config()
env = config.require("environment")
instance_count = config.get_int("instance_count") or 2

# VPC
vpc = aws.ec2.Vpc("main",
    cidr_block="10.0.0.0/16",
    enable_dns_support=True,
    tags={"Name": f"{env}-vpc", "Environment": env}
)

# Суbnets в нескольких AZ
availability_zones = aws.get_availability_zones(state="available")

subnets = []
for i, az in enumerate(availability_zones.names[:3]):
    subnet = aws.ec2.Subnet(f"private-{i}",
        vpc_id=vpc.id,
        cidr_block=f"10.0.{i}.0/24",
        availability_zone=az,
        tags={"Name": f"{env}-private-{i}"}
    )
    subnets.append(subnet)

# Экспорт outputs
pulumi.export("vpc_id", vpc.id)
pulumi.export("subnet_ids", [s.id for s in subnets])
```

## Stacks

Stack в Pulumi — это отдельный экземпляр конфигурации (аналог Terraform workspace):

```bash
# Создать стек
pulumi stack init staging
pulumi stack init production

# Конфигурация стека
pulumi config set environment production --stack production
pulumi config set instance_count 3 --stack production
pulumi config set --secret db_password "s3cr3t" --stack production

# Деплой в конкретный стек
pulumi up --stack production
```

Секреты шифруются автоматически — в state хранится зашифрованное значение.

## ComponentResource

Для переиспользуемых компонентов — аналог Terraform-модулей:

```python
from pulumi import ComponentResource, ResourceOptions
import pulumi_aws as aws

class WebApplication(ComponentResource):
    def __init__(self, name: str, opts: ResourceOptions = None, **kwargs):
        super().__init__("my:app:WebApplication", name, {}, opts)

        # ALB
        self.alb = aws.lb.LoadBalancer(f"{name}-alb",
            internal=False,
            load_balancer_type="application",
            subnets=kwargs["subnet_ids"],
            opts=ResourceOptions(parent=self)
        )

        # ECS Service
        self.service = aws.ecs.Service(f"{name}-service",
            cluster=kwargs["cluster_arn"],
            task_definition=kwargs["task_definition"],
            desired_count=kwargs.get("desired_count", 2),
            opts=ResourceOptions(parent=self)
        )

        self.register_outputs({
            "alb_dns": self.alb.dns_name,
        })

# Использование
app = WebApplication("my-app",
    subnet_ids=subnets,
    cluster_arn=cluster.arn,
    task_definition=task_def.arn,
    desired_count=3
)
```

## Интеграция с Kubernetes

Pulumi умеет работать с Kubernetes, читая kubeconfig или управляя кластером через AWS/GCP-провайдер:

```python
import pulumi_kubernetes as k8s

# Деплой в существующий кластер
provider = k8s.Provider("k8s",
    kubeconfig=cluster.kubeconfig
)

deployment = k8s.apps.v1.Deployment("app",
    metadata=k8s.meta.v1.ObjectMetaArgs(
        namespace="production"
    ),
    spec=k8s.apps.v1.DeploymentSpecArgs(
        replicas=3,
        selector=k8s.meta.v1.LabelSelectorArgs(
            match_labels={"app": "my-app"}
        ),
        template=k8s.core.v1.PodTemplateSpecArgs(
            spec=k8s.core.v1.PodSpecArgs(
                containers=[k8s.core.v1.ContainerArgs(
                    name="app",
                    image="my-registry/my-app:latest"
                )]
            )
        )
    ),
    opts=ResourceOptions(provider=provider)
)
```

## Тестирование

Полноценный язык программирования означает полноценные тесты:

```python
import pytest
import pulumi

class MyMocks(pulumi.runtime.Mocks):
    def new_resource(self, args: pulumi.runtime.MockResourceArgs):
        return [args.name + "_id", args.inputs]
    def call(self, args: pulumi.runtime.MockCallArgs):
        return {}

pulumi.runtime.set_mocks(MyMocks())

import infra  # ваша инфраструктура

@pulumi.runtime.test
def test_vpc_cidr():
    def check_cidr(args):
        cidr, = args
        assert cidr == "10.0.0.0/16", "Неправильный CIDR"
    return pulumi.Output.all(infra.vpc.cidr_block).apply(check_cidr)
```

Terraform только начинает развивать тестирование через `terraform test`, Pulumi имеет это из коробки.
