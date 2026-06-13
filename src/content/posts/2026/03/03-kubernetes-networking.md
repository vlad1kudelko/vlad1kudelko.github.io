---
title: "Kubernetes: networking, Ingress, NetworkPolicy"
description: "Настройте Kubernetes: networking с Ingress controllers, NetworkPolicy. Управляйте сетью в кластере профессионально."
pubDate: "2026-03-03"
---

# Kubernetes networking: Ingress, NetworkPolicy

В Kubernetes каждый под получает уникальный IP, сервисы адресуются по DNS-имени, а внешний трафик управляется через Ingress Controller. Понимание трёх слоёв сетевой модели -- pod-to-pod, Service, Ingress -- устраняет 80% проблем с "сервис не отвечает".

Сетевая модель Kubernetes имеет несколько уровней: между подами, между сервисами и с внешним миром. Каждый уровень решается своими инструментами, и путаница между ними -- одна из основных причин недоступных сервисов.

> **Key Takeaways**
> - Pod IP меняется при перезапуске -- для стабильной адресации используют Service с kube-dns
> - Ingress -- правило маршрутизации HTTP/HTTPS, требует Ingress Controller (nginx, Traefik) для работы
> - NetworkPolicy работает только при поддержке CNI-плагина (Cilium, Calico) -- Flannel политики не поддерживает
> - `default-deny-all` NetworkPolicy -- обязательная практика для production namespace
> - `nicolaka/netshoot` -- незаменимый образ для диагностики сетевых проблем в кластере

## Как поды общаются между собой

Каждый под получает уникальный IP из Pod CIDR-диапазона. Поды в кластере могут обращаться друг к другу напрямую по этому IP без NAT -- это гарантирует CNI-плагин (Cilium, Calico, Flannel). Но IP пода меняется при каждом перезапуске, поэтому для стабильной адресации используют Service:

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

После создания сервиса `backend.default.svc.cluster.local:8000` всегда резолвится в актуальные healthy поды через kube-dns. Service поддерживает несколько типов:

- `ClusterIP` (по умолчанию) -- виртуальный IP, доступный только внутри кластера
- `NodePort` -- открывает порт на каждой ноде кластера (30000-32767)
- `LoadBalancer` -- создаёт облачный балансировщик с публичным IP
- `ExternalName` -- DNS-алиас на внешний хост (для миграций)

```yaml
# Service для доступа к внешней базе данных
apiVersion: v1
kind: Service
metadata:
  name: legacy-db
spec:
  type: ExternalName
  externalName: db.internal.company.com
```

## Ingress Controller

Ingress -- это правило маршрутизации HTTP/HTTPS. Само по себе оно ничего не делает без Ingress Controller. Самые популярные: nginx-ingress, Traefik, Kong.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: app-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
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

Nginx Ingress Controller работает как reverse proxy внутри кластера. Внешний трафик приходит на `LoadBalancer` Service контроллера, который затем роутит по правилам Ingress.

### Установка nginx-ingress

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.replicaCount=2
```

### cert-manager для автоматических TLS-сертификатов

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    email: admin@example.com
    server: https://acme-v02.api.letsencrypt.org/directory
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
```

После создания `ClusterIssuer` аннотация `cert-manager.io/cluster-issuer: letsencrypt-prod` в Ingress автоматически запрашивает и обновляет сертификат.

## NetworkPolicy

По умолчанию в Kubernetes все поды могут общаться со всеми. NetworkPolicy -- это firewall на уровне подов. Работает только если CNI поддерживает политики: Cilium, Calico, Weave. Flannel политики не поддерживает.

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

### Default deny

Базовая практика для production namespace: сначала запрещаем всё, потом явно разрешаем нужное:

```yaml
# Default deny all -- закрываем namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: production
spec:
  podSelector: {}   # пустой selector применяется ко всем подам
  policyTypes:
    - Ingress
    - Egress
---
# Разрешаем DNS для всех подов (без него ничего не работает)
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: production
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
---
# Разрешаем frontend -> backend
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-frontend-to-backend
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: backend
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
      ports:
        - port: 8000
```

### Cross-namespace политики

```yaml
# Разрешить prometheus из namespace monitoring мониторить поды в production
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-prometheus-scrape
  namespace: production
spec:
  podSelector: {}
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: monitoring
          podSelector:
            matchLabels:
              app: prometheus
      ports:
        - port: 9090
```

## DNS и Service discovery

CoreDNS позволяет обращаться к сервисам по именам:

```
<service>.<namespace>.svc.cluster.local
```

Из того же namespace достаточно просто `<service>`. Из другого -- `<service>.<namespace>`:

```python
import httpx

# Из namespace "frontend" к сервису в namespace "backend"
async with httpx.AsyncClient() as client:
    # Полный FQDN
    response = await client.get("http://api.backend.svc.cluster.local:8000/health")

    # Или просто по имени из того же namespace
    response = await client.get("http://api:8000/health")
```

Кастомизация CoreDNS для дополнительных зон:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: coredns
  namespace: kube-system
data:
  Corefile: |
    .:53 {
        errors
        health
        kubernetes cluster.local in-addr.arpa ip6.arpa {
            pods insecure
            fallthrough in-addr.arpa ip6.arpa
        }
        # Форвардить *.internal.company.com на корпоративный DNS
        forward internal.company.com 10.0.0.1
        forward . /etc/resolv.conf
        cache 30
        loop
        reload
        loadbalance
    }
```

## Debugging сети

```bash
# Запустить временный под с сетевыми утилитами
kubectl run -it --rm debug --image=nicolaka/netshoot \
  --restart=Never -- bash

# Проверить DNS-резолюцию
nslookup backend.production.svc.cluster.local

# Проверить доступность порта
nc -zv backend.production.svc.cluster.local 8000

# Трассировка маршрута
traceroute backend.production.svc.cluster.local

# Прослушать трафик
tcpdump -i eth0 -n port 8000
```

```bash
# Посмотреть активные NetworkPolicy
kubectl get networkpolicies -n production -o yaml

# Endpoints -- к каким реальным подам резолвится Service
kubectl get endpoints backend -n production

# Проверить Ingress и его backends
kubectl describe ingress app-ingress

# Логи Ingress Controller при проблемах с маршрутизацией
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

Если Service есть, но Endpoints пустые -- selector в Service не совпадает с labels на подах. Проверить:

```bash
kubectl get pods -l app=backend -n production   # поды с нужными labels
kubectl get svc backend -n production -o yaml   # selector в Service
```

## Итог

Сетевая модель Kubernetes хорошо спроектирована: pod-to-pod без NAT, Service для стабильной адресации, Ingress для HTTP-маршрутизации, NetworkPolicy для изоляции. Проблемы возникают там, где эти уровни пересекаются -- знание инструментов диагностики (netshoot, `kubectl get endpoints`) решает большинство случаев за минуты.

Следующий шаг после сети -- [хранение данных в Kubernetes: PersistentVolume, StorageClass](/posts/2026/03/04-kubernetes-storage).
