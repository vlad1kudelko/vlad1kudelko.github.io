---
title: "События и шина сообщений: SRP и Domain Events в Python"
description: "Узнайте, как разделить бизнес-логику и побочные эффекты (email, уведомления) с помощью событий предметной области и Message Bus. Внедрите чистую архитектуру через SRP."
pubDate: "2026-02-23"
order: 8
---

# 8. События и шина сообщений (стр. 162-179)

`Новое требование`: когда товара нет в наличии, нужно отправить email отделу снабжения.

Плохие решения:

## Вариант 1: В контроллере (Flask)

```python
@app.route("/allocate", methods=['POST'])
def allocate_endpoint():
    try:
        batchref = services.allocate(line, uow)
    except model.OutOfStock:
        send_mail('stock@made.com', f'{line.sku} нет в наличии')  # ← Плохо!
        return jsonify({'error': str(e)}), 400
```

❌ Отправка email — не задача HTTP-слоя

## Вариант 2: В модели

```python
def allocate(self, line: OrderLine):
    if not self.can_allocate(line):
        email.send_mail('stock@made.com', f'Нет {line.sku}')  # ← Ещё хуже!
        raise OutOfStock(...)
```

❌ Модель зависит от инфраструктуры!

## Вариант 3: В сервисном слое

```python
def allocate(orderid, sku, qty, uow):
    try:
        batchref = product.allocate(line)
        uow.commit()
    except model.OutOfStock:
        email.send_mail(...)  # ← Тоже не идеально
        raise
```

❌ Смешивает бизнес-логику с уведомлениями

## Принцип единственной обязанности (SRP)

`Правило`: если нельзя описать функцию без слов «затем» или «и», вы нарушаете SRP.

 - allocate() — ✅ одна обязанность
 - allocate_and_send_email_if_out_of_stock() — ❌ две обязанности

`Решение`: разделить обязанности с помощью событий предметной области.

## Катимся на шине сообщений!

Вводим два паттерна:
 1. События предметной области (Domain Events)
 2. Шина сообщений (Message Bus)

Модель регистрирует события. Событие — объект-значение, факт произошедшего:

```python
from dataclasses import dataclass

class Event:
    pass

@dataclass
class OutOfStock(Event):
    sku: str
```

Модель инициирует события:

```python
class Product:
    def __init__(self, sku: str, batches: List[Batch]):
        self.sku = sku
        self.batches = batches
        self.events = []  # ← Список событий

    def allocate(self, line: OrderLine) -> str:
        try:
            batch = next(b for b in sorted(self.batches)
                        if b.can_allocate(line))
            batch.allocate(line)
            return batch.reference
        except StopIteration:
            self.events.append(OutOfStock(line.sku))  # ← Регистрируем событие
            return None
```

Тест:

```python
def test_records_out_of_stock_event_if_cannot_allocate():
    batch = Batch('batch1', 'SMALL-FORK', 10, eta=today)
    product = Product(sku="SMALL-FORK", batches=[batch])
    product.allocate(OrderLine('order1', 'SMALL-FORK', 10))
    result = product.allocate(OrderLine('order2', 'SMALL-FORK', 1))
    assert product.events[-1] == OutOfStock(sku="SMALL-FORK")
    assert result is None
```

Шина сообщений попарно сопоставляет события с обработчиками

Шина сообщений = система «издатель-подписчик»:

```python
def handle(event: events.Event):
    for handler in HANDLERS[type(event)]:
        handler(event)

def send_out_of_stock_notification(event: events.OutOfStock):
    email.send_mail(
        'stock@made.com',
        f'Артикула {event.sku} нет в наличии',
    )

HANDLERS = {
    events.OutOfStock: [send_out_of_stock_notification],
}
```

Вызов:

```python
# Где-то в коде
product.allocate(line)
for event in product.events:
    messagebus.handle(event)  # → вызовет send_out_of_stock_notification
```

Три варианта интеграции:

## Вариант 1: Сервисный слой берёт события из модели

```python
def allocate(orderid, sku, qty, uow):
    line = OrderLine(orderid, sku, qty)
    with uow:
        product = uow.products.get(sku=line.sku)
        batchref = product.allocate(line)
        uow.commit()
    # После фиксации — обработать события
    messagebus.handle(product.events)
    return batchref
```

✅ Чисто, понятно
❌ Нужно помнить о вызове messagebus.handle() в каждом обработчике

## Вариант 2: Сервисный слой инициирует собственные события

```python
def allocate(orderid, sku, qty, uow):
    with uow:
        product = uow.products.get(sku=line.sku)
        batchref = product.allocate(line)
        uow.commit()
        if batchref is None:
            messagebus.handle(OutOfStock(line.sku))  # ← Создаём событие вручную
    return batchref
```

✅ Контроль над событиями
❌ Дублирование логики (модель уже создала событие!)

## Вариант 3: UoW публикует события в шину сообщений (рекомендуется)

UoW автоматически собирает события:

```python
class AbstractUnitOfWork:
    def commit(self):
        self._commit()
        self.publish_events()  # ← После фиксации

    def publish_events(self):
        for product in self.products.seen:  # ← Все загруженные агрегаты
            while product.events:
                event = product.events.pop(0)
                messagebus.handle(event)
```

Репозиторий отслеживает агрегаты:

```python
class AbstractRepository:
    def __init__(self):
        self.seen = set()  # ← Отслеживает загруженные агрегаты

    def get(self, sku) -> Product:
        product = self._get(sku)
        if product:
            self.seen.add(product)  # ← Запомнить
        return product
```

Сервисный слой снова чист:

```python
def allocate(orderid, sku, qty, uow):
    with uow:
        product = uow.products.get(sku=line.sku)
        batchref = product.allocate(line)
        uow.commit()  # ← Автоматически опубликует события!
    return batchref
```

✅ Сервисный слой не знает о событиях
✅ Автоматически, нет дублирования
❌ Сложнее понять, что происходит «под капотом»

## Ключевые выводы Главы 8:

 1. События предметной области — факты, произошедшие в системе
 2. Шина сообщений — направляет события обработчикам
 3. Принцип единственной обязанности — разделяй оркестровку и бизнес-логику
 4. UoW + события — элегантная автоматическая публикация
 5. Не смешивайте исключения и события для одного и того же случая

## Вопросы для проверки:

 1. Что такое событие предметной области? Приведите пример.
 2. Зачем нужна шина сообщений?
 3. Почему не стоит отправлять email прямо в модели?
 4. Какой из трёх вариантов интеграции лучший и почему?
