---
title: "Dependency injection, FastAPI Depends, injector"
description: "Внедрите Dependency injection: FastAPI Depends, injector для управления зависимостями. Управляйте зависимостями в приложении правильно."
pubDate: "2026-02-27"
---

# Dependency injection: FastAPI Depends

FastAPI `Depends` решает три задачи сразу: автоматически вызывает функцию-зависимость при каждом запросе, кеширует результат в рамках одного запроса и выполняет cleanup после ответа. Это делает авторизацию, подключение к БД и валидацию конфигурации декларативными -- без ручного управления lifecycle.

Dependency Injection (DI) -- паттерн, при котором зависимости компонента передаются извне, а не создаются внутри. Без DI функции сами инициализируют БД, создают HTTP-клиенты, читают конфиг. Это делает код нетестируемым: чтобы подменить зависимость в тестах, нужно мокировать. С DI зависимость явная и заменяемая.

> **Key Takeaways**
> - FastAPI кеширует зависимости в рамках одного запроса: `get_db` вызывается один раз, даже если используется в 5 зависимостях
> - `yield` в зависимости обеспечивает cleanup: код после `yield` выполняется после отправки ответа
> - `app.dependency_overrides[get_db] = override_get_db` подменяет зависимость в тестах без мокирования
> - Class-based зависимости с параметрами: `Depends()` без аргументов инжектирует сам класс
> - `dishka` -- современная альтернатива `injector` для сложных приложений, спроектированная под async Python

---

Разработчик Коля писал тесты для FastAPI-сервиса. Проблема: каждый тест реально ходил в PostgreSQL, тесты зависели от состояния БД, запускались 2 минуты. Переписал `get_db` как зависимость через `Depends`, добавил одну строку в фикстуру: `app.dependency_overrides[get_db] = override_get_db` с in-memory SQLite. Все эндпоинты автоматически стали использовать тестовую БД. Время тестов -- 8 секунд. Реальный PostgreSQL в тестах стал нужен только для интеграционных тестов, которых было 5 из 80.

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

Разница не только в тестируемости. С явными зависимостями читающий код сразу понимает, что нужно функции. Нет скрытых инициализаций, нет глобальных переменных, нет side effects при импорте.

## FastAPI Depends: основы

```python
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

app = FastAPI()

# Зависимость, обычная функция или async-генератор
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

FastAPI автоматически вызывает `get_db`, передаёт сессию в обработчик, и после ответа выполняет cleanup (`yield` → конец блока `async with`). Cleanup выполняется даже если в обработчике выброшено исключение.

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

FastAPI кеширует зависимости в рамках одного запроса. `get_db` будет вызван один раз, даже если используется в нескольких зависимостях одного эндпоинта. `get_current_user` тоже вызывается один раз -- не нужно беспокоиться об эффективности глубоких цепочек.

---

Backend-команда добавляла RBAC в API с 40 эндпоинтами. Каждый эндпоинт нужно было защитить по-разному: одни только для admin, другие для admin и editor, третьи для любого авторизованного пользователя. Написали одну параметризованную зависимость `RequireRole(min_role='editor')` через class-based подход. Все 40 эндпоинтов обновили за 2 часа, добавив одну строку в сигнатуру. Логика авторизации в одном месте, не размазана по всему коду.

## Class-based зависимости

Для зависимостей с параметрами удобно использовать классы:

```python
class Paginator:
    def __init__(self, page: int = 1, size: int = 20):
        self.offset = (page - 1) * size
        self.limit = min(size, 100)  # максимум 100 элементов

@app.get('/posts')
async def list_posts(
    pagination: Paginator = Depends(),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Post).offset(pagination.offset).limit(pagination.limit)
    posts = (await db.execute(stmt)).scalars().all()
    return posts
```

`Depends()` без аргументов инжектирует сам класс `Paginator`. FastAPI читает параметры `__init__` как query-параметры запроса.

Более сложный вариант -- класс с методом `__call__`:

```python
class RequirePermission:
    def __init__(self, permission: str):
        self.permission = permission

    async def __call__(
        self,
        current_user: User = Depends(get_current_user)
    ) -> User:
        if self.permission not in current_user.permissions:
            raise HTTPException(status_code=403, detail=f'Required: {self.permission}')
        return current_user

# Использование
@app.delete('/posts/{post_id}')
async def delete_post(
    post_id: int,
    user: User = Depends(RequirePermission('posts:delete'))
):
    ...
```

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

`@lru_cache` на `get_settings` -- правильный паттерн. Настройки читаются из env один раз при первом вызове, дальше возвращается кешированный объект.

## Тестирование с DI

Главное преимущество DI -- простая подмена зависимостей в тестах:

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

Одна строка `app.dependency_overrides[get_db] = override_get_db` -- и все тесты используют in-memory SQLite вместо PostgreSQL. Никакого мокирования, реальная логика.

## Библиотека injector

Для более сложных случаев -- корпоративных приложений с десятками зависимостей -- есть `injector`:

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

`injector` появился из Java-мира и несёт этот стиль в Python. `dishka` -- более свежая библиотека, спроектированная нативно под async Python и FastAPI: поддерживает scopes (request, session, app), работает с любым фреймворком через провайдеры, не требует декораторов на каждом классе.

## Когда FastAPI Depends достаточно, когда нужен injector

Для большинства API-проектов `Depends` достаточно. Одна БД, Redis, конфиг, авторизация -- это закрывается без дополнительных библиотек. `injector` или `dishka` становятся полезными когда:

- Больше 20-30 зависимостей с разными lifecycle (singleton vs request-scoped)
- Нужна граф-зависимость: A зависит от B и C, B зависит от C
- Разные модули инжектируются в зависимости от окружения (dev/prod/test)
- Хочется единообразного DI вне контекста HTTP-запроса (фоновые задачи, CLI-команды)

## Итог

FastAPI `Depends` -- элегантное и прагматичное решение для DI в API. Цепочки зависимостей читаются как декларации, тестирование через `dependency_overrides` не требует мокирования. Для сложных приложений с многоуровневыми зависимостями `dishka` добавляет structured lifecycle management.

Следующая тема -- [PgBouncer и connection pooling для PostgreSQL](/posts/2026/02/28-connection-pooling-pgbouncer).
