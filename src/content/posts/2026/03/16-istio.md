---
title: "Istio: service mesh, Sidecar, mTLS, observability"
description: "Внедрите Istio: service mesh с Sidecar, mTLS, observability. Управляйте трафиком микросервисов профессионально."
pubDate: "2026-03-16"
---

# Istio service mesh: Sidecar, mTLS

Когда микросервисов становится много, поперечные задачи, шифрование трафика, retry, circuit breaking, трассировка, начинают дублироваться в каждом сервисе. Istio переносит их на уровень инфраструктуры: в Kubernetes каждый под получает sidecar-контейнер Envoy, который перехватывает весь трафик и применяет политики без изменения кода приложения.

## Архитектура

**Data plane**, Envoy sidecar в каждом поде. Перехватывает входящий и исходящий трафик через iptables rules.

**Control plane** (istiod), управляет конфигурацией Envoy: распределяет сертификаты, синхронизирует маршруты, хранит политики.

```bash
# Установка через Helm
helm repo add istio https://istio-release.storage.googleapis.com/charts
helm install istio-base istio/base -n istio-system --create-namespace
helm install istiod istio/istiod -n istio-system
helm install istio-ingressgateway istio/gateway -n istio-system

# Включить автоинъекцию sidecar в namespace
kubectl label namespace production istio-injection=enabled
```

## mTLS

По умолчанию Istio работает в режиме `PERMISSIVE`, принимает и шифрованный, и открытый трафик. `STRICT` требует mTLS от всех:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
 name: default
 namespace: production
spec:
 mtls:
 mode: STRICT
```

Теперь любой незашифрованный запрос между подами отклоняется. Сертификаты автоматически ротируются istiod каждые 24 часа.

## Traffic Management

**VirtualService** управляет маршрутизацией, canary деплой без изменения кода:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
 name: api
spec:
 hosts: [api]
 http:
 - match:
 - headers:
 x-canary:
 exact: "true"
 route:
 - destination:
 host: api
 subset: v2
 - route:
 - destination:
 host: api
 subset: v1
 weight: 90
 - destination:
 host: api
 subset: v2
 weight: 10
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
 name: api
spec:
 host: api
 subsets:
 - name: v1
 labels:
 version: v1
 - name: v2
 labels:
 version: v2
 trafficPolicy:
 connectionPool:
 tcp:
 maxConnections: 100
 outlierDetection:
 consecutive5xxErrors: 5
 interval: 30s
 baseEjectionTime: 30s # circuit breaker
```

**Retry и timeout**:

```yaml
http:
 - route:
 - destination:
 host: api
 timeout: 3s
 retries:
 attempts: 3
 perTryTimeout: 1s
 retryOn: 5xx,gateway-error,connect-failure
```

## AuthorizationPolicy

Управление доступом между сервисами:

```yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
 name: api-policy
 namespace: production
spec:
 selector:
 matchLabels:
 app: api
 action: ALLOW
 rules:
 - from:
 - source:
 principals: ["cluster.local/ns/production/sa/frontend"]
 to:
 - operation:
 methods: ["GET", "POST"]
 paths: ["/v1/*"]
```

## Observability

Istio автоматически собирает метрики (через Prometheus), трассировку (через Jaeger/Zipkin) и логи доступа без изменений в приложениях:

```bash
# Установить стек наблюдаемости
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/jaeger.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml

# Открыть Kiali, граф трафика между сервисами
istioctl dashboard kiali
```

Kiali визуализирует топологию сервисов в реальном времени: какие сервисы общаются, сколько ошибок, latency.

## Подводные камни

Istio добавляет ~50 мс к латентности при первом запросе (handshake mTLS) и потребляет ~0.5 vCPU на sidecar. В кластере из 50 подов это 25 дополнительных vCPU только на Envoy. Для небольших кластеров ambient mode (без sidecar, появился в Istio 1.18) снижает overhead, но пока менее зрелый.
