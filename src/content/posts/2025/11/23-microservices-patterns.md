---
title: "Микросервисы: паттерны проектирования для распределённых систем"
description: "Полное руководство по паттернам микросервисов: API Gateway, Circuit Breaker, Saga, CQRS, Service Discovery, Observability и лучшие практики для продакшена."
heroImage: "../../../../assets/imgs/2025/11/23-microservices-patterns.webp"
pubDate: "2025-11-23"
---

# Микросервисы: паттерны проектирования для распределённых систем

**Микросервисная архитектура** — это подход к разработке приложений как набора небольших независимых сервисов, которые взаимодействуют через чётко определённые API. В отличие от монолита, микросервисы позволяют масштабировать, развёртывать и развивать части системы независимо.

В этой статье мы разберём ключевые паттерны микросервисов: API Gateway, Circuit Breaker, Saga, CQRS, Service Discovery, Observability и лучшие практики для продакшена.

## Проблемы распределённых систем

Прежде чем изучать паттерны, важно понимать проблемы, которые они решают.

### Сетевые задержки и надёжность

В монолите вызов метода — это быстрый и надёжный вызов в памяти. В микросервисах каждый вызов — это сетевой запрос со всеми проблемами:

- Задержки сети (latency)
- Временные сбои (transient failures)
- Полная недоступность сервиса
- Частичные отказы (partial failures)

### Распределённые транзакции

В монолите транзакция охватывает несколько таблиц в одной базе данных. В микросервисах данные распределены между сервисами, и классические транзакции не работают.

### Согласованность данных

**CAP-теорема** утверждает, что распределённая система может гарантировать только два из трёх свойств:

- **Consistency** (согласованность) — все узлы видят одни данные
- **Availability** (доступность) — каждый запрос получает ответ
- **Partition tolerance** (устойчивость к разделению) — система работает при потере связи между узлами

В реальных системах выбирают между **CP** (согласованность + устойчивость) и **AP** (доступность + устойчивость).

### Observability

В монолите легко отследить запрос через логи. В микросервисах запрос проходит через множество сервисов, и нужна распределённая трассировка.

## API Gateway

**API Gateway** — это единая точка входа для клиентов, которая маршрутизирует запросы к соответствующим сервисам.

### Зачем нужен API Gateway

**Без Gateway:**
```
Mobile Client → User Service
Mobile Client → Order Service
Mobile Client → Product Service
Mobile Client → Payment Service

# Клиент делает 4 запроса, знает о всех сервисах
```

**С Gateway:**
```
Mobile Client → API Gateway → User Service
                          → Order Service
                          → Product Service
                          → Payment Service

# Клиент делает 1 запрос к Gateway
```

### Реализация на Node.js (Express + http-proxy-middleware)

```javascript
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Маршрутизация по пути
app.use('/users', createProxyMiddleware({
    target: 'http://user-service:3001',
    changeOrigin: true
}));

app.use('/orders', createProxyMiddleware({
    target: 'http://order-service:3002',
    changeOrigin: true
}));

app.use('/products', createProxyMiddleware({
    target: 'http://product-service:3003',
    changeOrigin: true
}));

// Агрегация данных
app.get('/dashboard/:userId', async (req, res) => {
    const userId = req.params.userId;
    
    // Параллельные запросы к сервисам
    const [user, orders, notifications] = await Promise.all([
        fetch(`http://user-service:3001/users/${userId}`),
        fetch(`http://order-service:3002/orders?userId=${userId}`),
        fetch(`http://notification-service:3004/notifications/${userId}`)
    ]);
    
    res.json({
        user: await user.json(),
        orders: await orders.json(),
        notifications: await notifications.json()
    });
});

app.listen(3000, () => {
    console.log('API Gateway running on port 3000');
});
```

### Реализация на Python (FastAPI + httpx)

```python
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
import httpx
import asyncio

app = FastAPI()

SERVICE_URLS = {
    'users': 'http://user-service:3001',
    'orders': 'http://order-service:3002',
    'products': 'http://product-service:3003'
}

@app.api_route("/{service:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def proxy(service: str, request: Request):
    # Маршрутизация к сервису
    if service not in SERVICE_URLS:
        raise HTTPException(status_code=404, detail="Service not found")
    
    url = f"{SERVICE_URLS[service]}/{service}"
    
    async with httpx.AsyncClient() as client:
        # Проксирование запроса
        response = await client.request(
            method=request.method,
            url=url,
            headers=dict(request.headers),
            content=await request.body()
        )
        
        return JSONResponse(
            status_code=response.status_code,
            content=response.json(),
            headers=dict(response.headers)
        )

@app.get("/dashboard/{user_id}")
async def get_dashboard(user_id: str):
    async with httpx.AsyncClient() as client:
        # Агрегация данных из нескольких сервисов
        user_resp, orders_resp, notifications_resp = await asyncio.gather(
            client.get(f"{SERVICE_URLS['users']}/users/{user_id}"),
            client.get(f"{SERVICE_URLS['orders']}/orders?userId={user_id}"),
            client.get(f"http://notification-service:3004/notifications/{user_id}"),
            return_exceptions=True
        )
        
        return {
            'user': user_resp.json() if isinstance(user_resp, httpx.Response) else None,
            'orders': orders_resp.json() if isinstance(orders_resp, httpx.Response) else [],
            'notifications': notifications_resp.json() if isinstance(notifications_resp, httpx.Response) else []
        }
```

### Kong API Gateway (готовое решение)

```yaml
# docker-compose.yml
version: '3.8'
services:
  kong-database:
    image: postgres:15
    environment:
      POSTGRES_USER: kong
      POSTGRES_DB: kong
    
  kong:
    image: kong:3.4
    environment:
      KONG_DATABASE: postgres
      KONG_PG_HOST: kong-database
      KONG_PROXY_ACCESS_LOG: /dev/stdout
      KONG_ADMIN_ACCESS_LOG: /dev/stdout
      KONG_PROXY_ERROR_LOG: /dev/stderr
      KONG_ADMIN_ERROR_LOG: /dev/stderr
    ports:
      - "8000:8000"  # Proxy
      - "8444:8444"  # Proxy SSL
      - "8001:8001"  # Admin API
```

```bash
# Регистрация сервиса
curl -X POST http://localhost:8001/services \
  --data "name=user-service" \
  --data "url=http://user-service:3001"

# Создание маршрута
curl -X POST http://localhost:8001/services/user-service/routes \
  --data "paths[]=/users"
```

## Circuit Breaker (Автоматический выключатель)

**Circuit Breaker** предотвращает каскадные сбои, временно блокируя вызовы неработающего сервиса.

### Состояния Circuit Breaker

```
CLOSED (Закрыт) — нормальная работа
    ↓ (ошибки > threshold)
OPEN (Открыт) — вызовы блокируются
    ↓ (timeout)
HALF-OPEN (Полуоткрыт) — пробный вызов
    ↓ (успех)              ↓ (ошибка)
CLOSED                   OPEN
```

### Реализация на Python

```python
import time
from functools import wraps
from enum import Enum
from threading import Lock

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreakerError(Exception):
    pass

class CircuitBreaker:
    def __init__(
        self,
        failure_threshold=5,
        recovery_timeout=30,
        half_open_max_calls=3
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.half_open_max_calls = half_open_max_calls
        
        self._state = CircuitState.CLOSED
        self._failure_count = 0
        self._last_failure_time = None
        self._half_open_calls = 0
        self._lock = Lock()
    
    @property
    def state(self):
        with self._lock:
            if self._state == CircuitState.OPEN:
                if time.time() - self._last_failure_time >= self.recovery_timeout:
                    self._state = CircuitState.HALF_OPEN
                    self._half_open_calls = 0
            return self._state
    
    def call(self, func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if self.state == CircuitState.OPEN:
                raise CircuitBreakerError("Circuit is OPEN")
            
            try:
                result = func(*args, **kwargs)
                self._on_success()
                return result
            except Exception as e:
                self._on_failure()
                raise e
        
        return wrapper
    
    def _on_success(self):
        with self._lock:
            if self._state == CircuitState.HALF_OPEN:
                self._half_open_calls += 1
                if self._half_open_calls >= self.half_open_max_calls:
                    self._state = CircuitState.CLOSED
                    self._failure_count = 0
            else:
                self._failure_count = 0
    
    def _on_failure(self):
        with self._lock:
            self._failure_count += 1
            self._last_failure_time = time.time()
            
            if self._failure_count >= self.failure_threshold:
                self._state = CircuitState.OPEN

# Использование
breaker = CircuitBreaker(failure_threshold=5, recovery_timeout=30)

@breaker.call
def call_external_service():
    response = requests.get('http://external-service/api')
    response.raise_for_status()
    return response.json()

# Вызов
try:
    result = call_external_service()
except CircuitBreakerError:
    # Fallback логика
    result = get_cached_data()
except requests.RequestException:
    # Обработка ошибки
    pass
```

### Реализация на Node.js (opossum)

```bash
npm install opossum
```

```javascript
const CircuitBreaker = require('opossum');

const options = {
    timeout: 3000,  // Таймаут вызова
    errorThresholdPercentage: 50,  // % ошибок для открытия
    resetTimeout: 30000  // Время до полуоткрытого состояния
};

const breaker = new CircuitBreaker(callExternalService, options);

async function callExternalService() {
    const response = await fetch('http://external-service/api');
    if (!response.ok) throw new Error('Service unavailable');
    return response.json();
}

// Fallback при открытом circuit
breaker.fallback(() => {
    return getCachedData();
});

// Мониторинг состояния
breaker.on('open', () => {
    console.log('Circuit opened');
});

breaker.on('halfOpen', () => {
    console.log('Circuit half-open');
});

breaker.on('close', () => {
    console.log('Circuit closed');
});

// Вызов
try {
    const result = await breaker.fire();
} catch (error) {
    if (error instanceof CircuitBreaker.OpenCircuitError) {
        console.log('Circuit is open');
    }
}
```

### Retry с экспоненциальной задержкой

```python
import time
import random

def retry_with_backoff(func, max_retries=5, base_delay=1, max_delay=60):
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            
            # Экспоненциальная задержка + jitter
            delay = min(base_delay * (2 ** attempt), max_delay)
            jitter = random.uniform(0, delay * 0.1)
            time.sleep(delay + jitter)

# Использование
result = retry_with_backoff(call_external_service)
```

## Saga (Распределённые транзакции)

**Saga** — это паттерн для управления распределёнными транзакциями через последовательность локальных транзакций с компенсирующими действиями.

### Типы Saga

**Choreography (Хореография)** — сервисы общаются через события без центрального координатора.

```
Order Service → OrderCreated → Payment Service
Payment Service → PaymentProcessed → Shipping Service
Shipping Service → OrderShipped → (конец)

При ошибке:
Shipping Service → ShippingFailed → Payment Service
Payment Service → PaymentRefunded → Order Service
Order Service → OrderCancelled
```

**Orchestration (Оркестрация)** — центральный координатор управляет потоком.

```
Saga Orchestrator → Order Service
                  → Payment Service
                  → Shipping Service
```

### Реализация оркестрации на Python

```python
from enum import Enum
from dataclasses import dataclass
from typing import List, Callable

class SagaStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    COMPENSATING = "compensating"
    FAILED = "failed"

@dataclass
class SagaStep:
    name: str
    action: Callable
    compensate: Callable

class SagaOrchestrator:
    def __init__(self, steps: List[SagaStep]):
        self.steps = steps
        self.completed_steps: List[SagaStep] = []
        self.status = SagaStatus.PENDING
    
    async def execute(self, context: dict) -> dict:
        self.status = SagaStatus.RUNNING
        
        try:
            for step in self.steps:
                print(f"Executing: {step.name}")
                await step.action(context)
                self.completed_steps.append(step)
            
            self.status = SagaStatus.COMPLETED
            return context
            
        except Exception as e:
            print(f"Error: {e}")
            await self.compensate(context)
            self.status = SagaStatus.FAILED
            raise
    
    async def compensate(self, context: dict):
        self.status = SagaStatus.COMPENSATING
        
        # Компенсация в обратном порядке
        for step in reversed(self.completed_steps):
            print(f"Compensating: {step.name}")
            try:
                await step.compensate(context)
            except Exception as e:
                print(f"Compensation failed for {step.name}: {e}")
                # Логирование для ручного вмешательства

# Пример: создание заказа
async def create_order(ctx):
    order = await db.orders.create(ctx['order_data'])
    ctx['order_id'] = order.id

async def cancel_order(ctx):
    await db.orders.delete(ctx['order_id'])

async def process_payment(ctx):
    payment = await payment_service.charge(ctx['order_id'], ctx['amount'])
    ctx['payment_id'] = payment.id

async def refund_payment(ctx):
    await payment_service.refund(ctx['payment_id'])

async def ship_order(ctx):
    shipment = await shipping_service.create(ctx['order_id'])
    ctx['shipment_id'] = shipment.id

async def cancel_shipment(ctx):
    await shipping_service.cancel(ctx['shipment_id'])

# Определение Saga
order_saga = SagaOrchestrator([
    SagaStep("Create Order", create_order, cancel_order),
    SagaStep("Process Payment", process_payment, refund_payment),
    SagaStep("Ship Order", ship_order, cancel_shipment),
])

# Выполнение
context = {
    'order_data': {'user_id': 1, 'items': [...]},
    'amount': 99.99
}

try:
    result = await order_saga.execute(context)
    print(f"Order completed: {result['order_id']}")
except Exception:
    print("Order failed and compensated")
```

### Реализация хореографии с событиями

```python
import asyncio
from dataclasses import dataclass

@dataclass
class Event:
    type: str
    data: dict

class EventBus:
    def __init__(self):
        self.subscribers = {}
    
    def subscribe(self, event_type: str, handler):
        self.subscribers.setdefault(event_type, []).append(handler)
    
    async def publish(self, event: Event):
        handlers = self.subscribers.get(event.type, [])
        await asyncio.gather(*[h(event) for h in handlers])

event_bus = EventBus()

# Order Service
async def on_order_created(event: Event):
    order_id = event.data['order_id']
    # Публикация события для Payment Service
    await event_bus.publish(Event(
        type='OrderCreated',
        data={'order_id': order_id, 'amount': event.data['amount']}
    ))

event_bus.subscribe('OrderCreated', on_order_created)

# Payment Service
async def on_order_created_for_payment(event: Event):
    try:
        # Обработка платежа
        await payment_service.charge(event.data['order_id'], event.data['amount'])
        
        # Публикация события успеха
        await event_bus.publish(Event(
            type='PaymentProcessed',
            data={'order_id': event.data['order_id']}
        ))
    except Exception:
        # Публикация события ошибки
        await event_bus.publish(Event(
            type='PaymentFailed',
            data={'order_id': event.data['order_id']}
        ))

event_bus.subscribe('OrderCreated', on_order_created_for_payment)

# Shipping Service
async def on_payment_processed(event: Event):
    await shipping_service.create(event.data['order_id'])

event_bus.subscribe('PaymentProcessed', on_payment_processed)
```

## Service Discovery (Обнаружение сервисов)

**Service Discovery** позволяет сервисам находить друг друга в динамической среде, где адреса постоянно меняются.

### Паттерны Service Discovery

**Client-side discovery** — клиент запрашивает реестр сервисов.

```
Client → Service Registry: "Where is user-service?"
Client ← Service Registry: "192.168.1.10:3001, 192.168.1.11:3001"
Client → 192.168.1.10:3001: вызов
```

**Server-side discovery** — балансировщик запрашивает реестр.

```
Client → Load Balancer → Service Registry
Load Balancer → user-service instances
```

### Реализация с Consul

```bash
# Запуск Consul
docker run -d --name consul -p 8500:8500 consul agent -server -ui -bootstrap-expect=1 -client=0.0.0.0
```

```python
import consul
import time

# Регистрация сервиса
c = consul.Consul(host='localhost', port=8500)

def register_service(service_id, service_name, address, port):
    c.agent.service.register(
        service_id=service_id,
        name=service_name,
        address=address,
        port=port,
        check=consul.Check.http(
            url=f'http://{address}:{port}/health',
            interval='10s',
            timeout='5s'
        )
    )

# Регистрация
register_service('user-service-1', 'user-service', '192.168.1.10', 3001)

# Обнаружение сервиса
def discover_service(service_name):
    index, nodes = c.health.service(service_name, passing=True)
    return [
        {'address': node['Service']['Address'], 'port': node['Service']['Port']}
        for node in nodes
    ]

# Использование
instances = discover_service('user-service')
# [{'address': '192.168.1.10', 'port': 3001}, ...]
```

### Eureka (Spring Cloud)

```yaml
# application.yml для Eureka Server
server:
  port: 8761
eureka:
  instance:
    hostname: localhost
  client:
    registerWithEureka: false
    fetchRegistry: false
```

```java
// Регистрация сервиса
@SpringBootApplication
@EnableEurekaServer
public class EurekaServer {
    public static void main(String[] args) {
        SpringApplication.run(EurekaServer.class, args);
    }
}
```

## Observability (Наблюдаемость)

**Observability** — это возможность понять внутреннее состояние системы по её внешним выходам.

### Три столпа Observability

**Logs (Логи)** — записи о событиях.

**Metrics (Метрики)** — числовые показатели во времени.

**Traces (Трассировки)** — путь запроса через сервисы.

### Распределённая трассировка с Jaeger

```python
from opentelemetry import trace
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

# Настройка трассировки
trace.set_tracer_provider(TracerProvider())
jaeger_exporter = JaegerExporter(
    agent_host_name='localhost',
    agent_port=6831,
)
trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(jaeger_exporter)
)

tracer = trace.get_tracer(__name__)

# Использование
with tracer.start_as_current_span("create_order") as span:
    span.set_attribute("order.user_id", user_id)
    
    # Вызов другого сервиса
    with tracer.start_as_current_span("process_payment"):
        payment_service.charge(amount)
    
    with tracer.start_as_current_span("ship_order"):
        shipping_service.create(order_id)
```

### Логирование с корреляцией

```python
import logging
import uuid
from contextvars import ContextVar

# Контекстная переменная для trace_id
trace_id_var = ContextVar('trace_id', default=None)

class TraceIdFilter(logging.Filter):
    def filter(self, record):
        record.trace_id = trace_id_var.get()
        return True

# Настройка логгера
logger = logging.getLogger('order_service')
handler = logging.StreamHandler()
handler.addFilter(TraceIdFilter())
handler.setFormatter(logging.Formatter(
    '%(asctime)s - %(trace_id)s - %(levelname)s - %(message)s'
))
logger.addHandler(handler)

# Использование
async def handle_request(request):
    trace_id = str(uuid.uuid4())
    trace_id_var.set(trace_id)
    
    logger.info(f"Processing order for user {request.user_id}")
    # Логи будут содержать trace_id для корреляции
```

### Метрики с Prometheus

```python
from prometheus_client import Counter, Histogram, generate_latest
from fastapi import FastAPI

app = FastAPI()

# Метрики
order_counter = Counter(
    'orders_total',
    'Total orders',
    ['status', 'payment_method']
)

order_duration = Histogram(
    'order_processing_seconds',
    'Order processing time',
    ['step']
)

@app.post('/orders')
async def create_order(order_data):
    with order_duration.labels(step='total').time():
        # Обработка
        order_counter.labels(status='success', payment_method='card').inc()
        return {'status': 'created'}

@app.get('/metrics')
async def metrics():
    return generate_latest()
```

## Database per Service

Каждый микросервис владеет своей базой данных.

### Правильно

```
Order Service → Order DB
User Service → User DB
Product Service → Product DB

# Сервисы не имеют прямого доступа к БД друг друга
```

### Неправильно

```
Order Service ──┐
User Service ───┼→ Shared Database
Product Service ─┘

# Общая БД создаёт耦合 (coupling)
```

### Синхронизация данных через события

```python
# User Service публикует событие при изменении пользователя
async def update_user(user_id, data):
    await db.users.update(user_id, data)
    
    await event_bus.publish(Event(
        type='UserUpdated',
        data={'user_id': user_id, 'name': data['name'], 'email': data['email']}
    ))

# Order Service подписывается и обновляет свою копию
async def on_user_updated(event: Event):
    await db.orders.update_user_info(
        event.data['user_id'],
        {'name': event.data['name'], 'email': event.data['email']}
    )

event_bus.subscribe('UserUpdated', on_user_updated)
```

## Best Practices

### Декомпозиция сервисов

**По бизнес-домену (DDD):**
```
User Service — управление пользователями
Order Service — обработка заказов
Payment Service — платежи
Inventory Service — управление запасами
```

**По поддоменам:**
```
Core Domain: Order, Product
Supporting Domain: User, Notification
Generic Domain: Authentication, Logging
```

### Версионирование API

```
# URL версионирование
GET /api/v1/users
GET /api/v2/users

# Header версионирование
Accept: application/vnd.api.v1+json
Accept: application/vnd.api.v2+json
```

### Health Checks

```python
from fastapi import FastAPI
import psycopg2

app = FastAPI()

@app.get('/health')
async def health_check():
    try:
        # Проверка БД
        conn = psycopg2.connect('dbname=orders')
        conn.close()
        
        # Проверка зависимостей
        await redis.ping()
        
        return {'status': 'healthy'}
    except Exception as e:
        return {'status': 'unhealthy', 'error': str(e)}, 503

@app.get('/ready')
async def readiness_check():
    # Готовность принимать трафик
    if is_database_ready() and is_cache_ready():
        return {'status': 'ready'}
    return {'status': 'not_ready'}, 503
```

### Configuration Management

```python
from pydantic import BaseSettings

class Settings(BaseSettings):
    database_url: str
    redis_url: str
    service_port: int = 3000
    log_level: str = 'INFO'
    
    class Config:
        env_file = '.env'

settings = Settings()
```

```bash
# .env
DATABASE_URL=postgresql://user:pass@localhost:5432/orders
REDIS_URL=redis://localhost:6379
SERVICE_PORT=3000
LOG_LEVEL=INFO
```

### Graceful Shutdown

```python
import signal
import asyncio

class GracefulShutdown:
    def __init__(self):
        self.shutdown_event = asyncio.Event()
    
    def register(self):
        for sig in (signal.SIGTERM, signal.SIGINT):
            signal.signal(sig, self._handle_signal)
    
    def _handle_signal(self, sig, frame):
        print(f"Received signal {sig}")
        self.shutdown_event.set()
    
    async def wait_for_shutdown(self):
        await self.shutdown_event.wait()

# Использование
shutdown = GracefulShutdown()
shutdown.register()

async def main():
    server = await start_server()
    
    # Ожидание сигнала завершения
    await shutdown.wait_for_shutdown()
    
    # Graceful shutdown
    print("Shutting down gracefully...")
    await server.close()
    await cleanup_connections()

asyncio.run(main())
```

## Заключение

Микросервисная архитектура требует понимания распределённых систем и применения правильных паттернов:

- **API Gateway** — единая точка входа и агрегация
- **Circuit Breaker** — защита от каскадных сбоев
- **Saga** — распределённые транзакции
- **Service Discovery** — обнаружение сервисов в динамической среде
- **Observability** — логи, метрики, трассировки
- **Database per Service** — независимость данных

**Используйте микросервисы, когда:**
- Команда выросла и монолит стал узким местом
- Нужна независимая масштабируемость компонентов
- Разные части системы имеют разные требования

**Оставайтесь на монолите, когда:**
- Маленькая команда и проект
- Неясны границы доменов
- Нет ресурсов на поддержку инфраструктуры
