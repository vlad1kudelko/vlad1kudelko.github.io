---
title: "Паттерн Unit of Work: атомарность операций и транзакции"
description: "Узнайте, как паттерн UoW обеспечивает атомарность операций, упрощает управление транзакциями и связывает репозиторий с сервисным слоем."
pubDate: "2026-02-23"
order: 6
---

# 6. Паттерн UoW (стр. 120-135)

## Что такое Unit of Work?

**Unit of Work (UoW)** — абстракция над атомарными операциями. Если репозиторий абстрагирует доступ к данным, то UoW абстрагирует **целостность транзакций**.

**Проблема без UoW**: сервисный слой зависит и от репозитория, и от сеанса БД:

```python
# Без UoW: много зависимостей
def allocate(line: OrderLine, repo, session):
    batches = repo.list()
    batchref = model.allocate(line, batches)
    session.commit()  # ← Зависимость от session
```

**Решение**: UoW объединяет репозиторий и транзакцию в одной абстракции:

```python
# С UoW: одна зависимость
def allocate(orderid: str, sku: str, qty: int, uow: AbstractUnitOfWork):
    line = OrderLine(orderid, sku, qty)
    with uow:
        batches = uow.batches.list()
        batchref = model.allocate(line, batches)
        uow.commit()
    return batchref
```

## Три преимущества UoW

1. **Стабильный снимок БД** — объекты не меняются во время операции
2. **Атомарность** — всё или ничего (нет частичных обновлений)
3. **Единый API** — одно место для получения репозиториев и фиксации

## Реализация UoW

### Абстрактный базовый класс

```python
# unit_of_work.py
class AbstractUnitOfWork(abc.ABC):
    batches: repository.AbstractRepository

    def __exit__(self, *args):
        self.rollback()

    @abc.abstractmethod
    def commit(self):
        raise NotImplementedError

    @abc.abstractmethod
    def rollback(self):
        raise NotImplementedError
```

### Реализация для SQLAlchemy

```python
class SqlAlchemyUnitOfWork(AbstractUnitOfWork):
    def __init__(self, session_factory=DEFAULT_SESSION_FACTORY):
        self.session_factory = session_factory

    def __enter__(self):
        self.session = self.session_factory()
        self.batches = repository.SqlAlchemyRepository(self.session)
        return super().__enter__()

    def __exit__(self, *args):
        super().__exit__(*args)
        self.session.close()

    def commit(self):
        self.session.commit()

    def rollback(self):
        self.session.rollback()
```

**Контекстный менеджер** (`with uow:`) — идиоматичный способ для Python:
- `__enter__` — создаёт сеанс и репозиторий
- `__exit__` — закрывает сеанс, делает откат если не было commit()

### Поддельный UoW для тестов

```python
class FakeUnitOfWork(AbstractUnitOfWork):
    def __init__(self):
        self.batches = FakeRepository([])
        self.committed = False

    def commit(self):
        self.committed = True

    def rollback(self):
        pass
```

## Тестирование UoW

### Интеграционный тест

```python
def test_uow_can_retrieve_a_batch_and_allocate_to_it(session_factory):
    # Подготовка: вставляем данные напрямую в БД
    session = session_factory()
    insert_batch(session, 'batch1', 'HIPSTER-WORKBENCH', 100, None)
    session.commit()
    
    # Тест: используем UoW
    uow = unit_of_work.SqlAlchemyUnitOfWork(session_factory)
    with uow:
        batch = uow.batches.get(reference='batch1')
        line = model.OrderLine('o1', 'HIPSTER-WORKBENCH', 10)
        batch.allocate(line)
        uow.commit()
    
    # Проверка: данные сохранились
    batchref = get_allocated_batch_ref(session, 'o1', 'HIPSTER-WORKBENCH')
    assert batchref == 'batch1'
```

### Тесты на откат

```python
def test_rolls_back_uncommitted_work_by_default(session_factory):
    uow = unit_of_work.SqlAlchemyUnitOfWork(session_factory)
    with uow:
        insert_batch(uow.session, 'batch1', 'MEDIUM-PLINTH', 100, None)
        # commit() не вызываем!
    
    # Данные не сохранились
    new_session = session_factory()
    rows = list(new_session.execute('SELECT * FROM batches'))
    assert rows == []

def test_rolls_back_on_error(session_factory):
    uow = unit_of_work.SqlAlchemyUnitOfWork(session_factory)
    with pytest.raises(MyException):
        with uow:
            insert_batch(uow.session, 'batch1', 'LARGE-FORK', 100, None)
            raise MyException()
    
    # Откат произошёл
    new_session = session_factory()
    rows = list(new_session.execute('SELECT * FROM batches'))
    assert rows == []
```

## Явная vs неявная фиксация

### Вариант 1: Явная фиксация (рекомендуется)

```python
with uow:
    uow.batches.add(batch)
    uow.commit()  # ← Явно вызываем
```

**Преимущества**:
- Безопасно по умолчанию (ничего не меняется без commit())
- Понятно, когда происходит фиксация
- Один путь к изменениям: полный успех + явная фиксация

### Вариант 2: Неявная фиксация

```python
class AbstractUnitOfWork:
    def __exit__(self, exn_type, exn_value, traceback):
        if exn_type is None:
            self.commit()  # ← Автоматически при успехе
        else:
            self.rollback()
```

```python
# Не нужно писать commit()
with uow:
    uow.batches.add(batch)
```

**Недостатки**:
- Менее явно, когда происходит фиксация
- Ранний выход из блока может зафиксировать частичные изменения

**Мы предпочитаем явную фиксацию** — безопаснее и понятнее.

## Примеры использования UoW

### Пример 1: Повторное размещение

```python
def reallocate(line: OrderLine, uow: AbstractUnitOfWork):
    with uow:
        batch = uow.batches.get(sku=line.sku)
        if batch is None:
            raise InvalidSku(f'Недопустимый артикул {line.sku}')
        
        batch.deallocate(line)  # ← Если ошибка — откат
        allocate(line)          # ← Если ошибка — откат
        uow.commit()            # ← Всё или ничего
```

Если `deallocate()` или `allocate()` выбросит ошибку — всё откатится.

### Пример 2: Изменение количества товара

```python
def change_batch_quantity(batchref: str, new_qty: int, uow: AbstractUnitOfWork):
    with uow:
        batch = uow.batches.get(reference=batchref)
        batch.change_purchased_quantity(new_qty)
        
        # Если товара стало меньше — отменяем размещения
        while batch.available_quantity < 0:
            line = batch.deallocate_one()
        
        uow.commit()
```

Если на каком-то этапе возникнет ошибка — все изменения откатятся.

## Почему UoW, а не просто Session?

**Вопрос**: зачем создавать UoW, если SQLAlchemy Session уже делает то же самое?

**Ответ**: UoW проще и понятнее:

| Session (SQLAlchemy) | UoW |
|---------------------|-----|
| Сложный объект с кучей методов | Простой интерфейс: commit(), rollback(), .batches |
| Можно делать произвольные запросы | Только репозитории и транзакции |
| Сложно подделывать в тестах | Легко создать FakeUnitOfWork |

**Принцип**: «Не владеешь — не имитируй». Лучше создать простую абстракцию, чем зависеть от сложного Session.

## Структура тестов после внедрения UoW

```
tests/
├── unit/
│   ├── test_allocate.py      # Модель предметной области
│   └── test_services.py      # Сервисный слой с FakeUoW
├── integration/
│   └── test_uow.py           # UoW с реальной БД
└── e2e/
    └── test_api.py           # Сквозные тесты API
```

**Правило**: тестировать на максимально высоком уровне абстракции. Если test_uow.py покрывает то же, что test_repository.py — удаляем последний.

## Выводы

1. **UoW — абстракция атомарных операций** — всё или ничего
2. **Контекстный менеджер** — идиоматичный Python-способ (`with uow:`)
3. **Явная фиксация безопаснее** — по умолчанию ничего не меняется
4. **UoW + репозиторий работают в паре** — коллабораторы
5. **Откат по умолчанию** — система безопасна при ошибках
6. **Проще чем Session** — не нужно зависеть от сложного ORM

## Вопросы

1. Что такое Unit of Work и зачем он нужен?
2. Почему контекстный менеджер удобен для UoW?
3. В чём разница между явной и неявной фиксацией?
4. Как UoW помогает с атомарностью операций?
5. Почему не использовать напрямую Session из SQLAlchemy?
6. Что такое принцип «Не владеешь — не имитируй»?
