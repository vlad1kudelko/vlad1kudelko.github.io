---
title: "Пирамида тестирования и TDD: переключаем передачи"
description: "Узнайте, как сбалансировать юнит и E2E тесты. Научитесь тестировать сервисный слой через примитивы и повышать гибкость кода."
pubDate: "2026-02-23"
order: 5
---

# 5. TDD на повышенной и пониженной передачах (стр. 109-119)

## Пирамида тестирования

После введения сервисного слоя считаем тесты:
- 15 юнит-тестов (модель + сервисный слой)
- 8 интеграционных тестов (ORM + репозиторий)
- 2 сквозных теста (API)

**Это правильная пирамида!** Большинство тестов — быстрые юнит-тесты.

```
        ┌─────────────┐
        │  E2E (2)    │  ← Медленные, проверяют интеграцию
        ├─────────────┤
        │Integration  │
        │   (8)       │  ← Средние, с БД
        ├─────────────┤
        │   Unit      │
        │   (15)      │  ← Быстрые, в памяти
        └─────────────┘
```

## Повышенная и пониженная передачи

**Метафора**: как велосипед. Начинаем на пониженной передаче, чтобы тронуться. Затем переключаемся на повышенную для скорости. Если встречаем подъём — снова пониженная.

### Пониженная передача — тесты модели

**Когда использовать**:
- Новый проект, сложная предметная область
- Нужно понять дизайн объектов
- Тестируем конкретную бизнес-логику

**Преимущества**:
- Точечный охват
- Высокая эффективность оценки
- Живая документация модели

**Недостатки**:
- Высокий барьер для изменений
- Тесты ломаются при рефакторинге

```python
# Тест модели (пониженная передача)
def test_prefers_current_stock_batches_to_shipments():
    in_stock_batch = Batch("in-stock", "RETRO-CLOCK", 100, eta=None)
    shipment_batch = Batch("shipment", "RETRO-CLOCK", 100, eta=tomorrow)
    line = OrderLine("oref", "RETRO-CLOCK", 10)
    
    allocate(line, [in_stock_batch, shipment_batch])
    
    assert in_stock_batch.available_quantity == 90
    assert shipment_batch.available_quantity == 100  # Не изменилась
```

### Повышенная передача — тесты сервисного слоя

**Когда использовать**:
- Добавление функций (add_stock, cancel_order)
- Исправление багов
- Рефакторинг без изменения модели

**Преимущества**:
- Меньше связаны с реализацией
- Легче рефакторинг модели
- Проверяют поведение системы

**Недостатки**:
- Меньше деталей о дизайне объектов

```python
# Тест сервиса (повышенная передача)
def test_prefers_warehouse_batches_to_shipments():
    in_stock_batch = Batch("in-stock", "RETRO-CLOCK", 100, eta=None)
    shipment_batch = Batch("shipment", "RETRO-CLOCK", 100, eta=tomorrow)
    repo = FakeRepository([in_stock_batch, shipment_batch])
    session = FakeSession()
    line = OrderLine('oref', "RETRO-CLOCK", 10)
    
    services.allocate(line, repo, session)
    
    assert in_stock_batch.available_quantity == 90
```

## Почему тесты сервиса лучше для рефакторинга?

**Проблема**: тесты модели тесно связаны с реализацией. Изменили внутренний метод — сломали 10 тестов.

**Решение**: тесты сервиса проверяют API, а не внутренности.

```
Тесты API (E2E)
  ↓ Широкий охват, низкая эффективность изменений
Тесты сервисного слоя
  ↓ Баланс охвата и гибкости
Тесты предметной области
  ↓ Точечный охват, высокая эффективность изменений
```

**Правило**: каждая строка кода в тесте — как капля клея, удерживающая систему в определённой форме. Чем больше низкоуровневых тестов, тем труднее менять дизайн.

## Устранение связей с предметной областью

### Проблема: тесты зависят от объектов модели

```python
# Сервисный слой принимает OrderLine
def allocate(line: OrderLine, repo, session) -> str:

# Тест вынужден создавать OrderLine
line = OrderLine("oref", "SKU", 10)
services.allocate(line, repo, session)
```

Если изменим OrderLine — сломаются все тесты сервиса.

### Решение 1: использовать примитивы

```python
# После рефакторинга
def allocate(orderid: str, sku: str, qty: int, repo, session) -> str:

# Тест с примитивами
result = services.allocate("o1", "SKU", 10, repo, session)
assert result == "batch-1"
```

Теперь тесты не зависят от класса OrderLine.

### Решение 2: фабричные функции

```python
class FakeRepository(set):
    @staticmethod
    def for_batch(ref, sku, qty, eta=None):
        return FakeRepository([model.Batch(ref, sku, qty, eta)])

# В тесте
repo = FakeRepository.for_batch("batch1", "LAMP", 100)
```

Все зависимости от модели собраны в одном месте.

### Решение 3: служба add_batch

Добавляем службу для создания партий — тесты не работают с репозиторием напрямую:

```python
# services.py
def add_batch(ref, sku, qty, eta, repo, session):
    repo.add(model.Batch(ref, sku, qty, eta))
    session.commit()

# test_services.py
def test_allocate_returns_allocation():
    repo, session = FakeRepository([]), FakeSession()
    
    # Используем службу, а не репозиторий напрямую
    services.add_batch("batch1", "LAMP", 100, None, repo, session)
    result = services.allocate("o1", "LAMP", 10, repo, session)
    
    assert result == "batch1"
```

**Преимущество**: тесты зависят только от сервисного слоя. Можно рефакторить модель без изменений в тестах.

## Улучшение сквозных тестов

Добавляем API endpoint для add_batch:

```python
# flask_app.py
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

Теперь сквозные тесты не используют прямой SQL:

```python
# test_api.py
def post_to_add_batch(ref, sku, qty, eta):
    url = config.get_api_url()
    r = requests.post(f'{url}/add_batch', json={
        'ref': ref, 'sku': sku, 'qty': qty, 'eta': eta
    })
    assert r.status_code == 201

def test_happy_path():
    # Подготовка через API, не через SQL
    post_to_add_batch("batch1", "SKU", 100, "2022-01-01")
    
    data = {'orderid': 'o1', 'sku': 'SKU', 'qty': 10}
    r = requests.post(f'{API_URL}/allocate', json=data)
    
    assert r.status_code == 201
    assert r.json()['batchref'] == "batch1"
```

## Эмпирические правила для тестов

| Тип теста | Сколько писать | Зачем |
|-----------|---------------|-------|
| **Сквозные (E2E)** | 1 на функцию | Проверка интеграции |
| **Сервисный слой** | Основная масса | Бизнес-логика, крайние случаи |
| **Модель предметной области** | Малое ядро | Сложная логика, документация |

**Правила**:
1. Один сквозной тест на одну функцию сервиса
2. Основная масса тестов — сервисный слой
3. Малое ядро тестов модели — можно удалять, если функциональность покрыта сервисом

## Выводы

1. **Пирамида тестов** — больше юнит-тестов, меньше E2E
2. **Пониженная передача** — тесты модели для сложной логики
3. **Повышенная передача** — тесты сервиса для обычных задач
4. **Примитивы в сервисном слое** — устраняют зависимости от модели
5. **Службы для тестов** — add_batch помогает изолировать тесты
6. **Можно удалять тесты** — если функциональность покрыта на более высоком уровне

## Вопросы

1. Что такое «повышенная» и «пониженная» передачи в TDD?
2. Почему тесты сервисного слоя лучше для рефакторинга?
3. Как устранить зависимость тестов от объектов предметной области?
4. Когда писать тесты модели, а когда — сервисного слоя?
5. Зачем добавлять службу add_batch только для тестов?
6. Что такое тестовая пирамида и почему она важна?
