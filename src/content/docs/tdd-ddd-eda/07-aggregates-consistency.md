---
title: "Агрегаты и границы согласованности: защита инвариантов"
description: "Узнайте, как паттерн Агрегат защищает целостность данных и решает проблемы параллелизма. Внедрите оптимистичную блокировку и версии объектов. Читайте далее!"
pubDate: "2026-02-23"
order: 7
---

# 7. Агрегаты и границы согласованности (стр. 136-155)

Почему бы просто не записать всё в электронную таблицу?

`Проблема`: как обеспечить целостность данных при параллельном доступе?

Инварианты — условия, которые всегда истинны:
 - available_quantity >= 0
 - товарная позиция размещена только в одной партии

## Инварианты, ограничения и согласованность

```
┌─────────────┬─────────────────────────────────┬───────────────────────────────┐
│ Термин      │ Определение                     │ Пример                        │
├─────────────┼─────────────────────────────────┼───────────────────────────────┤
│ Ограничение │ Правило, лимитирующее состояния │ Нельзя заказать -5 товаров    │
│ Инвариант   │ Условие, всегда истинное        │ qty >= 0 после любой операции │
└─────────────┴─────────────────────────────────┴───────────────────────────────┘
```

Проблема параллелизма:
- `Транзакция 1`: читает qty=10
- `Транзакция 2`: читает qty=10
- `Транзакция 1`: заказывает 8, пишет qty=2
- `Транзакция 2`: заказывает 8, пишет qty=2  ← ОШИБКА! Должно быть -6

## Что такое агрегат

`Агрегат` — кластер объектов, рассматриваемых как единое целое для изменения данных.

Ключевые свойства:
 1. Загружается целиком из хранилища
 2. Изменять можно только через методы агрегата
 3. Имеет корневую сущность (корень агрегата)

Пример:

```python
# Корзина — агрегат
class ShoppingCart:
    def __init__(self, items: list[CartItem]):
        self.items = items

    def add_item(self, product_id, qty):
        # Инвариант: нельзя добавить отрицательное количество
        if qty <= 0:
            raise ValueError("qty must be positive")
        self.items.append(CartItem(product_id, qty))
```

## Выбор агрегата

`Вопрос`: что должно быть агрегатом в нашей системе?

Варианты:
 - Shipment (поставка) — ❌ слишком крупно
 - Warehouse (склад) — ❌ слишком крупно
 - Product (артикул) — ✅ подходит!

Решение:

```python
class Product:
    def __init__(self, sku: str, batches: List[Batch]):
        self.sku = sku
        self.batches = batches  # ← Коллекция партий

    def allocate(self, line: OrderLine) -> str:
        """Разместить заказ в одной из партий"""
        try:
            batch = next(b for b in sorted(self.batches)
                        if b.can_allocate(line))
            batch.allocate(line)
            return batch.reference
        except StopIteration:
            raise OutOfStock(f'Артикула {line.sku} нет в наличии')
```

До:

```
Сервисный слой → list(all batches) → allocate(line, batches)
```

После:

```
Сервисный слой → get(product) → product.allocate(line)
```

Один агрегат = один репозиторий

`Правило`: репозитории возвращают только агрегаты!

```python
# Было
class AbstractRepository:
    def get(self, reference) -> Batch:  # ← Batch не агрегат!

# Стало
class AbstractProductRepository:
    def get(self, sku) -> Product:  # ← Product — агрегат!
```

Сервисный слой:

```python
def add_batch(ref: str, sku: str, qty: int, eta: date, uow):
    with uow:
        product = uow.products.get(sku=sku)
        if product is None:
            product = Product(sku, batches=[])
            uow.products.add(product)
        product.batches.append(Batch(ref, sku, qty, eta))
        uow.commit()

def allocate(orderid: str, sku: str, qty: int, uow):
    with uow:
        product = uow.products.get(sku=sku)
        if product is None:
            raise InvalidSku(f'Недопустимый артикул {sku}')
        batchref = product.allocate(OrderLine(orderid, sku, qty))
        uow.commit()
        return batchref
```

А что насчет производительности?

`Вопрос`: зачем загружать все партии, если нужна одна?

Ответы:

 1. Один запрос на чтение/запись — проще и надёжнее
 2. Данные маленькие — строки + числа, загружаются быстро
 3. 20 активных партий — старые партии архивируются

Если данных много:
 - Ленивая загрузка (SQLAlchemy сделает сам)
 - Пересмотреть агрегат (по регионам, складам)

## Оптимистичный параллелизм с номерами версий

`Проблема`: две транзакции обновляют один продукт одновременно

`Решение`: номера версий

`Транзакция 1`: читает Product(version=3)
`Транзакция 2`: читает Product(version=3)
`Транзакция 1`: allocate() → Product(version=4) → commit() ✅
`Транзакция 2`: allocate() → Product(version=4) → commit() ❌ (версия 4 уже есть!)

Реализация:

```python
class Product:
    def __init__(self, sku: str, batches: List[Batch], version: int = 0):
        self.sku = sku
        self.batches = batches
        self.version = version  # ← Номер версии

    def allocate(self, line: OrderLine) -> str:
        batch = next(b for b in sorted(self.batches) if b.can_allocate(line))
        batch.allocate(line)
        self.version += 1  # ← Увеличиваем версию
        return batch.reference
```

SQL (PostgreSQL):

```sql
UPDATE products
SET version = version + 1, ...
WHERE sku = :sku AND version = :old_version
-- Если строк обновлено 0 → конфликт версий!
```

Обработка конфликта:

```python
def allocate_with_retry(orderid, sku, qty, uow, max_retries=3):
    for attempt in range(max_retries):
        try:
            with uow:
                product = uow.products.get(sku=sku)
                batchref = product.allocate(OrderLine(orderid, sku, qty))
                uow.commit()
                return batchref
        except ConcurrencyError:
            if attempt == max_retries - 1:
                raise
            # Повторить попытку
```

## Ключевые выводы Главы 7:

 1. Агрегат — граница согласованности, загружается целиком
 2. Один агрегат = один репозиторий
 3. Product — агрегат для службы размещения заказов
 4. Номера версий — оптимистичный параллелизм
 5. Повторные попытки при конфликте версий

## Вопросы для проверки:

 1. Что такое агрегат и зачем он нужен?
 2. Почему репозитории должны возвращать только агрегаты?
 3. Как работают номера версий для параллелизма?
 4. Что такое оптимистичный vs пессимистичный параллелизм?
