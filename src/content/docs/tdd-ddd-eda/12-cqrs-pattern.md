---
title: "CQRS: Оптимизация чтения и записи"
description: "Узнайте, как паттерн CQRS позволяет разделить сложную логику записи и высокопроизводительное чтение. Используйте денормализованные таблицы и события для мгновенных отчетов."
pubDate: "2026-02-23"
order: 12
---

# 12. Разделение обязанностей команд и запросов (CQRS) (стр. 226-245)

Большинство пользователей не собираются покупать вашу мебель

`Проблема`: модель предметной области оптимизирована для записи, но не для чтения.

Пример из MADE.com:
 - 100 заказов в час (запись)
 - 100 просмотров продукта в секунду (чтение!)

```
┌────────────────────┬───────────────────────┬───────────────────────────┐
│ Характеристика     │ Чтение                │ Запись                    │
├────────────────────┼───────────────────────┼───────────────────────────┤
│ Логика             │ Простой SELECT        │ Сложная бизнес-логика     │
│ Кеширование        │ Подходит              │ Не подходит               │
│ Согласованность    │ Может быть устаревшим │ Должно быть согласованным │
│ Производительность │ Критична              │ Вторична                  │
└────────────────────┴───────────────────────┴───────────────────────────┘
```

`Вывод`: можно пожертвовать согласованностью чтения ради производительности!

## PRG и разделение команд и запросов

PRG (Post/Redirect/Get) — паттерн веб-разработки:

```
1. POST /orders  →  Создать заказ
2. Redirect → /orders/123
3. GET /orders/123  →  Показать результат
```

CQS (Command-Query Separation):
> Функции должны либо изменять состояние, либо отвечать на вопросы. Оба варианта сразу недопустимы.

Пример:

```python
# Плохо: команда + запрос вместе
@app.route('/allocate', methods=['POST'])
def allocate():
    batchref = services.allocate(...)
    return jsonify({'batchref': batchref})  # ← Возвращаем данные при записи!

# Хорошо: только команда
@app.route('/allocate', methods=['POST'])
def allocate():
    services.allocate(...)
    return '', 202  # ← Только подтверждение!

@app.route('/allocations/<orderid>', methods=['GET'])
def get_allocation(orderid):
    result = views.allocations(orderid)
    return jsonify(result)  # ← Отдельный запрос
```

Тест API

```python
def test_happy_path_returns_202_and_batch_is_allocated():
    # POST — разместить заказ
    r = api_client.post_to_allocate(orderid, sku, qty=3)
    assert r.status_code == 202  # ← Принято, но без данных!
    # GET — получить результат
    r = api_client.get_allocation(orderid)
    assert r.ok
    assert r.json() == [
        {'sku': sku, 'batchref': earlybatch},
    ]
```

## Хватайте свой обед, ребята

`Вопрос`: как реализовать views.allocations()?

`Вариант 1`: Сырой SQL (рекомендуется!)

```python
def allocations(orderid: str, uow):
    with uow:
        results = list(uow.session.execute(
            '''
            SELECT ol.sku, b.reference
            FROM allocations AS a
            JOIN batches AS b ON a.batch_id = b.id
            JOIN order_lines AS ol ON a.orderline_id = ol.id
            WHERE ol.orderid = :orderid
            '''
        ))
        return [{'sku': sku, 'batchref': batchref}
                for sku, batchref in results]
```

✅ Быстро
✅ Просто
✅ Эффективно

`«Очевидная» альтернатива 1`: использование репозитория

```python
def allocations(orderid: str, uow):
    with uow:
        products = uow.products.for_order(orderid=orderid)  # ← Новый метод!
        batches = [b for p in products for b in p.batches]  # ← Цикл в Python!
        return [
            {'sku': b.sku, 'batchref': b.reference}
            for b in batches
            if orderid in b.orderids  # ← Ещё один цикл!
        ]
```

Проблемы:
 - ❌ Нужно добавлять .for_order() в репозиторий
 - ❌ Нужно добавлять .orderids в модель
 - ❌ Много циклов в Python вместо SQL
 - ❌ Неуклюже!

`«Очевидная» альтернатива 2`: использование ORM

```python
def allocations(orderid: str, uow):
    with uow:
        batches = uow.session.query(model.Batch).join(
            model.OrderLine, model.Batch._allocations
        ).filter(
            model.OrderLine.orderid == orderid
        )
        return [{'sku': b.sku, 'batchref': b.reference} for b in batches]
```

Проблемы:
 - ❌ Сложнее понять, чем сырой SQL
 - ❌ SELECT N+1 — ORM делает много запросов
 - ❌ Неочевидная производительность

## SELECT N+1

Проблема:

```sql
# ORM делает:
SELECT id FROM batches  # ← 1 запрос
SELECT * FROM batches WHERE id = 1  # ← N запросов!
SELECT * FROM batches WHERE id = 2
...
```

`Решение`: сырой SQL или eager loading.

## Время прыгать через акулу

Оптимизация: денормализованная таблица для чтения!

```python
# adapters/orm.py
allocations_view = Table(
    'allocations_view', metadata,
    Column('orderid', String(255)),
    Column('sku', String(255)),
    Column('batchref', String(255)),
    # Никаких внешних ключей!
)

# views.py
def allocations(orderid: str, uow):
    with uow:
        results = list(uow.session.execute(
            'SELECT sku, batchref FROM allocations_view WHERE orderid = :orderid'
        ))
        return [{'sku': sku, 'batchref': batchref} for sku, batchref in results]
```

Преимущества:
 - ✅ Один простой SELECT
 - ✅ Нет JOIN'ов
 - ✅ Масштабируется горизонтально (много реплик для чтения)

## Обновление таблицы модели чтения с помощью обработчика событий

Как поддерживать актуальность?

```python
# messagebus.py
EVENT_HANDLERS = {
    events.Allocated: [
        handlers.publish_allocated_event,
        handlers.add_allocation_to_read_model,  # ← Второй обработчик!
    ],
    events.Deallocated: [
        handlers.remove_allocation_from_read_model,
        handlers.reallocate,
    ],
}

# handlers.py
def add_allocation_to_read_model(event: events.Allocated, uow):
    with uow:
        uow.session.execute(
            '''
            INSERT INTO allocations_view (orderid, sku, batchref)
            VALUES (:orderid, :sku, :batchref)
            ''',
            dict(orderid=event.orderid, sku=event.sku, batchref=event.batchref)
        )
        uow.commit()

def remove_allocation_from_read_model(event: events.Deallocated, uow):
    with uow:
        uow.session.execute(
            'DELETE FROM allocations_view WHERE orderid = :orderid AND sku = :sku'
        )
        uow.commit()
```

## Поток выполнения

```
┌─────────────────────────────────────────────────────────┐
│  POST /allocate                                         │
│  ↓                                                      │
│  Команда Allocate                                       │
│  ↓                                                      │
│  UoW Транзакция 1: model.allocate() → фиксация в БД     │
│  ↓                                                      │
│  Событие Allocated                                      │
│  ↓                                                      │
│  UoW Транзакция 2: INSERT INTO allocations_view         │
│  ↓                                                      │
│  202 Accepted                                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  GET /allocations/<orderid>                             │
│  ↓                                                      │
│  SELECT FROM allocations_view WHERE orderid = :orderid  │
│  ↓                                                      │
│  JSON результат                                         │
└─────────────────────────────────────────────────────────┘
```

## Изменить реализацию модели чтения очень просто

`Проблема`: модель чтения сломалась из-за бага?

`Решение`: перестроить из модели записи!

```python
def rebuild_read_model():
    uow = unit_of_work.SqlAlchemyUnitOfWork()
    with uow:
        # Получить все размещения из модели записи
        results = uow.session.execute(
            'SELECT orderid, sku, batchref FROM allocations'
        )
        for orderid, sku, batchref in results:
            # Очистить модель чтения
            uow.session.execute('DELETE FROM allocations_view')
            # Пересоздать из событий
            event = events.Allocated(orderid, sku, 0, batchref)
            handlers.add_allocation_to_read_model(event, uow)
```

`Преимущество`: поскольку модель чтения обновляется через события, можно просто replay'нуть все события заново!

## Ключевые выводы Главы 12:

 1. CQRS — разделение чтения и записи
 2. Модель для записи — сложная, с инвариантами, агрегатами
 3. Модель для чтения — простой SQL, денормализованная, быстрая
 4. События обновляют модель чтения асинхронно
 5. Масштабирование: много реплик для чтения, одна для записи

## Вопросы для проверки:

 1. Зачем разделять чтение и запись (CQRS)?
 2. Почему модель предметной области не подходит для чтения?
 3. Что такое SELECT N+1 и как его избежать?
 4. Как события помогают обновлять модель чтения?
 5. Что делать, если модель чтения сломалась?
