---
title: "Pydantic 2.x: валидация, V2 changes, serializers"
description: "Освойте Pydantic 2.x: валидация данных, V2 changes, serializers. Валидируйте данные в Python быстро и надёжно."
pubDate: "2026-02-26"
---

# Pydantic 2.x: валидация, V2 changes

Pydantic 2.0 переписан на Rust -- скорость выросла в 5-50 раз, API стал строже. Главное практическое изменение: `@validator` → `@field_validator` с обязательным `@classmethod`, `orm_mode=True` → `from_attributes=True`, `dict()` → `model_dump()`. Миграция с v1 требует конкретных правок в коде.

Если вы пишете FastAPI или валидируете данные в Python, понимание нового API критично. Pydantic v2 используется в FastAPI 0.100+, и старый код с `@validator` будет вызывать DeprecationWarning, а в будущих версиях -- ошибки.

> **Key Takeaways**
> - `@validator` заменён на `@field_validator` с обязательным `@classmethod` и явной типизацией
> - `model_config = ConfigDict(from_attributes=True)` заменяет `class Config: orm_mode = True`
> - `model_dump()` и `model_dump_json()` заменяют `.dict()` и `.json()`
> - `Annotated[int, Field(gt=0)]` позволяет переиспользовать ограничения как тип
> - `pydantic-settings` -- отдельный пакет в v2; `BaseSettings` больше не идёт в комплекте

---

Команда обновляла FastAPI-сервис с Pydantic v1 на v2. После `pip install pydantic --upgrade` запустили тесты -- 23 теста упало. Главные проблемы: `@validator` без `@classmethod` теперь предупреждение, `orm_mode` не существует, `.dict()` работает, но с предупреждением. Прошлись по списку изменений, сделали замены за 3 часа. Результат: все тесты зелёные, эндпоинты стали работать в среднем на 30% быстрее под нагрузкой -- просто от обновления зависимости без изменений логики.

## Главные изменения

**V1:**
```python
from pydantic import BaseModel, validator

class User(BaseModel):
    name: str
    age: int

    @validator('age')
    def age_must_be_positive(cls, v):
        if v < 0:
            raise ValueError('age must be positive')
        return v
```

**V2:**
```python
from pydantic import BaseModel, field_validator

class User(BaseModel):
    name: str
    age: int

    @field_validator('age')
    @classmethod
    def age_must_be_positive(cls, v: int) -> int:
        if v < 0:
            raise ValueError('age must be positive')
        return v
```

Изменения: `@validator` → `@field_validator`, обязательный `@classmethod`, явная типизация параметра. Без этих изменений код работает, но в production-логах появятся предупреждения.

## Модели и типы

```python
from pydantic import BaseModel, EmailStr, HttpUrl, Field
from datetime import datetime
from typing import Annotated
from enum import Enum

class UserRole(str, Enum):
    admin = 'admin'
    editor = 'editor'
    viewer = 'viewer'

# Annotated для переиспользуемых ограничений
PositiveInt = Annotated[int, Field(gt=0)]
ShortString = Annotated[str, Field(min_length=1, max_length=100)]

class UserCreate(BaseModel):
    username: ShortString
    email: EmailStr
    age: PositiveInt
    role: UserRole = UserRole.viewer
    website: HttpUrl | None = None
    created_at: datetime = Field(default_factory=datetime.now)

    model_config = {
        'str_strip_whitespace': True,
        'validate_assignment': True,
    }

# Валидация
try:
    user = UserCreate(
        username=' alice ',  # пробелы обрежутся
        email='alice@example.com',
        age=25,
        role='admin',
    )
    print(user.username)  # 'alice'
except ValueError as e:
    print(e.errors())
```

`Annotated[int, Field(gt=0)]` позволяет определить ограничение один раз и переиспользовать как тип. Если `PositiveInt` используется в 20 полях, изменить правило нужно в одном месте.

## Вложенные модели и списки

```python
class Address(BaseModel):
    street: str
    city: str
    country: str = 'RU'

class OrderItem(BaseModel):
    product_id: int
    quantity: PositiveInt
    price: Annotated[float, Field(gt=0)]

class Order(BaseModel):
    id: int
    customer: UserCreate
    items: list[OrderItem] = Field(min_length=1)
    shipping_to: Address
    total: float = 0.0

    @property
    def calculated_total(self) -> float:
        return sum(item.price * item.quantity for item in self.items)
```

## Валидаторы V2

```python
from pydantic import model_validator, field_validator, ValidationInfo

class PasswordReset(BaseModel):
    password: str
    confirm_password: str

    @field_validator('password')
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('password must contain uppercase letter')
        return v

    @model_validator(mode='after')
    def passwords_match(self) -> 'PasswordReset':
        if self.password != self.confirm_password:
            raise ValueError('passwords do not match')
        return self
```

`mode='after'` -- валидатор запускается после инициализации модели и имеет доступ к `self`. `mode='before'` -- получает сырые входные данные до конвертации типов.

## Сериализация

```python
from pydantic import BaseModel, field_serializer
from datetime import datetime

class Event(BaseModel):
    name: str
    occurred_at: datetime

    @field_serializer('occurred_at')
    def serialize_date(self, v: datetime) -> str:
        return v.strftime('%Y-%m-%d %H:%M')

event = Event(name='Deploy', occurred_at=datetime.now())

# В словарь
event.model_dump()
# {'name': 'Deploy', 'occurred_at': '2026-02-26 14:30'}

# В JSON
event.model_dump_json()
# '{"name":"Deploy","occurred_at":"2026-02-26 14:30"}'

# Исключить поля
event.model_dump(exclude={'occurred_at'})

# Только нужные поля
event.model_dump(include={'name'})
```

## Работа с ORM объектами

```python
from pydantic import BaseModel, ConfigDict

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str

# Создание из ORM-объекта (SQLAlchemy, Tortoise и т.д.)
db_user = await User.get(id=1)  # ORM объект
response = UserResponse.model_validate(db_user)
```

`from_attributes=True` (раньше `orm_mode=True`) позволяет создавать Pydantic модели из объектов с атрибутами, а не только из словарей. Работает с SQLAlchemy, Tortoise ORM, любыми dataclass-подобными объектами.

---

Разработчик Витя писал схемы для API платёжной системы. В входящих данных от клиентов регулярно приходили `amount: "1500"` вместо числа, `currency: "rub"` вместо `"RUB"`, лишние пробелы в именах. Раньше это обрабатывалось вручную в каждом эндпоинте. С Pydantic v2: `Annotated[str, Field(pattern=r'^[A-Z]{3}$')]` для валюты, `str_strip_whitespace: True` в конфиге, `@field_validator('currency', mode='before')` для нормализации в uppercase. Слой обработки схлопнулся в декларативные аннотации, логика эндпоинтов стала чище.

## Discriminated Unions

Мощная фича для полиморфных структур:

```python
from typing import Literal
from pydantic import BaseModel

class Dog(BaseModel):
    type: Literal['dog']
    breed: str
    sound: str = 'woof'

class Cat(BaseModel):
    type: Literal['cat']
    indoor: bool = True
    sound: str = 'meow'

class Bird(BaseModel):
    type: Literal['bird']
    wings: bool = True
    sound: str = 'tweet'

Pet = Dog | Cat | Bird

class Owner(BaseModel):
    name: str
    pets: list[Pet]

# Pydantic автоматически определит тип по полю 'type'
owner = Owner(name='Alice', pets=[
    {'type': 'dog', 'breed': 'labrador'},
    {'type': 'cat', 'indoor': True},
])
```

Pydantic v2 обрабатывает discriminated unions эффективно: не перебирает все варианты подряд, а сразу смотрит на discriminator-поле. На большом количестве вариантов это заметно по скорости.

## BaseSettings для конфигурации

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    debug: bool = False
    allowed_hosts: list[str] = ['localhost']
    max_connections: int = 10

    model_config = {
        'env_file': '.env',
        'env_file_encoding': 'utf-8',
        'case_sensitive': False,
    }

settings = Settings()  # читает из .env и переменных окружения
```

`pydantic-settings` -- отдельный пакет в v2, нужно устанавливать отдельно: `pip install pydantic-settings`. В v1 `BaseSettings` шёл в комплекте.

## Производительность V2

Pydantic v2 написан на Rust через библиотеку `pydantic-core`. На практике это даёт:
- Простая валидация: 5-10x быстрее
- Сложные вложенные модели: 10-50x быстрее
- Сериализация: 2-5x быстрее

Если вы используете FastAPI, обновление Pydantic до v2 ощутимо снизит время ответа под нагрузкой без изменений в коде приложения.

## Итог

Pydantic v2 требует конкретных правок при миграции с v1, но даёт в разы лучшую производительность и более строгий API. Основные изменения несложные: переименования декораторов, `ConfigDict`, раздельная установка `pydantic-settings`. Обновление стоит усилий -- особенно если проект под нагрузкой.

Следующая тема -- [Dependency injection в FastAPI: Depends, цепочки зависимостей, тестирование](/posts/2026/02/27-dependency-injection).
