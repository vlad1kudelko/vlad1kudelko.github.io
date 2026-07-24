---
title: "Pulumi: инфраструктура на Python, IaC без HCL"
description: "Используйте Pulumi: инфраструктура на Python, IaC без HCL. Описывайте облако на любимом языке для проектов."
pubDate: "2026-03-12"
---

# Pulumi: инфраструктура на Python

Pulumi позволяет описывать облачную инфраструктуру на Python, TypeScript или Go -- без изучения HCL. Полноценный язык программирования: циклы для создания суbnets по всем AZ, классы для переиспользуемых компонентов, pytest для проверки конфигурации.

Terraform требует учить HCL с его ограниченной логикой. Pulumi позволяет описывать инфраструктуру на Python, TypeScript, Go или Java, используя полноценный язык: циклы, функции, классы, типы, тесты.

> **Key Takeaways**
> - Pulumi Stack -- аналог Terraform workspace: отдельная конфигурация для dev/staging/production
> - `config.set --secret db_password` шифрует секреты в Pulumi state автоматически
> - `ComponentResource` -- аналог Terraform модулей; позволяет создавать переиспользуемые облачные компоненты
> - Pulumi поддерживает тестирование инфраструктуры через `pulumi.runtime.test` и pytest
> - `pulumi import` импортирует существующие ресурсы из облака, генерируя Python-код

## Первый проект

```bash
# Установка CLI
pip install pulumi

# Новый проект из шаблона
pulumi new aws-python

# Структура проекта:
# my-infra/
# ├── __main__.py
# ├── Pulumi.yaml            # метаданные проекта
# ├── Pulumi.dev.yaml        # конфигурация stack "dev"
# └── requirements.txt
```

```python
# __main__.py
import pulumi
import pulumi_aws as aws

# Конфигурация из Pulumi.*.yaml
config = pulumi.Config()
env = config.require("environment")
instance_count = config.get_int("instance_count") or 2

# VPC
vpc = aws.ec2.Vpc("main",
    cidr_block="10.0.0.0/16",
    enable_dns_support=True,
    enable_dns_hostnames=True,
    tags={"Name": f"{env}-vpc", "Environment": env}
)

# Subnets в нескольких AZ -- Python цикл вместо HCL count
availability_zones = aws.get_availability_zones(state="available")

private_subnets = []
public_subnets = []
for i, az in enumerate(availability_zones.names[:3]):
    private_subnet = aws.ec2.Subnet(f"private-{i}",
        vpc_id=vpc.id,
        cidr_block=f"10.0.{i}.0/24",
        availability_zone=az,
        map_public_ip_on_launch=False,
        tags={"Name": f"{env}-private-{az}", "kubernetes.io/role/internal-elb": "1"}
    )
    private_subnets.append(private_subnet)

    public_subnet = aws.ec2.Subnet(f"public-{i}",
        vpc_id=vpc.id,
        cidr_block=f"10.0.{i+10}.0/24",
        availability_zone=az,
        map_public_ip_on_launch=True,
        tags={"Name": f"{env}-public-{az}", "kubernetes.io/role/elb": "1"}
    )
    public_subnets.append(public_subnet)

# Экспорт outputs
pulumi.export("vpc_id", vpc.id)
pulumi.export("private_subnet_ids", [s.id for s in private_subnets])
pulumi.export("public_subnet_ids", [s.id for s in public_subnets])
```

## Stacks

Stack в Pulumi -- аналог Terraform workspace, отдельный экземпляр конфигурации:

```bash
# Создать стеки
pulumi stack init dev
pulumi stack init staging
pulumi stack init production

# Конфигурация для каждого стека
pulumi config set environment production --stack production
pulumi config set instance_count 3 --stack production
pulumi config set --secret db_password "s3cr3t" --stack production   # шифруется

# Деплой в конкретный стек
pulumi up --stack production

# Просмотр конфигурации (секреты скрыты)
pulumi config --stack production
```

Секреты шифруются автоматически через Pulumi Service или AWS KMS/Azure Key Vault. В state хранится зашифрованное значение.

## ComponentResource

Для переиспользуемых компонентов -- аналог Terraform-модулей:

```python
from pulumi import ComponentResource, ResourceOptions
import pulumi_aws as aws
from dataclasses import dataclass

@dataclass
class WebApplicationArgs:
    subnet_ids: list
    cluster_arn: pulumi.Output
    task_definition: pulumi.Output
    desired_count: int = 2
    min_count: int = 1
    max_count: int = 10

class WebApplication(ComponentResource):
    def __init__(self, name: str, args: WebApplicationArgs, opts: ResourceOptions = None):
        super().__init__("my:app:WebApplication", name, {}, opts)

        # ALB
        self.alb = aws.lb.LoadBalancer(f"{name}-alb",
            internal=False,
            load_balancer_type="application",
            subnets=args.subnet_ids,
            opts=ResourceOptions(parent=self)
        )

        # Target Group
        self.target_group = aws.lb.TargetGroup(f"{name}-tg",
            port=8000,
            protocol="HTTP",
            target_type="ip",
            vpc_id=self.alb.vpc_id,
            health_check=aws.lb.TargetGroupHealthCheckArgs(
                path="/health",
                healthy_threshold=2,
                unhealthy_threshold=3,
            ),
            opts=ResourceOptions(parent=self)
        )

        # ECS Service
        self.service = aws.ecs.Service(f"{name}-service",
            cluster=args.cluster_arn,
            task_definition=args.task_definition,
            desired_count=args.desired_count,
            network_configuration=aws.ecs.ServiceNetworkConfigurationArgs(
                subnets=args.subnet_ids,
                assign_public_ip=False,
            ),
            load_balancers=[aws.ecs.ServiceLoadBalancerArgs(
                target_group_arn=self.target_group.arn,
                container_name="app",
                container_port=8000,
            )],
            opts=ResourceOptions(parent=self)
        )

        self.register_outputs({
            "alb_dns": self.alb.dns_name,
            "service_name": self.service.name,
        })

# Использование
app = WebApplication("my-app",
    WebApplicationArgs(
        subnet_ids=private_subnets,
        cluster_arn=cluster.arn,
        task_definition=task_def.arn,
        desired_count=3,
    )
)

pulumi.export("app_url", app.alb.dns_name)
```

## Интеграция с Kubernetes

Pulumi управляет и облачными ресурсами, и Kubernetes-объектами из одного кода:

```python
import pulumi_kubernetes as k8s

# Создать EKS кластер и сразу деплоить приложение
eks_cluster = aws.eks.Cluster("prod-cluster", ...)

# Provider для Kubernetes из свежесозданного кластера
k8s_provider = k8s.Provider("k8s",
    kubeconfig=eks_cluster.kubeconfig,
    opts=ResourceOptions(depends_on=[eks_cluster])
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
            metadata=k8s.meta.v1.ObjectMetaArgs(
                labels={"app": "my-app"}
            ),
            spec=k8s.core.v1.PodSpecArgs(
                containers=[k8s.core.v1.ContainerArgs(
                    name="app",
                    image="my-registry/my-app:latest",
                    resources=k8s.core.v1.ResourceRequirementsArgs(
                        requests={"cpu": "100m", "memory": "128Mi"},
                        limits={"cpu": "500m", "memory": "512Mi"},
                    )
                )]
            )
        )
    ),
    opts=ResourceOptions(provider=k8s_provider)
)
```

## Тестирование

Полноценный язык программирования означает полноценные тесты:

```python
import pytest
import pulumi
from unittest.mock import patch

class MyMocks(pulumi.runtime.Mocks):
    def new_resource(self, args: pulumi.runtime.MockResourceArgs):
        return [args.name + "_id", args.inputs]

    def call(self, args: pulumi.runtime.MockCallArgs):
        return {}

pulumi.runtime.set_mocks(MyMocks())

import infra  # ваш __main__.py

@pulumi.runtime.test
def test_vpc_has_dns_enabled():
    def check(args):
        cidr, dns_support, dns_hostnames = args
        assert cidr == "10.0.0.0/16"
        assert dns_support is True
        assert dns_hostnames is True

    return pulumi.Output.all(
        infra.vpc.cidr_block,
        infra.vpc.enable_dns_support,
        infra.vpc.enable_dns_hostnames,
    ).apply(check)

@pulumi.runtime.test
def test_private_subnets_count():
    def check(args):
        subnet_ids, = args
        assert len(subnet_ids) == 3, "Должно быть 3 private subnet"

    return pulumi.Output.all(
        pulumi.Output.all(*[s.id for s in infra.private_subnets])
    ).apply(check)
```

```bash
pytest tests/
```

## Команды CLI

```bash
# Предпросмотр изменений
pulumi preview --stack production

# Применить изменения
pulumi up --stack production

# История изменений
pulumi stack history --stack production

# Откат к предыдущей версии
pulumi up --target-urn <resource-urn>

# Импорт существующего ресурса
pulumi import aws:ec2/vpc:Vpc main vpc-abc123

# Уничтожить ресурсы
pulumi destroy --stack staging
```

## Итог

Pulumi -- сильный выбор для команд на Python или TypeScript, которые хотят писать инфраструктурный код как обычный код: с тестами, типизацией, переиспользуемыми компонентами. Terraform лучше там, где уже есть HCL-экспертиза и большая экосистема готовых модулей в Registry. Выбор зависит от языковых предпочтений и зрелости команды в IaC.

Следующий шаг -- [Ansible роли и коллекции для управления конфигурацией серверов](/posts/2026/03/13-ansible-roles/).
