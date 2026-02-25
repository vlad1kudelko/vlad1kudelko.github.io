---
title: "Паттерн Unit of Work в Python: атомарность и транзакции"
description: "Узнайте, как паттерн Unit of Work (UoW) обеспечивает атомарность операций и упрощает управление транзакциями. Применяйте контекстные менеджеры для надежного кода."
pubDate: "2026-02-23"
order: 6
---

# 6. Паттерн UoW (стр. 120-135)

`UoW (Unit of Work)` — абстракция над атомарными операциями. Работает в паре с репозиторием.

Пример использования:

```python
def allocate(orderid: str, sku: str, qty: int, uow: AbstractUnitOfWork) -> str:
    line = OrderLine(orderid, sku, qty)
    with uow:  # ← Контекстный менеджер
        batches = uow.batches.list()
        batchref = model.allocate(line, batches)
        uow.commit()  # ← Явная фиксация
    return batchref
```

## Три преимущества UoW:

 1. Стабильный снимок БД — объекты не меняются mid-operation
 2. Атомарность — всё или ничего (нет частичных обновлений)
 3. Единый API для репозиториев и транзакций

## Тестирование UoW интеграционными тестами

```python
def test_uow_can_retrieve_a_batch_and_allocate_to_it(session_factory):
    session = session_factory()
    insert_batch(session, 'batch1', 'HIPSTER-WORKBENCH', 100, None)
    session.commit()
    uow = unit_of_work.SqlAlchemyUnitOfWork(session_factory)
    with uow:
        batch = uow.batches.get(reference='batch1')
        line = OrderLine('o1', 'HIPSTER-WORKBENCH', 10)
        batch.allocate(line)
        uow.commit()
    batchref = get_allocated_batch_ref(session, 'o1', 'HIPSTER-WORKBENCH')
    assert batchref == 'batch1'
```

## UoW и его контекстный менеджер

Абстрактный UoW:

```python
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

Реализация для SQLAlchemy:

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

Поддельный UoW для тестов:

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

## Использование паттерна UoW в сервисном слое

До:

```python
def allocate(line: OrderLine, repo, session):
    batches = repo.list()
    batchref = model.allocate(line, batches)
    session.commit()
```

После:

```python
def allocate(orderid: str, sku: str, qty: int, uow: AbstractUnitOfWork):
    line = OrderLine(orderid, sku, qty)
    with uow:
        batches = uow.batches.list()
        batchref = model.allocate(line, batches)
        uow.commit()
    return batchref
```

`Преимущество`: сервисный слой зависит только от одной абстракции (UoW), а не от session + repo.

## Явные и неявные фиксации

Вариант 1: Явная фиксация (рекомендуется)

```python
with uow:
    uow.batches.add(batch)
    uow.commit()  # ← Явно
```

Вариант 2: Неявная фиксация

```python
class AbstractUnitOfWork:
    def __exit__(self, exn_type, exn_value, traceback):
        if exn_type is None:
            self.commit()  # ← Автоматически при успехе
        else:
            self.rollback()
```

Авторы предпочитают явную фиксацию: безопаснее по умолчанию, код понятнее.

## Примеры: группировка операций в атомарную единицу

Пример 1: Повторное размещение

```python
def reallocate(line: OrderLine, uow: AbstractUnitOfWork):
    with uow:
        batch = uow.batches.get(sku=line.sku)
        batch.deallocate(line)  # ← Если ошибка — откат
        allocate(line)          # ← Если ошибка — откат
        uow.commit()            # ← Всё или ничего
```

Пример 2: Изменение количества товаров

```python
def change_batch_quantity(batchref: str, new_qty: int, uow: AbstractUnitOfWork):
    with uow:
        batch = uow.batches.get(reference=batchref)
        batch.change_purchased_quantity(new_qty)
        # Автоматически отменяем размещения, если товара не хватает
        while batch.available_quantity < 0:
            line = batch.deallocate_one()
        uow.commit()
```

## Ключевые выводы Главы 6:

 1. UoW — абстракция над атомарными операциями
 2. Контекстный менеджер (`with uow:`) — идиоматичный Python-способ
 3. Явная фиксация безопаснее неявной
 4. UoW + Репозиторий работают в паре
 5. Откат по умолчанию — система безопасна при ошибках

## Вопросы для проверки:

 1. Что такое Unit of Work и зачем он нужен?
 2. Почему контекстный менеджер удобен для UoW?
 3. В чём разница между явной и неявной фиксацией?
 4. Как UoW помогает с атомарностью операций?
