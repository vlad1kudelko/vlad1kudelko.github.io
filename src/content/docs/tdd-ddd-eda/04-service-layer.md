---
title: "Сервисный слой и Flask: отделение бизнес-логики от API"
description: "Узнайте, как внедрить Service Layer во Flask-приложение для изоляции логики от фреймворка. Используйте FakeRepository для быстрых тестов."
pubDate: "2026-02-23"
order: 4
---

# 4. Сервисный слой (стр. 90-108)

## Зачем нужен сервисный слой?

До сих пор модель предметной области и репозиторий работали в изоляции. Теперь нужно подключить их к веб-интерфейсу.

**Проблема**: если написать код «как проще», бизнес-логика окажется перемешана с Flask, HTTP и базой данных.

**Решение**: добавить **сервисный слой** — слой оркестровки между веб-фреймворком и моделью предметной области.

## Эволюция кода

### Первый сквозной тест

Начинаем с E2E-теста, который проверяет весь путь от HTTP до БД:

```python
# test_api.py
@pytest.mark.usefixtures('restart_api')
def test_api_returns_allocation(add_stock):
    add_stock([('batch-1', 'TABLE', 100, '2011-01-01')])
    
    data = {'orderid': 'order-1', 'sku': 'TABLE', 'qty': 3}
    r = requests.post(f'{API_URL}/allocate', json=data)
    
    assert r.status_code == 201
    assert r.json()['batchref'] == 'batch-1'
```

**Проблема**: тест медленный (требуется Flask + БД).

### Первая реализация: всё во Flask

```python
# flask_app.py
@app.route("/allocate", methods=['POST'])
def allocate_endpoint():
    session = get_session()
    batches = repository.SqlAlchemyRepository(session).list()
    line = model.OrderLine(
        request.json['orderid'],
        request.json['sku'],
        request.json['qty'],
    )
    batchref = model.allocate(line, batches)
    return jsonify({'batchref': batchref}), 201
```

Забыли `session.commit()`! Нужен тест на сохранение:

```python
def test_allocations_are_persisted(add_stock):
    # Первый заказ исчерпывает партию 1
    # Второй заказ должен пойти в партию 2
```

### Добавляем обработку ошибок

```python
def test_400_message_for_out_of_stock(add_stock):
    # Пытаемся заказать больше, чем есть
    assert r.status_code == 400

def test_400_message_for_invalid_sku():
    # Несуществующий артикул
    assert r.status_code == 400
```

Код во Flask разрастается:

```python
# flask_app.py — становится громоздко
@app.route("/allocate", methods=['POST'])
def allocate_endpoint():
    session = get_session()
    batches = repository.SqlAlchemyRepository(session).list()
    line = model.OrderLine(...)
    
    if not is_valid_sku(line.sku, batches):  # ← Бизнес-логика во Flask!
        return jsonify({'message': '...'}), 400
    
    try:
        batchref = model.allocate(line, batches)
    except model.OutOfStock as e:
        return jsonify({'message': str(e)}), 400
    
    session.commit()
    return jsonify({'batchref': batchref}), 201
```

**Проблемы**:
- Бизнес-логика (`is_valid_sku`) оказалась во Flask
- Код громоздкий, тесты медленные

## Выделяем сервисный слой

```python
# services.py
class InvalidSku(Exception):
    pass

def allocate(line: OrderLine, repo: AbstractRepository, session) -> str:
    batches = repo.list()
    
    if not is_valid_sku(line.sku, batches):
        raise InvalidSku(f'Недопустимый артикул {line.sku}')
    
    batchref = model.allocate(line, batches)
    session.commit()
    
    return batchref
```

Теперь Flask тонкий:

```python
# flask_app.py
@app.route("/allocate", methods=['POST'])
def allocate_endpoint():
    session = get_session()
    repo = repository.SqlAlchemyRepository(session)
    line = model.OrderLine(...)
    
    try:
        batchref = services.allocate(line, repo, session)
    except (model.OutOfStock, services.InvalidSku) as e:
        return jsonify({'message': str(e)}), 400
    
    return jsonify({'batchref': batchref}), 201
```

## Юнит-тесты сервисного слоя

Используем поддельный репозиторий:

```python
# test_services.py
class FakeRepository(AbstractRepository):
    def __init__(self, batches):
        self._batches = set(batches)
    def list(self):
        return list(self._batches)

class FakeSession:
    committed = False
    def commit(self):
        self.committed = True

def test_returns_allocation():
    line = model.OrderLine("o1", "LAMP", 10)
    batch = model.Batch("b1", "LAMP", 100, eta=None)
    repo = FakeRepository([batch])
    session = FakeSession()
    
    result = services.allocate(line, repo, session)
    assert result == "b1"

def test_commits():
    # Проверяем, что session.commit() вызван
    assert session.committed is True
```

**Преимущества**:
- Тесты без БД, быстрые
- Легко тестировать ошибки

## Сокращаем E2E-тесты

Оставляем только 2 сквозных теста:

```python
def test_happy_path_returns_201():
    """Товар есть — выделение успешно"""

def test_unhappy_path_returns_400():
    """Товара нет — ошибка 400"""
```

**Тестовая пирамида**:
- Много юнит-тестов (модель, сервисный слой)
- Несколько интеграционных (репозиторий)
- Минимум E2E (ключевые сценарии)

## Инверсия зависимостей

Функция зависит от абстракции:

```python
def allocate(line: OrderLine, repo: AbstractRepository, session) -> str:
```

**В тестах**: FakeRepository (в памяти)

**В продакшене**: SqlAlchemyRepository (БД)

Сервисный слой не знает о конкретной реализации.

## Почему всё называется «службой»?

- **Сервисный слой** — оркестрация: получить из БД, обновить модель, сохранить
- **Служба предметной области** — бизнес-операция без состояния (например, `calculate_tax`)
- **Микросервис** — отдельный процесс

## Структура проекта

```
project/
├── domain/           # Модель предметной области
├── service_layer/    # Сервисный слой
├── adapters/         # Репозитории, ORM
├── entrypoints/      # Flask, CLI
└── tests/
    ├── unit/         # Быстрые тесты
    ├── integration/  # С БД
    └── e2e/          # Сквозные
```

## Выводы

1. **Сервисный слой** — оркестровка бизнес-операций
2. **Отделяйте логику от фреймворка** — Flask только для HTTP/JSON
3. **Юнит-тесты с FakeRepository** — быстро, без БД
4. **Тестовая пирамида** — много юнит-тестов, мало E2E
5. **Инверсия зависимостей** — зависите от абстракций

## Вопросы

1. Зачем нужен сервисный слой?
2. Почему не стоит писать бизнес-логику во Flask views?
3. В чём разница между E2E и юнит-тестом сервисного слоя?
4. Что такое тестовая пирамида?
5. В чём разница между службой предметной области и сервисным слоем?
