---
title: "Event-Driven архитектура: полное руководство по событийно-ориентированному дизайну"
description: "Исчерпывающий гид по Event-Driven архитектуре: Event Sourcing, CQRS, шины событий, паттерны обработки, масштабирование и лучшие практики для продакшена."
heroImage: "../../../../assets/imgs/2025/11/24-event-driven-architecture.webp"
pubDate: "2025-11-24"
---

# Event-Driven архитектура: полное руководство по событийно-ориентированному дизайну

**Event-Driven архитектура (EDA)** — это архитектурный паттерн, в котором компоненты системы взаимодействуют через производство и потребление событий. Событие — это запись о факте, произошедшем в системе, который имеет значение для бизнеса.

В этой статье мы разберём Event Sourcing, CQRS, шины событий, паттерны обработки, масштабирование и лучшие практики Event-Driven архитектуры для продакшена.

## Что такое событие

**Событие (Event)** — это неизменяемая запись о факте, произошедшем в прошлом.

```python
# Примеры событий
OrderCreated      # Заказ был создан
PaymentProcessed  # Платёж был обработан
UserVerified      # Пользователь был верифицирован
InventoryReserved # Товар был зарезервирован
ShipmentDelivered # Доставка была выполнена
```

### Характеристики хорошего события

**Прошедшее время** — событие описывает факт, который уже произошёл.

```python
# ✅ Хорошо
OrderCreated
OrderShipped
PaymentFailed

# ❌ Плохо
CreateOrder       # Это команда, а не событие
ShipOrder         # Это команда
FailPayment       # Это команда
```

**Неизменяемость** — событие нельзя изменить после создания.

```python
from dataclasses import dataclass
from datetime import datetime

@dataclass(frozen=True)  # frozen делает объект неизменяемым
class OrderCreated:
    order_id: str
    customer_id: str
    total: float
    timestamp: datetime
    items: list
```

**Самодостаточность** — событие содержит все данные, необходимые для понимания факта.

```python
# ✅ Хорошо: все данные в событии
@dataclass
class OrderCreated:
    order_id: str
    customer_id: str
    customer_name: str      # Денормализация
    customer_email: str     # Денормализация
    total: float
    items: list

# ❌ Плохо: нужно идти в БД за данными
@dataclass
class OrderCreated:
    order_id: str
    # Где данные о заказе?
```

## Архитектурные стили EDA

### Notification (Уведомление)

Простейшая форма: события содержат минимум данных, только уведомление об изменении.

```
Order Service → OrderCreated(order_id) → Event Bus
                                            ↓
Inventory Service → забирает order_id → запрашивает Order Service
                                            ↓
Email Service → забирает order_id → запрашивает Order Service
```

**Преимущества:**
- Простота реализации
- Маленький размер событий

**Недостатки:**
- Дополнительный запрос к источнику
- Временная связанность

### Event-Carried State Transfer (Перенос состояния)

События содержат все данные, необходимые потребителям.

```
Order Service → OrderCreated(order_id, customer, items, total) → Event Bus
                                                                      ↓
Inventory Service → обновляет свою копию данных без дополнительных запросов
```

**Преимущества:**
- Нет дополнительных запросов
- Слабая связанность

**Недостатки:**
- Больший размер событий
- Дублирование данных

### Event Sourcing (Журналирование событий)

Состояние системы определяется как последовательность событий.

```
Состояние = Событие₁ + Событие₂ + ... + Событиеₙ

# Вместо хранения текущего состояния:
{
  "order_id": "123",
  "status": "shipped",
  "total": 99.99
}

# Храним последовательность событий:
[
  {"type": "OrderCreated", "data": {...}},
  {"type": "PaymentProcessed", "data": {...}},
  {"type": "OrderShipped", "data": {...}}
]
```

## Event Sourcing подробно

### Агрегат с событийным хранением

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import List
from uuid import UUID, uuid4

@dataclass
class OrderCreated:
    order_id: UUID
    customer_id: UUID
    items: list
    total: float
    timestamp: datetime = field(default_factory=datetime.utcnow)

@dataclass
class PaymentProcessed:
    order_id: UUID
    payment_id: UUID
    amount: float
    timestamp: datetime = field(default_factory=datetime.utcnow)

@dataclass
class OrderShipped:
    order_id: UUID
    tracking_number: str
    timestamp: datetime = field(default_factory=datetime.utcnow)

class Order:
    def __init__(self, order_id: UUID = None):
        self.order_id = order_id or uuid4()
        self.customer_id: UUID = None
        self.items: list = []
        self.total: float = 0
        self.status: str = None
        self.payment_id: UUID = None
        self.tracking_number: str = None
        
        # Неприменённые события
        self._pending_events: List = []
        
        # История для восстановления
        self._version: int = 0
    
    def create(self, customer_id: UUID, items: list):
        """Создаёт новый заказ"""
        if self.status is not None:
            raise DomainError("Order already created")
        
        total = sum(item['price'] * item['quantity'] for item in items)
        
        self._apply_event(OrderCreated(
            order_id=self.order_id,
            customer_id=customer_id,
            items=items,
            total=total
        ))
    
    def process_payment(self, payment_id: UUID, amount: float):
        """Обрабатывает платёж"""
        if self.status != 'created':
            raise DomainError("Can only pay for created order")
        
        if amount != self.total:
            raise DomainError("Payment amount must match order total")
        
        self._apply_event(PaymentProcessed(
            order_id=self.order_id,
            payment_id=payment_id,
            amount=amount
        ))
    
    def ship(self, tracking_number: str):
        """Отправляет заказ"""
        if self.status != 'paid':
            raise DomainError("Can only ship paid order")
        
        self._apply_event(OrderShipped(
            order_id=self.order_id,
            tracking_number=tracking_number
        ))
    
    def _apply_event(self, event):
        """Применяет событие к состоянию"""
        if isinstance(event, OrderCreated):
            self.customer_id = event.customer_id
            self.items = event.items
            self.total = event.total
            self.status = 'created'
        
        elif isinstance(event, PaymentProcessed):
            self.payment_id = event.payment_id
            self.status = 'paid'
        
        elif isinstance(event, OrderShipped):
            self.tracking_number = event.tracking_number
            self.status = 'shipped'
        
        self._pending_events.append(event)
        self._version += 1
    
    def get_pending_events(self) -> List:
        """Возвращает неприменённые события для сохранения"""
        events = self._pending_events.copy()
        self._pending_events.clear()
        return events
    
    @classmethod
    def load_from_history(cls, order_id: UUID, events: List) -> 'Order':
        """Восстанавливает агрегат из истории событий"""
        order = cls(order_id)
        for event in events:
            order._apply_event(event)
        order._pending_events.clear()
        return order
```

### Event Store (Хранилище событий)

```python
import json
from datetime import datetime
from typing import List

class EventStore:
    def __init__(self, db):
        self.db = db
    
    def save(self, aggregate_id: str, events: List, expected_version: int):
        """Сохраняет события с оптимистичной блокировкой"""
        for event in events:
            self.db.execute("""
                INSERT INTO events (
                    aggregate_id,
                    aggregate_type,
                    event_type,
                    event_data,
                    version,
                    timestamp
                ) VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                str(aggregate_id),
                type(event).__module__,
                type(event).__name__,
                json.dumps(self._serialize_event(event)),
                expected_version + 1,
                datetime.utcnow()
            ))
            expected_version += 1
    
    def get_history(self, aggregate_id: str) -> List:
        """Получает всю историю событий агрегата"""
        rows = self.db.fetch("""
            SELECT event_type, event_data
            FROM events
            WHERE aggregate_id = %s
            ORDER BY version ASC
        """, str(aggregate_id))
        
        return [self._deserialize_event(row) for row in rows]
    
    def _serialize_event(self, event):
        """Сериализует событие для хранения"""
        return {
            'order_id': str(event.order_id),
            **{k: v for k, v in event.__dict__.items() 
               if k != 'order_id' and not k.startswith('_')}
        }
    
    def _deserialize_event(self, row):
        """Десериализует событие из хранения"""
        event_type = row['event_type']
        event_data = json.loads(row['event_data'])
        
        # Динамическое создание объекта события
        module_name, class_name = event_type.rsplit('.', 1)
        module = __import__(module_name, fromlist=[class_name])
        event_class = getattr(module, class_name)
        
        return event_class(**event_data)
```

### Snapshot (Снимки состояния)

Для агрегатов с длинной историей воспроизведение всех событий может быть медленным.

```python
class SnapshotStore:
    def __init__(self, db):
        self.db = db
    
    def save(self, aggregate_id: str, version: int, state: dict):
        """Сохраняет снимок состояния"""
        self.db.execute("""
            INSERT INTO snapshots (aggregate_id, version, state, created_at)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (aggregate_id) 
            DO UPDATE SET version = %s, state = %s, created_at = %s
            WHERE EXCLUDED.version > snapshots.version
        """, (
            str(aggregate_id), version, json.dumps(state),
            datetime.utcnow(), version, json.dumps(state), datetime.utcnow()
        ))
    
    def get(self, aggregate_id: str):
        """Получает последний снимок"""
        row = self.db.fetchrow("""
            SELECT version, state
            FROM snapshots
            WHERE aggregate_id = %s
            ORDER BY version DESC
            LIMIT 1
        """, str(aggregate_id))
        
        if row:
            return row['version'], json.loads(row['state'])
        return None, None

# Загрузка агрегата со снимком
def load_order_with_snapshot(order_id: UUID, event_store, snapshot_store):
    # Пробуем получить снимок
    snapshot_version, snapshot_state = snapshot_store.get(order_id)
    
    if snapshot_state:
        # Восстанавливаем из снимка
        order = Order.load_from_state(order_id, snapshot_state)
        order._version = snapshot_version
        
        # Применяем только события после снимка
        events = event_store.get_history_after(order_id, snapshot_version)
        for event in events:
            order._apply_event(event)
    else:
        # Загружаем всю историю
        events = event_store.get_history(order_id)
        order = Order.load_from_history(order_id, events)
    
    return order
```

## CQRS (Command Query Responsibility Segregation)

**CQRS** — это паттерн разделения операций чтения и записи на разные модели.

### Write Model (Command Side)

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class CreateOrderCommand:
    customer_id: str
    items: list
    shipping_address: str

@dataclass
class ProcessPaymentCommand:
    order_id: str
    payment_method: str
    amount: float

class CreateOrderHandler:
    def __init__(self, event_store, event_bus):
        self.event_store = event_store
        self.event_bus = event_bus
    
    async def handle(self, command: CreateOrderCommand) -> str:
        # Создание агрегата
        order = Order()
        order.create(
            customer_id=command.customer_id,
            items=command.items
        )
        
        # Сохранение событий
        events = order.get_pending_events()
        await self.event_store.save(order.order_id, events, 0)
        
        # Публикация событий
        for event in events:
            await self.event_bus.publish(event)
        
        return str(order.order_id)

class ProcessPaymentHandler:
    def __init__(self, event_store, event_bus):
        self.event_store = event_store
        self.event_bus = event_bus
    
    async def handle(self, command: ProcessPaymentCommand):
        # Загрузка агрегата
        events = await self.event_store.get_history(command.order_id)
        order = Order.load_from_history(command.order_id, events)
        
        # Применение команды
        order.process_payment(
            payment_id=generate_payment_id(),
            amount=command.amount
        )
        
        # Сохранение событий
        events = order.get_pending_events()
        await self.event_store.save(
            order.order_id, 
            events, 
            order._version - len(events)
        )
        
        # Публикация
        for event in events:
            await self.event_bus.publish(event)
```

### Read Model (Query Side)

```python
class OrderReadModel:
    def __init__(self, db):
        self.db = db
        self._setup_tables()
    
    def _setup_tables(self):
        """Создаёт таблицы для чтения"""
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS orders_read (
                order_id UUID PRIMARY KEY,
                customer_id UUID,
                status VARCHAR(50),
                total NUMERIC(10, 2),
                created_at TIMESTAMP,
                paid_at TIMESTAMP,
                shipped_at TIMESTAMP
            )
        """)
        
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS order_items_read (
                id SERIAL PRIMARY KEY,
                order_id UUID REFERENCES orders_read(order_id),
                product_id UUID,
                quantity INTEGER,
                price NUMERIC(10, 2)
            )
        """)
    
    async def handle_event(self, event):
        """Обрабатывает события для обновления read model"""
        if isinstance(event, OrderCreated):
            await self.db.execute("""
                INSERT INTO orders_read 
                (order_id, customer_id, status, total, created_at)
                VALUES (%s, %s, 'created', %s, %s)
            """, (event.order_id, event.customer_id, event.total, event.timestamp))
            
            for item in event.items:
                await self.db.execute("""
                    INSERT INTO order_items_read 
                    (order_id, product_id, quantity, price)
                    VALUES (%s, %s, %s, %s)
                """, (event.order_id, item['product_id'], item['quantity'], item['price']))
        
        elif isinstance(event, PaymentProcessed):
            await self.db.execute("""
                UPDATE orders_read 
                SET status = 'paid', paid_at = %s
                WHERE order_id = %s
            """, (event.timestamp, event.order_id))
        
        elif isinstance(event, OrderShipped):
            await self.db.execute("""
                UPDATE orders_read 
                SET status = 'shipped', shipped_at = %s
                WHERE order_id = %s
            """, (event.timestamp, event.order_id))
    
    async def get_order(self, order_id: str):
        """Получает заказ с товарами"""
        order = await self.db.fetchrow("""
            SELECT * FROM orders_read WHERE order_id = %s
        """, order_id)
        
        items = await self.db.fetch("""
            SELECT * FROM order_items_read WHERE order_id = %s
        """, order_id)
        
        return {
            'order': dict(order),
            'items': [dict(item) for item in items]
        }
    
    async def get_customer_orders(self, customer_id: str):
        """Получает все заказы клиента"""
        orders = await self.db.fetch("""
            SELECT * FROM orders_read 
            WHERE customer_id = %s 
            ORDER BY created_at DESC
        """, customer_id)
        
        return [dict(order) for order in orders]
```

### Проектные модели (Projections)

```python
class Projection:
    def __init__(self, name: str, db):
        self.name = name
        self.db = db
        self._position = 0
    
    async def get_position(self) -> int:
        """Получает позицию последнего обработанного события"""
        row = await self.db.fetchrow("""
            SELECT position FROM projection_positions 
            WHERE projection_name = %s
        """, self.name)
        return row['position'] if row else 0
    
    async def update_position(self, position: int):
        """Обновляет позицию"""
        await self.db.execute("""
            INSERT INTO projection_positions (projection_name, position)
            VALUES (%s, %s)
            ON CONFLICT (projection_name) 
            DO UPDATE SET position = %s
        """, (self.name, position, position))
    
    async def process_events(self, events: List):
        """Обрабатывает пакет событий"""
        for event in events:
            await self.apply_event(event)
        
        await self.update_position(events[-1].position)

class OrderSummaryProjection(Projection):
    def __init__(self, db):
        super().__init__('order_summary', db)
    
    async def apply_event(self, event):
        if isinstance(event, OrderCreated):
            await self.db.execute("""
                INSERT INTO order_summary 
                (date, orders_count, total_amount)
                VALUES (%s, 1, %s)
                ON CONFLICT (date) 
                DO UPDATE SET 
                    orders_count = order_summary.orders_count + 1,
                    total_amount = order_summary.total_amount + %s
            """, (event.timestamp.date(), event.total, event.total))

class CustomerStatsProjection(Projection):
    def __init__(self, db):
        super().__init__('customer_stats', db)
    
    async def apply_event(self, event):
        if isinstance(event, OrderCreated):
            await self.db.execute("""
                INSERT INTO customer_stats (customer_id, orders_count, total_spent)
                VALUES (%s, 1, %s)
                ON CONFLICT (customer_id)
                DO UPDATE SET
                    orders_count = customer_stats.orders_count + 1,
                    total_spent = customer_stats.total_spent + %s
            """, (event.customer_id, event.total, event.total))
```

## Шины событий (Event Bus)

### In-Memory Event Bus

```python
import asyncio
from typing import List, Callable
from collections import defaultdict

class InMemoryEventBus:
    def __init__(self):
        self._subscribers: dict = defaultdict(list)
        self._lock = asyncio.Lock()
    
    def subscribe(self, event_type: type, handler: Callable):
        """Подписывает обработчик на тип события"""
        self._subscribers[event_type].append(handler)
    
    async def publish(self, event):
        """Публикует событие всем подписчикам"""
        handlers = self._subscribers.get(type(event), [])
        
        # Параллельное выполнение обработчиков
        await asyncio.gather(
            *[handler(event) for handler in handlers],
            return_exceptions=True
        )
    
    async def publish_sequential(self, event):
        """Последовательная публикация (для транзакций)"""
        handlers = self._subscribers.get(type(event), [])
        
        for handler in handlers:
            await handler(event)

# Использование
event_bus = InMemoryEventBus()

# Подписка
event_bus.subscribe(OrderCreated, send_confirmation_email)
event_bus.subscribe(OrderCreated, reserve_inventory)
event_bus.subscribe(PaymentProcessed, update_accounting)

# Публикация
await event_bus.publish(OrderCreated(
    order_id=uuid4(),
    customer_id=customer_id,
    items=items,
    total=total
))
```

### Redis Event Bus

```python
import json
import redis.asyncio as redis

class RedisEventBus:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
    
    async def publish(self, event):
        """Публикует событие в Redis Pub/Sub"""
        event_data = {
            'type': type(event).__name__,
            'data': self._serialize(event)
        }
        
        await self.redis.publish(
            f'events:{type(event).__name__}',
            json.dumps(event_data)
        )
    
    async def subscribe(self, event_types: List[type], handler):
        """Подписывается на события"""
        pubsub = self.redis.pubsub()
        
        for event_type in event_types:
            await pubsub.subscribe(f'events:{event_type.__name__}')
        
        async for message in pubsub.listen():
            if message['type'] == 'message':
                event_data = json.loads(message['data'])
                event = self._deserialize(event_data)
                await handler(event)
    
    def _serialize(self, event):
        return {k: v for k, v in event.__dict__.items() if not k.startswith('_')}
    
    def _deserialize(self, data):
        # Динамическое создание объекта
        pass

# Использование в микросервисах
redis_client = redis.Redis(host='localhost', port=6379)
event_bus = RedisEventBus(redis_client)

# Сервис 1: публикация
await event_bus.publish(OrderCreated(order_id=uuid4(), ...))

# Сервис 2: подписка
async def handle_order_created(event):
    print(f"New order: {event.order_id}")

await event_bus.subscribe([OrderCreated], handle_order_created)
```

### Kafka Event Bus

```python
from aiokafka import AIOKafkaProducer, AIOKafkaConsumer
import json

class KafkaEventBus:
    def __init__(self, bootstrap_servers: List[str]):
        self.producer = AIOKafkaProducer(
            bootstrap_servers=bootstrap_servers,
            value_serializer=lambda v: json.dumps(v.__dict__).encode(),
            key_serializer=lambda k: k.encode() if k else None
        )
        self.consumer = None
    
    async def start(self):
        await self.producer.start()
    
    async def stop(self):
        await self.producer.stop()
        if self.consumer:
            await self.consumer.stop()
    
    async def publish(self, event, partition_key: str = None):
        """Публикует событие в Kafka"""
        topic = f'events.{type(event).__name__}'
        
        await self.producer.send_and_wait(
            topic=topic,
            value=event,
            key=partition_key
        )
    
    async def subscribe(self, topics: List[str], group_id: str, handler):
        """Подписывается на топики Kafka"""
        self.consumer = AIOKafkaConsumer(
            *topics,
            bootstrap_servers='localhost:9092',
            group_id=group_id,
            value_deserializer=lambda m: json.loads(m.decode()),
            auto_offset_reset='earliest'
        )
        
        await self.consumer.start()
        
        try:
            async for msg in self.consumer:
                event_data = msg.value
                event = self._deserialize(event_data)
                await handler(event)
                await self.consumer.commit()
        finally:
            await self.consumer.stop()
    
    def _deserialize(self, data):
        # Восстановление объекта события
        pass

# Использование
event_bus = KafkaEventBus(['localhost:9092'])
await event_bus.start()

# Публикация
await event_bus.publish(
    OrderCreated(order_id='123', customer_id='456', ...),
    partition_key='customer-456'  # Для порядка событий клиента
)

# Подписка
async def process_order_event(event):
    await handle_order(event)

await event_bus.subscribe(
    ['events.OrderCreated', 'events.OrderShipped'],
    group_id='order-processor',
    handler=process_order_event
)
```

## Паттерны обработки событий

### Event Filtering (Фильтрация)

```python
class EventFilter:
    def __init__(self, condition):
        self.condition = condition
    
    def matches(self, event) -> bool:
        return self.condition(event)

# Фильтры
high_value_filter = EventFilter(
    lambda e: isinstance(e, OrderCreated) and e.total > 1000
)

vip_customer_filter = EventFilter(
    lambda e: isinstance(e, OrderCreated) and e.customer_id in VIP_CUSTOMERS
)

# Обработчик с фильтрами
class FilteredHandler:
    def __init__(self):
        self.filters = []
    
    def add_filter(self, event_type: type, filter: EventFilter, handler):
        self.filters.append((event_type, filter, handler))
    
    async def handle(self, event):
        for event_type, filter, handler in self.filters:
            if isinstance(event, event_type) and filter.matches(event):
                await handler(event)
```

### Event Aggregation (Агрегация событий)

```python
import asyncio
from collections import deque

class EventAggregator:
    def __init__(self, window_seconds: int = 60):
        self.window_seconds = window_seconds
        self.events = deque()
        self.lock = asyncio.Lock()
    
    async def add_event(self, event):
        async with self.lock:
            self.events.append((event, asyncio.get_event_loop().time()))
            self._cleanup_old_events()
    
    async def get_aggregated(self) -> dict:
        async with self.lock:
            self._cleanup_old_events()
            
            return {
                'count': len(self.events),
                'total': sum(e.total for e, _ in self.events if hasattr(e, 'total')),
                'events': [e for e, _ in self.events]
            }
    
    def _cleanup_old_events(self):
        now = asyncio.get_event_loop().time()
        while self.events and now - self.events[0][1] > self.window_seconds:
            self.events.popleft()

# Использование
aggregator = EventAggregator(window_seconds=60)

# Добавление событий
await aggregator.add_event(OrderCreated(...))
await aggregator.add_event(OrderCreated(...))

# Получение агрегированных данных
summary = await aggregator.get_aggregated()
print(f"Orders in last minute: {summary['count']}, Total: {summary['total']}")
```

### Event Chaining (Цепочки событий)

```python
class EventChain:
    def __init__(self):
        self.chain = []
    
    def when(self, event_type: type):
        """Условие: когда произошло событие"""
        def decorator(handler):
            self.chain.append(('when', event_type, handler))
            return self
        return decorator
    
    def then_publish(self, event_factory):
        """Действие: опубликовать новое событие"""
        self.chain.append(('then_publish', event_factory))
        return self
    
    async def process(self, event, event_bus):
        """Обрабатывает цепочку"""
        for step_type, *args in self.chain:
            if step_type == 'when':
                event_type, handler = args
                if isinstance(event, event_type):
                    await handler(event)
            
            elif step_type == 'then_publish':
                event_factory = args[0]
                new_event = event_factory(event)
                await event_bus.publish(new_event)

# Пример цепочки
chain = EventChain()
chain.when(OrderCreated).then_publish(
    lambda e: InventoryReserved(
        order_id=e.order_id,
        items=e.items
    )
).when(InventoryReserved).then_publish(
    lambda e: PaymentRequested(
        order_id=e.order_id
    )
)

# Обработка
await chain.process(event, event_bus)
```

## Масштабирование

### Partitioning по агрегатам

```python
class PartitionedEventProcessor:
    def __init__(self, num_partitions: int = 10):
        self.num_partitions = num_partitions
        self.processors = {}
    
    def get_partition(self, aggregate_id: str) -> int:
        """Определяет партицию по ID агрегата"""
        return hash(aggregate_id) % self.num_partitions
    
    async def process_event(self, event):
        """Обрабатывает событие в правильной партиции"""
        partition = self.get_partition_key(event)
        
        if partition not in self.processors:
            self.processors[partition] = EventProcessor(partition)
        
        await self.processors[partition].process(event)
    
    def get_partition_key(self, event) -> str:
        """Получает ключ партиционирования из события"""
        if hasattr(event, 'order_id'):
            return event.order_id
        if hasattr(event, 'customer_id'):
            return event.customer_id
        return 'default'
```

### Consumer Groups

```python
# Kafka consumer groups для параллельной обработки
from aiokafka import AIOKafkaConsumer

async def create_consumer_group(group_id: str, topics: List[str]):
    consumer = AIOKafkaConsumer(
        *topics,
        bootstrap_servers='localhost:9092',
        group_id=group_id,
        # Автоматическое распределение партиций между участниками группы
        partition_assignment_strategy='roundrobin'
    )
    
    await consumer.start()
    return consumer

# Запуск нескольких инстансов одного процессора
# Kafka автоматически распределит партиции между ними
```

## Best Practices

### Идемпотентность обработчиков

```python
class IdempotentHandler:
    def __init__(self, db):
        self.db = db
    
    async def handle(self, event):
        event_id = self._get_event_id(event)
        
        # Проверка: уже обрабатывали?
        exists = await self.db.fetchval("""
            SELECT 1 FROM processed_events WHERE event_id = %s
        """, event_id)
        
        if exists:
            return  # Уже обработано
        
        # Обработка
        await self.process_event(event)
        
        # Запись: обработано
        await self.db.execute("""
            INSERT INTO processed_events (event_id, processed_at)
            VALUES (%s, %s)
        """, (event_id, datetime.utcnow()))
    
    def _get_event_id(self, event) -> str:
        """Уникальный ID события для дедупликации"""
        return f"{type(event).__name__}:{event.order_id}:{event.timestamp}"
```

### Порядок событий

```python
class OrderedEventProcessor:
    def __init__(self):
        self.expected_versions = {}  # aggregate_id -> expected_version
    
    async def process(self, event):
        aggregate_id = event.aggregate_id
        current_version = event.version
        
        expected = self.expected_versions.get(aggregate_id, 0)
        
        if current_version != expected + 1:
            # Нарушен порядок
            await self.handle_out_of_order(event)
            return
        
        await self.process_event(event)
        self.expected_versions[aggregate_id] = current_version
    
    async def handle_out_of_order(self, event):
        """Обработка событий вне порядка"""
        # Буферизация до получения пропущенных событий
        # Или запрос пропущенных событий из Event Store
        pass
```

### Мониторинг

```python
from prometheus_client import Counter, Histogram

# Метрики
events_processed = Counter(
    'events_processed_total',
    'Total events processed',
    ['event_type', 'status']
)

event_processing_time = Histogram(
    'event_processing_seconds',
    'Event processing time',
    ['event_type']
)

events_lag = Gauge(
    'events_lag',
    'Events processing lag',
    ['consumer_group']
)

# Использование
@event_processing_time.labels(event_type='OrderCreated').time()
async def process_event(event):
    try:
        await handle(event)
        events_processed.labels(event_type='OrderCreated', status='success').inc()
    except Exception:
        events_processed.labels(event_type='OrderCreated', status='error').inc()
        raise
```

## Заключение

Event-Driven архитектура — это мощный подход для построения распределённых систем:

- **Слабая связанность** — сервисы не зависят друг от друга
- **Масштабируемость** — независимая обработка событий
- **Отказоустойчивость** — события сохраняются и могут быть обработаны позже
- **Аудит** — полная история изменений через события
- **Гибкость** — легко добавлять новых потребителей событий

**Используйте EDA, когда:**
- Сложная доменная логика с множеством бизнес-процессов
- Нужна полная история изменений
- Требуется слабая связанность между сервисами
- Высокие требования к масштабируемости

**Избегайте EDA, когда:**
- Простое CRUD приложение
- Нужна строгая согласованность в реальном времени
- Нет ресурсов на поддержку инфраструктуры
- Команда не готова к eventual consistency
