---
title: "Hexagonal Architecture: полное руководство по Ports & Adapters"
description: "Исчерпывающий гид по гексагональной архитектуре: домен, порты, адаптеры, инверсия зависимостей, тестирование и лучшие практики для продакшена."
heroImage: "../../../../assets/imgs/2025/11/25-hexagonal-architecture.webp"
pubDate: "2025-11-25"
---

# Hexagonal Architecture: полное руководство по Ports & Adapters

**Hexagonal Architecture (Гексагональная архитектура)**, также известная как **Ports & Adapters**, — это архитектурный паттерн, предложенный Алистером Кокберном в 2005 году. Основная идея — изолировать бизнес-логику (домен) от внешних зависимостей: баз данных, UI, внешних сервисов.

В этой статье мы разберём домен, порты, адаптеры, инверсию зависимостей, тестирование и лучшие практики гексагональной архитектуры для продакшена.

## Проблемы традиционной архитектуры

### Типичное веб-приложение (анемичная модель)

```python
# ❌ Плохо: бизнес-логика размазана по контроллерам
class UserController:
    def create_user(self, request):
        # Валидация в контроллере
        if not request.email or '@' not in request.email:
            return {'error': 'Invalid email'}
        
        # Проверка дубликата
        existing = db.query("SELECT * FROM users WHERE email = ?", request.email)
        if existing:
            return {'error': 'Email exists'}
        
        # Создание
        user = db.execute(
            "INSERT INTO users (email, password) VALUES (?, ?)",
            request.email, hash_password(request.password)
        )
        
        # Отправка email
        send_welcome_email(request.email)
        
        # Логирование
        logger.info(f"User created: {user.id}")
        
        return {'id': user.id}
```

**Проблемы:**
- Бизнес-логика в контроллерах
- Прямая зависимость от БД
- Невозможно тестировать без БД
- Сложно заменить компоненты

### Слоёная архитектура (лучше, но не идеально)

```
Controller → Service → Repository → Database
     ↓
   View
```

**Проблемы:**
- Зависимость направлена вниз
- Сложно тестировать сервисы
- БД влияет на доменную модель

## Гексагональная архитектура

### Основная идея

```
                    ┌─────────────────┐
                    │   UI Adapter    │
                    │   (Web/CLI)     │
                    └────────┬────────┘
                             │
        ┌────────────────────┼───────────────────┐
        │                    │                   │
        │           ┌────────▼────────┐          │
        │           │   Input Port    │          │
        │           │   (Interface)   │          │
        │           └────────┬────────┘          │
        │                    │                   │
        │  ┌─────────────────┼──────────────────┐│
        │  │                 │                  ││
        │  │        ┌────────▼────────┐         ││
        │  │        │    Domain       │         ││
        │  │        │ (Business Logic)│         ││
        │  │        └────────┬────────┘         ││
        │  │                 │                  ││
        │  └─────────────────┼──────────────────┘│
        │                    │                   │
        │           ┌────────▼────────┐          │
        │           │  Output Port    │          │
        │           │   (Interface)   │          │
        │           └────────┬────────┘          │
        │                    │                   │
┌───────┴────────┐  ┌────────┴────────┐  ┌───────┴────────┐
│  DB Adapter    │  │  Email Adapter  │  │  Cache Adapter │
│  (PostgreSQL)  │  │  (SendGrid)     │  │  (Redis)       │
└────────────────┘  └─────────────────┘  └────────────────┘
```

### Компоненты архитектуры

**Домен (Domain)** — ядро приложения, бизнес-логика. Не зависит ни от чего внешнего.

**Входные порты (Input Ports)** — интерфейсы, которые домен предоставляет внешнему миру.

**Выходные порты (Output Ports)** — интерфейсы, которые домен использует для взаимодействия с внешним миром.

**Входные адаптеры (Input Adapters)** — реализуют входные порты для конкретных технологий (HTTP, CLI, GUI).

**Выходные адаптеры (Output Adapters)** — реализуют выходные порты для конкретных технологий (БД, email, кэш).

## Реализация на Python

### Доменная модель

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional, List
from uuid import UUID, uuid4
from enum import Enum

class OrderStatus(Enum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    PAID = "paid"
    SHIPPED = "shipped"
    CANCELLED = "cancelled"

class DomainError(Exception):
    """Базовое исключение домена"""
    pass

class InsufficientStockError(DomainError):
    pass

class OrderAlreadyConfirmedError(DomainError):
    pass

@dataclass
class Product:
    id: UUID
    name: str
    price: float
    stock: int
    
    def can_fulfill(self, quantity: int) -> bool:
        """Проверяет, достаточно ли товара на складе"""
        return self.stock >= quantity
    
    def reserve(self, quantity: int):
        """Резервирует товар"""
        if not self.can_fulfill(quantity):
            raise InsufficientStockError(f"Not enough stock for {self.name}")
        self.stock -= quantity

@dataclass
class OrderItem:
    product: Product
    quantity: int
    
    @property
    def total(self) -> float:
        return self.product.price * self.quantity

@dataclass
class Order:
    id: UUID = field(default_factory=uuid4)
    customer_id: UUID = None
    items: List[OrderItem] = field(default_factory=list)
    status: OrderStatus = OrderStatus.DRAFT
    created_at: datetime = field(default_factory=datetime.utcnow)
    confirmed_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    
    @property
    def total(self) -> float:
        return sum(item.total for item in self.items)
    
    def add_item(self, product: Product, quantity: int):
        """Добавляет товар в заказ"""
        if self.status != OrderStatus.DRAFT:
            raise OrderAlreadyConfirmedError("Cannot modify confirmed order")
        
        if not product.can_fulfill(quantity):
            raise InsufficientStockError(f"Not enough stock for {product.name}")
        
        # Проверяем, есть ли уже такой товар
        for item in self.items:
            if item.product.id == product.id:
                item.quantity += quantity
                break
        else:
            self.items.append(OrderItem(product=product, quantity=quantity))
    
    def remove_item(self, product_id: UUID):
        """Удаляет товар из заказа"""
        if self.status != OrderStatus.DRAFT:
            raise OrderAlreadyConfirmedError("Cannot modify confirmed order")
        
        self.items = [item for item in self.items if item.product.id != product_id]
    
    def confirm(self):
        """Подтверждает заказ"""
        if self.status != OrderStatus.DRAFT:
            raise OrderAlreadyConfirmedError("Order already confirmed")
        
        if not self.items:
            raise DomainError("Cannot confirm empty order")
        
        # Резервируем товары
        for item in self.items:
            item.product.reserve(item.quantity)
        
        self.status = OrderStatus.CONFIRMED
        self.confirmed_at = datetime.utcnow()
    
    def mark_as_paid(self):
        """Отмечает заказ как оплаченный"""
        if self.status != OrderStatus.CONFIRMED:
            raise DomainError("Can only pay confirmed order")
        
        self.status = OrderStatus.PAID
        self.paid_at = datetime.utcnow()
    
    def cancel(self):
        """Отменяет заказ"""
        if self.status in (OrderStatus.SHIPPED, OrderStatus.CANCELLED):
            raise DomainError(f"Cannot cancel {self.status.value} order")
        
        self.status = OrderStatus.CANCELLED
```

### Выходные порты (интерфейсы)

```python
from abc import ABC, abstractmethod
from typing import Optional, List
from datetime import datetime

class ProductRepository(ABC):
    """Порт для работы с продуктами"""
    
    @abstractmethod
    def get_by_id(self, product_id: UUID) -> Optional[Product]:
        pass
    
    @abstractmethod
    def save(self, product: Product):
        pass
    
    @abstractmethod
    def get_all(self) -> List[Product]:
        pass

class OrderRepository(ABC):
    """Порт для работы с заказами"""
    
    @abstractmethod
    def get_by_id(self, order_id: UUID) -> Optional[Order]:
        pass
    
    @abstractmethod
    def save(self, order: Order):
        pass
    
    @abstractmethod
    def get_by_customer(self, customer_id: UUID) -> List[Order]:
        pass
    
    @abstractmethod
    def get_by_status(self, status: OrderStatus) -> List[Order]:
        pass

class EmailSender(ABC):
    """Порт для отправки email"""
    
    @abstractmethod
    def send(self, to: str, subject: str, body: str):
        pass

class PaymentGateway(ABC):
    """Порт для обработки платежей"""
    
    @abstractmethod
    def charge(self, amount: float, customer_id: UUID) -> bool:
        pass

class StockReservationService(ABC):
    """Порт для резервирования товаров"""
    
    @abstractmethod
    def reserve(self, product_id: UUID, quantity: int) -> bool:
        pass
    
    @abstractmethod
    def release(self, product_id: UUID, quantity: int):
        pass
```

### Входные порты (Use Cases)

```python
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class CreateOrderCommand:
    customer_id: UUID

@dataclass
class AddItemCommand:
    order_id: UUID
    product_id: UUID
    quantity: int

@dataclass
class ConfirmOrderCommand:
    order_id: UUID

@dataclass
class PayOrderCommand:
    order_id: UUID
    payment_method: str

@dataclass
class OrderResponse:
    id: UUID
    customer_id: UUID
    items: List[dict]
    total: float
    status: str

class OrderUseCase:
    """Входной порт для управления заказами"""
    
    def __init__(
        self,
        order_repo: OrderRepository,
        product_repo: ProductRepository,
        email_sender: EmailSender,
        payment_gateway: PaymentGateway
    ):
        self.order_repo = order_repo
        self.product_repo = product_repo
        self.email_sender = email_sender
        self.payment_gateway = payment_gateway
    
    def create_order(self, command: CreateOrderCommand) -> OrderResponse:
        """Создаёт новый заказ"""
        order = Order(customer_id=command.customer_id)
        self.order_repo.save(order)
        
        return self._to_response(order)
    
    def add_item(self, command: AddItemCommand):
        """Добавляет товар в заказ"""
        order = self.order_repo.get_by_id(command.order_id)
        if not order:
            raise DomainError("Order not found")
        
        product = self.product_repo.get_by_id(command.product_id)
        if not product:
            raise DomainError("Product not found")
        
        order.add_item(product, command.quantity)
        self.order_repo.save(order)
    
    def confirm_order(self, command: ConfirmOrderCommand):
        """Подтверждает заказ"""
        order = self.order_repo.get_by_id(command.order_id)
        if not order:
            raise DomainError("Order not found")
        
        order.confirm()
        self.order_repo.save(order)
        
        # Отправка уведомления
        customer = self._get_customer(order.customer_id)
        self.email_sender.send(
            to=customer.email,
            subject="Order Confirmed",
            body=f"Your order {order.id} has been confirmed. Total: ${order.total}"
        )
    
    def pay_order(self, command: PayOrderCommand) -> bool:
        """Оплачивает заказ"""
        order = self.order_repo.get_by_id(command.order_id)
        if not order:
            raise DomainError("Order not found")
        
        # Обработка платежа
        success = self.payment_gateway.charge(order.total, order.customer_id)
        if not success:
            raise DomainError("Payment failed")
        
        order.mark_as_paid()
        self.order_repo.save(order)
        
        return True
    
    def get_order(self, order_id: UUID) -> Optional[OrderResponse]:
        """Получает заказ"""
        order = self.order_repo.get_by_id(order_id)
        return self._to_response(order) if order else None
    
    def _to_response(self, order: Order) -> OrderResponse:
        return OrderResponse(
            id=order.id,
            customer_id=order.customer_id,
            items=[
                {
                    'product_id': item.product.id,
                    'product_name': item.product.name,
                    'quantity': item.quantity,
                    'price': item.product.price
                }
                for item in order.items
            ],
            total=order.total,
            status=order.status.value
        )
    
    def _get_customer(self, customer_id: UUID):
        """Заглушка для получения клиента"""
        # В реальности будет вызов CustomerRepository
        return type('Customer', (), {'email': 'customer@example.com'})()
```

### Выходные адаптеры

```python
# Адаптер базы данных (PostgreSQL)
import psycopg2
from typing import Optional, List
import json

class PostgreSQLOrderRepository(OrderRepository):
    def __init__(self, connection_string: str):
        self.conn = psycopg2.connect(connection_string)
    
    def get_by_id(self, order_id: UUID) -> Optional[Order]:
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT id, customer_id, status, created_at, confirmed_at, paid_at, items_data
            FROM orders WHERE id = %s
        """, (str(order_id),))
        
        row = cursor.fetchone()
        if not row:
            return None
        
        order = Order(
            id=UUID(row[0]),
            customer_id=UUID(row[1]),
            status=OrderStatus(row[2]),
            created_at=row[3],
            confirmed_at=row[4],
            paid_at=row[5]
        )
        
        # Восстановление товаров из JSON
        items_data = json.loads(row[6])
        # ... восстановление OrderItem
        
        return order
    
    def save(self, order: Order):
        cursor = self.conn.cursor()
        cursor.execute("""
            INSERT INTO orders (id, customer_id, status, created_at, items_data)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                customer_id = EXCLUDED.customer_id,
                status = EXCLUDED.status,
                items_data = EXCLUDED.items_data
        """, (
            str(order.id),
            str(order.customer_id),
            order.status.value,
            order.created_at,
            json.dumps([self._serialize_item(i) for i in order.items])
        ))
        self.conn.commit()
    
    def get_by_customer(self, customer_id: UUID) -> List[Order]:
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT id FROM orders WHERE customer_id = %s ORDER BY created_at DESC
        """, (str(customer_id),))
        
        return [self.get_by_id(UUID(row[0])) for row in cursor.fetchall()]
    
    def get_by_status(self, status: OrderStatus) -> List[Order]:
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT id FROM orders WHERE status = %s
        """, (status.value,))
        
        return [self.get_by_id(UUID(row[0])) for row in cursor.fetchall()]
    
    def _serialize_item(self, item: OrderItem) -> dict:
        return {
            'product_id': str(item.product.id),
            'quantity': item.quantity
        }

# Адаптер для отправки email (SendGrid)
from sendgrid import SendGridAPIClient

class SendGridEmailSender(EmailSender):
    def __init__(self, api_key: str, from_email: str):
        self.sg = SendGridAPIClient(api_key)
        self.from_email = from_email
    
    def send(self, to: str, subject: str, body: str):
        message = {
            'from': self.from_email,
            'to': to,
            'subject': subject,
            'content': [{'type': 'text/plain', 'value': body}]
        }
        self.sg.client.mail.send.post(request_body=message)

# Адаптер для платежей (Stripe)
import stripe

class StripePaymentGateway(PaymentGateway):
    def __init__(self, api_key: str):
        stripe.api_key = api_key
    
    def charge(self, amount: float, customer_id: UUID) -> bool:
        try:
            stripe.Charge.create(
                amount=int(amount * 100),  # В центах
                currency='usd',
                customer=str(customer_id)
            )
            return True
        except stripe.error.CardError:
            return False

# In-Memory адаптер для тестов
class InMemoryOrderRepository(OrderRepository):
    def __init__(self):
        self._orders = {}
    
    def get_by_id(self, order_id: UUID) -> Optional[Order]:
        return self._orders.get(str(order_id))
    
    def save(self, order: Order):
        self._orders[str(order.id)] = order
    
    def get_by_customer(self, customer_id: UUID) -> List[Order]:
        return [
            o for o in self._orders.values() 
            if o.customer_id == customer_id
        ]
    
    def get_by_status(self, status: OrderStatus) -> List[Order]:
        return [o for o in self._orders.values() if o.status == status]

class FakeEmailSender(EmailSender):
    def __init__(self):
        self.sent_emails = []
    
    def send(self, to: str, subject: str, body: str):
        self.sent_emails.append({
            'to': to,
            'subject': subject,
            'body': body
        })

class FakePaymentGateway(PaymentGateway):
    def __init__(self, should_succeed: bool = True):
        self.should_succeed = should_succeed
        self.charges = []
    
    def charge(self, amount: float, customer_id: UUID) -> bool:
        self.charges.append({'amount': amount, 'customer_id': customer_id})
        return self.should_succeed
```

### Входные адаптеры

```python
# HTTP адаптер (FastAPI)
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from uuid import UUID

app = FastAPI()

# DTO для запросов
class CreateOrderRequest(BaseModel):
    customer_id: UUID

class AddItemRequest(BaseModel):
    product_id: UUID
    quantity: int

class PayOrderRequest(BaseModel):
    payment_method: str

# Factory для создания Use Case
def get_order_use_case() -> OrderUseCase:
    return OrderUseCase(
        order_repo=PostgreSQLOrderRepository("postgresql://..."),
        product_repo=PostgreSQLProductRepository("postgresql://..."),
        email_sender=SendGridEmailSender("key", "noreply@example.com"),
        payment_gateway=StripePaymentGateway("key")
    )

@app.post("/orders")
def create_order(
    request: CreateOrderRequest,
    use_case: OrderUseCase = Depends(get_order_use_case)
):
    try:
        response = use_case.create_order(CreateOrderCommand(customer_id=request.customer_id))
        return {'order_id': str(response.id)}
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/orders/{order_id}/items")
def add_item(
    order_id: UUID,
    request: AddItemRequest,
    use_case: OrderUseCase = Depends(get_order_use_case)
):
    try:
        use_case.add_item(AddItemCommand(
            order_id=order_id,
            product_id=request.product_id,
            quantity=request.quantity
        ))
        return {'status': 'ok'}
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/orders/{order_id}/confirm")
def confirm_order(
    order_id: UUID,
    use_case: OrderUseCase = Depends(get_order_use_case)
):
    try:
        use_case.confirm_order(ConfirmOrderCommand(order_id=order_id))
        return {'status': 'ok'}
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/orders/{order_id}/pay")
def pay_order(
    order_id: UUID,
    request: PayOrderRequest,
    use_case: OrderUseCase = Depends(get_order_use_case)
):
    try:
        use_case.pay_order(PayOrderCommand(
            order_id=order_id,
            payment_method=request.payment_method
        ))
        return {'status': 'ok'}
    except DomainError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/orders/{order_id}")
def get_order(
    order_id: UUID,
    use_case: OrderUseCase = Depends(get_order_use_case)
):
    order = use_case.get_order(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

# CLI адаптер
import click

@click.group()
def cli():
    pass

@cli.command()
@click.option('--customer-id', required=True)
def create_order(customer_id: str):
    """Создать новый заказ"""
    use_case = create_use_case()
    response = use_case.create_order(CreateOrderCommand(customer_id=UUID(customer_id)))
    click.echo(f"Order created: {response.id}")

@cli.command()
@click.option('--order-id', required=True)
@click.option('--product-id', required=True)
@click.option('--quantity', type=int, required=True)
def add_item(order_id: str, product_id: str, quantity: int):
    """Добавить товар в заказ"""
    use_case = create_use_case()
    use_case.add_item(AddItemCommand(
        order_id=UUID(order_id),
        product_id=UUID(product_id),
        quantity=quantity
    ))
    click.echo("Item added")

if __name__ == '__main__':
    cli()
```

## Тестирование

### Unit-тесты домена

```python
import pytest
from uuid import uuid4

class TestOrder:
    @pytest.fixture
    def product(self):
        return Product(
            id=uuid4(),
            name="Test Product",
            price=99.99,
            stock=10
        )
    
    def test_create_order(self):
        order = Order(customer_id=uuid4())
        assert order.status == OrderStatus.DRAFT
        assert order.total == 0
    
    def test_add_item(self, product):
        order = Order(customer_id=uuid4())
        order.add_item(product, quantity=2)
        
        assert len(order.items) == 1
        assert order.items[0].quantity == 2
        assert order.total == 199.98
    
    def test_add_item_insufficient_stock(self, product):
        order = Order(customer_id=uuid4())
        
        with pytest.raises(InsufficientStockError):
            order.add_item(product, quantity=15)  # stock = 10
    
    def test_confirm_order(self, product):
        order = Order(customer_id=uuid4())
        order.add_item(product, quantity=2)
        
        order.confirm()
        
        assert order.status == OrderStatus.CONFIRMED
        assert product.stock == 8  # 10 - 2
    
    def test_cannot_modify_confirmed_order(self, product):
        order = Order(customer_id=uuid4())
        order.add_item(product, quantity=2)
        order.confirm()
        
        with pytest.raises(OrderAlreadyConfirmedError):
            order.add_item(product, quantity=1)
    
    def test_pay_order(self, product):
        order = Order(customer_id=uuid4())
        order.add_item(product, quantity=2)
        order.confirm()
        
        order.mark_as_paid()
        
        assert order.status == OrderStatus.PAID
        assert order.paid_at is not None
    
    def test_cannot_pay_draft_order(self, product):
        order = Order(customer_id=uuid4())
        order.add_item(product, quantity=2)
        
        with pytest.raises(DomainError):
            order.mark_as_paid()
    
    def test_cancel_order(self, product):
        order = Order(customer_id=uuid4())
        order.add_item(product, quantity=2)
        
        order.cancel()
        
        assert order.status == OrderStatus.CANCELLED
    
    def test_cannot_cancel_shipped_order(self, product):
        order = Order(customer_id=uuid4())
        order.add_item(product, quantity=2)
        order.confirm()
        order.mark_as_paid()
        order.status = OrderStatus.SHIPPED
        
        with pytest.raises(DomainError):
            order.cancel()
```

### Integration-тесты Use Case

```python
class TestOrderUseCase:
    @pytest.fixture
    def repositories(self):
        return {
            'order_repo': InMemoryOrderRepository(),
            'product_repo': InMemoryProductRepository(),
            'email_sender': FakeEmailSender(),
            'payment_gateway': FakePaymentGateway()
        }
    
    @pytest.fixture
    def use_case(self, repositories):
        return OrderUseCase(**repositories)
    
    @pytest.fixture
    def product(self, repositories):
        product = Product(
            id=uuid4(),
            name="Test Product",
            price=99.99,
            stock=100
        )
        repositories['product_repo'].save(product)
        return product
    
    def test_create_order(self, use_case):
        command = CreateOrderCommand(customer_id=uuid4())
        response = use_case.create_order(command)
        
        assert response.id is not None
        assert response.status == 'draft'
    
    def test_add_item_to_order(self, use_case, product):
        # Создаём заказ
        create_cmd = CreateOrderCommand(customer_id=uuid4())
        response = use_case.create_order(create_cmd)
        
        # Добавляем товар
        use_case.add_item(AddItemCommand(
            order_id=response.id,
            product_id=product.id,
            quantity=5
        ))
        
        # Проверяем
        order = use_case.get_order(response.id)
        assert len(order.items) == 1
        assert order.total == 499.95
    
    def test_confirm_order_sends_email(self, use_case, product, repositories):
        # Создаём и заполняем заказ
        create_cmd = CreateOrderCommand(customer_id=uuid4())
        response = use_case.create_order(create_cmd)
        use_case.add_item(AddItemCommand(
            order_id=response.id,
            product_id=product.id,
            quantity=1
        ))
        
        # Подтверждаем
        use_case.confirm_order(ConfirmOrderCommand(order_id=response.id))
        
        # Проверяем email
        assert len(repositories['email_sender'].sent_emails) == 1
        email = repositories['email_sender'].sent_emails[0]
        assert "confirmed" in email['subject'].lower()
    
    def test_pay_order_fails_with_invalid_payment(self, use_case, product, repositories):
        # Создаём заказ с неудачным платежом
        repositories['payment_gateway'] = FakePaymentGateway(should_succeed=False)
        
        create_cmd = CreateOrderCommand(customer_id=uuid4())
        response = use_case.create_order(create_cmd)
        use_case.add_item(AddItemCommand(
            order_id=response.id,
            product_id=product.id,
            quantity=1
        ))
        use_case.confirm_order(ConfirmOrderCommand(order_id=response.id))
        
        # Платёж должен упасть
        with pytest.raises(DomainError):
            use_case.pay_order(PayOrderCommand(
                order_id=response.id,
                payment_method='card'
            ))
```

## Dependency Injection

### Ручной DI

```python
# production.py
def create_production_use_case():
    return OrderUseCase(
        order_repo=PostgreSQLOrderRepository(DATABASE_URL),
        product_repo=PostgreSQLProductRepository(DATABASE_URL),
        email_sender=SendGridEmailSender(SENDGRID_KEY, FROM_EMAIL),
        payment_gateway=StripePaymentGateway(STRIPE_KEY)
    )

# tests.py
def create_test_use_case():
    return OrderUseCase(
        order_repo=InMemoryOrderRepository(),
        product_repo=InMemoryProductRepository(),
        email_sender=FakeEmailSender(),
        payment_gateway=FakePaymentGateway()
    )
```

### Контейнер зависимостей

```python
from dependency_injector import containers, providers

class Container(containers.DeclarativeContainer):
    config = providers.Configuration()
    
    # Репозитории
    order_repository = providers.Singleton(
        PostgreSQLOrderRepository,
        connection_string=config.database.url
    )
    
    product_repository = providers.Singleton(
        PostgreSQLProductRepository,
        connection_string=config.database.url
    )
    
    # Сервисы
    email_sender = providers.Singleton(
        SendGridEmailSender,
        api_key=config.sendgrid.api_key,
        from_email=config.email.from_address
    )
    
    payment_gateway = providers.Singleton(
        StripePaymentGateway,
        api_key=config.stripe.api_key
    )
    
    # Use Cases
    order_use_case = providers.Factory(
        OrderUseCase,
        order_repo=order_repository,
        product_repo=product_repository,
        email_sender=email_sender,
        payment_gateway=payment_gateway
    )

# Использование
container = Container()
container.config.database.url.from_envvar("DATABASE_URL")
container.config.sendgrid.api_key.from_envvar("SENDGRID_KEY")

use_case = container.order_use_case()
```

## Best Practices

### Правила зависимостей

```
┌─────────────────────────────────────────────┐
│  Адаптеры зависят от портов, а не наоборот  │
└─────────────────────────────────────────────┘

# ✅ Правильно
class OrderUseCase:
    def __init__(self, repo: OrderRepository):  # Зависит от интерфейса
        self.repo = repo

class PostgreSQLOrderRepository(OrderRepository):  # Адаптер зависит от порта
    pass

# ❌ Неправильно
class OrderUseCase:
    def __init__(self, repo: PostgreSQLOrderRepository):  # Зависит от реализации
        self.repo = repo
```

### Богатая доменная модель

```python
# ✅ Богатая модель (бизнес-логика в домене)
class Order:
    def confirm(self):
        if self.status != OrderStatus.DRAFT:
            raise OrderAlreadyConfirmedError()
        for item in self.items:
            item.product.reserve(item.quantity)
        self.status = OrderStatus.CONFIRMED

# ❌ Анемичная модель (логика в сервисе)
class Order:
    status: str
    items: list

class OrderService:
    def confirm_order(self, order: Order):
        if order.status != 'draft':
            raise Error()
        for item in order.items:
            # Логика резервирования в сервисе
            pass
        order.status = 'confirmed'
```

### Границы агрегатов

```python
# ✅ Order — корень агрегата, OrderItem — часть
class Order:
    def __init__(self):
        self.items: List[OrderItem] = []
    
    def add_item(self, product, quantity):
        # Order управляет своими OrderItem
        pass

class OrderItem:
    # Не имеет собственного репозитория
    # Доступ только через Order
    pass

# ❌ Неправильно: раздельное управление
order_repo.get(order_id)
order_item_repo.create(order_id, product_id, quantity)  # Нарушение границы
```

### Обработка ошибок

```python
# Доменные исключения
class DomainError(Exception):
    pass

class OrderNotFoundError(DomainError):
    pass

class InsufficientStockError(DomainError):
    pass

class OrderAlreadyConfirmedError(DomainError):
    pass

# Использование в Use Case
def confirm_order(self, command: ConfirmOrderCommand):
    order = self.order_repo.get_by_id(command.order_id)
    if not order:
        raise OrderNotFoundError(f"Order {command.order_id} not found")
    
    try:
        order.confirm()
    except OrderAlreadyConfirmedError as e:
        raise e  # Пробрасываем доменную ошибку
    except InsufficientStockError as e:
        # Логирование и проброс
        logger.warning(f"Stock issue for order {command.order_id}: {e}")
        raise
    
    self.order_repo.save(order)
```

## Когда использовать

**Hexagonal Architecture подходит, когда:**
- Сложная бизнес-логика
- Нужно тестировать без внешних зависимостей
- Частая смена технологий (БД, фреймворки)
- Долгосрочная поддержка проекта

**Избыточна для:**
- Простых CRUD приложений
- Прототипов и MVP
- Проектов с фиксированным стеком технологий

## Заключение

Hexagonal Architecture — это мощный паттерн для создания поддерживаемых приложений:

- **Изоляция домена** — бизнес-логика не зависит от фреймворков
- **Тестируемость** — unit-тесты без БД и внешних сервисов
- **Гибкость** — легко заменить адаптер (БД, email, платежи)
- **Понятность** — чёткие границы между компонентами

**Ключевые принципы:**
1. Домен в центре, не зависит ни от чего
2. Порты — интерфейсы для взаимодействия
3. Адаптеры — реализация для конкретных технологий
4. Зависимости направлены к домену
