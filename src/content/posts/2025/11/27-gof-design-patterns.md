---
title: "Паттерны проектирования GoF: основные шаблоны"
description: "Паттерны проектирования GoF: Singleton, Factory, Observer, Strategy и другие. Примеры реализации на Python."
heroImage: "../../../../assets/imgs/2025/11/27-gof-design-patterns.webp"
pubDate: "2025-11-27"
---

# Паттерны проектирования GoF

Паттерны проектирования Gang of Four (GoF) — это 23 классических паттерна, разделенных на три категории. Рассмотрим основные из них с примерами на Python.

## Порождающие паттерны

### Singleton (Одиночка)

Гарантирует, что класс имеет только один экземпляр.

```python
class DatabaseConnection:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._connection = None
        return cls._instance
    
    def connect(self):
        if self._connection is None:
            self._connection = "Connected to DB"
        return self._connection

# Использование
db1 = DatabaseConnection()
db2 = DatabaseConnection()
print(db1 is db2)  # True
```

### Factory Method (Фабричный метод)

Определяет интерфейс для создания объекта, но оставляет подклассам решение о том, какой класс создавать.

```python
from abc import ABC, abstractmethod

class Transport(ABC):
    @abstractmethod
    def deliver(self) -> str:
        pass

class Truck(Transport):
    def deliver(self) -> str:
        return "Delivery by truck"

class Ship(Transport):
    def deliver(self) -> str:
        return "Delivery by ship"

class TransportFactory:
    @staticmethod
    def create_transport(transport_type: str) -> Transport:
        transports = {"truck": Truck, "ship": Ship}
        return transports[transport_type]()

# Использование
factory = TransportFactory()
truck = factory.create_transport("truck")
print(truck.deliver())  # Delivery by truck
```

### Builder (Строитель)

Отделяет конструирование сложного объекта от его представления.

```python
class House:
    def __init__(self):
        self.walls = None
        self.roof = None
        self.windows = None
    
    def __str__(self):
        return f"House with {self.walls}, {self.roof}, {self.windows}"

class HouseBuilder:
    def __init__(self):
        self.house = House()
    
    def build_walls(self, walls):
        self.house.walls = walls
        return self
    
    def build_roof(self, roof):
        self.house.roof = roof
        return self
    
    def build_windows(self, windows):
        self.house.windows = windows
        return self
    
    def get_result(self):
        return self.house

# Использование
house = HouseBuilder().build_walls("brick walls").build_roof("tile roof").get_result()
```

## Структурные паттерны

### Adapter (Адаптер)

Преобразует интерфейс одного класса в интерфейс другого.

```python
class OldPaymentSystem:
    def pay(self, amount: int):
        print(f"Paid {amount} via old system")

class NewPaymentAPI:
    def make_payment(self, amount: float, currency: str):
        print(f"Paid {amount} {currency} via new API")

class PaymentAdapter:
    def __init__(self, old_system: OldPaymentSystem):
        self.old_system = old_system
    
    def make_payment(self, amount: float, currency: str = "USD"):
        self.old_system.pay(int(amount))

# Использование
adapter = PaymentAdapter(OldPaymentSystem())
adapter.make_payment(100.0)
```

### Decorator (Декоратор)

Добавляет новую функциональность объекту динамически.

```python
class Coffee:
    def cost(self):
        return 5

class CoffeeDecorator:
    def __init__(self, coffee: Coffee):
        self._coffee = coffee
    
    def cost(self):
        return self._coffee.cost()

class Milk(CoffeeDecorator):
    def cost(self):
        return self._coffee.cost() + 1.5

class Sugar(CoffeeDecorator):
    def cost(self):
        return self._coffee.cost() + 0.5

# Использование
coffee = Coffee()
coffee_with_milk = Milk(coffee)
coffee_with_milk_and_sugar = Sugar(coffee_with_milk)
print(coffee_with_milk_and_sugar.cost())  # 7.0
```

### Facade (Фасад)

Предоставляет унифицированный интерфейс к набору интерфейсов подсистемы.

```python
class CPU:
    def freeze(self): print("CPU frozen")
    def jump(self, pos): print(f"Jump to {pos}")
    def execute(self): print("CPU executing")

class Memory:
    def load(self, pos, data): print(f"Memory loaded at {pos}")

class HardDrive:
    def read(self, sector, size): return "data"

class ComputerFacade:
    def __init__(self):
        self.cpu = CPU()
        self.memory = Memory()
        self.hdd = HardDrive()
    
    def start(self):
        self.cpu.freeze()
        self.memory.load(0, self.hdd.read(0, 1024))
        self.jump(0)
        self.cpu.execute()

# Использование
computer = ComputerFacade()
computer.start()
```

## Поведенческие паттерны

### Observer (Наблюдатель)

Определяет зависимость "один-ко-многим" между объектами.

```python
class Observer(ABC):
    @abstractmethod
    def update(self, message: str):
        pass

class Subject:
    def __init__(self):
        self._observers = []
    
    def attach(self, observer: Observer):
        self._observers.append(observer)
    
    def detach(self, observer: Observer):
        self._observers.remove(observer)
    
    def notify(self, message: str):
        for observer in self._observers:
            observer.update(message)

class NewsChannel(Observer):
    def update(self, message: str):
        print(f"News received: {message}")

# Использование
subject = Subject()
subject.attach(NewsChannel())
subject.notify("Breaking news!")
```

### Strategy (Стратегия)

Определяет семейство алгоритмов и делает их взаимозаменяемыми.

```python
class PaymentStrategy(ABC):
    @abstractmethod
    def pay(self, amount: float):
        pass

class CreditCardPayment(PaymentStrategy):
    def __init__(self, card_number: str):
        self.card_number = card_number
    
    def pay(self, amount: float):
        print(f"Paid {amount} via Credit Card {self.card_number[-4:]}")

class PayPalPayment(PaymentStrategy):
    def __init__(self, email: str):
        self.email = email
    
    def pay(self, amount: float):
        print(f"Paid {amount} via PayPal ({self.email})")

class Order:
    def __init__(self, payment_strategy: PaymentStrategy):
        self.payment_strategy = payment_strategy
    
    def checkout(self, amount: float):
        self.payment_strategy.pay(amount)

# Использование
order = Order(CreditCardPayment("1234567890123456"))
order.checkout(100.0)
```

### Chain of Responsibility (Цепочка обязанностей)

Передаёт запрос по цепочке обработчиков.

```python
class Handler(ABC):
    def __init__(self):
        self.next_handler = None
    
    def set_next(self, handler):
        self.next_handler = handler
        return handler
    
    def handle(self, request):
        if self.next_handler:
            return self.next_handler.handle(request)
        return None

class AuthHandler(Handler):
    def handle(self, request):
        if not request.get("token"):
            return "Auth failed"
        return super().handle(request)

class ValidationHandler(Handler):
    def handle(self, request):
        if not request.get("data"):
            return "Validation failed"
        return super().handle(request)

# Использование
chain = AuthHandler().set_next(ValidationHandler())
result = chain.handle({"token": "abc", "data": "test"})
```

## Заключение

Паттерны GoF — это проверенные временем решения типичных задач проектирования. Их знание помогает писать более качественный и поддерживаемый код.