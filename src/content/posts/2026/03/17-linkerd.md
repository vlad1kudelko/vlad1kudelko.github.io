---
title: "Linkerd: лёгкий service mesh, Сравнение с Istio"
description: "Используйте Linkerd: лёгкий service mesh, сравнение с Istio. Простой и быстрый service mesh для K8s."
pubDate: "2026-03-17"
---

# Linkerd service mesh: сравнение с Istio

Linkerd даёт mTLS, observability и traffic splitting с overhead ~10 МБ RAM и ~0.1 vCPU на sidecar -- против ~50 МБ и ~0.5 vCPU у Istio. Написан на Rust, p99 latency ~10 мс против ~50 мс у Istio. Для большинства команд Linkerd закрывает 80% потребностей от service mesh с 20% сложности Istio.

Istio -- мощный инструмент с огромным числом настроек. Linkerd -- противоположный подход: минимальная конфигурация, предсказуемое поведение, радикально меньший overhead.

> **Key Takeaways**
> - Linkerd использует собственный Rust proxy (linkerd2-proxy), не Envoy -- это главная причина низкого overhead
> - mTLS включён по умолчанию без какой-либо конфигурации после инъекции sidecar
> - `linkerd viz stat deploy` показывает golden metrics (success rate, RPS, latency) прямо в CLI
> - Traffic splitting через SMI (Service Mesh Interface) для canary деплоя
> - Linkerd не подходит для complex routing (header matching, JWT validation) -- там нужен Istio

## Установка

```bash
# Установить CLI
curl --proto '=https' --tlsv1.2 -sSfL https://run.linkerd.io/install | sh
export PATH=$PATH:$HOME/.linkerd2/bin

# Проверить совместимость кластера
linkerd check --pre

# Установить control plane
linkerd install --crds | kubectl apply -f -
linkerd install | kubectl apply -f -

# Проверить установку
linkerd check
```

Linkerd не требует Helm и не устанавливает сотни CRD. Минимальная инсталляция занимает ~200 МБ RAM на весь control plane против ~1 ГБ у Istio.

## Инъекция sidecar

```bash
# Включить инъекцию для namespace (рекомендуемый способ)
kubectl annotate ns production linkerd.io/inject=enabled

# Или для конкретного deployment
kubectl get deploy api -n production -o yaml \
  | linkerd inject - \
  | kubectl apply -f -

# Проверить что sidecar инжектирован
linkerd check --proxy -n production
```

Linkerd использует собственный proxy написанный на Rust (linkerd2-proxy), а не Envoy. Это даёт меньший footprint: ~10 МБ RAM и ~0.1 vCPU на sidecar против ~50 МБ и ~0.5 vCPU у Envoy.

## mTLS и Identity

mTLS включён по умолчанию после инъекции sidecar -- никаких дополнительных манифестов:

```bash
# Проверить, что трафик зашифрован
linkerd viz stat deploy -n production
# NAME      MESHED   SUCCESS    RPS   LATENCY_P50   LATENCY_P99
# api       3/3      99.8%    42.3   4ms           18ms [tls]
# database  1/1      100%      12.1  2ms           8ms  [tls]

# Детальный tap трафика (реальные запросы)
linkerd viz tap deploy/api -n production
# req id=0:1 proxy=in  src=10.0.0.1:45123 dst=10.0.0.5:8000 tls=true :method=POST :authority=api :path=/v1/users
# rsp id=0:1 proxy=in  src=10.0.0.1:45123 dst=10.0.0.5:8000 tls=true :status=200 latency=12ms

# Identity каждого пода (SPIFFE URI)
linkerd identity -n production my-pod-123
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

Linkerd поддерживает SMI -- стандартизированный API для service mesh. Это позволяет мигрировать между реализациями (Linkerd → Istio) без изменения манифестов traffic splitting.

Более удобный способ через Flagger для автоматического canary:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: api
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  service:
    port: 8000
  analysis:
    interval: 1m
    threshold: 5       # остановить при 5% ошибок
    stepWeight: 10     # увеличивать на 10% каждую минуту
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
```

## Observability

```bash
# Установить Viz extension (Prometheus + Grafana + tap)
linkerd viz install | kubectl apply -f -

# Открыть dashboard
linkerd viz dashboard

# Golden metrics в CLI
linkerd viz stat ns/production
# NAME        MESHED   SUCCESS   RPS    LATENCY_P50   LATENCY_P99
# production  12/12    99.8%    142.3   4ms           18ms

# Детальный мониторинг конкретного сервиса
linkerd viz stat deploy/api -n production

# Реальный трафик в реальном времени (tap)
linkerd viz tap ns/production --to deploy/database

# Top команды по latency
linkerd viz top deploy/api -n production
```

Grafana dashboards из Viz extension показывают golden signals (latency, traffic, errors, saturation) для всех мешированных сервисов без дополнительной конфигурации.

## Multicluster

Linkerd поддерживает федерацию кластеров -- сервисы в разных кластерах видят друг друга как локальные:

```bash
# Установить multicluster extension
linkerd multicluster install | kubectl apply -f -

# Связать два кластера
linkerd multicluster link --cluster-name east | kubectl apply -f - --context=west

# Экспортировать сервис из east в west
kubectl label svc api -n production mirror.linkerd.io/exported=true --context=east
```

После этого в кластере west появляется `api-east.production.svc.cluster.local` -- зеркало сервиса из east. Трафик между кластерами автоматически шифруется через mTLS.

## Когда Linkerd, когда Istio

**Linkerd** выигрывает когда нужен:
- Минимальный overhead на latency (критичны <10 мс)
- Простая установка и эксплуатация
- mTLS и golden metrics без сложной конфигурации
- Маленькие и средние команды без dedicated platform engineers

**Istio** необходим когда нужны:
- Сложные политики маршрутизации (header matching, JWT validation)
- Rate limiting на уровне mesh
- Интеграция с внешними CA для сертификатов
- Управление трафиком к сервисам вне кластера (ServiceEntry)
- Команда с опытом Envoy конфигурации

Для большинства команд Linkerd закрывает 80% потребностей с 20% сложности Istio.

## Итог

Linkerd -- прагматичный выбор для команд, которым нужен service mesh без операционной сложности Istio. Rust proxy даёт минимальный overhead, mTLS из коробки, golden metrics в CLI и UI. SMI совместимость гарантирует возможность миграции, если потребности вырастут.

Следующий шаг -- [Prometheus advanced: recording rules и federation](/posts/2026/03/18-prometheus-advanced/).
