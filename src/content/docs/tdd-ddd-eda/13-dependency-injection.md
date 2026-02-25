---
title: "Внедрение зависимостей и Bootstrap: чистая сборка приложения"
description: "Узнайте, как паттерн Dependency Injection и скрипт начальной загрузки превращают код в гибкую и тестируемую систему."
pubDate: "2026-02-23"
order: 13
---

# 13. Внедрение зависимостей (и начальная загрузка) (стр. 246-267)

## Проблема: неявные зависимости

До сих пор мы управляли зависимостями по-разному:

**UoW — явная зависимость** (хорошо):

```python
def allocate(cmd: Allocate, uow: AbstractUnitOfWork):
    with uow:
        ...

# Тесты — легко подделать
uow = FakeUnitOfWork()
messagebus.handle(cmd, uow)
```

**Email — неявная зависимость** (плохо):

```python
from allocation.adapters import email

def send_out_of_stock_notification(event, uow):
    email.send('stock@made.com', f'Артикула {event.sku} нет в наличии')

# Тесты — mock.patch для каждого теста
with mock.patch("allocation.adapters.email.send"):
    ...
```

**Проблемы неявных зависимостей**:
- `mock.patch` привязывает к реализации (импорт, имя функции)
- Нужно патчить в каждом тесте
- Рефакторинг ломает тесты

## Решение: явные зависимости

```python
def send_out_of_stock_notification(
    event: OutOfStock,
    send_mail: Callable  # ← Явная зависимость!
):
    send_mail('stock@made.com', f'Артикула {event.sku} нет в наличии')
```

**Преимущества**:
1. **Тестируемость** — легко подменить в тестах
2. **Инверсия зависимостей** — зависимость от абстракций
3. **Явное лучше неявного** (Дзен Python)

**Вопрос**: кто будет создавать и передавать зависимости?

## Подготовка обработчиков: 3 способа внедрения

### Способ 1: Замыкания

```python
# handlers.py
def allocate(cmd: Allocate, uow: AbstractUnitOfWork):
    with uow:
        ...

def send_out_of_stock_notification(event, send_mail: Callable):
    send_mail('stock@made.com', f'Артикула {event.sku} нет в наличии')

# bootstrap.py
def bootstrap():
    uow = SqlAlchemyUnitOfWork()

    # Замыкание захватывает uow
    def allocate_composed(cmd):
        return allocate(cmd, uow)

    # Замыкание захватывает send_mail
    def sosn_composed(event):
        return send_out_of_stock_notification(event, email.send)

    return allocate_composed, sosn_composed
```

### Способ 2: functools.partial

```python
import functools

def bootstrap():
    uow = SqlAlchemyUnitOfWork()
    allocate_composed = functools.partial(allocate, uow=uow)
    sosn_composed = functools.partial(
        send_out_of_stock_notification,
        send_mail=email.send
    )
    return allocate_composed, sosn_composed
```

### Способ 3: Классы

```python
# handlers.py
class AllocateHandler:
    def __init__(self, uow: AbstractUnitOfWork):
        self.uow = uow

    def __call__(self, cmd: Allocate):
        with self.uow:
            # Логика обработчика
            ...

# bootstrap.py
uow = SqlAlchemyUnitOfWork()
allocate = AllocateHandler(uow)  # ← Внедрение зависимости!

# Позже
allocate(cmd)  # ← Вызов без передачи зависимостей
```

## Сценарий начальной загрузки (Bootstrap)

**Задачи bootstrap**:
1. Объявляет зависимости по умолчанию
2. Выполняет инициализацию (ORM, logging)
3. Внедряет зависимости в обработчики
4. Возвращает шину сообщений

**Реализация**:

```python
# bootstrap.py
import inspect
from functools import partial

def bootstrap(
    start_orm: bool = True,
    uow: AbstractUnitOfWork = SqlAlchemyUnitOfWork(),
    send_mail: Callable = email.send,
    publish: Callable = redis_eventpublisher.publish,
) -> MessageBus:
    if start_orm:
        orm.start_mappers()
    
    # Зависимости
    dependencies = {
        'uow': uow,
        'send_mail': send_mail,
        'publish': publish
    }
    
    # Внедряем зависимости в обработчики событий
    injected_event_handlers = {
        event_type: [
            inject_dependencies(handler, dependencies)
            for handler in event_handlers
        ]
        for event_type, event_handlers in handlers.EVENT_HANDLERS.items()
    }
    
    # Внедряем зависимости в обработчики команд
    injected_command_handlers = {
        command_type: inject_dependencies(handler, dependencies)
        for command_type, handler in handlers.COMMAND_HANDLERS.items()
    }
    
    return MessageBus(
        uow=uow,
        event_handlers=injected_event_handlers,
        command_handlers=injected_command_handlers,
    )

def inject_dependencies(handler, dependencies):
    # Проверяем сигнатуру функции
    params = inspect.signature(handler).parameters
    # Находим совпадающие зависимости
    deps = {
        name: dependency
        for name, dependency in dependencies.items()
        if name in params
    }
    # Возвращаем частично применённую функцию
    return lambda message: handler(message, **deps)
```

### «Ручное» внедрение (альтернатива без inspect)

Если `inspect()` кажется сложным:

```python
def bootstrap(uow, send_mail, publish):
    injected_event_handlers = {
        events.Allocated: [
            lambda e: handlers.publish_allocated_event(e, publish),
            lambda e: handlers.add_allocation_to_read_model(e, uow),
        ],
        events.Deallocated: [
            lambda e: handlers.remove_allocation_from_read_model(e, uow),
            lambda e: handlers.reallocate(e, uow),
        ],
        events.OutOfStock: [
            lambda e: handlers.send_out_of_stock_notification(e, send_mail)
        ]
    }
    injected_command_handlers = {
        commands.Allocate: lambda c: handlers.allocate(c, uow),
        commands.CreateBatch: lambda c: handlers.add_batch(c, uow),
        commands.ChangeBatchQuantity: lambda c: handlers.change_batch_quantity(c, uow),
    }
    return MessageBus(
        uow=uow,
        event_handlers=injected_event_handlers,
        command_handlers=injected_command_handlers,
    )
```

**Преимущество**: проще понять, нет «магии» с `inspect()`.

## Использование bootstrap в точках входа

**Flask**:

```python
# flask_app.py
from allocation import bootstrap

bus = bootstrap.bootstrap()

@app.route('/allocate', methods=['POST'])
def allocate_endpoint():
    cmd = commands.Allocate(
        request.json['orderid'],
        request.json['sku'],
        request.json['qty']
    )
    bus.handle(cmd)
    return '', 202
```

**Redis Consumer**:

```python
from allocation import bootstrap

bus = bootstrap.bootstrap()

def main():
    pubsub = r.pubsub()
    pubsub.subscribe('change_batch_quantity')
    for m in pubsub.listen():
        cmd = commands.ChangeBatchQuantity(...)
        bus.handle(cmd)
```

## Внедрение зависимостей в тестах

**Тестовый bootstrap**:

```python
# tests/conftest.py
def bootstrap_for_tests():
    return bootstrap.bootstrap(
        start_orm=False,  # Не запускаем ORM
        uow=FakeUnitOfWork(),  # Поддельный UoW
        send_mail=FakeEmailSender(),  # Поддельный email
        publish=lambda *args: None,  # Никакого Redis
    )

# tests/unit/test_handlers.py
def test_allocate():
    bus = bootstrap_for_tests()
    bus.handle(commands.CreateBatch('b1', 'SKU', 100, None))
    bus.handle(commands.Allocate('order1', 'SKU', 10))
    assert bus.uow.committed
```

## «Правильное» создание адаптера

**Проблема**: как создать реальный email-адаптер?

**Решение**: фабрика адаптеров в bootstrap:

```python
# adapters/email.py
class EmailSender:
    def __init__(self, smtp_host, smtp_port):
        self.smtp = smtplib.SMTP(smtp_host, smtp_port)

    def send(self, to, subject):
        self.smtp.send_message(...)

# bootstrap.py
def make_email_sender():
    return EmailSender(
        smtp_host=os.environ.get('SMTP_HOST', 'localhost'),
        smtp_port=int(os.environ.get('SMTP_PORT', 25))
    )

def bootstrap(...):
    send_mail = make_email_sender()
    ...
```

**В тестах**:

```python
def test_bootstrap():
    bus = bootstrap.bootstrap(
        send_mail=FakeEmailSender()  # ← Подмена!
    )
```

## Выводы

1. **Явные зависимости лучше неявных** — тестируемость, рефакторинг
2. **Bootstrap** — единое место для инициализации и внедрения
3. **Три способа внедрения**: замыкания, `partial`, классы
4. **Inspect** — автоматическое внедрение по имени параметра
5. **Тесты** — подменяем зависимости в bootstrap

## Вопросы

1. Зачем нужны явные зависимости вместо импортов?
2. Что делает функция `bootstrap()`?
3. Какие есть способы внедрения зависимостей (3 способа)?
4. Как упростить тестирование с помощью bootstrap?
5. Что такое Composition Root?
