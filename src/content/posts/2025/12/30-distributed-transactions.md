---
title: "Распределённые транзакции и 2PC — Saga, Paxos, Raft"
description: "Изучите распределённые транзакции: Two-Phase Commit, Saga, консенсус-алгоритмы. Решите проблему согласованности в микросервисах."
heroImage: "../../../../assets/imgs/2025/12/30-distributed-transactions.webp"
pubDate: "2025-12-30"
---

# Распределённые транзакции в микросервисах

Распределённые транзакции — сложная проблема в микросервисной архитектуре.

## Проблема

```
Сервис A           Сервис B    Сервис C
    │                  │           │
    ├─── Транзакция ───┼───────────┤
    │ (ACID)           │           │
    │                  │           │
    └──────────────────┴───────────┘
    
Проблема: как обеспечить атомарность между сервисами?
```

## Two-Phase Commit (2PC)

```
Phase 1: Prepare
┌──────────────────────────────┐
│  Coordinator ── A: Prepare?  │
│  Coordinator ── B: Prepare?  │
│  Coordinator ── C: Prepare?  │
│                              │
│  A ── Ready                  │
│  B ── Ready                  │
│  C ── Ready                  │
└──────────────────────────────┘

Phase 2: Commit
┌────────────────────────────┐
│  Coordinator ── A: Commit  │
│  Coordinator ── B: Commit  │
│  Coordinator ── C: Commit  │
│                            │
│  A ── Done                 │
│  B ── Done                 │
│  C ── Done                 │
└────────────────────────────┘
```

### Недостатки 2PC

- Блокировка ресурсов
- Coordinator — single point of failure
- Сложность реализации

## Saga Pattern

```
┌───────────────────────────────────────┐
│ Order Service                         │
│  1. createOrder()  → Создание заказа  │
│  2. compensate()   → Отмена заказа    │
├───────────────────────────────────────┤
│ Payment Service                       │
│  3. charge()       → Оплата           │
│  4. compensate()   → Возврат средств  │
├───────────────────────────────────────┤
│ Inventory Service                     │
│  5. reserve()      → Резервирование   │
│  6. compensate()   → Снятие резерва   │
├───────────────────────────────────────┤
│ Shipping Service                      │
│  7. ship()         → Доставка         │
│  8. compensate()   → Отмена доставки  │
└───────────────────────────────────────┘
```

### Choreography-based Saga

```javascript
// Сервис заказов
async function createOrder(orderData) {
    const order = await Order.create({ ...orderData, status: 'PENDING' });
    
    await MessageBroker.publish('order.created', {
        orderId: order.id,
        items: order.items
    });
    
    return order;
}

// Сервис оплаты
async function handleOrderCreated(event) {
    await Payment.charge(event.orderId, event.amount);
    await MessageBroker.publish('payment.completed', { orderId: event.orderId });
}

async function handlePaymentFailed(event) {
    await Order.update(event.orderId, { status: 'CANCELLED' });
    await MessageBroker.publish('order.cancelled', { orderId: event.orderId });
}
```

### Orchestration-based Saga

```javascript
// Orchestrator
class OrderSaga {
    async execute(orderData) {
        try {
            // Шаг 1: Создать заказ
            const order = await OrderService.create({ ...orderData, status: 'PENDING' });
            
            // Шаг 2: Обработать оплату
            await PaymentService.charge(order.id, order.amount);
            
            // Шаг 3: Зарезервировать товар
            await InventoryService.reserve(order.items);
            
            // Шаг 4: Запустить доставку
            await ShippingService.ship(order.id);
            
            // Шаг 5: Обновить статус
            await OrderService.update(order.id, { status: 'COMPLETED' });
            
        } catch (error) {
            // Compensating transactions
            await this.compensate(error);
        }
    }
    
    async compensate(error) {
        const completedSteps = error.completedSteps || [];
        
        for (const step of completedSteps.reverse()) {
            try {
                await step.compensate();
            } catch (e) {
                // Логирование, manual intervention
                await AlertService.notify('compensation_failed', { error: e });
            }
        }
    }
}
```

## Outbox Pattern

```
┌───────────────────────────────────────────────┐
│              Application                      │
│  ┌─────────────┐     ┌─────────────┐          │
│  │ Transaction │     │   Outbox    │          │
│  │   (БД)      │ ─── │   Table     │          │
│  └─────────────┘     └──────┬──────┘          │
│                             │                 │
│  ┌─────────────────────────────────────────┐  │
│  │   Transaction Log Miner (CDC/Broker)    │  │
│  └────────────────────┬────────────────────┘  │
│                       │                       │
└───────────────────────┼───────────────────────┘
                        │
           ┌────────────┴────────────┐
    ┌──────────────┐          ┌──────────────┐
    │   Service A  │          │   Service B  │
    └──────────────┘          └──────────────┘
```

### Реализация

```javascript
// Модель
class Order extends Model {
    static tableName = 'orders';
    
    static jsonSchema = {
        type: 'object',
        required: ['items'],
        properties: {
            id: { type: 'string' },
            status: { type: 'string', enum: ['PENDING', 'PAID', 'SHIPPED', 'CANCELLED'] },
            items: { type: 'array' }
        }
    };
}

// Outbox table
class OutboxEvent extends Model {
    static tableName = 'outbox';
    
    static async append(aggregateType, aggregateId, type, payload) {
        await this.query().insert({
            aggregate_type: aggregateType,
            aggregate_id: aggregateId,
            type,
            payload: JSON.stringify(payload),
            created_at: new Date()
        });
    }
}

// Транзакция + outbox
async function createOrder(orderData) {
    return db.transaction(async (trx) => {
        // 1. Создать заказ
        const order = await Order.query(trx).insert({
            id: uuid(),
            ...orderData,
            status: 'PENDING'
        });
        
        // 2. Записать в outbox
        await OutboxEvent.query(trx).insert({
            aggregate_type: 'order',
            aggregate_id: order.id,
            type: 'order.created',
            payload: { orderId: order.id, items: order.items }
        });
        
        return order;
    });
}
```

## Eventual Consistency

```
┌───────────────────────────┐
│ Strong Consistency        │
│  A ── B ── C ── Done      │
│  |    |    |              │
│  └────┴────┘              │
│  Всё или ничего           │
├───────────────────────────┤
│ Eventual Consistency      │
│  A ── B ── C ── Done      │
│  │    │    │              │
│  └────┴────┘              │
│  Со временем согласуется  │
└───────────────────────────┘
```

## Выбор подхода

- 2PC: Несколько сервисов, строгая согласованность
- Saga (choreography): Независимые сервисы, простые сценарии
- Saga (orchestration): Сложные сценарии, явный контроль
- Outbox: Publish events из транзакций

## Best Practices

1. **Idempotency** — обработчики должны быть идемпотентными
2. **Compensation** — всегда продумывайте откат
3. **Timeouts** — устанавливайте разумные таймауты
4. **Monitoring** — отслеживайте saga execution
5. **Manual intervention** — планируйте ручное вмешательство

## Заключение

Распределённые транзакции требуют иного подхода, чем монолитные ACID транзакции. Saga и Outbox — основные паттерны.
