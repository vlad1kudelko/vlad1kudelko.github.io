---
title: "Интеграция микросервисов: события, Redis и борьба с грязью"
description: "Узнайте, как избежать циклической зависимости в микросервисах через Pub/Sub и Redis. Внедрите асинхронный обмен сообщениями."
pubDate: "2026-02-23"
order: 11
---

# 11. Событийно-управляемая архитектура: использование событий для интеграции микросервисов (стр. 211-225)

## Распределённый комок грязи, или Мыслить существительными

**Проблема**: наивный подход к микросервисам — деление по существительным:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Заказы    │───▶│   Партии    │───▶│    Склад    │
│  (Orders)   │    │  (Batches)  │    │ (Warehouse) │
└─────────────┘    └─────────────┘    └─────────────┘
       ▲                                      │
       └──────────────────────────────────────┘
                (циклическая зависимость!)
```

**Сценарий 1** (заказ): `Заказы → Партии → Склад` ✅

**Сценарий 2** (брак на складе): `Склад → Партии → Заказы` ✅

**Результат**: циклические зависимости, распределённый комок грязи!

## Обработка ошибок в распределенных системах

**Сценарий**: сеть упала во время размещения заказа

```
Клиент → Заказы → [СБОЙ] → Партии ❓
```

**Проблема**: временная связанность (temporal coupling) — все службы должны работать одновременно.

**Типы связанности**:

**Согласованность исполнения** — компоненты должны знать порядок операций. Пример: RPC-вызовы.

**Согласованность времени** — компоненты должны работать одновременно. Пример: синхронные HTTP-вызовы.

**Согласованность имени** — компоненты согласуют только имя события. Пример: события ✅

**Решение**: думать глаголами, а не существительными!

**Вместо**:
- Служба заказов
- Служба партий

**Используем**:
- Служба размещения заказов
- Служба управления партиями

**Новая архитектура**:

```
┌────────────────────────────────────────────────┐
│  Redis Pub/Sub                                 │
│  • change_batch_quantity (входящие)            │
│  • line_allocated (исходящие)                  │
└────────────────────────────────────────────────┘
         ↓                              ↑
    Consumer                        Publisher
         ↓                              ↑
┌────────────────────────────────────────────────┐
│  Служба размещения заказов                     │
│  • Принимает команды                           │
│  • Публикует события                           │
│  • Независима от других служб                  │
└────────────────────────────────────────────────┘
```

**Преимущества**:
1. Службы независимы — можно принимать заказы, даже если Партии не работают
2. Меньше связанности — легко изменить порядок операций
3. Конечная согласованность — всё согласуется со временем

## Использование канала «издатель/подписчик» Redis

### Сквозной тест

```python
def test_change_batch_quantity_leading_to_reallocation():
    # 1. Создаём 2 партии и размещаем заказ в первой
    orderid, sku = random_orderid(), random_sku()
    earlier_batch = random_batchref('old')
    later_batch = random_batchref('newer')
    
    api_client.post_to_add_batch(earlier_batch, sku, qty=10, eta='2011-01-02')
    api_client.post_to_add_batch(later_batch, sku, qty=10, eta='2011-01-02')
    response = api_client.post_to_allocate(orderid, sku, 10)
    assert response.json()['batchref'] == earlier_batch
    
    # 2. Подписываемся на исходящие события
    subscription = redis_client.subscribe_to('line_allocated')
    
    # 3. Отправляем команду на уменьшение партии
    redis_client.publish_message('change_batch_quantity', {
        'batchref': earlier_batch,
        'qty': 5  # ← Меньше, чем в заказе!
    })
    
    # 4. Ждём событие о переразмещении
    for attempt in Retrying(stop=stop_after_delay(3)):
        with attempt:
            message = subscription.get_message(timeout=1)
            if message:
                data = json.loads(message['data'])
                assert data['orderid'] == orderid
                assert data['batchref'] == later_batch  # ← Переразмещено!
```

### Redis — ещё один тонкий адаптер

**Потребитель событий (входящие)**:

```python
# entrypoints/redis_eventconsumer.py
r = redis.Redis(**config.get_redis_host_and_port())

def main():
    pubsub = r.pubsub(ignore_subscribe_messages=True)
    pubsub.subscribe('change_batch_quantity')
    for m in pubsub.listen():
        handle_change_batch_quantity(m)

def handle_change_batch_quantity(m):
    data = json.loads(m['data'])
    cmd = commands.ChangeBatchQuantity(
        ref=data['batchref'],
        qty=data['qty']
    )
    messagebus.handle(cmd, uow=unit_of_work.SqlAlchemyUnitOfWork())
```

**Издатель событий (исходящие)**:

```python
# adapters/redis_eventpublisher.py
r = redis.Redis(**config.get_redis_host_and_port())

def publish(channel, event: Event):
    r.publish(channel, json.dumps(asdict(event)))

# handlers.py
def publish_allocated_event(event: Allocated, uow):
    redis_eventpublisher.publish('line_allocated', event)
```

**Новое событие**:

```python
@dataclass
class Allocated(Event):
    orderid: str
    sku: str
    qty: int
    batchref: str  # ← Где размещено
```

**Модель обновляется**:

```python
class Product:
    def allocate(self, line: OrderLine) -> str:
        batch = next(b for b in sorted(self.batches) if b.can_allocate(line))
        batch.allocate(line)
        # ← Публикуем событие!
        self.events.append(Allocated(
            orderid=line.orderid,
            sku=line.sku,
            qty=line.qty,
            batchref=batch.reference
        ))
        return batch.reference
```

## Внутренние события против внешних

**Важно**: разделяйте внутренние и внешние события!

**Внутренние** — используются только внутри системы. Пример: `OutOfStock`.

**Внешние** — публикуются наружу для других систем. Пример: `Allocated`.

**Почему это важно**:
- Внутренние события можно менять без согласования с другими командами
- Внешние события — это публичный API, их изменение требует версии

## Выводы

1. **Делите по глаголам, а не по существительным** — службы по бизнес-процессам
2. **Асинхронные события уменьшают связанность** между службами
3. **Redis Pub/Sub** — простой брокер сообщений
4. **Входящие команды → обработка → Исходящие события**
5. **Конечная согласованность** — новая концепция для освоения
6. **Разделяйте внутренние и внешние события**

## Вопросы

1. Почему деление микросервисов по существительным приводит к проблемам?
2. Что такое временная связанность?
3. Как Redis Pub/Sub помогает интегрировать службы?
4. В чём разница между внутренними и внешними событиями?
5. Что такое согласованность имени и почему она лучше согласованности времени?
