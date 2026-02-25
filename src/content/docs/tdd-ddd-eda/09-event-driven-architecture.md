---
title: "Message Bus и обработчики: архитектура на событиях"
description: "Превратите ваше приложение в процессор событий. Узнайте, как рефакторить сервисы в обработчики и реализовать сложные цепочки через шину сообщений."
pubDate: "2026-02-23"
order: 9
---

# 9. Катимся в город на шине сообщений (стр. 180-199)

## Новое требование

**Сценарий**: обнаружили, что партия товара повреждена (3 матраса промокли). Нужно уменьшить количество в партии.

**Проблема**: если на эту партию уже размещены заказы — их нужно отменить и разместить заново!

**Бизнес-правило**:

```
Изменение количества партии → Отмена размещений → Повторное размещение
```

**События**:

```
BatchQuantityChanged (количество изменилось)
    ↓
AllocationRequired (требуется размещение для заказа X)
    ↓
Allocated (заказ размещён в партии Y)
```

## Архитектура: всё через шину сообщений

**Было**:

```
Flask → Сервисный слой → UoW → События → Обработчики
```

**Станет**:

```
Flask → Шина сообщений → Обработчики → UoW → События → Обработчики
```

Теперь **всё** — обработчики событий. API-вызовы и внутренние рабочие потоки обрабатываются одинаково.

## Рефакторинг служб в обработчики

### Шаг 1: Определяем события для API-входов

```python
# events.py
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

### Шаг 2: Переименовываем `services.py` → `handlers.py`

**До**:

```python
def allocate(orderid: str, sku: str, qty: int, uow):
    line = OrderLine(orderid, sku, qty)
    ...
```

**После**:

```python
def allocate(event: AllocationRequired, uow):
    line = OrderLine(event.orderid, event.sku, event.qty)
    ...
```

**Все обработчики теперь одинаковые**:

```python
def add_batch(event: BatchCreated, uow):
    with uow:
        product = uow.products.get(sku=event.sku)
        ...

def allocate(event: AllocationRequired, uow):
    with uow:
        product = uow.products.get(sku=event.sku)
        ...

def send_out_of_stock_notification(event: OutOfStock, uow):
    email.send('stock@made.com', f'Артикула {event.sku} нет в наличии')
```

### Шаг 3: Шина сообщений управляет очередью событий

**Новая шина сообщений с очередью**:

```python
# messagebus.py
def handle(event: Event, uow: AbstractUnitOfWork):
    results = []
    queue = [event]
    
    while queue:
        event = queue.pop(0)
        for handler in HANDLERS[type(event)]:
            handler(event, uow=uow)
        
        # Собираем новые события из UoW
        queue.extend(uow.collect_new_events())
    
    return results
```

**UoW больше не публикует события сам** — только отдаёт их шине:

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

**Преимущество**: шина сообщений управляет очередью, UoW только хранит события.

### Шаг 4: Изменение API для работы с событиями

**Flask теперь создаёт события**:

```python
# flask_app.py
@app.route("/allocate", methods=['POST'])
def allocate_endpoint():
    event = AllocationRequired(
        request.json['orderid'],
        request.json['sku'],
        request.json['qty']
    )
    results = messagebus.handle(event, unit_of_work.SqlAlchemyUnitOfWork())
    batchref = results.pop(0)
    return jsonify({'batchref': batchref}), 201
```

**Теперь приложение — это процессор событий!**

## Реализация нового требования

### Новое событие

```python
@dataclass
class BatchQuantityChanged(Event):
    ref: str
    qty: int
```

### Тест

```python
class TestChangeBatchQuantity:
    def test_reallocates_if_necessary(self):
        uow = FakeUnitOfWork()
        
        # Создаём 2 партии
        messagebus.handle(BatchCreated("batch1", "TABLE", 50, None), uow)
        messagebus.handle(BatchCreated("batch2", "TABLE", 50, today), uow)
        
        # Размещаем 2 заказа в batch1
        messagebus.handle(AllocationRequired("order1", "TABLE", 20), uow)
        messagebus.handle(AllocationRequired("order2", "TABLE", 20), uow)
        
        # Уменьшаем batch1 с 50 до 25
        messagebus.handle(BatchQuantityChanged("batch1", 25), uow)
        
        # Один заказ должен быть переразмещён в batch2
        assert batch1.available_quantity == 5   # 25 - 20
        assert batch2.available_quantity == 30  # 50 - 20
```

### Обработчик

```python
def change_batch_quantity(event: BatchQuantityChanged, uow):
    with uow:
        product = uow.products.get_by_batchref(batchref=event.ref)
        product.change_batch_quantity(ref=event.ref, qty=event.qty)
        uow.commit()
```

### Модель предметной области

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
                AllocationRequired(line.orderid, line.sku, line.qty)
            )

class Batch:
    def deallocate_one(self) -> OrderLine:
        return self._allocations.pop()
```

### Шина сообщений обновляется

```python
HANDLERS = {
    BatchCreated: [add_batch],
    BatchQuantityChanged: [change_batch_quantity],
    AllocationRequired: [allocate],
    OutOfStock: [send_out_of_stock_notification],
}
```

## Поток выполнения

```
1. API: BatchQuantityChanged("batch1", 25)
   ↓
2. Шина сообщений: queue = [BatchQuantityChanged]
   ↓
3. change_batch_quantity():
   • product.change_batch_quantity(ref="batch1", qty=25)
   • batch.available_quantity = -15 (< 0!)
   • deallocate_one() → OrderLine("order1", "TABLE", 20)
   • product.events.append(AllocationRequired(...))
   • uow.commit()
   ↓
4. Шина сообщений (продолжение):
   queue = [AllocationRequired("order1", ...)]
   ↓
5. allocate():
   • Размещает заказ в batch2
   • uow.commit()
```

## Юнит-тест обработчиков в изоляции (опционально)

**Проблема**: тестировать всю цепочку событий сложно.

**Решение**: поддельная шина сообщений:

```python
class FakeMessageBus:
    def __init__(self):
        self.events_published = []

    def handle(self, event: Event):
        for handler in HANDLERS[type(event)]:
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

**Тест в изоляции**:

```python
def test_reallocates_if_necessary_isolated():
    uow = FakeUnitOfWorkWithFakeMessageBus()
    
    messagebus.handle(BatchQuantityChanged("batch1", 25), uow)
    
    # Проверяем, что было создано событие AllocationRequired
    assert len(uow.events_published) == 1
    assert isinstance(uow.events_published[0], AllocationRequired)
```

## Выводы

1. **Все обработчики событий** — API, внутренние рабочие потоки
2. **Шина сообщений с очередью** — обрабатывает цепочки событий
3. **События как входные данные** — структурированный API
4. **Разделение на UoW** — каждая операция атомарна
5. **Переразмещение через события** — BatchQuantityChanged → AllocationRequired

## Вопросы

1. Зачем превращать функции служб в обработчики событий?
2. Как шина сообщений обрабатывает цепочки событий?
3. Почему BatchQuantityChanged создаёт новые события AllocationRequired?
4. В чём разница между тестированием «от края до края» и изолированным тестированием?
