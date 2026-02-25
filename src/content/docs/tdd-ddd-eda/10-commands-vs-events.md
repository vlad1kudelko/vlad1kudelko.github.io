---
title: "Команды и события: разделение намерений и фактов"
description: "Узнайте разницу между командами и событиями. Настройте обработку ошибок, повторные попытки и внедрите шину сообщений."
pubDate: "2026-02-23"
order: 10
---

# 10. Команды и обработчик команд (стр. 200-210)

## Проблема: события для всего?

В предыдущей главе мы использовали события для всего. Но `BatchCreated` — это не факт, партия ещё не создана! Мы только **хотим** её создать.

**Решение**: разделить **команды** и **события**.

## Различия между командами и событиями

**Команда (Command)** — намерение что-то сделать. Посылается одному получателю.

**Событие (Event)** — факт, который уже произошёл. Рассылается всем слушателям.

**Сравнение**:

**Форма имени**:
- Команда: повелительное наклонение — `CreateBatch`, `Allocate`
- Событие: прошедшее время — `BatchCreated`, `Allocated`

**Обработка ошибок**:
- Команда: выбрасываем ошибку пользователю
- Событие: игнорируем ошибку, логируем

**Отправка**:
- Команда: одному обработчику
- Событие: всем слушателям (многие)

**Семантика**:
- Команда: намерение на будущее
- Событие: факт о прошлом

**Примеры**:
- Команда: `Allocate(orderid, sku, qty)` — «размести заказ!»
- Событие: `OutOfStock(sku)` — «товара нет в наличии (уже случилось)»

## Создаём команды

```python
# commands.py
class Command:
    pass

@dataclass
class Allocate(Command):
    orderid: str
    sku: str
    qty: int

@dataclass
class CreateBatch(Command):
    ref: str
    sku: str
    qty: int
    eta: Optional[date] = None

@dataclass
class ChangeBatchQuantity(Command):
    ref: str
    qty: int
```

## Различия в обработке исключений

Шина сообщений различает команды и события:

```python
# messagebus.py
Message = Union[Command, Event]

def handle(message: Message, uow):
    queue = [message]
    while queue:
        message = queue.pop(0)
        if isinstance(message, Event):
            handle_event(message, queue, uow)
        elif isinstance(message, Command):
            handle_command(message, queue, uow)
```

### Обработка событий

```python
def handle_event(event, queue, uow):
    for handler in EVENT_HANDLERS[type(event)]:
        try:
            handler(event, uow=uow)
            queue.extend(uow.collect_new_events())
        except Exception:
            logger.exception('Exception handling event %s', event)
            continue  # ← Игнорируем ошибку, идём дальше!
```

### Обработка команд

```python
def handle_command(command, queue, uow):
    try:
        handler = COMMAND_HANDLERS[type(command)]  # ← Один обработчик!
        result = handler(command, uow=uow)
        queue.extend(uow.collect_new_events())
        return result
    except Exception:
        logger.exception('Exception handling command %s', command)
        raise  # ← Выбрасываем ошибку!
```

### Словари обработчиков

```python
EVENT_HANDLERS = {
    OutOfStock: [send_out_of_stock_notification],
}

COMMAND_HANDLERS = {
    Allocate: allocate,
    CreateBatch: add_batch,
    ChangeBatchQuantity: change_batch_quantity,
}
```

## События, команды и обработка ошибок

**Вопрос**: что если событие не обработалось? Система останется в несогласованном состоянии?

**Ответ**: нет, потому что:
1. Команда изменяет один агрегат атомарно (через UoW)
2. События — это побочные эффекты (уведомления, интеграции)
3. Успех команды не зависит от успеха обработчиков событий

### Пример: VIP-клиенты

```python
# Агрегат
class History:
    def record_order(self, order_id: str, amount: int):
        self.orders.add(HistoryEntry(order_id, amount))
        if len(self.orders) == 3:
            self.events.append(CustomerBecameVIP(self.customer_id))

# Обработчик 1: создаёт заказ (ОБЯЗАТЕЛЬНО)
def create_order_from_basket(uow, cmd: CreateOrder):
    with uow:
        order = Order.from_basket(cmd.customer_id, cmd.basket_items)
        uow.orders.add(order)
        uow.commit()  # → инициирует OrderCreated

# Обработчик 2: обновляет историю (если получится)
def update_customer_history(uow, event: OrderCreated):
    with uow:
        history = uow.order_history.get(event.customer_id)
        history.record_order(event.order_id, event.order_amount)
        uow.commit()  # → инициирует CustomerBecameVIP

# Обработчик 3: отправляет email (если получится)
def congratulate_vip_customer(uow, event: CustomerBecameVIP):
    with uow:
        customer = uow.customers.get(event.customer_id)
        email.send(customer.email_address, 'Congratulations!')
```

**Сценарии**:

- `create_order` сломался — ❌ Заказ не создан, клиент не получил товар
- `update_customer_history` сломался — ✅ Заказ создан, но клиент не стал VIP
- `congratulate_vip_customer` сломался — ✅ Клиент стал VIP, но не получил email

**Вывод**: команда должна выполниться, события — по возможности.

## Синхронное восстановление после ошибок

**Проблема**: события иногда не обрабатываются (сеть упала, БД заблокирована).

### Решение 1: логирование

```python
def handle_event(event, queue, uow):
    for handler in EVENT_HANDLERS[type(event)]:
        try:
            logger.debug('Обработка события %s', event)
            handler(event, uow=uow)
        except Exception:
            logger.exception('Исключение при обработке события %s', event)
            continue
```

**Лог**:
```
Обработка события CustomerBecameVIP(customer_id=12345)
  обработчиком <function congratulate_vip_customer at 0x10ebc9a60>
Исключение при обработке события CustomerBecameVIP(customer_id=12345)
```

### Решение 2: повторные попытки

```python
from tenacity import Retrying, stop_after_attempt, wait_exponential

def handle_event(event, queue, uow):
    for handler in EVENT_HANDLERS[type(event)]:
        try:
            for attempt in Retrying(
                stop=stop_after_attempt(3),  # 3 попытки
                wait=wait_exponential()       # Экспоненциальная задержка
            ):
                with attempt:
                    handler(event, uow=uow)
                    queue.extend(uow.collect_new_events())
        except RetryError:
            logger.error('Не удалось обработить событие %s', event)
            continue
```

## Выводы

1. **Команда = намерение** (`CreateBatch`), **Событие = факт** (`BatchCreated`)
2. **Команды выбрасывают ошибки**, события логируют и игнорируют
3. **Одна команда → один обработчик**, одно событие → много обработчиков
4. **Успех команды не зависит от событий**
5. **Повторные попытки** для обработки событий

## Вопросы

1. В чём разница между командой и событием?
2. Почему команды выбрасывают ошибки, а события — нет?
3. Зачем нужны повторные попытки для событий?
4. Что такое «граница согласованности» в контексте команд?
