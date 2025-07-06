+++
lang = "ru"
title = "FastAPI + SQLAlchemy: работа с базой данных"
description = "Подробное руководство по интеграции FastAPI с SQLAlchemy: настройка подключения к БД, создание моделей, CRUD операции, миграции и лучшие практики."
template = "posts"
thumb = "/imgs/fastapi-sqlalchemy-database-guide.png"
publication_date = "2025-07-06"
+++

# FastAPI + SQLAlchemy: работа с базой данных

**SQLAlchemy** — это мощная библиотека для работы с базами данных в Python, которая предоставляет как ORM (Object-Relational Mapping), так и Core API для прямого выполнения SQL-запросов. В сочетании с FastAPI она создаёт идеальную пару для разработки современных веб-приложений с надёжной работой с данными. В этой статье мы рассмотрим, как эффективно интегрировать SQLAlchemy с FastAPI для создания полноценных API с базой данных.

## 1. Установка и настройка

Для работы с SQLAlchemy в FastAPI потребуется установить несколько пакетов:

```bash
pip install fastapi uvicorn sqlalchemy psycopg2-binary alembic
```

**Объяснение пакетов:**
- `fastapi` — основной веб-фреймворк
- `uvicorn` — ASGI-сервер для запуска приложения
- `sqlalchemy` — ORM для работы с базами данных
- `psycopg2-binary` — драйвер для PostgreSQL (можно заменить на `pymysql` для MySQL)
- `alembic` — инструмент для управления миграциями базы данных

## 2. Базовая структура проекта

Создадим структуру проекта для демонстрации интеграции FastAPI с SQLAlchemy:

```
fastapi_sqlalchemy_project/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   └── crud.py
├── alembic.ini
└── requirements.txt
```

## 3. Настройка подключения к базе данных

Создадим файл `database.py` для настройки подключения к базе данных:

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Настройки подключения к базе данных
SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost/fastapi_db"

# Создание движка базы данных
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=True  # Логирование SQL-запросов (отключить в продакшене)
)

# Создание фабрики сессий
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Базовый класс для моделей
Base = declarative_base()

# Dependency для получения сессии БД
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Пояснения к коду:**
- `SQLALCHEMY_DATABASE_URL` — строка подключения к базе данных. Формат: `dialect://username:password@host:port/database_name`
- `create_engine()` — создаёт движок для подключения к БД. Параметр `echo=True` включает логирование SQL-запросов (полезно для отладки)
- `SessionLocal` — фабрика для создания сессий базы данных
- `Base` — базовый класс для всех моделей SQLAlchemy
- `get_db()` — dependency-функция, которая создаёт сессию БД для каждого запроса и автоматически закрывает её

## 4. Создание моделей данных

В файле `models.py` определим модели данных с помощью SQLAlchemy ORM:

```python
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Связь с постами (один ко многим)
    posts = relationship("Post", back_populates="author")

class Post(Base):
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    content = Column(Text, nullable=False)
    is_published = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Внешний ключ к пользователю
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Связь с автором
    author = relationship("User", back_populates="posts")
```

**Пояснения к коду:**
- `__tablename__` — имя таблицы в базе данных
- `Column()` — определение колонки с указанием типа данных и ограничений
- `primary_key=True` — первичный ключ
- `index=True` — создание индекса для ускорения поиска
- `unique=True` — уникальное значение
- `nullable=False` — поле не может быть пустым
- `ForeignKey()` — внешний ключ для связи между таблицами
- `relationship()` — определение связей между моделями
- `func.now()` — функция для установки текущего времени
- `server_default=func.now()` — значение по умолчанию устанавливается сервером БД

## 5. Создание Pydantic схем

В файле `schemas.py` определим Pydantic модели для валидации данных:

```python
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# Базовые схемы
class UserBase(BaseModel):
    email: EmailStr
    username: str

class PostBase(BaseModel):
    title: str
    content: str
    is_published: bool = False

# Схемы для создания
class UserCreate(UserBase):
    password: str

class PostCreate(PostBase):
    pass

# Схемы для обновления
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    is_active: Optional[bool] = None

class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    is_published: Optional[bool] = None

# Схемы для ответов
class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class Post(PostBase):
    id: int
    author_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    author: User
    
    class Config:
        from_attributes = True

# Схемы для списков
class UserList(BaseModel):
    users: List[User]

class PostList(BaseModel):
    posts: List[Post]
```

**Пояснения к коду:**
- `BaseModel` — базовый класс Pydantic для создания схем
- `EmailStr` — специальный тип для валидации email-адресов
- `Optional[Type]` — поле может быть None
- `List[Type]` — список объектов определённого типа
- `from_attributes = True` — позволяет создавать Pydantic модели из SQLAlchemy объектов
- Разделение на `Base`, `Create`, `Update` и ответные схемы обеспечивает безопасность и гибкость API

## 6. CRUD операции

В файле `crud.py` создадим функции для работы с базой данных:

```python
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from . import models, schemas
from passlib.context import CryptContext

# Настройка хеширования паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Функции для работы с пользователями
def get_user(db: Session, user_id: int) -> Optional[models.User]:
    """Получить пользователя по ID"""
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    """Получить пользователя по email"""
    return db.query(models.User).filter(models.User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[models.User]:
    """Получить список пользователей с пагинацией"""
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    """Создать нового пользователя"""
    hashed_password = pwd_context.hash(user.password)
    db_user = models.User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user_update: schemas.UserUpdate) -> Optional[models.User]:
    """Обновить пользователя"""
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int) -> bool:
    """Удалить пользователя"""
    db_user = get_user(db, user_id)
    if not db_user:
        return False
    
    db.delete(db_user)
    db.commit()
    return True

# Функции для работы с постами
def get_post(db: Session, post_id: int) -> Optional[models.Post]:
    """Получить пост по ID"""
    return db.query(models.Post).filter(models.Post.id == post_id).first()

def get_posts(db: Session, skip: int = 0, limit: int = 100, 
              author_id: Optional[int] = None, published_only: bool = False) -> List[models.Post]:
    """Получить список постов с фильтрацией"""
    query = db.query(models.Post)
    
    if author_id:
        query = query.filter(models.Post.author_id == author_id)
    
    if published_only:
        query = query.filter(models.Post.is_published == True)
    
    return query.offset(skip).limit(limit).all()

def create_post(db: Session, post: schemas.PostCreate, author_id: int) -> models.Post:
    """Создать новый пост"""
    db_post = models.Post(**post.dict(), author_id=author_id)
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post

def update_post(db: Session, post_id: int, post_update: schemas.PostUpdate) -> Optional[models.Post]:
    """Обновить пост"""
    db_post = get_post(db, post_id)
    if not db_post:
        return None
    
    update_data = post_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_post, field, value)
    
    db.commit()
    db.refresh(db_post)
    return db_post

def delete_post(db: Session, post_id: int) -> bool:
    """Удалить пост"""
    db_post = get_post(db, post_id)
    if not db_post:
        return False
    
    db.delete(db_post)
    db.commit()
    return True
```

**Пояснения к коду:**
- `db.query()` — создание запроса к базе данных
- `filter()` — применение фильтров к запросу
- `first()` — получение первого результата
- `all()` — получение всех результатов
- `offset()` и `limit()` — пагинация результатов
- `add()` — добавление объекта в сессию
- `commit()` — сохранение изменений в базе данных
- `refresh()` — обновление объекта из базы данных
- `delete()` — удаление объекта
- `exclude_unset=True` — исключение полей со значением None при обновлении

## 7. Основное приложение FastAPI

В файле `main.py` создадим основное приложение с API endpoints:

```python
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from . import crud, models, schemas
from .database import engine, get_db

# Создание таблиц в базе данных
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="FastAPI SQLAlchemy Demo",
    description="Демонстрация интеграции FastAPI с SQLAlchemy",
    version="1.0.0"
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoints для пользователей
@app.post("/users/", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Создать нового пользователя"""
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует"
        )
    return crud.create_user(db=db, user=user)

@app.get("/users/", response_model=List[schemas.User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Получить список пользователей"""
    users = crud.get_users(db, skip=skip, limit=limit)
    return users

@app.get("/users/{user_id}", response_model=schemas.User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    """Получить пользователя по ID"""
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    return db_user

@app.put("/users/{user_id}", response_model=schemas.User)
def update_user(user_id: int, user_update: schemas.UserUpdate, db: Session = Depends(get_db)):
    """Обновить пользователя"""
    db_user = crud.update_user(db, user_id=user_id, user_update=user_update)
    if db_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    return db_user

@app.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Удалить пользователя"""
    success = crud.delete_user(db, user_id=user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )

# Endpoints для постов
@app.post("/posts/", response_model=schemas.Post, status_code=status.HTTP_201_CREATED)
def create_post(post: schemas.PostCreate, author_id: int, db: Session = Depends(get_db)):
    """Создать новый пост"""
    # Проверяем, что автор существует
    db_user = crud.get_user(db, user_id=author_id)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Автор не найден"
        )
    return crud.create_post(db=db, post=post, author_id=author_id)

@app.get("/posts/", response_model=List[schemas.Post])
def read_posts(
    skip: int = 0, 
    limit: int = 100, 
    author_id: int = None,
    published_only: bool = False,
    db: Session = Depends(get_db)
):
    """Получить список постов"""
    posts = crud.get_posts(
        db, 
        skip=skip, 
        limit=limit, 
        author_id=author_id,
        published_only=published_only
    )
    return posts

@app.get("/posts/{post_id}", response_model=schemas.Post)
def read_post(post_id: int, db: Session = Depends(get_db)):
    """Получить пост по ID"""
    db_post = crud.get_post(db, post_id=post_id)
    if db_post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пост не найден"
        )
    return db_post

@app.put("/posts/{post_id}", response_model=schemas.Post)
def update_post(post_id: int, post_update: schemas.PostUpdate, db: Session = Depends(get_db)):
    """Обновить пост"""
    db_post = crud.update_post(db, post_id=post_id, post_update=post_update)
    if db_post is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пост не найден"
        )
    return db_post

@app.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: int, db: Session = Depends(get_db)):
    """Удалить пост"""
    success = crud.delete_post(db, post_id=post_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пост не найден"
        )

# Корневой endpoint
@app.get("/")
def read_root():
    return {"message": "Добро пожаловать в FastAPI SQLAlchemy Demo!"}
```

**Пояснения к коду:**
- `Depends(get_db)` — dependency injection для получения сессии БД
- `response_model` — указание схемы для ответа
- `status_code` — HTTP-код ответа
- `HTTPException` — исключение для возврата ошибок клиенту
- `List[schemas.User]` — тип для списка объектов
- Автоматическая валидация входных данных через Pydantic схемы

## 8. Миграции с Alembic

Для управления изменениями схемы базы данных используем Alembic:

```bash
# Инициализация Alembic
alembic init alembic

# Создание первой миграции
alembic revision --autogenerate -m "Initial migration"

# Применение миграций
alembic upgrade head
```

Настройка `alembic.ini`:

```ini
[alembic]
script_location = alembic
sqlalchemy.url = postgresql://user:password@localhost/fastapi_db
```

Настройка `alembic/env.py`:

```python
from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
from app.models import Base
from app.database import SQLALCHEMY_DATABASE_URL

config = context.config
config.set_main_option("sqlalchemy.url", SQLALCHEMY_DATABASE_URL)

target_metadata = Base.metadata
```

## 9. Асинхронная работа с базой данных

Для высоконагруженных приложений рекомендуется использовать асинхронную работу с БД:

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Асинхронный движок
async_engine = create_async_engine(
    "postgresql+asyncpg://user:password@localhost/fastapi_db",
    echo=True
)

# Асинхронная фабрика сессий
AsyncSessionLocal = sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)

# Асинхронная dependency
async def get_async_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Асинхронный endpoint
@app.get("/async/users/")
async def read_users_async(db: AsyncSession = Depends(get_async_db)):
    result = await db.execute(select(models.User))
    users = result.scalars().all()
    return users
```

## 10. Оптимизация производительности

### Индексы и запросы

```python
# Создание составного индекса
from sqlalchemy import Index

class Post(Base):
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Составной индекс для поиска по автору и дате
    __table_args__ = (
        Index('idx_author_created', 'author_id', 'created_at'),
    )

# Оптимизированные запросы
def get_recent_posts_by_author(db: Session, author_id: int, limit: int = 10):
    """Получить последние посты автора с оптимизацией"""
    return db.query(models.Post)\
        .filter(models.Post.author_id == author_id)\
        .order_by(models.Post.created_at.desc())\
        .limit(limit)\
        .all()
```

### Ленивая загрузка и eager loading

```python
from sqlalchemy.orm import joinedload, selectinload

# Eager loading для избежания N+1 проблемы
def get_posts_with_authors(db: Session):
    return db.query(models.Post)\
        .options(joinedload(models.Post.author))\
        .all()

# Selectin loading для больших наборов данных
def get_users_with_posts_count(db: Session):
    return db.query(models.User)\
        .options(selectinload(models.User.posts))\
        .all()
```

## 11. Обработка ошибок и валидация

```python
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from contextlib import contextmanager

@contextmanager
def handle_db_errors():
    """Контекстный менеджер для обработки ошибок БД"""
    try:
        yield
    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нарушение целостности данных"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Внутренняя ошибка сервера"
        )

# Использование в CRUD операциях
def create_user_safe(db: Session, user: schemas.UserCreate) -> models.User:
    with handle_db_errors():
        return create_user(db, user)
```

## 12. Тестирование

Создадим тесты для API:

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import get_db
from app.models import Base

# Тестовая база данных
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def test_create_user():
    response = client.post(
        "/users/",
        json={"email": "test@example.com", "username": "testuser", "password": "password123"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["username"] == "testuser"

def test_get_users():
    response = client.get("/users/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

## 13. Лучшие практики

### 1. Структура проекта
- Разделяйте модели, схемы и CRUD операции по отдельным файлам
- Используйте dependency injection для получения сессий БД
- Создавайте отдельные модули для разных доменов

### 2. Безопасность
- Всегда хешируйте пароли
- Используйте prepared statements (автоматически в SQLAlchemy)
- Валидируйте все входные данные через Pydantic

### 3. Производительность
- Создавайте индексы для часто используемых полей
- Используйте eager loading для избежания N+1 проблемы
- Применяйте пагинацию для больших наборов данных

### 4. Миграции
- Всегда используйте миграции для изменения схемы БД
- Тестируйте миграции на тестовых данных
- Создавайте резервные копии перед применением миграций

## Заключение

Интеграция FastAPI с SQLAlchemy предоставляет мощную и гибкую платформу для создания современных веб-приложений. Сочетание автоматической валидации данных, строгой типизации, асинхронности и удобной работы с базой данных делает эту пару отличным выбором для разработки API любой сложности.

Основные преимущества такого подхода:
- **Производительность** — асинхронная работа и оптимизированные запросы
- **Безопасность** — автоматическая валидация и защита от SQL-инъекций
- **Удобство разработки** — автоматическая документация и строгая типизация
- **Масштабируемость** — поддержка миграций и возможность оптимизации

Используя представленные в статье подходы и лучшие практики, вы сможете создавать надёжные и эффективные API с полноценной работой с базой данных. 