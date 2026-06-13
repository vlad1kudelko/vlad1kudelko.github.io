---
title: "Linkerd: лёгкий service mesh, Сравнение с Istio"
description: "Используйте Linkerd: лёгкий service mesh, сравнение с Istio. Простой и быстрый service mesh для K8s."
pubDate: "2026-03-17"
---

# Linkerd service mesh: сравнение с Istio

Istio, мощный инструмент с огромным числом настроек. Linkerd, противоположный подход: минимальная конфигурация, предсказуемое поведение, радикально меньший overhead. Linkerd написан на Rust (proxy-компонент linkerd2-proxy), что даёт ~10 мс p99 latency против ~50 мс у Istio.

## Установка

```bash
# Установить CLI
curl --proto '=https' --tlsv1.2 -sSfL https://run.linkerd.io/install | sh

# Проверить кластер
linkerd check --pre

# Установить control plane
linkerd install --crds | kubectl apply -f -
linkerd install | kubectl apply -f -

# Проверить установку
linkerd check
```

Linkerd не требует Helm и не устанавливает CRD пачками, минимальная инсталляция занимает ~200 МБ RAM против ~1 ГБ у Istio.

## Инъекция sidecar

```bash
# Аннотировать namespace
kubectl annotate ns production linkerd.io/inject=enabled

# Или конкретный deployment
kubectl get deploy api -n production -o yaml \
 | linkerd inject - \
 | kubectl apply -f -
```

Linkerd использует собственный proxy написанный на Rust (linkerd2-proxy), а не Envoy. Это даёт меньший footprint: ~10 МБ RAM и ~0.1 vCPU на sidecar vs ~50 МБ и ~0.5 vCPU у Envoy.

## mTLS и Identity

mTLS включён по умолчанию, никаких дополнительных манифестов:

```bash
# Проверить, что трафик зашифрован
linkerd viz stat deploy -n production

# Детали по конкретному деплою
linkerd viz tap deploy/api -n production

# Вывод: route, response_code, latency_p99, tls
# → POST /v1/users 200 12ms [tls]
```

## Traffic Splitting

Canary деплой через SMI (Service Mesh Interface):

```yaml
apiVersion: split.smi-spec.io/v1alpha1
kind: TrafficSplit
metadata:
 name: api-split
 namespace: production
spec:
 service: api
 backends:
 - service: api-v1
 weight: 90
 - service: api-v2
 weight: 10
```

Linkerd поддерживает SMI, стандартизированный API для service mesh, позволяющий мигрировать между реализациями без изменения манифестов.

## Observability

```bash
# Установить Viz extension (Prometheus + Grafana)
linkerd viz install | kubectl apply -f -

# Открыть dashboard
linkerd viz dashboard

# Golden metrics в CLI
linkerd viz stat ns/production
# NAME MESHED SUCCESS RPS LATENCY_P50 LATENCY_P99
# production 12/12 99.8% 142.3 4ms 18ms

# Реальный трафик в реальном времени
linkerd viz tap ns/production --to deploy/database
```

## Multicluster

Linkerd поддерживает федерацию кластеров, сервисы в разных кластерах видят друг друга как локальные:

```bash
# Связать два кластера
linkerd multicluster install | kubectl apply -f -
linkerd multicluster link --cluster-name east | kubectl apply -f - --context=west

# Экспортировать сервис из east в west
kubectl label svc api -n production mirror.linkerd.io/exported=true --context=east
```

После этого в кластере west появляется `api-east.production.svc.cluster.local`.

## Когда Linkerd, когда Istio

Linkerd выигрывает когда нужен mesh с минимальной сложностью и предсказуемым влиянием на latency. Конфигурации меньше, операционный overhead ниже.

Istio необходим когда нужны сложные политики маршрутизации (header matching, JWT validation, rate limiting на уровне mesh), интеграция с внешними CA или управление трафиком к сервисам вне кластера. Для большинства команд Linkerd закрывает 80% потребностей с 20% сложности Istio.
