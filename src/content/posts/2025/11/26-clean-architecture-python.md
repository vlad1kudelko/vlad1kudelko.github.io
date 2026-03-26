---
title: "Clean Architecture в Python — полное руководство"
description: "Изучите Clean Architecture в Python: Entities, Use Cases, Interface Adapters. Пишите тестируемый и поддерживаемый код уже сегодня."
heroImage: "../../../../assets/imgs/2025/11/26-clean-architecture-python.webp"
pubDate: "2025-11-26"
---

# Clean Architecture в Python

Clean Architecture — это набор принципов построения программного обеспечения, которые делают код тестируемым, поддерживаемым и независимым от фреймворков. В этой статье разберёмся, как применить эти принципы в Python.

Главная идея Clean Architecture — разделение кода на слои по уровню абстракции. Бизнес-логика находится в центре и не зависит от внешних систем вроде баз данных, веб-фреймворков или UI. Это позволяет легко заменять внешние зависимости, тестировать бизнес-логику изолированно и поддерживать код на протяжении лет.

## Основные слои Clean Architecture

### 1. Entities (Сущности)

Сущности — это бизнес-объекты, которые не зависят от каких-либо внешних систем. Они содержат бизнес-логику и правила.

```python
# entities/user.py
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class User:
    id: Optional[int]
    email: str
    password_hash: str
    created_at: datetime
    
    def validate_email(self) -> bool:
        """Валидация email по бизнес-правилам"""
        return '@' in self.email and len(self.email) > 3
    
    def validate_password(self) -> bool:
        """Проверка сложности пароля"""
        return len(self.password_hash) >= 8
    
    def is_valid(self) -> tuple[bool, list[str]]:
        """Валидация всей сущности"""
        errors = []
        if not self.validate_email():
            errors.append("Invalid email format")
        if not self.validate_password():
            errors.append("Password too short")
        return len(errors) == 0, errors
```

### 2. Use Cases (Сценарии использования)

Сценарии описывают бизнес-операции. Они зависят от сущностей, но не зависят от инфраструктуры.

```python
# use_cases/create_user.py
from entities.user import User
from typing import Protocol

class UserRepository(Protocol):
    def save(self, user: User) -> User: ...
    def find_by_email(self, email: str) -> User | None: ...

class PasswordHasher(Protocol):
    def hash(self, password: str) -> str: ...

class CreateUserUseCase:
    def __init__(self, user_repo: UserRepository, password_hasher: PasswordHasher):
        self.user_repo = user_repo
        self.password_hasher = password_hasher
    
    def execute(self, email: str, password: str) -> User:
        # Проверка существования
        existing = self.user_repo.find_by_email(email)
        if existing:
            raise ValueError("User already exists")
        
        # Создание сущности
        user = User(
            id=None,
            email=email,
            password_hash=self.password_hasher.hash(password),
            created_at=datetime.utcnow()
        )
        
        # Валидация
        is_valid, errors = user.is_valid()
        if not is_valid:
            raise ValueError(", ".join(errors))
        
        return self.user_repo.save(user)
```

### 3. Interface Adapters (Адаптеры интерфейсов)

Адаптеры преобразуют данные между внешними системами и бизнес-логикой.

```python
# adapters/fastapi_controller.py
from fastapi import FastAPI, HTTPException
from use_cases.create_user import CreateUserUseCase
from adapters.sqlalchemy_user_repo import SQLAlchemyUserRepository
from adapters.bcrypt_hasher import BcryptHasher

app = FastAPI()

# Dependency Injection
def get_create_user_use_case() -> CreateUserUseCase:
    return CreateUserUseCase(
        user_repo=SQLAlchemyUserRepository(),
        password_hasher=BcryptHasher()
    )

@app.post("/users")
def create_user(
    email: str, 
    password: str,
    use_case: CreateUserUseCase = Depends(get_create_user_use_case)
):
    try:
        user = use_case.execute(email, password)
        return {"id": user.id, "email": user.email}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

## Структура проекта

```
src/
├── entities/
│   ├── __init__.py
│   └── user.py
├── use_cases/
│   ├── __init__.py
│   ├── create_user.py
│   └── get_user.py
├── adapters/
│   ├── __init__.py
│   ├── fastapi_controller.py
│   ├── sqlalchemy_user_repo.py
│   └── bcrypt_hasher.py
├── main.py
└── di.py  # Dependency Injection конфигурация
```

## Преимущества Clean Architecture

- **Тестируемость** — каждый слой тестируется изолированно
- **Независимость** — бизнес-логика не зависит от фреймворков
- **Переносимость** — легко переключить базу данных или API
- **Поддерживаемость** — понятная структура для новых разработчиков

## Заключение

Clean Architecture помогает создавать приложения, которые легко тестировать, развивать и поддерживать. Ключевое правило: зависимости должны быть направлены внутрь — к сущностям.