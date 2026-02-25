---
title: "Сервисный слой и Flask: отделение бизнес-логики от API"
description: "Узнайте, как внедрить Service Layer в Flask-приложение для изоляции логики от фреймворка. Используйте FakeRepository для быстрых тестов. Читайте подробнее!"
pubDate: "2026-02-23"
order: 4
---

# 4. Первый вариант использования: API фреймворка Flask и сервисный слой (стр. 90-108)

До сих пор модель предметной области и репозиторий работали в изоляции. Теперь нужно подключить их к веб-интерфейсу.

`Цель`: создать API, которое принимает заказы и выделяет товар.

Первый сквозной тест. Авторы начинают с теста, который проверяет весь путь от HTTP-запроса до базы данных:

```python
def test_api_returns_allocation(order_line):
    # Создаём партию товара в БД
    batch = Batch("batch-1", order_line.sku, 100, eta=None)
    session.add(batch)
    session.commit()
    # Отправляем HTTP-запрос
    response = client.post('/allocate', json={
        'orderid': order_line.orderid,
        'sku': order_line.sku,
        'qty': order_line.qty
    })
    assert response.status_code == 201
    assert response.json() == {'batchid': 'batch-1'}
```

`Проблема`: этот тест медленный (требует БД, HTTP-сервера).

## Простая реализация

Первая попытка — всё в одном месте:

```python
@app.route('/allocate', methods=['POST'])
def allocate():
    data = request.get_json()
    line = OrderLine(data['orderid'], data['sku'], data['qty'])
    # Прямой доступ к БД через ORM
    batches = session.query(Batch).all()
    batch = allocate(line, batches)
    session.commit()
    return jsonify({'batchid': batch.ref}), 201
```

`Проблема`: бизнес-логика смешана с Flask и ORM!

## Состояния ошибок, требующие проверки базы данных

Что если товара нет в наличии?

```python
def test_api_returns_error_when_out_of_stock():
    # Нет партий в БД
    response = client.post('/allocate', json={
        'orderid': 'order-1',
        'sku': 'TABLE',
        'qty': 10
    })
    assert response.status_code == 400
    assert response.json() == {'error': 'Нет товара TABLE'}
```

## Введение сервисного слоя и использование поддельного репозитория для юнит-теста

`Решение`: выделить сервисный слой — слой с бизнес-логикой, который не зависит от Flask.

```python
class AllocationService:
    def __init__(self, repo: AbstractRepository):
        self.repo = repo

    def allocate(self, orderid: str, sku: str, qty: int) -> str:
        line = OrderLine(orderid, sku, qty)
        batches = self.repo.list()
        try:
            batch = allocate(line, batches)
            self.repo.session.commit()
            return batch.ref
        except OutOfStock as e:
            raise OutOfStock(str(e))
```

Теперь API выглядит проще:

```python
@app.route('/allocate', methods=['POST'])
def allocate_endpoint():
    service = AllocationService(SqlAlchemyRepository(session))
    data = request.get_json()
    try:
        batch_ref = service.allocate(
            data['orderid'],
            data['sku'],
            data['qty']
        )
        return jsonify({'batchid': batch_ref}), 201
    except OutOfStock as e:
        return jsonify({'error': str(e)}), 400
```

## Юнит-тест сервисного слоя (без БД!)

```python
def test_allocate_returns_batch_ref():
    # Поддельный репозиторий
    repo = FakeRepository([
        Batch("batch-1", "TABLE", 20, eta=None)
    ])
    service = AllocationService(repo)
    result = service.allocate("order-1", "TABLE", 5)
    assert result == "batch-1"
```

Преимущества:
 - Быстрый тест (нет БД, нет HTTP)
 - Легко тестировать ошибки
 - Бизнес-логика изолирована

Почему всё называется службой?

Авторы отмечают путаницу в терминах:
 - Сервисный слой — точка входа в приложение (use cases)
 - Служба предметной области — бизнес-операция (как allocate())
 - Микросервис — отдельный процесс/приложение

В этой книге:
 - Сервисный слой = слой с функциями службы (service layer)
 - Служба предметной области = функция в модели (domain service)

Складываем всё в папки

```
project/
├── domain_model/
│   ├── model.py          # Batch, OrderLine
│   └── test_model.py
├── services/
│   ├── services.py       # AllocationService
│   └── test_services.py
├── api/
│   ├── flask_app.py      # Flask API
│   └── test_api.py
├── repository/
│   ├── repository.py     # SqlAlchemyRepository, FakeRepository
│   └── test_repository.py
└── config.py
```

## Ключевые выводы Главы 4:

 1. Сервисный слой — точка входа для бизнес-операций
 2. Отделяйте бизнес-логику от фреймворков (Flask, Django)
 3. Юнит-тесты сервисного слоя быстрее сквозных тестов
 4. Используйте FakeRepository для тестирования без БД

## Вопросы для проверки:

 1. Что такое сервисный слой и зачем он нужен?
 2. Почему не стоит писать бизнес-логику прямо во Flask views?
 3. В чём разница между сквозным тестом и юнит-тестом сервисного слоя?
