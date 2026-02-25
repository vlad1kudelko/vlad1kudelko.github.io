---
title: "События и шина сообщений: SRP и Domain Events в Python"
description: "Узнайте, как разделить бизнес-логику и побочные эффекты (email, уведомления) с помощью событий предметной области и Message Bus."
pubDate: "2026-02-23"
order: 8
---

# 8. События и шина сообщений (стр. 162-179)

## Новое требование

**Задача**: когда товара нет в наличии, нужно отправить email отделу снабжения.

Куда добавить код отправки email?

### Вариант 1: В контроллере (Flask) — ❌

```python
@app.route("/allocate", methods=['POST'])
def allocate_endpoint():
    try:
        batchref = services.allocate(line, uow)
    except model.OutOfStock:
        send_mail('stock@made.com', f'{line.sku} нет в наличии')
        return jsonify({'error': str(e)}), 400
```

**Проблема**: отправка email — не задача HTTP-слоя.

### Вариант 2: В модели — ❌

```python
def allocate(self, line: OrderLine):
    if not self.can_allocate(line):
        email.send_mail('stock@made.com', f'Нет {line.sku}')
        raise OutOfStock(...)
```

**Проблема**: модель зависит от инфраструктуры! Нельзя отключить email или переключиться на SMS без изменения модели.

### Вариант 3: В сервисном слое — ❌

```python
def allocate(orderid, sku, qty, uow):
    try:
        batchref = product.allocate(line)
        uow.commit()
    except model.OutOfStock:
        email.send_mail(...)
        raise
```

**Проблема**: смешивает бизнес-логику с уведомлениями.

## Принцип единственной обязанности (SRP)

**Правило**: если нельзя описать функцию без слов «затем» или «и», вы нарушаете SRP.

- `allocate()` — ✅ одна обязанность
- `allocate_and_send_email_if_out_of_stock()` — ❌ две обязанности

**Решение**: разделить обязанности с помощью **событий предметной области** и **шины сообщений**.

## События предметной области

**Событие** — объект-значение, факт произошедшего в системе. События не имеют поведения, только данные.

```python
# events.py
from dataclasses import dataclass

class Event:
    pass

@dataclass
class OutOfStock(Event):
    sku: str
```

### Модель инициирует события

Модель регистрирует события в списке `.events`:

```python
# model.py
class Product:
    def __init__(self, sku: str, batches: list[Batch]):
        self.sku = sku
        self.batches = batches
        self.events = []  # Список событий

    def allocate(self, line: OrderLine) -> str:
        try:
            batch = next(b for b in sorted(self.batches) if b.can_allocate(line))
            batch.allocate(line)
            return batch.reference
        except StopIteration:
            self.events.append(OutOfStock(line.sku))  # ← Регистрируем событие
            return None
```

**Важно**: мы убираем исключение `OutOfStock`. Событие заменяет его.

### Тест на событие

```python
def test_records_out_of_stock_event_if_cannot_allocate():
    batch = Batch('batch1', 'SMALL-FORK', 10, eta=today)
    product = Product(sku="SMALL-FORK", batches=[batch])
    
    product.allocate(OrderLine('order1', 'SMALL-FORK', 10))
    result = product.allocate(OrderLine('order2', 'SMALL-FORK', 1))
    
    assert product.events[-1] == OutOfStock(sku="SMALL-FORK")
    assert result is None
```

## Шина сообщений

**Шина сообщений** — система «издатель-подписчик». Направляет события обработчикам.

```python
# messagebus.py
HANDLERS = {
    OutOfStock: [send_out_of_stock_notification],
}

def handle(event: Event):
    for handler in HANDLERS[type(event)]:
        handler(event)

def send_out_of_stock_notification(event: OutOfStock):
    email.send_mail(
        'stock@made.com',
        f'Артикула {event.sku} нет в наличии',
    )
```

**Вызов**:

```python
product.allocate(line)
for event in product.events:
    messagebus.handle(event)  # → вызовет send_out_of_stock_notification
```

## Три варианта интеграции

### Вариант 1: Сервисный слой берёт события из модели

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

**Преимущества**: чисто, понятно.

**Недостатки**: нужно помнить о вызове `messagebus.handle()` в каждом обработчике.

### Вариант 2: Сервисный слой инициирует собственные события

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

**Преимущества**: контроль над событиями.

**Недостатки**: дублирование логики (модель уже создала событие!).

### Вариант 3: UoW публикует события (рекомендуется)

UoW автоматически собирает и публикует события после фиксации:

```python
# unit_of_work.py
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

Репозиторий отслеживает загруженные агрегаты:

```python
# repository.py
class AbstractRepository:
    def __init__(self):
        self.seen = set()  # ← Отслеживает загруженные агрегаты

    def get(self, sku) -> Product:
        product = self._get(sku)
        if product:
            self.seen.add(product)  # ← Запомнить
        return product
```

**Сервисный слой остаётся чистым**:

```python
def allocate(orderid, sku, qty, uow):
    with uow:
        product = uow.products.get(sku=line.sku)
        batchref = product.allocate(line)
        uow.commit()  # ← Автоматически опубликует события!
    return batchref
```

**Преимущества**:
- Сервисный слой не знает о событиях
- Автоматически, нет дублирования
- Элегантно

**Недостатки**: сложнее понять, что происходит «под капотом».

## Итоговая архитектура

```
Flask → Сервисный слой → UoW → Публикация событий
                              ↓
                         Шина сообщений → Обработчики → send_mail()
                              ↑
Предметная область → Событие: OutOfStock
```

## Выводы

1. **События предметной области** — факты, произошедшие в системе
2. **Шина сообщений** — направляет события обработчикам
3. **Принцип единственной обязанности** — разделяй оркестровку и бизнес-логику
4. **UoW + события** — элегантная автоматическая публикация
5. **Не смешивайте исключения и события** для одного и того же случая

## Вопросы

1. Что такое событие предметной области? Приведите пример.
2. Зачем нужна шина сообщений?
3. Почему не стоит отправлять email прямо в модели?
4. Какой из трёх вариантов интеграции лучший и почему?
5. Что такое принцип единственной обязанности (SRP)?
