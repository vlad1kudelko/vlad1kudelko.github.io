---
title: "Dependency injection — FastAPI Depends, injector"
description: "Внедрите Dependency injection: FastAPI Depends, injector для управления зависимостями. Управляйте зависимостями в приложении правильно."
pubDate: "2026-02-27"
---

# Dependency injection: FastAPI Depends

Dependency Injection (DI) — паттерн, при котором зависимости компонента передаются извне, а не создаются внутри. Это делает код тестируемым, гибким и явным. FastAPI реализует DI через систему `Depends`, которая стала одной из главных причин его популярности.

## Зачем нужен DI?

Без DI функции сами создают свои зависимости:

```python
# Плохо: тяжело тестировать, жёсткая связность
async def get_user(user_id: int):
    db = Database('postgresql://...')  # зависимость внутри
    return await db.query(f'SELECT * FROM users WHERE id = {user_id}')
```

С DI зависимость передаётся снаружи:

```python
# Хорошо: зависимость явная, легко подменить в тестах
async def get_user(user_id: int, db: Database = Depends(get_database)):
    return await db.get_user(user_id)
```

## FastAPI Depends: основы

```python
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

app = FastAPI()

# Зависимость — обычная функция или async-генератор
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session  # yield = cleanup после запроса

# Использование в эндпоинте
@app.get('/users/{user_id}')
async def read_user(user_id: int, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404)
    return user
```

FastAPI автоматически вызывает `get_db`, передаёт сессию в обработчик, и после ответа выполняет cleanup (`yield` → конец блока `async with`).

## Цепочки зависимостей

Зависимости могут зависеть от других зависимостей:

```python
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> str:
    return credentials.credentials

async def get_current_user(
    token: str = Depends(get_token),
    db: AsyncSession = Depends(get_db)
) -> User:
    user_id = verify_jwt_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail='Invalid token')
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    return user

async def get_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=403, detail='Inactive user')
    return current_user

# Эндпоинт получает готового пользователя
@app.get('/profile')
async def get_profile(user: User = Depends(get_active_user)):
    return user

@app.delete('/users/{user_id}')
async def delete_user(
    user_id: int,
    current_user: User = Depends(get_active_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != 'admin':
        raise HTTPException(status_code=403)
    await db.delete(await db.get(User, user_id))
    await db.commit()
```

FastAPI кешируют зависимости в рамках одного запроса. `get_db` будет вызван один раз, даже если используется в нескольких зависимостях одного эндпоинта.

## Class-based зависимости

Для зависимостей с параметрами удобно использовать классы:

```python
class Paginator:
    def __init__(self, page: int = 1, size: int = 20):
        self.offset = (page - 1) * size
        self.limit  = min(size, 100)  # максимум 100 элементов

@app.get('/posts')
async def list_posts(
    pagination: Paginator = Depends(),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Post).offset(pagination.offset).limit(pagination.limit)
    posts = (await db.execute(stmt)).scalars().all()
    return posts
```

`Depends()` без аргументов инжектирует сам класс `Paginator`.

## Зависимости для фоновых задач и кеша

```python
import redis.asyncio as redis
from functools import lru_cache

@lru_cache
def get_settings() -> Settings:
    return Settings()

async def get_redis() -> redis.Redis:
    client = redis.Redis(host='localhost', port=6379, decode_responses=True)
    try:
        yield client
    finally:
        await client.close()

@app.get('/stats/{key}')
async def get_stats(
    key: str,
    cache: redis.Redis = Depends(get_redis),
    settings: Settings = Depends(get_settings)
):
    cached = await cache.get(f'stats:{key}')
    if cached:
        return {'source': 'cache', 'data': cached}

    # ... вычисление данных ...
    await cache.setex(f'stats:{key}', settings.cache_ttl, result)
    return {'source': 'computed', 'data': result}
```

## Тестирование с DI

Главное преимущество DI — простая подмена зависимостей в тестах:

```python
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

# Тестовая база данных
test_engine = create_async_engine('sqlite+aiosqlite:///:memory:')
TestSessionLocal = async_sessionmaker(test_engine)

async def override_get_db():
    async with TestSessionLocal() as session:
        yield session

@pytest.fixture
async def client():
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(app=app, base_url='http://test') as c:
        yield c
    app.dependency_overrides.clear()

async def test_read_user(client: AsyncClient):
    response = await client.get('/users/1')
    assert response.status_code == 404
```

Одна строка `app.dependency_overrides[get_db] = override_get_db` — и все тесты используют in-memory SQLite вместо PostgreSQL. Никакого мокирования, реальная логика.

## Библиотека injector

Для более сложных случаев — корпоративных приложений с десятками зависимостей — есть `injector`:

```python
from injector import Injector, inject, singleton, Module

class DatabaseModule(Module):
    def configure(self, binder):
        binder.bind(Database, to=PostgresDatabase, scope=singleton)
        binder.bind(Cache, to=RedisCache, scope=singleton)

class UserService:
    @inject
    def __init__(self, db: Database, cache: Cache):
        self.db = db
        self.cache = cache

    async def get_user(self, user_id: int) -> User | None:
        cached = await self.cache.get(f'user:{user_id}')
        if cached:
            return User(**cached)
        user = await self.db.find_user(user_id)
        if user:
            await self.cache.set(f'user:{user_id}', user.dict(), ttl=300)
        return user

injector = Injector([DatabaseModule()])
user_service = injector.get(UserService)
```

`injector` полезен когда зависимости сложные, их много, и они имеют разные lifecycle'ы (singleton, request-scoped, transient).

`injector` появился из Java-мира и несёт этот стиль в Python. `dishka` — более свежая библиотека, спроектированная нативно под async Python и FastAPI: поддерживает scopes (request, session, app), работает с любым фреймворком через провайдеры, и не требует декораторов на каждом классе.
