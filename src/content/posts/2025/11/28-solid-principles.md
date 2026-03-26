---
title: "SOLID принципы с примерами на Python"
description: "Принципы SOLID в Python: каждый принцип с кодом и антипаттернами. Как писать чистый и поддерживаемый объектно-ориентированный код."
heroImage: "../../../../assets/imgs/2025/11/28-solid-principles.webp"
pubDate: "2025-11-28"
---

# SOLID принципы в Python

SOLID — это пять основных принципов объектно-ориентированного программирования, которые помогают создавать гибкий и поддерживаемый код.

## S — Single Responsibility Principle (Принцип единственной ответственности)

Каждый класс должен иметь только одну причину для изменения.

### Антипаттерн

```python
# Плохо: класс делает слишком много
class User:
    def __init__(self, name: str, email: str):
        self.name = name
        self.email = email
    
    def save_to_database(self):
        # Логика сохранения в БД
        pass
    
    def send_email(self):
        # Логика отправки email
        pass
    
    def generate_report(self):
        # Генерация отчёта
        pass
```

### Правильный подход

```python
# Хорошо: каждый класс отвечает за своё
class User:
    def __init__(self, name: str, email: str):
        self.name = name
        self.email = email

class UserRepository:
    def save(self, user: User):
        # Логика сохранения
        pass

class EmailService:
    def send(self, to: str, subject: str, body: str):
        # Логика отправки
        pass

class ReportGenerator:
    def generate(self, user: User):
        # Генерация отчёта
        pass
```

## O — Open/Closed Principle (Принцип открытости/закрытости)

Классы должны быть открыты для расширения, но закрыты для модификации.

### Антипаттерн

```python
# Плохо: добавление нового типа требует изменения существующего кода
class AreaCalculator:
    def calculate(self, shape):
        if isinstance(shape, "circle"):
            return 3.14 * shape.radius ** 2
        elif isinstance(shape, "rectangle"):
            return shape.width * shape.height
        # При добавлении треугольника нужно менять этот класс
```

### Правильный подход

```python
# Хорошо: добавляем новые фигуры без изменения существующего кода
from abc import ABC, abstractmethod

class Shape(ABC):
    @abstractmethod
    def area(self) -> float:
        pass

class Circle(Shape):
    def __init__(self, radius: float):
        self.radius = radius
    
    def area(self) -> float:
        return 3.14 * self.radius ** 2

class Rectangle(Shape):
    def __init__(self, width: float, height: float):
        self.width = width
        self.height = height
    
    def area(self) -> float:
        return self.width * self.height

# Для добавления треугольника просто создаём новый класс
class Triangle(Shape):
    def __init__(self, base: float, height: float):
        self.base = base
        self.height = height
    
    def area(self) -> float:
        return 0.5 * self.base * self.height
```

## L — Liskov Substitution Principle (Принцип подстановки Лисков)

Объекты базового класса должны заменяться объектами производных без изменения корректности программы.

### Антипаттерн

```python
# Плохо: наследник нарушает контракт базового класса
class Bird:
    def fly(self):
        return "Flying"

class Penguin(Bird):
    def fly(self):
        raise NotImplementedError("Penguins can't fly")
```

### Правильный подход

```python
# Хорошо: корректная иерархия
class Bird:
    def move(self):
        return "Moving"

class FlyingBird(Bird):
    def fly(self):
        return "Flying"

class Penguin(Bird):
    def swim(self):
        return "Swimming"
```

## I — Interface Segregation Principle (Принцип разделения интерфейсов)

Клиенты не должны зависеть от методов, которые они не используют.

### Антипаттерн

```python
# Плохо: толстый интерфейс
class Worker(ABC):
    @abstractmethod
    def work(self): ...
    @abstractmethod
    def eat(self): ...
    @abstractmethod
    def sleep(self): ...

class Robot(Worker):
    def work(self): ...
    def eat(self): raise NotImplementedError()  # Роботам не нужно есть
    def sleep(self): raise NotImplementedError()  # Роботам не нужно спать
```

### Правильный подход

```python
# Хорошо: разделённые интерфейсы
class Workable(ABC):
    @abstractmethod
    def work(self): ...

class Eatable(ABC):
    @abstractmethod
    def eat(self): ...

class Sleepable(ABC):
    @abstractmethod
    def sleep(self): ...

class Human(Workable, Eatable, Sleepable):
    def work(self): ...
    def eat(self): ...
    def sleep(self): ...

class Robot(Workable):
    def work(self): ...
```

## D — Dependency Inversion Principle (Принцип инверсии зависимостей)

Модули верхнего уровня не должны зависеть от модулей нижнего. Оба должны зависеть от абстракций.

### Антипаттерн

```python
# Плохо: зависимость от конкретной реализации
class MySQLDatabase:
    def connect(self): ...
    def query(self, sql): ...

class UserService:
    def __init__(self):
        self.db = MySQLDatabase()  # Жёсткая зависимость
    
    def get_users(self):
        return self.db.query("SELECT * FROM users")
```

### Правильный подход

```python
# Хорошо: зависимость от абстракции
from abc import ABC

class Database(ABC):
    @abstractmethod
    def connect(self): ...
    @abstractmethod
    def query(self, sql): ...

class MySQLDatabase(Database):
    def connect(self): ...
    def query(self, sql): ...

class PostgreSQLDatabase(Database):
    def connect(self): ...
    def query(self, sql): ...

class UserService:
    def __init__(self, db: Database):  # Зависимость от абстракции
        self.db = db
    
    def get_users(self):
        return self.db.query("SELECT * FROM users")

# Легко подменить реализацию
user_service = UserService(MySQLDatabase())
# или
user_service = UserService(PostgreSQLDatabase())
```

## Заключение

Следование SOLID принципам делает код более:
- **Тестируемым** — проще мокать зависимости
- **Гибким** — легче добавлять новую функциональность
- **Понятным** — каждый класс имеет чёткую ответственность
- **Поддерживаемым** — изменения локализованы и предсказуемы