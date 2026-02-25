---
title: "Агрегаты и границы согласованности: защита инвариантов"
description: "Узнайте, как паттерн Агрегат защищает целостность данных, решает проблемы параллелизма и обеспечивает согласованность через оптимистичную блокировку."
pubDate: "2026-02-23"
order: 7
---

# 7. Агрегаты и границы согласованности (стр. 136-155)

## Зачем нужна модель предметной области?

Почему бы просто не записать всё в электронную таблицу? Бизнесмены любят таблицы — они просты и понятны. Но есть проблема: **масштабирование и согласованность**.

- Кто имеет доступ на обновление?
- Что если заказать -350 стульев?
- Что если два клиента закажут один товар одновременно?

**Инварианты** — условия, которые должны быть истинны после каждой операции. Модель предметной области нужна для их соблюдения.

## Инварианты, ограничения и согласованность

**Ограничение (constraint)** — правило, лимитирующее возможные состояния:
- Нельзя заказать -5 товаров

**Инвариант (invariant)** — условие, всегда истинное:
- `available_quantity >= 0` после любой операции

**Проблема параллелизма**:

```
Транзакция 1: читает qty=10
Транзакция 2: читает qty=10
Транзакция 1: заказывает 8, пишет qty=2
Транзакция 2: заказывает 8, пишет qty=2  ← ОШИБКА! Должно быть -6
```

## Что такое агрегат?

**Агрегат** — кластер объектов, которые мы рассматриваем как единое целое для изменения данных.

**Ключевые свойства**:
1. Загружается целиком из хранилища
2. Изменять можно только через методы агрегата
3. Имеет корневую сущность (корень агрегата)

**Пример: корзина интернет-магазина**

```python
class ShoppingCart:
    def __init__(self, items: list[CartItem]):
        self.items = items

    def add_item(self, product_id, qty):
        # Инвариант: нельзя добавить отрицательное количество
        if qty <= 0:
            raise ValueError("qty must be positive")
        self.items.append(CartItem(product_id, qty))
```

**Важно**: корзина — граница согласованности. Две корзины разных клиентов не влияют друг на друга, поэтому их можно изменять параллельно.

## Выбор агрегата

**Вопрос**: что должно быть агрегатом в нашей системе?

**Варианты**:
- **Shipment (поставка)** — ❌ слишком крупно, не та гранулярность
- **Warehouse (склад)** — ❌ слишком крупно
- **Product (артикул)** — ✅ подходит!

**Почему Product?** Когда размещаем заказ, нас интересуют только партии с тем же артикулом. Заказы на разные артикулы не влияют друг на друга.

### Реализация агрегата Product

**До** (без агрегата):

```
Сервисный слой → list(all batches) → allocate(line, batches)
```

**После** (с агрегатом):

```python
class Product:
    def __init__(self, sku: str, batches: list[Batch]):
        self.sku = sku
        self.batches = batches  # Коллекция партий

    def allocate(self, line: OrderLine) -> str:
        """Разместить заказ в одной из партий"""
        try:
            batch = next(
                b for b in sorted(self.batches)
                if b.can_allocate(line)
            )
            batch.allocate(line)
            return batch.reference
        except StopIteration:
            raise OutOfStock(f'Артикула {line.sku} нет в наличии')
```

```
Сервисный слой → get(product) → product.allocate(line)
```

**Преимущества**:
- Явная граница согласованности
- Инварианты защищены внутри агрегата
- Параллельные заказы на разные артикулы безопасны

## Один агрегат = один репозиторий

**Правило**: репозитории должны возвращать **только агрегаты**. Не нарушайте его!

**До**:

```python
class AbstractRepository:
    def get(self, reference) -> Batch:  # ← Batch не агрегат!
```

**После**:

```python
class AbstractProductRepository:
    def get(self, sku) -> Product:  # ← Product — агрегат!
```

### Обновлённый сервисный слой

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

## А что насчёт производительности?

**Вопрос**: зачем загружать все партии, если нужна одна?

**Ответы**:

1. **Один запрос на чтение/запись** — проще и надёжнее
2. **Данные маленькие** — строки + числа, загружаются быстро
3. **~20 активных партий** — старые архивируются

**Если данных много**:
- Ленивая загрузка (SQLAlchemy сделает сам)
- Пересмотреть агрегат (по регионам, складам)

**Важно**: единственно правильного агрегата нет. Если производительность падает — выберите другой вариант.

## Оптимистичный параллелизм с номерами версий

**Проблема**: две транзакции обновляют один продукт одновременно.

**Решение**: номера версий.

### Как это работает

```
Транзакция 1: читает Product(version=3)
Транзакция 2: читает Product(version=3)
Транзакция 1: allocate() → Product(version=4) → commit() ✅
Транзакция 2: allocate() → Product(version=4) → commit() ❌ (версия 4 уже есть!)
```

### Реализация

```python
class Product:
    def __init__(self, sku: str, batches: list[Batch], version: int = 0):
        self.sku = sku
        self.batches = batches
        self.version = version  # Номер версии

    def allocate(self, line: OrderLine) -> str:
        batch = next(b for b in sorted(self.batches) if b.can_allocate(line))
        batch.allocate(line)
        self.version += 1  # Увеличиваем версию
        return batch.reference
```

**SQL (PostgreSQL)**:

```sql
UPDATE products
SET version = version + 1, ...
WHERE sku = :sku AND version = :old_version
-- Если строк обновлено 0 → конфликт версий!
```

### Обработка конфликта: повторные попытки

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

**Сценарий**:
1. Гарри и Боб заказывают SHINY-TABLE
2. Оба загружают Product(version=1)
3. Гарри успевает зафиксировать version=2
4. Боб получает ошибку → повторяет с version=2
5. Если товар есть — успех, иначе OutOfStock

### Оптимистичный vs пессимистичный параллелизм

**Оптимистичный** — разрешаем конфликты, обрабатываем ошибки. Используем, когда конфликты редки.

**Пессимистичный** — блокируем на всякий случай (SELECT FOR UPDATE). Используем, когда конфликты часты.

**Мы используем оптимистичный** — конфликты редки, производительность выше.

## Тестирование правил целостности

Интеграционный тест на параллельное обновление:

```python
def test_concurrent_updates_to_version_are_not_allowed(postgres_session_factory):
    sku, batch = random_sku(), random_batchref()
    session = postgres_session_factory()
    insert_batch(session, batch, sku, 100, None, product_version=1)
    session.commit()
    
    order1, order2 = random_orderid(1), random_orderid(2)
    exceptions = []
    
    # Запускаем два потока параллельно
    thread1 = Thread(target=try_to_allocate, args=(order1, sku, exceptions))
    thread2 = Thread(target=try_to_allocate, args=(order2, sku, exceptions))
    thread1.start()
    thread2.start()
    thread1.join()
    thread2.join()
    
    # Только одна транзакция успешна
    [[version]] = session.execute("SELECT version FROM products WHERE sku=:sku", ...)
    assert version == 2  # Увеличилась на 1
    
    # Вторая транзакция получила ошибку
    [exception] = exceptions
    assert 'параллельное обновление' in str(exception)
```

## Выводы

1. **Агрегат** — граница согласованности, загружается целиком
2. **Один агрегат = один репозиторий** — возвращайте только агрегаты
3. **Product** — агрегат для службы размещения
4. **Номера версий** — оптимистичный параллелизм
5. **Повторные попытки** — обработка конфликтов версий
6. **Инварианты** — защищаются внутри агрегата

## Вопросы

1. Что такое агрегат и зачем он нужен?
2. Почему репозитории должны возвращать только агрегаты?
3. Как работают номера версий для параллелизма?
4. В чём разница между оптимистичным и пессимистичным параллелизмом?
5. Что делать при конфликте версий?
6. Почему Product — хороший агрегат, а Warehouse — плохой?
