---
title: "Consul: service discovery, DNS, HTTP, service mesh"
description: "Настройте Consul: service discovery с DNS, HTTP, service mesh. Обнаружение сервисов в кластере Kubernetes."
pubDate: "2026-03-15"
---

# Consul service discovery: DNS, HTTP

Когда сервисов больше пяти и они перезапускаются на разных IP, жёсткие адреса в конфигах перестают работать. Consul решает это централизованно: сервисы регистрируются при старте, клиенты находят их через DNS или HTTP API, а health checks автоматически убирают упавшие инстансы из ротации.

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
 "version": "2.5.1"
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

Или через API при старте приложения:

```python
import consul

c = consul. Consul(host="consul.internal", port=8500)

c.agent.service.register(
 name="api",
 service_id=f"api-{socket.gethostname()}",
 port=8000,
 tags=["v2"],
 check=consul. Check.http(
 url="http://localhost:8000/health",
 interval="10s",
 deregister="30s"
 )
)

# При завершении
import atexit
atexit.register(lambda: c.agent.service.deregister(f"api-{socket.gethostname()}"))
```

## DNS-резолюция

Consul поднимает DNS-сервер на порту 8600. Формат имён:

```
<service>.service.consul → все healthy инстансы
<tag>.<service>.service.consul → инстансы с тегом
<id>.service.consul → конкретный инстанс
```

```bash
# Найти все инстансы api
dig @127.0.0.1 -p 8600 api.service.consul

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

c = consul. Consul(host="consul.internal")

# Найти сервис
_, services = c.health.service("api", passing=True)

# services, список healthy инстансов
for svc in services:
 address = svc["Service"]["Address"] or svc["Node"]["Address"]
 port = svc["Service"]["Port"]
 print(f"{address}:{port}")

# Watch, получать уведомления об изменениях
index = None
while True:
 index, data = c.health.service("api", passing=True, index=index, wait="30s")
 update_load_balancer(data)
```

## Key/Value хранилище

Consul KV часто используют для распределённой конфигурации:

```bash
consul kv put config/api/log_level INFO
consul kv put config/api/workers 4

consul kv get config/api/log_level
consul kv get -recurse config/api/
```

```python
# Динамическая конфигурация с watch
_, data = c.kv.get("config/api/log_level")
log_level = data["Value"].decode()

# Атомарное обновление через CAS
_, current = c.kv.get("config/api/workers", index=0)
c.kv.put("config/api/workers", "8",
 cas=current["ModifyIndex"])
```

## Service Mesh с Consul Connect

Consul Connect добавляет mTLS между сервисами без изменения кода, через sidecar-прокси (Envoy):

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
# Запретить всё по умолчанию
consul intention create -deny '*' '*'

# Разрешить только api → database
consul intention create -allow api database
```
