---
title: "Istio: service mesh, Sidecar, mTLS, observability"
description: "Внедрите Istio: service mesh с Sidecar, mTLS, observability. Управляйте трафиком микросервисов профессионально."
pubDate: "2026-03-16"
---

# Istio service mesh: Sidecar, mTLS

Istio переносит поперечные задачи микросервисов -- шифрование, retry, circuit breaking, трассировку -- на уровень инфраструктуры. Каждый под получает sidecar Envoy, который управляет трафиком без изменения кода приложения. Цена: ~50 МБ RAM и ~0.5 vCPU на каждый sidecar.

Когда микросервисов становится много, поперечные задачи начинают дублироваться в каждом сервисе. Istio переносит их на уровень инфраструктуры: в Kubernetes каждый под получает sidecar-контейнер Envoy, который перехватывает весь трафик и применяет политики без изменения кода.

> **Key Takeaways**
> - `STRICT` mTLS отклоняет незашифрованный трафик между подами; сертификаты ротируются автоматически каждые 24 часа
> - VirtualService управляет canary деплоем на уровне процентов трафика или HTTP-заголовков
> - `outlierDetection` в DestinationRule реализует circuit breaker: при 5xx ошибках инстанс исключается из ротации
> - Kiali визуализирует топологию сервисов в реальном времени с метриками latency и error rate
> - Ambient mode (Istio 1.22+) убирает sidecar, снижая overhead до ~10 МБ на ноду вместо ~50 МБ на под

---

Команда Дениса добавила Istio для mTLS шифрования. Через неделю поняли, что p99 latency выросла на 40-50 мс. Это Envoy handshake при первом запросе и overhead на каждый TCP-соединение. Для их сервиса с SLA 100 мс это было критично. Решение: перешли на Linkerd -- он использует Rust proxy вместо Envoy, overhead 10 мс вместо 50 мс. Istio оставили только для сервисов с complex routing requirements. Правильный инструмент для правильной задачи.

## Архитектура

**Data plane** -- Envoy sidecar в каждом поде. Перехватывает входящий и исходящий трафик через iptables rules.

**Control plane** (istiod) -- управляет конфигурацией Envoy: распределяет сертификаты, синхронизирует маршруты, хранит политики.

```bash
# Установка через Helm
helm repo add istio https://istio-release.storage.googleapis.com/charts
helm install istio-base istio/base -n istio-system --create-namespace
helm install istiod istio/istiod -n istio-system --wait
helm install istio-ingressgateway istio/gateway -n istio-system

# Включить автоинъекцию sidecar в namespace
kubectl label namespace production istio-injection=enabled

# Проверить что sidecar инжектируется
kubectl get namespace production --show-labels
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

Теперь любой незашифрованный запрос между подами в namespace `production` отклоняется. Сертификаты автоматически ротируются istiod каждые 24 часа.

## Traffic Management

**VirtualService** управляет маршрутизацией. Canary деплой без изменения кода:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: api
spec:
  hosts: [api]
  http:
    # Canary по заголовку: разработчики тестируют v2
    - match:
        - headers:
            x-canary:
              exact: "true"
      route:
        - destination:
            host: api
            subset: v2
    # Основной трафик: 90% v1, 10% v2
    - route:
        - destination:
            host: api
            subset: v1
          weight: 90
        - destination:
            host: api
            subset: v2
          weight: 10
```

**DestinationRule** с circuit breaker:

```yaml
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
      http:
        http1MaxPendingRequests: 50
        maxRequestsPerConnection: 1
    outlierDetection:
      consecutive5xxErrors: 5    # исключить после 5 ошибок подряд
      interval: 30s
      baseEjectionTime: 30s      # держать вне ротации 30 секунд
      maxEjectionPercent: 50     # исключать не более 50% инстансов
```

**Retry и timeout** на уровне сетевого слоя:

```yaml
http:
  - route:
      - destination:
          host: api
    timeout: 3s
    retries:
      attempts: 3
      perTryTimeout: 1s
      retryOn: 5xx,gateway-error,connect-failure,retriable-4xx
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
    - from:
        - source:
            principals: ["cluster.local/ns/monitoring/sa/prometheus"]
      to:
        - operation:
            ports: ["9090"]
```

## Observability

Istio автоматически собирает метрики, трассировку и логи доступа без изменений в приложениях:

```bash
# Установить стек наблюдаемости
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.21/samples/addons/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.21/samples/addons/grafana.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.21/samples/addons/jaeger.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.21/samples/addons/kiali.yaml

# Открыть Kiali -- граф трафика между сервисами
istioctl dashboard kiali

# Открыть Jaeger -- распределённые трейсы
istioctl dashboard jaeger
```

Kiali визуализирует топологию сервисов в реальном времени: какие сервисы общаются, сколько ошибок, latency на каждом ребре графа.

```yaml
# Включить distributed tracing с sampling 1%
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: tracing-default
  namespace: istio-system
spec:
  tracing:
    - randomSamplingPercentage: 1.0
      providers:
        - name: jaeger
```

## Debugging

```bash
# Проверить конфигурацию sidecar
istioctl analyze -n production

# Proxy-статус для конкретного пода
istioctl proxy-status my-pod.production

# Детальная конфигурация Envoy
istioctl proxy-config all my-pod.production

# Проверить mTLS статус между подами
istioctl x check-inject -n production

# Логи доступа Envoy
kubectl logs my-pod -c istio-proxy -n production
```

## Ambient mode

С Istio 1.22 появился ambient mode -- без sidecar-контейнеров:

```bash
# Установить с ambient mode
helm install istiod istio/istiod --set profile=ambient

# Включить для namespace (без перезапуска подов)
kubectl label namespace production istio.io/dataplane-mode=ambient
```

Overhead снижается с ~50 МБ на под до ~10 МБ на ноду. Функциональность mTLS и базовая маршрутизация сохраняются.

## Подводные камни

Istio добавляет ~50 мс к латентности при первом запросе (mTLS handshake) и потребляет ~0.5 vCPU на sidecar. В кластере из 50 подов это 25 дополнительных vCPU только на Envoy. Для сервисов с жёсткими требованиями к latency рассмотрите Linkerd с его Rust-прокси.

## Итог

Istio -- мощный инструмент для команд с серьёзными требованиями к безопасности и observability. mTLS по умолчанию, детальное управление трафиком через VirtualService, circuit breaking, автоматические метрики и трейсы. Цена -- операционная сложность и ресурсный overhead.

Следующий шаг -- [Linkerd как лёгкая альтернатива Istio](/posts/2026/03/17-linkerd).
