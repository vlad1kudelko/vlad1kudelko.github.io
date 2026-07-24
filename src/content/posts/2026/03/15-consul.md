---
title: "Consul: service discovery, DNS, HTTP, service mesh"
description: "Настройте Consul: service discovery с DNS, HTTP, service mesh. Обнаружение сервисов в кластере Kubernetes."
pubDate: "2026-03-15"
---

# Consul service discovery: DNS, HTTP

Consul решает проблему динамических IP в микросервисной архитектуре: сервисы регистрируются при старте, клиенты находят их через DNS или HTTP API, а health checks автоматически убирают упавшие инстансы из ротации. DNS-запрос `api.service.consul` всегда возвращает только healthy инстансы.

Когда сервисов больше пяти и они перезапускаются на разных IP, жёсткие адреса в конфигах перестают работать. Consul решает это централизованно, без изменений в коде приложений.

> **Key Takeaways**
> - DNS-интерфейс Consul: `<service>.service.consul` -- все healthy инстансы; `<tag>.<service>.service.consul` -- инстансы с тегом
> - `deregister_critical_service_after: 30s` автоматически удаляет мёртвые инстансы из ротации
> - Consul KV используют для распределённой конфигурации с watch-уведомлениями при изменении
> - Consul Connect (service mesh) добавляет mTLS между сервисами через sidecar Envoy без изменения кода
> - Intentions в режиме `default-deny` -- белый список: только явно разрешённые пары сервисов могут общаться

## Регистрация сервиса

Consul агент запускается на каждой ноде и принимает конфигурации сервисов:

```json
// /etc/consul.d/api-service.json
{
  "service": {
    "name": "api",
    "id": "api-1",
    "port": 8000,
    "tags": ["v2", "python"],
    "meta": {
      "version": "2.5.1",
      "region": "eu-west"
    },
    "check": {
      "http": "http://localhost:8000/health",
      "interval": "10s",
      "timeout": "3s",
      "deregister_critical_service_after": "30s"
    }
  }
}
```

```bash
consul agent -config-dir=/etc/consul.d -data-dir=/var/consul -bind=0.0.0.0
```

Или регистрация через API при старте приложения -- удобно для приложений в Docker:

```python
import consul
import socket
import atexit

c = consul.Consul(host="consul.internal", port=8500)

service_id = f"api-{socket.gethostname()}"

c.agent.service.register(
    name="api",
    service_id=service_id,
    address=socket.gethostbyname(socket.gethostname()),
    port=8000,
    tags=["v2"],
    check=consul.Check.http(
        url="http://localhost:8000/health",
        interval="10s",
        deregister="30s"
    )
)

# Дерегистрация при завершении
atexit.register(lambda: c.agent.service.deregister(service_id))
```

## DNS-резолюция

Consul поднимает DNS-сервер на порту 8600. Формат имён:

```
<service>.service.consul           → все healthy инстансы
<tag>.<service>.service.consul     → инстансы с тегом
<id>.service.consul                → конкретный инстанс
<service>.<datacenter>.service.consul → кросс-датацентр
```

```bash
# Найти все инстансы api
dig @127.0.0.1 -p 8600 api.service.consul A

# SRV запись с портами
dig @127.0.0.1 -p 8600 api.service.consul SRV

# Только инстансы с тегом v2
dig @127.0.0.1 -p 8600 v2.api.service.consul SRV

# Интеграция с системным DNS через dnsmasq
# /etc/dnsmasq.d/consul.conf
server=/consul/127.0.0.1#8600
```

После настройки dnsmasq обычный `curl http://api.service.consul:8000` работает без изменений в коде.

## HTTP API

```python
import consul

c = consul.Consul(host="consul.internal")

# Найти все healthy инстансы сервиса
_, services = c.health.service("api", passing=True)

# Выбрать первый доступный инстанс (load balancing)
for svc in services:
    address = svc["Service"]["Address"] or svc["Node"]["Address"]
    port = svc["Service"]["Port"]
    print(f"{address}:{port}")

# Long-poll: получать уведомления об изменениях
index = None
while True:
    index, data = c.health.service("api", passing=True, index=index, wait="30s")
    # data обновился, можно перебалансировать клиентов
    update_load_balancer(data)
```

## Key/Value хранилище

Consul KV часто используют для распределённой конфигурации с watch-уведомлениями:

```bash
consul kv put config/api/log_level INFO
consul kv put config/api/workers 4
consul kv put config/api/feature_flags '{"new_ui": true}'

consul kv get config/api/log_level
consul kv get -recurse config/api/
```

```python
# Динамическая конфигурация с watch
_, data = c.kv.get("config/api/log_level")
log_level = data["Value"].decode()

# Атомарное обновление через CAS (Compare-And-Swap)
_, current = c.kv.get("config/api/workers", index=0)
success = c.kv.put("config/api/workers", "8",
    cas=current["ModifyIndex"])
if not success:
    # Конфликт: кто-то обновил раньше
    pass

# Watch в отдельном потоке
def watch_config():
    index = None
    while True:
        index, data = c.kv.get("config/api/log_level", index=index, wait="30s")
        if data:
            new_level = data["Value"].decode()
            logging.getLogger().setLevel(new_level)
```

## Service Mesh с Consul Connect

Consul Connect добавляет mTLS между сервисами без изменения кода через sidecar-прокси (Envoy):

```json
{
  "service": {
    "name": "api",
    "port": 8000,
    "connect": {
      "sidecar_service": {
        "proxy": {
          "upstreams": [
            {
              "destination_name": "database",
              "local_bind_port": 5432
            },
            {
              "destination_name": "redis",
              "local_bind_port": 6379
            }
          ]
        }
      }
    }
  }
}
```

Приложение подключается к `localhost:5432`, Envoy sidecar прозрачно шифрует трафик и проверяет сертификаты. Intentions контролируют, каким сервисам разрешено общаться:

```bash
# Запретить всё по умолчанию (default deny)
consul intention create -deny '*' '*'

# Разрешить только api → database
consul intention create -allow api database

# Разрешить frontend → api
consul intention create -allow frontend api

# Проверить намерения
consul intention check api database
# Allowed
```

## Federation между датацентрами

```bash
# Настроить репликацию ACL tokens между датацентрами
consul acl replication status

# WAN join: соединить датацентры
consul members -wan

# Cross-datacenter service discovery
dig @127.0.0.1 -p 8600 api.service.eu-west.consul
```

## Итог

Consul решает service discovery для динамических инфраструктур: DNS-интерфейс работает без изменения кода приложений, HTTP API даёт программный доступ, KV хранилище заменяет простые feature flag системы. Consul Connect добавляет service mesh возможности для тех, кому нужен mTLS, но не хочется сложности Istio.

Следующий шаг -- [Istio service mesh: mTLS, traffic management, observability](/posts/2026/03/16-istio/).
