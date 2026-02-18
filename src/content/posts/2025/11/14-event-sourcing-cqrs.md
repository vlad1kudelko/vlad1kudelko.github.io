---
title: "Event Sourcing и CQRS: Паттерны для масштабируемых систем"
description: "Полное руководство по Event Sourcing и CQRS: события как источник истины, разделение чтения и записи, проектирование агрегатов, обработка команд и запросов."
heroImage: "../../../../assets/imgs/2025/11/14-event-sourcing-cqrs.webp"
pubDate: "2025-11-14"
---

# Event Sourcing и CQRS: Архитектура для сложных доменов

**Event Sourcing (Журналирование событий)** и **CQRS (Command Query Responsibility Segregation)** — это два мощных паттерна архитектурного проектирования, которые часто используются вместе для построения масштабируемых, отказоустойчивых систем с чёткой бизнес-логикой.

В отличие от традиционного подхода, где мы храним только текущее состояние объекта, Event Sourcing сохраняет **каждое изменение** как событие. CQRS, в свою очередь, разделяет операции чтения и записи на разные модели, позволяя оптимизировать каждую из них независимо.

## Почему традиционный CRUD не всегда работает

В классическом CRUD-приложении мы выполняем операции над данными через привычные `INSERT`, `UPDATE`, `DELETE`. Когда пользователь обновляет профиль, мы просто перезаписываем старые значения новыми:

```sql
UPDATE users SET email = 'new@example.com' WHERE id = 1;
```

**Проблема:** после такой операции мы теряем информацию о том, что было до изменения. Мы не знаем, какой был email раньше, когда именно он изменился и кто инициировал изменение.

Для аудита приходится добавлять отдельные таблицы истории, триггеры или логировать изменения вручную. Это создаёт дублирование данных и усложняет поддержку.

**Event Sourcing предлагает другой подход:** вместо хранения текущего состояния мы храним последовательность событий, которые привели к этому состоянию.

## Event Sourcing: События как источник истины

### Основная идея

В Event Sourcing состояние системы определяется как **сумма всех применённых событий**. Если нужно узнать текущее состояние агрегата, мы «воспроизводим» все его события с самого начала:

```
Состояние = Событие₁ + Событие₂ + ... + Событиеₙ
```

> Пример: Вместо того чтобы хранить баланс счёта как число `$100`, мы храним последовательность событий: `AccountOpened($50)`, `MoneyDeposited($70)`, `MoneyWithdrawn($20)`. Баланс вычисляется как `$50 + $70 - $20 = $100`.

### Преимущества Event Sourcing

**Полная история изменений** — каждое изменение сохраняется навсегда. Вы всегда можете узнать, что происходило с системой в любой момент времени.

**Возможность отката** — если обнаружена ошибка, можно «отмотать» состояние назад и применить исправленные события.

**Аудит из коробки** — для регуляторных требований (PCI DSS, SOX, GDPR) не нужно создавать отдельные логи. События сами по себе являются аудиторским следом.

**Гибкость чтения** — поскольку данные хранятся как события, вы можете создавать новые проекции (read models) постфактум, не меняя способ записи.

**Отладка и анализ** — можно воспроизвести баг, применив ту же последовательность событий на тестовом окружении.

### Структура события

Событие — это неизменяемый объект, который описывает факт, произошедший в прошлом. Хорошее событие должно содержать:

```python
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

@dataclass(frozen=True)
class OrderCreated:
    event_id: UUID          # Уникальный идентификатор события
    aggregate_id: UUID      # ID агрегата, к которому относится событие
    timestamp: datetime     # Когда произошло событие
    customer_id: UUID       # Данные события
    items: list             # Список товаров
    total_amount: decimal   # Сумма заказа
```

**Важные правила именования событий:**

- Используйте прошедшее время: `OrderCreated`, `PaymentProcessed`, `UserVerified`
- Называйте события от лица того, кто их породил
- Избегайте общих названий вроде `DataChanged` или `UpdateEvent`

### Хранение событий

События обычно хранятся в **Event Store** — специализированной базе данных или таблице. Минимальная структура:

```sql
CREATE TABLE events (
    event_id UUID PRIMARY KEY,
    aggregate_id UUID NOT NULL,
    aggregate_type VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    version INTEGER NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    
    -- Оптимистичная блокировка
    UNIQUE (aggregate_id, version)
);
```

Поле `version` обеспечивает **оптимистичную блокировку**: два процесса не смогут одновременно записать события с одинаковой версией для одного агрегата.

### Восстановление состояния (Projection)

Чтобы получить текущее состояние агрегата, нужно применить все его события по порядку:

```python
class Order:
    def __init__(self, order_id: UUID):
        self.order_id = order_id
        self.status = None
        self.items = []
        self.total = Decimal(0)
        self._version = 0
    
    def apply(self, event: Event):
        """Применяет событие к агрегату"""
        if isinstance(event, OrderCreated):
            self.status = 'created'
            self.items = event.items
            self.total = event.total_amount
        elif isinstance(event, OrderPaid):
            self.status = 'paid'
        elif isinstance(event, OrderShipped):
            self.status = 'shipped'
        
        self._version += 1
    
    @classmethod
    def load(cls, order_id: UUID, events: list[Event]) -> 'Order':
        """Восстанавливает агрегат из последовательности событий"""
        order = cls(order_id)
        for event in events:
            order.apply(event)
        return order
```

### Snapshot (Снимки состояния)

Для агрегатов с длинной историей воспроизведение всех событий может быть медленным. **Snapshot** — это сохранённое состояние агрегата на определённый момент времени:

```
События: [E1, E2, E3, ..., E1000]
Snapshot на версии 500: {state_at_500}

Загрузка: берём snapshot + применяем E501...E1000
```

```python
@dataclass
class Snapshot:
    aggregate_id: UUID
    version: int
    state: dict
    timestamp: datetime
```

Снимки делаются периодически (например, каждые 100 событий) и хранятся в отдельной таблице.

## CQRS: Разделение чтения и записи

### Что такое CQRS

**CQRS (Command Query Responsibility Segregation)** — это паттерн, предложенный Грегом Янгом, который разделяет операции над данными на две категории:

- **Command (Команда)** — операция записи, которая изменяет состояние системы. Не возвращает данных, только результат выполнения (успех/ошибка).
- **Query (Запрос)** — операция чтения, которая возвращает данные. Не изменяет состояние системы.

В традиционной CRUD-архитектуре одна и та же модель используется и для чтения, и для записи. В CQRS эти модели разделены:

```
┌─────────────┐     ┌──────────────┐
│   Command   │────▶│ Write Model  │
│   (Запись)  │     │  (Domain)    │
└─────────────┘     └──────────────┘

┌─────────────┐     ┌──────────────┐
│    Query    │────▶│  Read Model  │
│   (Чтение)  │     │ (Projection) │
└─────────────┘     └──────────────┘
```

### Когда нужен CQRS

**Не используйте CQRS** для простых CRUD-приложений. Это добавит ненужную сложность.

**CQRS оправдан**, когда:

- **Разная нагрузка на чтение и запись** — например, в социальной сети посты читают в 1000 раз чаще, чем создают. Можно масштабировать read-модель независимо.
- **Сложная бизнес-логика** — доменная модель для записи может быть богаче, чем плоские DTO для чтения.
- **Несколько представлений данных** — один и тот же заказ нужно показывать по-разному в админке, в личном кабинете и в отчёте для бухгалтерии.
- **Высокие требования к производительности** — read-модель можно денормализовать и оптимизировать под конкретные запросы.

### Архитектура CQRS + Event Sourcing

Вместе эти паттерны создают мощную комбинацию:

```
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Command    │────▶│   Command   │────▶│   Aggregate  │
│   Handler    │     │   Validator │     │   (Domain)   │
└──────────────┘     └─────────────┘     └──────────────┘
                                                 │
                                                 ▼
                                          ┌─────────────┐
                                          │ Event Store │
                                          └─────────────┘
                                                 │
                                                 ▼
┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  Read Model  │◀────│   Event     │◀────│  Event       │
│ (Projection) │     │  Handler    │     │  Publisher   │
└──────────────┘     └─────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐
│   Query      │
│   Handler    │
└──────────────┘
```

**Поток данных:**

1. Пользователь отправляет команду `CreateOrder`
2. Command Handler валидирует команду и создаёт агрегат
3. Агрегат генерирует событие `OrderCreated`
4. Событие сохраняется в Event Store
5. Event Publisher отправляет событие в шину
6. Event Handler обновляет Read Model (проекцию)
7. Query Handler читает данные из Read Model

## Практическая реализация

### Команды и обработчики

Команда — это намерение выполнить действие. Она описывает, **что** нужно сделать:

```python
from dataclasses import dataclass
from uuid import UUID
from decimal import Decimal

@dataclass
class CreateOrder:
    command_id: UUID
    customer_id: UUID
    items: list[OrderItem]
    
@dataclass
class PayOrder:
    command_id: UUID
    order_id: UUID
    payment_method: str
    amount: Decimal
```

Обработчик команд отвечает за выполнение бизнес-логики:

```python
class CreateOrderHandler:
    def __init__(
        self,
        event_store: EventStore,
        idempotency_store: IdempotencyStore
    ):
        self.event_store = event_store
        self.idempotency_store = idempotency_store
    
    async def handle(self, command: CreateOrder) -> UUID:
        # Проверка идемпотентности
        if await self.idempotency_store.exists(command.command_id):
            raise IdempotencyError("Command already processed")
        
        # Загрузка или создание агрегата
        order = Order(command.command_id)
        order.create(command.customer_id, command.items)
        
        # Сохранение событий
        await self.event_store.save(order.events)
        
        # Запись в хранилище идемпотентности
        await self.idempotency_store.save(command.command_id)
        
        return order.order_id
```

### Агрегат с генерацией событий

Агрегат инкапсулирует бизнес-логику и генерирует события:

```python
class Order:
    def __init__(self, order_id: UUID):
        self.order_id = order_id
        self.events: list[Event] = []
        self._version = 0
    
    def create(self, customer_id: UUID, items: list[OrderItem]):
        """Создаёт новый заказ"""
        if not items:
            raise DomainError("Order must have items")
        
        total = sum(item.price * item.quantity for item in items)
        
        self.apply(OrderCreated(
            aggregate_id=self.order_id,
            customer_id=customer_id,
            items=items,
            total_amount=total,
            timestamp=datetime.utcnow()
        ))
    
    def pay(self, payment_method: str, amount: Decimal):
        """Оплачивает заказ"""
        if self.status != 'created':
            raise DomainError("Can only pay for created order")
        
        if amount != self.total:
            raise DomainError("Payment amount must match order total")
        
        self.apply(OrderPaid(
            aggregate_id=self.order_id,
            payment_method=payment_method,
            amount=amount,
            timestamp=datetime.utcnow()
        ))
    
    def apply(self, event: Event):
        """Применяет событие и добавляет в список непроверенных"""
        self._apply_event(event)
        self.events.append(event)
        self._version += 1
    
    def _apply_event(self, event: Event):
        """Внутренний метод применения события к состоянию"""
        if isinstance(event, OrderCreated):
            self.customer_id = event.customer_id
            self.items = event.items
            self.total = event.total_amount
            self.status = 'created'
        elif isinstance(event, OrderPaid):
            self.status = 'paid'
            self.payment_method = event.payment_method
```

### Проекции (Read Models)

Проекции создают оптимизированные представления данных для чтения:

```python
class OrderProjection:
    def __init__(self, db: Database):
        self.db = db
    
    async def handle(self, event: Event):
        """Обрабатывает событие и обновляет проекцию"""
        if isinstance(event, OrderCreated):
            await self.db.execute("""
                INSERT INTO orders_read (
                    order_id, customer_id, status, total, created_at
                ) VALUES (%s, %s, 'created', %s, %s)
            """, event.aggregate_id, event.customer_id, 
                event.total_amount, event.timestamp)
            
            for item in event.items:
                await self.db.execute("""
                    INSERT INTO order_items_read 
                    (order_id, product_id, quantity, price)
                    VALUES (%s, %s, %s, %s)
                """, event.aggregate_id, item.product_id, 
                    item.quantity, item.price)
        
        elif isinstance(event, OrderPaid):
            await self.db.execute("""
                UPDATE orders_read 
                SET status = 'paid', paid_at = %s
                WHERE order_id = %s
            """, event.timestamp, event.aggregate_id)
        
        elif isinstance(event, OrderCancelled):
            await self.db.execute("""
                UPDATE orders_read 
                SET status = 'cancelled', cancelled_at = %s
                WHERE order_id = %s
            """, event.timestamp, event.aggregate_id)
```

### Запросы (Queries)

Запросы возвращают данные из read-модели:

```python
@dataclass
class OrderDTO:
    order_id: UUID
    customer_id: UUID
    status: str
    total: Decimal
    items: list[OrderItemDTO]
    created_at: datetime
    paid_at: datetime | None

class GetOrderQuery:
    def __init__(self, db: Database):
        self.db = db
    
    async def execute(self, order_id: UUID) -> OrderDTO | None:
        row = await self.db.fetchrow("""
            SELECT order_id, customer_id, status, total, 
                   created_at, paid_at
            FROM orders_read
            WHERE order_id = $1
        """, order_id)
        
        if not row:
            return None
        
        items_rows = await self.db.fetch("""
            SELECT product_id, quantity, price
            FROM order_items_read
            WHERE order_id = $1
        """, order_id)
        
        return OrderDTO(
            order_id=row['order_id'],
            customer_id=row['customer_id'],
            status=row['status'],
            total=row['total'],
            items=[OrderItemDTO(**r) for r in items_rows],
            created_at=row['created_at'],
            paid_at=row['paid_at']
        )
```

## Согласованность в конечном счёте

Одно из важнейших понятий в CQRS + Event Sourcing — **Eventual Consistency (Согласованность в конечном счёте)**.

После записи команды данные в read-модели обновляются асинхронно. Это означает, что в течение короткого времени (обычно миллисекунды или секунды) read-модель может отставать от write-модели.

```
T0: Команда CreateOrder → Event Store
T1: Событие опубликовано
T2: Projection обрабатывает событие (задержка 50ms)
T3: Read Model обновлён
```

**Как работать с задержкой:**

**Не возвращайте данные из read-модели сразу после записи:**

```python
# ❌ Плохо: данные ещё не обновились
order_id = await handler.handle(command)
return await query.execute(order_id)  # Может вернуть null

# ✅ Хорошо: возвращаем результат из команды
result = await handler.handle(command)
return {"order_id": result, "status": "created"}
```

**Используйте version для синхронизации:**

```python
# Клиент запрашивает данные с определённой версией
async def get_order_with_version(
    order_id: UUID, 
    min_version: int
) -> OrderDTO:
    while True:
        order = await query.execute(order_id)
        if order and order.version >= min_version:
            return order
        await asyncio.sleep(0.01)  # Ждём 10ms
```

## Идемпотентность

Идемпотентность гарантирует, что повторное выполнение команды не изменит результат. Это критически важно для надёжности системы.

```python
class IdempotencyStore:
    def __init__(self, redis: Redis):
        self.redis = redis
    
    async def exists(self, command_id: UUID) -> bool:
        return await self.redis.exists(f"idemp:{command_id}")
    
    async def save(self, command_id: UUID, ttl: int = 86400):
        await self.redis.setex(
            f"idemp:{command_id}", 
            ttl, 
            "1"
        )
```

**Правила идемпотентности:**

- Каждая команда должна иметь уникальный `command_id`
- Перед обработкой проверяйте, не обрабатывалась ли команда
- Сохраняйте результат обработки для повторных запросов

## Масштабирование

### Горизонтальное масштабирование чтения

Read-модели можно реплицировать и шардировать:

- **Репликация** — несколько копий БД для чтения
- **Шардирование** — разделение данных по разным серверам (например, по `customer_id`)
- **Кэширование** — Redis/Memcached для горячих данных

### Масштабирование записи

Write-модель масштабировать сложнее:

- **Шардирование по агрегатам** — разные агрегаты на разных серверах
- **Партиционирование Event Store** — разделение событий по диапазонам ID
- **Очереди команд** — буферизация входящих команд

## Когда не использовать

**Event Sourcing и CQRS добавляют сложность.** Не применяйте их, если:

- Простое CRUD-приложение без сложной логики
- Нет требований к аудиту или истории изменений
- Команда не готова к eventual consistency
- Нет ресурсов на поддержку инфраструктуры

## Заключение

Event Sourcing и CQRS — это мощные инструменты для построения сложных, масштабируемых систем. Они дают:

- **Полную историю изменений** через события
- **Гибкость чтения** через проекции
- **Масштабируемость** через разделение моделей
- **Отказоустойчивость** через воспроизведение событий

Но за эти преимущества приходится платить:

- Сложность реализации и отладки
- Необходимость обработки eventual consistency
- Дополнительные требования к инфраструктуре

Используйте эти паттерны осознанно, когда преимущества перевешивают затраты на сложность.
