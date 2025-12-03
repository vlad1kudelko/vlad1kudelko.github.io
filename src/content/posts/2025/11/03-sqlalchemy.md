---
title: "Полная памятка по SQLAlchemy: Core, ORM, сессии, запросы, примеры и лучшие практики"
description: "Подробная памятка по SQLAlchemy: создание моделей, таблиц, запросов, работа с ORM и Core, сессии, соединения, транзакции и примеры кода. Кратко и понятно."
heroImage: "../../../../assets/imgs/2025/11/03-sqlalchemy.webp"
pubDate: "2025-11-03"
tags: "manual"
---

# Памятка по SQLAlchemy (Core + ORM)

`requirements.txt` обычно включает:

```
alembic
asyncpg         # асинхронная база
psycopg         # синхронная база (но можно и асинхронно)
psycopg-binary  # синхронная база (зависимость)
sqlalchemy

fastapi
pydantic
pydantic-settings  # для подгрузки данных из переменных окружения
uvicorn
```

## Конфигурация (Pydantic Settings)

```python
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    DB_HOST: str
    DB_PORT: str
    DB_USER: str
    DB_PASS: str
    DB_NAME: str

    @property
    def DATABASE_URL_psycopg(self):
        return (
            f"postgresql+psycopg://{self.DB_USER}:{self.DB_PASS}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    @property
    def DATABASE_URL_asyncpg(self):
        return (
            f"postgresql+asyncpg://{self.DB_USER}:{self.DB_PASS}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
        )

    model_config = SettingsConfigDict(env_file='.env')

settings = Settings()
```

## Создание движка

### Синхронный

```python
from sqlalchemy import create_engine

engine = create_engine(
    settings.DATABASE_URL_psycopg,
    # echo=True,  # лог SQL
)
```

Использование:

```python
with engine.connect() as conn:
    ...
    conn.commit()
```

### Асинхронный

```python
from sqlalchemy.ext.asyncio import create_async_engine

async_engine = create_async_engine(settings.DATABASE_URL_asyncpg)
```

## Работа с сессиями (sessionmaker)

```python
from sqlalchemy.orm import sessionmaker

SessionFactory = sessionmaker(bind=engine)
```

Использование:

```python
with SessionFactory() as session:
    ...
    session.commit()
```

## Описание таблиц (императивно)

```python
from sqlalchemy import Table, Column, Integer, String, MetaData

metadata = MetaData()

tbl_users = Table(
    "tbl_users",
    metadata,
    Column("user_id", Integer, primary_key=True),
    Column("login", String),
)
```

Создание в БД:

```python
metadata.create_all(engine)
```

## Описание моделей (декларативно)

```python
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, String

Base = declarative_base()

class User(Base):
    __tablename__ = "tbl_users"

    user_id = Column(Integer, primary_key=True)
    login = Column(String)
```

Создание в БД:

```python
Base.metadata.create_all(engine)
```

## Вставка данных

### Через insert()

```python
from sqlalchemy import insert

stmt = insert(tbl_users).values([
    {"login": "Bobr"},
    {"login": "Volk"},
])

with engine.connect() as conn:
    conn.execute(stmt)
    conn.commit()
```
### Через ORM-объект

```python
new_user = User(login="Jack")
session.add(new_user)
session.commit()
```

## Обновление данных

### Через text()

```python
from sqlalchemy import text

stmt = text(
    "UPDATE workers SET username=:user_name WHERE userid=:user_id"
).bindparams(user_name=name, user_id=id)
```

### Через update()

```python
from sqlalchemy import update

stmt = (
    update(tbl_users)
    .values(login="NewName")
    #.whete(workers_table.c.user_id == 1)
    .filter_by(user_id=1)
)
```

### Через ORM-объект

```python
worker = session.get(User, 1)
worker.login = "New Name"

session.flush()   # отправляет изменения, но не фиксирует
session.commit()  # подтверждает окончательно
```

## Получение данных

### Через select()

```python
from sqlalchemy import select

stmt = select(User)
result = session.execute(stmt)
users = result.scalars().all()
```

> `.scalars()` — чтобы получать сразу объекты User, а не кортежи.

### Через ORM-объект

```python
worker = session.get(User, 1)
```

или

```python
worker = session.get(User, {"user_id": 1})
```

## Удаление данных

```python
worker = session.get(User, 1)
session.delete(worker)
session.commit()
```

## Асинхронный ORM (кратко)

```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

engine = create_async_engine(settings.DATABASE_URL_asyncpg)

AsyncSessionFactory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async with AsyncSessionFactory() as session:
    result = await session.execute(select(User))
    users = result.scalars().all()
```

## Полезные советы

* **echo=True** в create_engine помогает видеть SQL-запросы.
* Для массивных вставок используйте Core `insert()`.
* В ORM лучше всегда использовать:
    * `.scalars()` для получения объектов
    * `.commit()` — без него ORM ничего не запишет
* `session.flush()` нужен только если объект должен получить ID до коммита.
* Для больших проектов — обязательно добавляйте миграции через **Alembic**.
