---
title: "ORM: SQLAlchemy 2.0+ с Async и 2.0 style — Полный обзор"
description: "Освойте ORM: SQLAlchemy 2.0+ с поддержкой Async и 2.0 style. Работайте с БД на Python эффективно и современно."
pubDate: "2026-02-24"
---

# ORM: SQLAlchemy 2.0+, Async, 2.0 style

SQLAlchemy 2.0 — это не просто обновление, а переосмысление API. Старый "legacy" стиль с `Session.query()` ушёл в прошлое. Новый 2.0 style более явный, лучше типизированный и поддерживает async из коробки. Если вы переходите с 1.x или начинаете новый проект — разберём, что изменилось и как писать современный код.

## Что изменилось в 2.0

**Старый стиль (1.x, legacy):**
```python
# Этот стиль всё ещё работает, но устарел
session.query(User).filter(User.name == 'Alice').all()
```

**Новый стиль (2.0 style):**
```python
from sqlalchemy import select

stmt = select(User).where(User.name == 'Alice')
result = session.execute(stmt)
users = result.scalars().all()
```

Изменение не косметическое: новый API лучше работает с type checkers, поддерживает async без переписывания и выражает намерения явнее.

## Декларативные модели

```python
from sqlalchemy import String, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from datetime import datetime

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = 'users'

    id:         Mapped[int]           = mapped_column(primary_key=True)
    name:       Mapped[str]           = mapped_column(String(100))
    email:      Mapped[str]           = mapped_column(String(255), unique=True)
    created_at: Mapped[datetime]      = mapped_column(default=func.now())
    is_active:  Mapped[bool]          = mapped_column(default=True)

    posts: Mapped[list['Post']] = relationship(back_populates='author')

class Post(Base):
    __tablename__ = 'posts'

    id:        Mapped[int]        = mapped_column(primary_key=True)
    title:     Mapped[str]        = mapped_column(String(200))
    content:   Mapped[str | None] = mapped_column()
    author_id: Mapped[int]        = mapped_column(ForeignKey('users.id'))

    author: Mapped['User'] = relationship(back_populates='posts')
```

`Mapped[T]` — это аннотация типа, которая одновременно является валидацией. SQLAlchemy понимает `Mapped[str | None]` как nullable колонку без явного `nullable=True`.

## Синхронные запросы

```python
from sqlalchemy import create_engine, select, and_, or_, func
from sqlalchemy.orm import Session

engine = create_engine('postgresql+psycopg2://user:pass@localhost/db')

# Базовые операции
with Session(engine) as session:
    # Создание
    user = User(name='Alice', email='alice@example.com')
    session.add(user)
    session.commit()

    # Чтение
    stmt = select(User).where(User.is_active == True)
    users = session.execute(stmt).scalars().all()

    # Фильтрация
    stmt = (
        select(User)
        .where(
            and_(
                User.is_active == True,
                or_(User.name.like('A%'), User.name.like('B%'))
            )
        )
        .order_by(User.created_at.desc())
        .limit(10)
    )
    recent_users = session.execute(stmt).scalars().all()

    # Агрегации
    stmt = select(func.count(User.id), func.max(User.created_at))
    count, last_created = session.execute(stmt).one()

    # JOIN
    stmt = (
        select(User, Post)
        .join(Post, User.id == Post.author_id)
        .where(Post.title.icontains('python'))
    )
    for user, post in session.execute(stmt):
        print(f"{user.name}: {post.title}")
```

## Async SQLAlchemy

Для async нужен async-совместимый драйвер: `asyncpg` для PostgreSQL, `aiosqlite` для SQLite.

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

async_engine = create_async_engine(
    'postgresql+asyncpg://user:pass@localhost/db',
    pool_size=10,
    max_overflow=20,
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(
    async_engine,
    expire_on_commit=False,
)

# Async запросы
async def get_user(user_id: int) -> User | None:
    async with AsyncSessionLocal() as session:
        stmt = select(User).where(User.id == user_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

async def create_post(author_id: int, title: str, content: str) -> Post:
    async with AsyncSessionLocal() as session:
        post = Post(author_id=author_id, title=title, content=content)
        session.add(post)
        await session.commit()
        await session.refresh(post)
        return post
```

## Интеграция с FastAPI

Паттерн dependency injection для сессий:

```python
from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession

app = FastAPI()

async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

@app.get('/users/{user_id}')
async def read_user(user_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail='User not found')
    return user

@app.post('/posts')
async def create_post_endpoint(
    title: str,
    content: str,
    author_id: int,
    db: AsyncSession = Depends(get_db)
):
    post = Post(title=title, content=content, author_id=author_id)
    db.add(post)
    await db.commit()
    await db.refresh(post)
    return post
```

## Загрузка связанных объектов

В async режиме ленивая загрузка не работает по умолчанию. Используйте `selectinload` или `joinedload`:

```python
from sqlalchemy.orm import selectinload, joinedload

# selectinload: отдельный SELECT для каждой связи
stmt = (
    select(User)
    .options(selectinload(User.posts))
    .where(User.is_active == True)
)
users = (await db.execute(stmt)).scalars().all()
# Теперь user.posts доступны без дополнительных запросов

# joinedload: JOIN в основном запросе
stmt = (
    select(Post)
    .options(joinedload(Post.author))
    .where(Post.title.icontains('python'))
)
posts = (await db.execute(stmt)).unique().scalars().all()
```

## Миграции с Alembic

SQLAlchemy работает в паре с Alembic для управления миграциями:

```bash
pip install alembic
alembic init alembic
```

```python
# alembic/env.py — подключаем наши модели
from app.models import Base
target_metadata = Base.metadata
```

```bash
# Автогенерация миграции на основе изменений в моделях
alembic revision --autogenerate -m "add posts table"

# Применение
alembic upgrade head

# Откат
alembic downgrade -1
```

Alembic умеет обнаруживать расхождения между моделями и схемой БД, но автогенерация не всегда точная — особенно для кастомных типов и partial-индексов. Всегда просматривайте сгенерированный файл миграции перед применением.
