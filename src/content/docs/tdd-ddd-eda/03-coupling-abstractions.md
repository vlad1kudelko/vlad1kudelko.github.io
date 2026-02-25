---
title: "Связанность и абстракции: как снизить зависимости в коде"
description: "Узнайте, как уменьшить связанность (coupling) через абстракции и сервисы. Разберите типы зависимостей и улучшите тестопригодность вашего кода на Python."
pubDate: "2026-02-23"
order: 3
---

# 3. О связанности и абстракциях (стр. 74-89)

`Проблема`: слишком много ответственности

В предыдущих главах функция allocate() работала с списком Batch. Но что если нужно выделить товар для нескольких заказов сразу?

Новое требование:
 - Есть список заказов (order lines)
 - Есть список партий (batches)
 - Нужно выделить товар для всех заказов
 - Если товара не хватило — выбросить ошибку

Абстрагирование состояния способствует тестопригодности.

`Проблема`: функция allocate() изменяет объекты Batch (увеличивает `_allocated`). Это побочный эффект.

```python
def allocate(line: OrderLine, batches: list[Batch]) -> str:
    batch = next(b for b in batches if b.can_allocate(line))
    batch.allocate(line)  # ← Побочный эффект!
    return batch.ref
```

`Проблема для тестов`: нужно проверять не только возвращаемое значение, но и изменение состояния.

`Решение`: создать класс-сервис, который управляет состоянием.

```python
class AllocationService:
    def __init__(self, batches: list[Batch]):
        self.batches = batches

    def allocate(self, line: OrderLine) -> str:
        batch = next(b for b in self.batches if b.can_allocate(line))
        batch.allocate(line)
        return batch.ref
```

## Выбор правильной абстракции

Авторы рассматривают несколько вариантов:

Вариант 1: Работать напрямую со списком list[Batch]
 - ❌ Слишком низкоуровнево
 - ❌ Нет инкапсуляции

Вариант 2: Создать класс Warehouse или WarehouseInventory
 - ✅ Скрывает детали реализации
 - ✅ Может добавлять новую логику

```python
class Warehouse:
    def __init__(self, batches: list[Batch]):
        self.batches = batches

    def get_available_batches(self, sku: str) -> list[Batch]:
        return [b for b in self.batches if b.sku == sku and b.available > 0]
```

## Реализация выбранных абстракций

Финальная версия из книги:

```python
class Warehouse:
    def __init__(self, batches: list[Batch]):
        self.batches = batches

    def allocate(self, line: OrderLine) -> str:
        """Выделить товар для заказа"""
        available = self.get_available_batches(line.sku)
        if not available:
            raise OutOfStock(f"Нет товара {line.sku}")
        batch = min(available, key=lambda b: b.eta)
        batch.allocate(line)
        return batch.ref

    def get_available_batches(self, sku: str) -> list[Batch]:
        return [b for b in self.batches
                if b.sku == sku and b.available > 0]
```

Тестирование с новой абстракцией

```python
def test_allocate_uses_earliest_batch():
    warehouse = Warehouse([
        Batch("batch-1", "TABLE", 10, eta=date(2022, 1, 10)),
        Batch("batch-2", "TABLE", 10, eta=date(2022, 1, 1)),
    ])
    line = OrderLine("order-1", "TABLE", 3)
    result = warehouse.allocate(line)
    assert result == "batch-2"  # Более ранняя партия
    assert warehouse.batches[1].available == 7
```

## Связанность (Coupling)

`Связанность` — это степень зависимости между модулями кода.

Высокая связанность (плохо):

```python
class OrderService:
    def __init__(self):
        self.db = SQLAlchemy()  # ← Жёсткая зависимость
        self.email = SMTPMailer()  # ← Жёсткая зависимость
```

Низкая связанность (хорошо):

```python
class OrderService:
    def __init__(self, repository: AbstractRepository,
                 email_sender: AbstractEmailSender):
        self.repository = repository  # ← Зависимость от абстракции
        self.email_sender = email_sender  # ← Зависимость от абстракции
```

## Типы связанности

```
┌──────────────────┬────────────────────────────────────────┬─────────────────────────────────────────┐
│ Тип              │ Описание                               │ Пример                                  │
├──────────────────┼────────────────────────────────────────┼─────────────────────────────────────────┤
│ Временная        │ Модули связаны по времени выполнения   │ __init__.py импортирует всё при запуске │
│ Пространственная │ Модули знают о расположении друг друга │ import sys; sys.path.append(...)        │
│ Логическая       │ Модули зависят от логики друг друга    │ Изменение в модели ломает сервис        │
└──────────────────┴────────────────────────────────────────┴─────────────────────────────────────────┘
```

## Ключевые выводы Главы 3:

 1. Абстракции упрощают тестирование — скрывают сложное состояние
 2. Низкая связанность — цель хорошей архитектуры
 3. Зависите от абстракций, а не от реализаций
 4. Класс-обёртка (как Warehouse) лучше голого списка

## Вопросы для проверки:

 1. Что такое связанность (coupling)? Почему высокая связанность — это плохо?
 2. Зачем создавать абстракции вроде Warehouse вместо работы со списком?
 3. Что такое побочный эффект и почему он усложняет тестирование?
