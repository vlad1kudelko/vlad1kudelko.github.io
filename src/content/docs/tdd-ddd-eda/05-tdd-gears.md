---
title: "Пирамида тестирования и TDD: переключаем передачи"
description: "Узнайте, как сбалансировать юнит и E2E тесты. Научитесь тестировать сервисный слой через примитивы и повышать гибкость кода. Оптимизируйте ваш TDD!"
pubDate: "2026-02-23"
order: 5
---

# 5. TDD на повышенной и пониженной передачах (стр. 109-119)

Как выглядит пирамида тестирования

Авторы подсчитывают тесты:
 - 15 юнит-тестов (модель + сервисный слой)
 - 8 интеграционных тестов (ORM + репозиторий)
 - 2 сквозных теста (API)

Это правильная пирамида! Большинство тестов — быстрые юнит-тесты.

Должны ли тесты слоя предметной области перейти в сервисный слой?

`Вопрос`: стоит ли переписывать тесты модели на тесты сервисного слоя?

Пример:

```python
# Тест предметной области (низкий уровень)
def test_prefers_current_stock_batches_to_shipments():
    in_stock_batch = Batch("in-stock-batch", "RETRO-CLOCK", 100, eta=None)
    shipment_batch = Batch("shipment-batch", "RETRO-CLOCK", 100, eta=tomorrow)
    line = OrderLine("oref", "RETRO-CLOCK", 10)
    allocate(line, [in_stock_batch, shipment_batch])
    assert in_stock_batch.available_quantity == 90
    assert shipment_batch.available_quantity == 100

# Тест сервисного слоя (высокий уровень)
def test_prefers_warehouse_batches_to_shipments():
    in_stock_batch = Batch("in-stock-batch", "RETRO-CLOCK", 100, eta=None)
    shipment_batch = Batch("shipment-batch", "RETRO-CLOCK", 100, eta=tomorrow)
    repo = FakeRepository([in_stock_batch, shipment_batch])
    session = FakeSession()
    line = OrderLine('oref', "RETRO-CLOCK", 10)
    services.allocate(line, repo, session)
    assert in_stock_batch.available_quantity == 90
```

Зачем?
 - Тесты сервисного слоя менее связаны с реализацией модели
 - Легче делать рефакторинг модели без поломки тестов
 - Тесты проверяют поведение системы, а не внутренности

## Какие тесты писать

```
┌─────────────────────────────────────┐
│  Тесты API (E2E)                    │
│  • Высокий уровень                  │
│  • Низкая эффективность изменений   │
│  • Широкий охват системы            │
├─────────────────────────────────────┤
│  Тесты сервисного слоя              │
│  • Средний уровень                  │
│  • Баланс охвата и гибкости         │
├─────────────────────────────────────┤
│  Тесты предметной области           │
│  • Низкий уровень                   │
│  • Высокая эффективность изменений  │
│  • Точечный охват                   │
└─────────────────────────────────────┘
```

Пример:
 - Пониженная: новая бизнес-логика allocation → тесты модели
 - Повышенная: добавить add_stock, cancel_order → тесты сервиса

Устранение связей между тестами сервисного слоя и предметной областью

`Проблема`: тесты сервиса всё ещё зависят от объектов модели:

```python
# Зависимость от OrderLine
def allocate(line: OrderLine, repo, session) -> str:
```

`Решение 1`: использовать примитивы:

```python
# После рефакторинга
def allocate(orderid: str, sku: str, qty: int, repo, session) -> str:
```

`Решение 2`: фабричные функции для тестов:

```python
class FakeRepository(set):
    @staticmethod
    def for_batch(ref, sku, qty, eta=None):
        return FakeRepository([model.Batch(ref, sku, qty, eta)])

# В тесте:
repo = FakeRepository.for_batch("batch1", "LAMP", 100)
```

`Решение 3`: добавить службу add_batch:

```python
# services.py
def add_batch(ref, sku, qty, eta, repo, session):
    repo.add(model.Batch(ref, sku, qty, eta))
    session.commit()

# test_services.py
def test_allocate_returns_allocation():
    repo, session = FakeRepository([]), FakeSession()
    services.add_batch("batch1", "LAMP", 100, None, repo, session)
    result = services.allocate("o1", "LAMP", 10, repo, session)
    assert result == "batch1"
```

Теперь тесты зависят только от сервисного слоя!

## Дальнейшее улучшение с помощью сквозных тестов

Добавляем API endpoint для add_batch:

```python
@app.route("/add_batch", methods=['POST'])
def add_batch():
    session = get_session()
    repo = repository.SqlAlchemyRepository(session)

    services.add_batch(
        request.json['ref'],
        request.json['sku'],
        request.json['qty'],
        request.json['eta'],
        repo, session
    )
    return 'OK', 201
```

Теперь сквозные тесты не используют прямой SQL!

```python
def post_to_add_batch(ref, sku, qty, eta):
    url = config.get_api_url()
    r = requests.post(f'{url}/add_batch', json={
        'ref': ref, 'sku': sku, 'qty': qty, 'eta': eta
    })
    assert r.status_code == 201

def test_happy_path():
    post_to_add_batch("batch1", "SKU", 100, "2022-01-01")
    # ... тест без прямого SQL
```

Эмпирические правила для тестов:

```
┌───────────────────────────┬────────────────┬───────────────────────────────┐
│ Тип теста                 │ Сколько писать │ Зачем                         │
├───────────────────────────┼────────────────┼───────────────────────────────┤
│ Сквозные (E2E)            │ 1 на функцию   │ Проверка интеграции           │
│ Сервисный слой            │ Основная масса │ Бизнес-логика, крайние случаи │
│ Модель предметной области │ Малое ядро     │ Сложная логика, документация  │
└───────────────────────────┴────────────────┴───────────────────────────────┘
```

## Ключевые выводы Главы 5:

 1. Пирамида тестов: больше юнит-тестов, меньше E2E
 2. Повышенная передача: тесты сервисного слоя для обычных задач
 3. Пониженная передача: тесты модели для сложной логики
 4. Устраняйте зависимости: используйте примитивы и фабрики в тестах

## Вопросы для проверки:

 1. Что такое «повышенная» и «пониженная» передачи в TDD?
 2. Почему тесты сервисного слоя лучше тестов модели для рефакторинга?
 3. Как устранить зависимость тестов от объектов предметной области?
