---
title: "Kubernetes: networking — Ingress, NetworkPolicy"
description: "Настройте Kubernetes: networking с Ingress controllers, NetworkPolicy. Управляйте сетью в кластере профессионально."
pubDate: "2026-03-03"
---

# Kubernetes networking: Ingress, NetworkPolicy

Сетевая модель Kubernetes имеет несколько уровней: между подами, между сервисами и с внешним миром. Каждый уровень решается своими инструментами, и путаница между ними — одна из основных причин "почему мой сервис не отвечает".

## Как поды общаются между собой

В Kubernetes каждый под получает уникальный IP. Поды в кластере могут обращаться друг к другу напрямую по этому IP без NAT — это гарантирует CNI-плагин (Cilium, Calico, Flannel). Но IP пода меняется при каждом перезапуске, поэтому для стабильной адресации используют Service.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  selector:
    app: backend
  ports:
    - port: 8000
      targetPort: 8000
```

Теперь `backend.default.svc.cluster.local:8000` всегда резолвится в актуальные поды через kube-dns.

## Ingress Controller

Ingress — это правило маршрутизации HTTP/HTTPS. Само по себе оно ничего не делает без Ingress Controller (nginx-ingress, Traefik, Kong):

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.example.com
      secretName: api-tls
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /v1
            pathType: Prefix
            backend:
              service:
                name: api-v1
                port:
                  number: 8000
          - path: /v2
            pathType: Prefix
            backend:
              service:
                name: api-v2
                port:
                  number: 8000
```

Nginx Ingress Controller работает как reverse proxy внутри кластера. Внешний трафик приходит на LoadBalancer Service контроллера, который затем роутит по правилам Ingress.

## NetworkPolicy

По умолчанию в Kubernetes все поды могут общаться со всеми. NetworkPolicy — это firewall на уровне подов. Работает только если CNI поддерживает политики (Cilium, Calico, Weave).

```yaml
# Запрещаем весь входящий трафик к базе данных
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: db-network-policy
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Разрешаем только от backend-подов
    - from:
        - podSelector:
            matchLabels:
              app: backend
      ports:
        - port: 5432
  egress:
    # Postgres ничего не инициирует, кроме DNS
    - ports:
        - port: 53
          protocol: UDP
```

```yaml
# Default deny all — закрываем namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}  # применяется ко всем подам
  policyTypes:
    - Ingress
    - Egress
```

После `default-deny-all` нужно явно разрешить нужные маршруты.

## DNS и Service discovery

kube-dns (обычно CoreDNS) позволяет обращаться к сервисам по именам:

```
<service>.<namespace>.svc.cluster.local
```

Из того же namespace достаточно просто `<service>`. Из другого — `<service>.<namespace>`.

```python
import httpx

# Из namespace "frontend" к сервису в namespace "backend"
async with httpx.AsyncClient() as client:
    response = await client.get("http://api.backend.svc.cluster.local:8000/health")
```

## Debugging сети

```bash
# Проверить, что DNS резолвится
kubectl run -it --rm debug --image=nicolaka/netshoot \
  --restart=Never -- nslookup backend.production.svc.cluster.local

# Проверить доступность порта
kubectl run -it --rm debug --image=nicolaka/netshoot \
  --restart=Never -- nc -zv backend.production.svc.cluster.local 8000

# Посмотреть активные NetworkPolicy
kubectl get networkpolicies -n production

# Трассировка пакетов (Cilium)
cilium monitor --type trace
```

`nicolaka/netshoot` — образ с набором сетевых утилит (tcpdump, iperf, dig, curl), незаменим для отладки сети в кластере.
