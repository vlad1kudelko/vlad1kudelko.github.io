---
title: "FastAPI + JWT: аутентификация"
description: "Руководство по реализации аутентификации с использованием JWT токенов в FastAPI: настройка, примеры кода, безопасность."
heroImage: "/imgs/2025/07/fastapi-jwt-authentication.webp"
pubDate: "2025-07-08"
---

# FastAPI + JWT: аутентификация

**JWT (JSON Web Token)** — это открытый стандарт для создания токенов доступа, который позволяет безопасно передавать информацию между сторонами в виде JSON-объекта. В сочетании с FastAPI JWT обеспечивает надёжную и масштабируемую систему аутентификации, идеально подходящую для современных API. В этой статье мы рассмотрим, как реализовать полноценную систему аутентификации с использованием JWT токенов в FastAPI.

## 1. Что такое JWT и зачем он нужен

JWT (JSON Web Token) — это открытый стандарт RFC 7519, который определяет компактный и самодостаточный способ безопасной передачи информации между сторонами в виде JSON-объекта. Эта информация может быть проверена и доверена, поскольку она цифрово подписана.

### Структура JWT токена

JWT состоит из трёх частей, разделённых точками (`.`):

1. **Header** — содержит метаданные о токене:
   - Тип токена (`typ: "JWT"`)
   - Алгоритм подписи (`alg: "HS256"`, `RS256` и др.)

2. **Payload** — содержит данные (claims) о пользователе и токене:
   - **Registered claims** — стандартные поля: `iss` (издатель), `exp` (время истечения), `sub` (субъект)
   - **Public claims** — пользовательские данные: `user_id`, `username`, `roles`
   - **Private claims** — внутренние данные приложения

3. **Signature** — цифровая подпись для проверки подлинности и целостности данных

### Пример JWT токена
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### Преимущества JWT перед традиционными сессиями

**Stateless архитектура** — сервер не хранит информацию о сессиях в памяти или базе данных. Это означает, что каждый запрос содержит всю необходимую информацию для аутентификации, что значительно упрощает масштабирование приложения.

**Масштабируемость** — поскольку сервер не хранит состояние сессий, легко распределять нагрузку между несколькими серверами. Пользователь может обращаться к любому серверу в кластере, и аутентификация будет работать одинаково.

**Безопасность** — токены подписываются криптографическими алгоритмами (HMAC, RSA), что гарантирует их целостность. Дополнительно можно установить время жизни токена, после которого он становится недействительным.

**Универсальность** — JWT работает с любыми типами клиентов: веб-приложения, мобильные приложения, десктопные программы. Токен можно передавать через заголовки HTTP, cookies или в теле запроса.

**Производительность** — отсутствие необходимости обращаться к базе данных для проверки сессии на каждом запросе значительно повышает скорость работы API.

## 2. Установка необходимых зависимостей

Для работы с JWT в FastAPI потребуются дополнительные библиотеки, которые не включены в базовую установку FastAPI. Каждая библиотека выполняет свою специфическую роль в системе аутентификации.

```bash
pip install fastapi uvicorn python-jose[cryptography] passlib[bcrypt] python-multipart
```

### Подробное описание зависимостей

**`fastapi`** — основной веб-фреймворк, который мы используем для создания API. Он предоставляет все необходимые инструменты для создания эндпоинтов, валидации данных и автоматической генерации документации.

**`uvicorn`** — ASGI-сервер, необходимый для запуска FastAPI приложений. Это быстрый и современный сервер, который поддерживает асинхронные операции и WebSocket соединения.

**`python-jose[cryptography]`** — библиотека для работы с JWT токенами. Она предоставляет функции для создания, подписи, проверки и декодирования JWT токенов. Опция `[cryptography]` включает дополнительные криптографические алгоритмы для более надёжной защиты.

**`passlib[bcrypt]`** — библиотека для хэширования паролей. Она предоставляет безопасные алгоритмы хэширования и функции для проверки паролей. Опция `[bcrypt]` включает алгоритм bcrypt, который считается одним из самых безопасных для хэширования паролей.

**`python-multipart`** — библиотека для обработки multipart/form-data запросов. Она необходима для работы с формами, включая OAuth2PasswordRequestForm, которая используется для получения логина и пароля пользователя.

### Альтернативные варианты установки

Если вы используете Poetry для управления зависимостями:

```bash
poetry add fastapi uvicorn python-jose[cryptography] passlib[bcrypt] python-multipart
```

Или если используете pipenv:

```bash
pipenv install fastapi uvicorn python-jose[cryptography] passlib[bcrypt] python-multipart
```

### Проверка установки

После установки можно проверить, что все библиотеки работают корректно:

```python
import fastapi
import uvicorn
from jose import jwt
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer

print("Все зависимости установлены успешно!")
```

## 3. Базовая структура проекта

Правильная организация кода — ключ к созданию масштабируемых и поддерживаемых приложений. Для демонстрации JWT аутентификации мы создадим простую, но хорошо структурированную архитектуру проекта.

### Структура файлов

```
app/
├── main.py          # Основной файл приложения с эндпоинтами
├── models.py        # SQLAlchemy модели данных
├── schemas.py       # Pydantic схемы для валидации
├── auth.py          # Функции аутентификации и JWT
└── database.py      # Настройка подключения к базе данных
```

### Объяснение назначения каждого файла

**`main.py`** — точка входа в приложение. Здесь определяются все API эндпоинты, настройки FastAPI и основная логика приложения. Этот файл содержит маршруты для регистрации, входа и защищённые эндпоинты.

**`models.py`** — содержит SQLAlchemy модели, которые описывают структуру таблиц в базе данных. В нашем случае здесь будет определена модель User с полями для хранения информации о пользователях.

**`schemas.py`** — Pydantic схемы для валидации входящих и исходящих данных. Эти схемы обеспечивают автоматическую проверку типов данных, сериализацию и десериализацию JSON.

**`auth.py`** — модуль, содержащий всю логику аутентификации: функции для работы с паролями, создания и проверки JWT токенов, а также зависимости для защиты эндпоинтов.

**`database.py`** — настройки подключения к базе данных, создание сессий и конфигурация SQLAlchemy. Этот файл обеспечивает абстракцию над базой данных.

### Принципы организации кода

1. **Разделение ответственности** — каждый файл отвечает за свою область функциональности
2. **Модульность** — код легко тестировать и переиспользовать
3. **Читаемость** — понятная структура упрощает понимание кода
4. **Масштабируемость** — легко добавлять новые функции и модули

Такая структура позволяет легко расширять приложение, добавляя новые модели, схемы и эндпоинты, не нарушая существующую архитектуру.

## 4. Модели данных

Модели данных — это основа любого приложения, работающего с базой данных. В FastAPI мы используем SQLAlchemy для определения структуры таблиц и связей между ними. Модели описывают, как данные будут храниться в базе данных и как с ними можно работать в коде.

### Создание файла models.py

Создайте файл `models.py` со следующим содержимым:

```python
from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
```

### Подробное объяснение модели User

**`__tablename__ = "users"`** — указывает SQLAlchemy, что эта модель соответствует таблице с именем "users" в базе данных. Это позволяет использовать более понятные имена таблиц, не зависящие от названия класса.

**`id = Column(Integer, primary_key=True, index=True)`** — первичный ключ таблицы. Поле `id` автоматически увеличивается при добавлении новых записей. Параметр `index=True` создаёт индекс для ускорения поиска по этому полю.

**`email = Column(String, unique=True, index=True)`** — поле для хранения email пользователя. Параметр `unique=True` гарантирует, что в базе данных не будет двух пользователей с одинаковым email. Индекс ускоряет поиск пользователей по email.

**`username = Column(String, unique=True, index=True)`** — уникальное имя пользователя. Как и email, это поле должно быть уникальным, чтобы избежать конфликтов при регистрации.

**`hashed_password = Column(String)`** — хэшированный пароль пользователя. Важно: мы никогда не храним пароли в открытом виде! Пароли всегда хэшируются перед сохранением в базу данных.

**`is_active = Column(Boolean, default=True)`** — флаг активности пользователя. Позволяет деактивировать пользователей без их удаления из базы данных. По умолчанию все новые пользователи активны.

### Дополнительные поля для расширенной функциональности

Если вам нужна более сложная система пользователей, можно добавить дополнительные поля:

```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    
    # Дополнительные поля
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
```

### Важные принципы проектирования моделей

1. **Безопасность** — никогда не храните чувствительные данные в открытом виде
2. **Уникальность** — используйте уникальные ограничения для полей, которые должны быть уникальными
3. **Индексы** — создавайте индексы для полей, по которым часто выполняется поиск
4. **Нулевые значения** — явно указывайте, какие поля могут быть пустыми
5. **Временные метки** — добавляйте поля для отслеживания времени создания и обновления записей

## 5. Pydantic схемы

Pydantic схемы — это мощный инструмент FastAPI для валидации данных, сериализации и автоматической генерации документации API. Они обеспечивают типобезопасность и автоматическую проверку входящих данных, что значительно снижает количество ошибок в приложении.

### Создание файла schemas.py

Создайте файл `schemas.py` для валидации данных:

```python
from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
```

### Подробное объяснение схем

**`UserBase`** — базовая схема, содержащая общие поля для всех операций с пользователями. Наследование от `BaseModel` даёт нам автоматическую валидацию данных и сериализацию в JSON. Поле `email` использует тип `EmailStr`, который автоматически проверяет корректность email адреса.

**`UserCreate`** — схема для создания нового пользователя. Наследуется от `UserBase` и добавляет поле `password`. Эта схема используется при регистрации пользователей, когда нам нужно получить пароль от клиента.

**`User`** — схема для ответа API, содержащая информацию о пользователе. Включает поле `id` и `is_active`, но не содержит пароль (по соображениям безопасности). Класс `Config` с `from_attributes = True` позволяет Pydantic работать с SQLAlchemy объектами.

**`Token`** — схема для JWT токена. Содержит сам токен (`access_token`) и его тип (`token_type`), который обычно равен "bearer".

**`TokenData`** — схема для данных, хранящихся внутри JWT токена. В нашем случае содержит только `username`, но может быть расширена дополнительными полями.

### Дополнительные схемы для расширенной функциональности

Для более сложных приложений можно добавить дополнительные схемы:

```python
from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from datetime import datetime

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    username: str
    password: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str
    
    @validator('new_password')
    def validate_password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Пароль должен содержать минимум 8 символов')
        return v
```

### Преимущества использования Pydantic схем

1. **Автоматическая валидация** — данные проверяются на соответствие типам и ограничениям
2. **Безопасность** — предотвращает передачу нежелательных данных
3. **Документация** — автоматически генерируется OpenAPI документация
4. **Типобезопасность** — IDE может предоставлять автодополнение и проверку типов
5. **Сериализация** — автоматическое преобразование в JSON и обратно

### Валидаторы и ограничения

Pydantic позволяет добавлять кастомные валидаторы:

```python
from pydantic import BaseModel, validator

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    
    @validator('username')
    def username_alphanumeric(cls, v):
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Имя пользователя должно содержать только буквы, цифры, _ и -')
        return v
    
    @validator('password')
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError('Пароль должен содержать минимум 8 символов')
        return v
```

## 6. Настройка базы данных

Настройка базы данных — критически важный этап в создании любого веб-приложения. SQLAlchemy предоставляет мощный ORM (Object-Relational Mapping), который позволяет работать с базой данных, используя Python объекты вместо прямых SQL запросов.

### Создание файла database.py

Создайте файл `database.py`:

```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### Подробное объяснение настроек базы данных

**`SQLALCHEMY_DATABASE_URL`** — строка подключения к базе данных. В нашем примере используется SQLite для простоты, но в продакшене рекомендуется использовать PostgreSQL или MySQL. Формат строки подключения: `dialect+driver://username:password@host:port/database`.

**`create_engine()`** — создаёт движок SQLAlchemy, который управляет подключениями к базе данных. Параметр `connect_args={"check_same_thread": False}` необходим для SQLite, чтобы разрешить использование в многопоточных приложениях.

**`SessionLocal`** — фабрика сессий базы данных. Сессия — это объект, который управляет транзакциями и предоставляет интерфейс для работы с базой данных. Параметры:
- `autocommit=False` — отключает автоматическое подтверждение транзакций
- `autoflush=False` — отключает автоматическую синхронизацию с базой данных

**`Base`** — базовый класс для всех моделей SQLAlchemy. Все наши модели будут наследоваться от этого класса.

**`get_db()`** — функция-генератор, которая создаёт сессию базы данных для каждого запроса. Использует `yield` для предоставления сессии и автоматически закрывает её после использования.

### Подключение к различным базам данных

#### PostgreSQL
```python
SQLALCHEMY_DATABASE_URL = "postgresql://user:password@localhost/dbname"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
```

#### MySQL
```python
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://user:password@localhost/dbname"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
```

#### SQLite (для разработки)
```python
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False}
)
```

### Использование переменных окружения

В продакшене рекомендуется использовать переменные окружения для конфигурации базы данных:

```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### Миграции базы данных

Для управления изменениями схемы базы данных рекомендуется использовать Alembic:

```bash
pip install alembic
alembic init alembic
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

### Мониторинг и логирование

Для отладки и мониторинга можно включить логирование SQL запросов:

```python
import logging

# Настройка логирования SQLAlchemy
logging.basicConfig()
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
```

### Оптимизация производительности

Для высоконагруженных приложений рекомендуется использовать пул соединений:

```python
from sqlalchemy.pool import QueuePool

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=30,
    pool_pre_ping=True
)
```

## 7. Функции для работы с паролями и JWT

Модуль аутентификации — это сердце системы безопасности приложения. Здесь мы реализуем все функции, необходимые для безопасной работы с паролями, создания и проверки JWT токенов, а также защиты эндпоинтов.

### Создание файла auth.py

Создайте файл `auth.py`:

```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import TokenData

# Настройки безопасности
SECRET_KEY = "ваш_секретный_ключ_здесь"  # В продакшене используйте переменные окружения
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str, credentials_exception):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    return token_data

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    token_data = verify_token(token, credentials_exception)
    user = db.query(User).filter(User.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Неактивный пользователь")
    return current_user
```

### Подробное объяснение настроек безопасности

**`SECRET_KEY`** — секретный ключ для подписи JWT токенов. Это критически важный параметр безопасности. В продакшене должен быть длинным, случайным и храниться в переменных окружения. Рекомендуется использовать минимум 32 символа.

**`ALGORITHM`** — алгоритм подписи токенов. HS256 (HMAC с SHA-256) — наиболее распространённый и безопасный алгоритм для JWT. Альтернативы: RS256 (RSA), ES256 (ECDSA).

**`ACCESS_TOKEN_EXPIRE_MINUTES`** — время жизни токена доступа в минутах. Короткое время жизни (15-60 минут) повышает безопасность, но требует частого обновления токенов.

**`pwd_context`** — контекст для хэширования паролей. Использует bcrypt — один из самых безопасных алгоритмов хэширования паролей. Параметр `deprecated="auto"` автоматически обновляет устаревшие хэши.

**`oauth2_scheme`** — схема OAuth2 для получения токена из заголовка Authorization. Указывает URL эндпоинта для получения токена.

### Функции для работы с паролями

**`verify_password(plain_password, hashed_password)`** — проверяет соответствие открытого пароля его хэшу. Использует безопасные алгоритмы сравнения, устойчивые к timing attacks.

**`get_password_hash(password)`** — создаёт безопасный хэш пароля с использованием bcrypt. Включает соль (salt) для защиты от rainbow table атак.

### Функции для работы с JWT токенами

**`create_access_token(data, expires_delta)`** — создаёт JWT токен с указанными данными и временем жизни. Процесс создания токена:
1. Копирование данных пользователя
2. Добавление времени истечения токена
3. Подпись токена секретным ключом
4. Кодирование в base64

**`verify_token(token, credentials_exception)`** — проверяет и декодирует JWT токен. Выполняет следующие проверки:
1. Валидность подписи токена
2. Наличие обязательных полей (например, `sub` для субъекта)
3. Время жизни токена (проверяется автоматически)

### Зависимости для защиты эндпоинтов

**`get_current_user()`** — зависимость, которая извлекает текущего пользователя из JWT токена. Процесс работы:
1. Получение токена из заголовка Authorization
2. Проверка и декодирование токена
3. Поиск пользователя в базе данных
4. Возврат объекта пользователя или ошибки аутентификации

**`get_current_active_user()`** — дополнительная проверка активности пользователя. Позволяет деактивировать пользователей без их удаления из базы данных.

### Дополнительные функции безопасности

Для более сложных приложений можно добавить дополнительные функции:

```python
def create_refresh_token(data: dict):
    """Создание refresh токена с длительным временем жизни"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_refresh_token(token: str):
    """Проверка refresh токена"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Неверный тип токена")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Неверный токен")

async def get_current_user_with_roles(current_user: User = Depends(get_current_user)):
    """Получение пользователя с проверкой ролей"""
    if not hasattr(current_user, 'roles') or not current_user.roles:
        raise HTTPException(status_code=403, detail="Недостаточно прав")
    return current_user
```

### Обработка ошибок безопасности

Важно правильно обрабатывать различные типы ошибок аутентификации:

```python
from fastapi import HTTPException, status

class AuthenticationError(HTTPException):
    def __init__(self, detail: str = "Ошибка аутентификации"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"}
        )

class AuthorizationError(HTTPException):
    def __init__(self, detail: str = "Недостаточно прав"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )
```

## 8. Основное приложение

Основное приложение — это точка входа в нашу систему аутентификации. Здесь мы определяем все API эндпоинты, настраиваем FastAPI и реализуем бизнес-логику приложения. Каждый эндпоинт выполняет определённую функцию в системе аутентификации.

### Создание файла main.py

Создайте файл `main.py`:

```python
from datetime import timedelta
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from database import engine, get_db
from models import Base, User
from schemas import UserCreate, User as UserSchema, Token
from auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_active_user, ACCESS_TOKEN_EXPIRE_MINUTES
)

# Создание таблиц
Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.post("/register", response_model=UserSchema)
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Проверка существования пользователя
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email уже зарегистрирован")
    
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Имя пользователя уже занято")
    
    # Создание нового пользователя
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        username=user.username,
        hashed_password=hashed_password
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    # Аутентификация пользователя
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверное имя пользователя или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Создание токена доступа
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me", response_model=UserSchema)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@app.get("/protected")
async def protected_route(current_user: User = Depends(get_current_active_user)):
    return {"message": f"Привет, {current_user.username}! Это защищённый маршрут."}
```

### Подробное объяснение инициализации приложения

**`Base.metadata.create_all(bind=engine)`** — создаёт все таблицы в базе данных на основе определённых моделей SQLAlchemy. Это удобно для разработки, но в продакшене рекомендуется использовать миграции (Alembic).

**`app = FastAPI()`** — создание экземпляра FastAPI приложения. Здесь можно добавить дополнительные настройки, такие как заголовки CORS, middleware и метаданные.

### Эндпоинт регистрации пользователей

**`@app.post("/register", response_model=UserSchema)`** — эндпоинт для регистрации новых пользователей. Процесс регистрации включает:

1. **Валидация данных** — Pydantic автоматически проверяет входящие данные на соответствие схеме `UserCreate`
2. **Проверка уникальности** — проверяется, что email и username ещё не используются
3. **Хэширование пароля** — пароль хэшируется перед сохранением в базу данных
4. **Создание пользователя** — новый пользователь сохраняется в базу данных
5. **Возврат данных** — возвращается информация о созданном пользователе (без пароля)

### Эндпоинт аутентификации

**`@app.post("/token", response_model=Token)`** — эндпоинт для получения JWT токена. Использует стандартную форму OAuth2 для получения логина и пароля. Процесс аутентификации:

1. **Получение данных** — логин и пароль из формы OAuth2
2. **Поиск пользователя** — поиск пользователя по username в базе данных
3. **Проверка пароля** — сравнение хэша пароля с хэшем в базе данных
4. **Создание токена** — генерация JWT токена с данными пользователя
5. **Возврат токена** — возврат токена в формате OAuth2

### Защищённые эндпоинты

**`@app.get("/users/me", response_model=UserSchema)`** — эндпоинт для получения информации о текущем пользователе. Защищён зависимостью `get_current_active_user`, которая:

1. Извлекает токен из заголовка Authorization
2. Проверяет валидность токена
3. Находит пользователя в базе данных
4. Проверяет активность пользователя
5. Возвращает информацию о пользователе

**`@app.get("/protected")`** — пример защищённого эндпоинта, доступного только аутентифицированным пользователям.

### Дополнительные эндпоинты для расширенной функциональности

Для более сложных приложений можно добавить дополнительные эндпоинты:

```python
@app.put("/users/me", response_model=UserSchema)
async def update_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Обновление профиля пользователя"""
    for field, value in user_update.dict(exclude_unset=True).items():
        setattr(current_user, field, value)
    
    db.commit()
    db.refresh(current_user)
    return current_user

@app.post("/refresh")
async def refresh_token(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    """Обновление токена доступа"""
    try:
        payload = verify_refresh_token(refresh_token)
        username = payload.get("sub")
        user = db.query(User).filter(User.username == username).first()
        
        if not user or not user.is_active:
            raise HTTPException(status_code=401, detail="Недействительный токен")
        
        access_token = create_access_token(data={"sub": username})
        return {"access_token": access_token, "token_type": "bearer"}
    except Exception:
        raise HTTPException(status_code=401, detail="Недействительный refresh токен")

@app.delete("/users/me")
async def delete_user(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Удаление пользователя"""
    db.delete(current_user)
    db.commit()
    return {"message": "Пользователь удалён"}
```

### Обработка ошибок и валидация

FastAPI автоматически обрабатывает многие типы ошибок, но можно добавить кастомные обработчики:

```python
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "status_code": exc.status_code
        }
    )

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=400,
        content={"detail": str(exc)}
    )
```

### Настройка CORS и middleware

Для работы с фронтендом может потребоваться настройка CORS:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Разрешённые домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 9. Тестирование API

Тестирование — важная часть разработки любого API. Правильное тестирование помогает убедиться, что все функции работают корректно и безопасно. В этом разделе мы рассмотрим различные способы тестирования нашего API аутентификации.

### Запуск сервера

Сначала запустите сервер разработки:

```bash
uvicorn main:app --reload
```

Флаг `--reload` автоматически перезапускает сервер при изменении кода, что очень удобно для разработки. Сервер будет доступен по адресу `http://localhost:8000`.

### Тестирование с помощью curl

Curl — это мощный инструмент командной строки для тестирования HTTP запросов. Рассмотрим основные сценарии тестирования:

#### 1. Регистрация нового пользователя

```bash
curl -X POST "http://localhost:8000/register" \
     -H "Content-Type: application/json" \
     -d '{"email": "user@example.com", "username": "testuser", "password": "password123"}'
```

**Ожидаемый ответ:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "testuser",
  "is_active": true
}
```

**Возможные ошибки:**
- `400 Bad Request` — если email или username уже существуют
- `422 Unprocessable Entity` — если данные не прошли валидацию

#### 2. Получение JWT токена (аутентификация)

```bash
curl -X POST "http://localhost:8000/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=testuser&password=password123"
```

**Ожидаемый ответ:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Возможные ошибки:**
- `401 Unauthorized` — если логин или пароль неверны

#### 3. Доступ к защищённому маршруту

```bash
curl -X GET "http://localhost:8000/protected" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Замените `YOUR_TOKEN_HERE` на токен, полученный в предыдущем шаге.

**Ожидаемый ответ:**
```json
{
  "message": "Привет, testuser! Это защищённый маршрут."
}
```

**Возможные ошибки:**
- `401 Unauthorized` — если токен отсутствует или недействителен
- `400 Bad Request` — если пользователь неактивен

#### 4. Получение информации о текущем пользователе

```bash
curl -X GET "http://localhost:8000/users/me" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Ожидаемый ответ:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "username": "testuser",
  "is_active": true
}
```

### Тестирование с помощью Python requests

Для более удобного тестирования можно использовать библиотеку `requests`:

```python
import requests

BASE_URL = "http://localhost:8000"

# Регистрация пользователя
def test_register():
    data = {
        "email": "test@example.com",
        "username": "testuser",
        "password": "password123"
    }
    response = requests.post(f"{BASE_URL}/register", json=data)
    print(f"Register: {response.status_code}")
    print(response.json())

# Получение токена
def test_login():
    data = {
        "username": "testuser",
        "password": "password123"
    }
    response = requests.post(f"{BASE_URL}/token", data=data)
    print(f"Login: {response.status_code}")
    return response.json().get("access_token")

# Тестирование защищённого маршрута
def test_protected(token):
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/protected", headers=headers)
    print(f"Protected: {response.status_code}")
    print(response.json())

# Запуск тестов
if __name__ == "__main__":
    test_register()
    token = test_login()
    if token:
        test_protected(token)
```

### Тестирование с помощью Postman

Postman — это популярный GUI инструмент для тестирования API:

1. **Создайте коллекцию** для вашего API
2. **Настройте переменные окружения** для хранения токена
3. **Создайте запросы** для каждого эндпоинта
4. **Настройте автоматическое извлечение токена** из ответа

### Автоматизированное тестирование с pytest

Для более серьёзного тестирования создайте файл `test_main.py`:

```python
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_register():
    response = client.post("/register", json={
        "email": "test@example.com",
        "username": "testuser",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["username"] == "testuser"
    assert "password" not in data

def test_login():
    response = client.post("/token", data={
        "username": "testuser",
        "password": "password123"
    })
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_protected_route():
    # Сначала получаем токен
    login_response = client.post("/token", data={
        "username": "testuser",
        "password": "password123"
    })
    token = login_response.json()["access_token"]
    
    # Тестируем защищённый маршрут
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/protected", headers=headers)
    assert response.status_code == 200
    assert "message" in response.json()

def test_invalid_token():
    headers = {"Authorization": "Bearer invalid_token"}
    response = client.get("/protected", headers=headers)
    assert response.status_code == 401
```

### Тестирование ошибок и граничных случаев

Важно протестировать не только успешные сценарии, но и обработку ошибок:

```bash
# Попытка регистрации с существующим email
curl -X POST "http://localhost:8000/register" \
     -H "Content-Type: application/json" \
     -d '{"email": "user@example.com", "username": "newuser", "password": "password123"}'

# Попытка входа с неверным паролем
curl -X POST "http://localhost:8000/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=testuser&password=wrongpassword"

# Доступ к защищённому маршруту без токена
curl -X GET "http://localhost:8000/protected"

# Доступ с недействительным токеном
curl -X GET "http://localhost:8000/protected" \
     -H "Authorization: Bearer invalid_token"
```

### Проверка документации API

FastAPI автоматически генерирует интерактивную документацию:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

Эти интерфейсы позволяют тестировать API прямо в браузере, что очень удобно для разработки и демонстрации.

## 10. Безопасность и лучшие практики

### Хранение секретных ключей
Никогда не храните секретные ключи в коде. Используйте переменные окружения:

```python
import os
from dotenv import load_dotenv

load_dotenv()
SECRET_KEY = os.getenv("SECRET_KEY")
```

### Обновление токенов
Для долгосрочной аутентификации используйте refresh токены:

```python
def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt
```

### Валидация токенов
Всегда проверяйте время жизни токена и подпись:

```python
def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Токен истёк")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Неверный токен")
```

## 11. Обработка ошибок

Добавьте глобальные обработчики ошибок:

```python
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )
```

## 12. Документация API

FastAPI автоматически генерирует документацию. Откройте:
- [http://localhost:8000/docs](http://localhost:8000/docs) — Swagger UI
- [http://localhost:8000/redoc](http://localhost:8000/redoc) — ReDoc

## Заключение

JWT аутентификация в FastAPI предоставляет мощное и гибкое решение для защиты API. Основные преимущества:

- **Stateless архитектура** — не требует хранения сессий на сервере
- **Масштабируемость** — легко распределять нагрузку
- **Безопасность** — токены подписываются и имеют время жизни
- **Простота интеграции** — работает с любыми клиентами

При реализации JWT аутентификации помните о безопасности: используйте HTTPS, храните секретные ключи в переменных окружения, устанавливайте разумное время жизни токенов и регулярно обновляйте зависимости.

## Полезные ссылки

- [Официальная документация FastAPI](https://fastapi.tiangolo.com/ru/)
- [JWT.io — отладчик токенов](https://jwt.io/)
- [Python-Jose документация](https://python-jose.readthedocs.io/)
- [Passlib документация](https://passlib.readthedocs.io/) 
