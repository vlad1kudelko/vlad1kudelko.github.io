---
title: "Message Bus и обработчики: архитектура на событиях"
description: "Превратите ваше приложение в мощный процессор событий. Узнайте, как рефакторить сервисы в обработчики и реализовать сложные цепочки бизнес-логики через шину."
pubDate: "2026-02-23"
order: 9
---

# 9. Катимся в город на шине сообщений (стр. 180-199)

Новое требование приводит к новой архитектуре

Сценарий:
 - Обнаружили, что партия товара повреждена (3 матраса промокли)
 - Нужно уменьшить количество в партии
 - Но: если уже размещены заказы на этот товар — отменить их и разместить заново!

Бизнес-правило:

```
Изменение количества партии → Отмена размещений → Повторное размещение
```

События:

```
BatchQuantityChanged (количество изменилось)
    ↓
AllocationRequired (требуется размещение для заказа X)
    ↓
Allocated (заказ размещён в партии Y)
```

Архитектура: всё через шину сообщений

Было:

```
Flask → Сервисный слой → UoW → События → Обработчики
```

Станет:

```
Flask → Шина сообщений → Обработчики → UoW → События → Обработчики
```

Рефакторинг функций служб для обработчиков сообщений

`Цель`: превратить всё в обработчики событий.

## Шаг 1: Определяем события для API-входов

```python
@dataclass
class BatchCreated(Event):
    ref: str
    sku: str
    qty: int
    eta: Optional[date] = None

@dataclass
class AllocationRequired(Event):
    orderid: str
    sku: str
    qty: int
```

## Шаг 2: Переименовываем `services.py` → `handlers.py`

До:

```python
def allocate(orderid: str, sku: str, qty: int, uow):
    line = OrderLine(orderid, sku, qty)
    ...
```

После:

```python
def allocate(event: events.AllocationRequired, uow):
    line = OrderLine(event.orderid, event.sku, event.qty)
    ...
```

Все обработчики теперь одинаковые:

```python
def add_batch(event: events.BatchCreated, uow):
    with uow:
        product = uow.products.get(sku=event.sku)
        ...

def allocate(event: events.AllocationRequired, uow):
    with uow:
        product = uow.products.get(sku=event.sku)
        ...

def send_out_of_stock_notification(event: events.OutOfStock, uow):
    email.send('stock@made.com', f'Артикула {event.sku} нет в наличии')
```

## Шина сообщений теперь собирает события из UoW

Новая шина сообщений с очередью:

```python
def handle(event: events.Event, uow: AbstractUnitOfWork):
    results = []
    queue = [event]
    while queue:
        event = queue.pop(0)
        for handler in HANDLERS[type(event)]:
            handler(event, uow=uow)
            results.append(handler(event, uow=uow))
        # Собираем новые события из UoW
        queue.extend(uow.collect_new_events())
    return results
```

UoW больше не публикует события сам:

```python
class AbstractUnitOfWork:
    def commit(self):
        self._commit()
        # Больше не вызываем publish_events()!

    def collect_new_events(self):
        for product in self.products.seen:
            while product.events:
                yield product.events.pop(0)  # ← Просто отдаём события
```

`Преимущество`: шина сообщений управляет очередью, UoW только хранит события.

## Изменение API для работы с событиями

Flask теперь создаёт события:

До:

```python
@app.route("/allocate", methods=['POST'])
def allocate_endpoint():
    batchref = services.allocate(
        request.json['orderid'],
        request.json['sku'],
        request.json['qty'],
        unit_of_work.SqlAlchemyUnitOfWork()
    )
```

После:

```python
@app.route("/allocate", methods=['POST'])
def allocate_endpoint():
    event = events.AllocationRequired(
        request.json['orderid'],
        request.json['sku'],
        request.json['qty']
    )
    results = messagebus.handle(event, unit_of_work.SqlAlchemyUnitOfWork())
    batchref = results.pop(0)
    return jsonify({'batchref': batchref}), 201
```

Теперь приложение — это процессор событий!

## Реализация нового требования

Новое событие:

```python
@dataclass
class BatchQuantityChanged(Event):
    ref: str
    qty: int
```

Тест:

```python
class TestChangeBatchQuantity:
    def test_changes_available_quantity(self):
        uow = FakeUnitOfWork()
        # Создаём партию
        messagebus.handle(
            events.BatchCreated("batch1", "ADORABLE-SETTEE", 100, None),
            uow
        )
        # Изменяем количество
        messagebus.handle(events.BatchQuantityChanged("batch1", 50), uow)
        assert batch.available_quantity == 50

    def test_reallocates_if_necessary(self):
        uow = FakeUnitOfWork()
        # Создаём 2 партии и размещаем 2 заказа в batch1
        messagebus.handle(events.BatchCreated("batch1", "TABLE", 50, None), uow)
        messagebus.handle(events.BatchCreated("batch2", "TABLE", 50, today), uow)
        messagebus.handle(events.AllocationRequired("order1", "TABLE", 20), uow)
        messagebus.handle(events.AllocationRequired("order2", "TABLE", 20), uow)
        # Уменьшаем batch1 с 50 до 25
        messagebus.handle(events.BatchQuantityChanged("batch1", 25), uow)
        # Один заказ должен быть переразмещён в batch2
        assert batch1.available_quantity == 5   # 25 - 20
        assert batch2.available_quantity == 30  # 50 - 20
```

Обработчик:

```python
def change_batch_quantity(event: events.BatchQuantityChanged, uow):
    with uow:
        product = uow.products.get_by_batchref(batchref=event.ref)
        product.change_batch_quantity(ref=event.ref, qty=event.qty)
        uow.commit()
```

Модель предметной области:

```python
class Product:
    def change_batch_quantity(self, ref: str, qty: int):
        batch = next(b for b in self.batches if b.reference == ref)
        batch._purchased_quantity = qty
        # Если товара не хватает — отменяем размещения
        while batch.available_quantity < 0:
            line = batch.deallocate_one()
            # Создаём событие для повторного размещения!
            self.events.append(
                events.AllocationRequired(line.orderid, line.sku, line.qty)
            )

class Batch:
    def deallocate_one(self) -> OrderLine:
        return self._allocations.pop()
```

Шина сообщений обновляется:

```python
HANDLERS = {
    events.BatchCreated: [handlers.add_batch],
    events.BatchQuantityChanged: [handlers.change_batch_quantity],
    events.AllocationRequired: [handlers.allocate],
    events.OutOfStock: [handlers.send_out_of_stock_notification],
}
```

## Поток выполнения

```
┌─────────────────────────────────────────────────────────────────┐
│  API: BatchQuantityChanged("batch1", 25)                        │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  Шина сообщений                                                 │
│  queue = [BatchQuantityChanged]                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  change_batch_quantity()                                        │
│  • product.change_batch_quantity(ref="batch1", qty=25)          │
│  • batch.available_quantity = -15 (< 0!)                        │
│  • deallocate_one() → OrderLine("order1", "TABLE", 20)          │
│  • product.events.append(AllocationRequired(...))               │
│  • uow.commit()                                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  Шина сообщений (продолжение)                                   │
│  queue = [AllocationRequired("order1", ...)]                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│  allocate()                                                     │
│  • Размещает заказ в batch2                                     │
│  • uow.commit()                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Юнит-тест обработчиков в изоляции (опционально)

`Проблема`: тестировать всю цепочку событий сложно.

`Решение`: поддельная шина сообщений:

```python
class FakeMessageBus(AbstractMessageBus):
    def __init__(self):
        self.events_published = []

    def handle(self, event: events.Event):
        for handler in self.HANDLERS[type(event)]:
            handler(event)

class FakeUnitOfWorkWithFakeMessageBus(FakeUnitOfWork):
    def __init__(self):
        super().__init__()
        self.events_published = []
        self.messagebus = FakeMessageBus()

    def collect_new_events(self):
        for product in self.products.seen:
            while product.events:
                event = product.events.pop(0)
                self.events_published.append(event)
                self.messagebus.handle(event)
```

Тест в изоляции:

```python
def test_reallocates_if_necessary_isolated():
    uow = FakeUnitOfWorkWithFakeMessageBus()
    # Тестируем только change_batch_quantity
    messagebus.handle(events.BatchQuantityChanged("batch1", 25), uow)
    # Проверяем, что было создано событие AllocationRequired
    assert len(uow.events_published) == 1
    assert isinstance(uow.events_published[0], events.AllocationRequired)
```

## Ключевые выводы Главы 9:

 1. Все обработчики событий — API, внутренние рабочие потоки
 2. Шина сообщений с очередью — обрабатывает цепочки событий
 3. События как входные данные — структурированный API
 4. Разделение на UoW — каждая операция атомарна
 5. Переразмещение через события — BatchQuantityChanged → AllocationRequired

## Вопросы для проверки:

 1. Зачем превращать функции служб в обработчики событий?
 2. Как шина сообщений обрабатывает цепочки событий?
 3. Почему BatchQuantityChanged создаёт новые события AllocationRequired?
 4. В чём разница между тестированием «от края до края» и изолированным тестированием?
