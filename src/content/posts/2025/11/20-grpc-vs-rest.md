---
title: "gRPC vs REST: сравнение протоколов и выбор API для микросервисов"
description: "Сравниваем gRPC и REST: протоколы, производительность, бинарные vs текстовые форматы, streaming, кодогенерация и когда что использовать в продакшене."
heroImage: "../../../../assets/imgs/2025/11/20-grpc-vs-rest.webp"
pubDate: "2025-11-20"
---

# gRPC vs REST: выбор протокола для API

**REST (Representational State Transfer)** и **gRPC (gRPC Remote Procedure Calls)** — два популярных подхода к построению API для микросервисов и веб-приложений. REST доминировал более десяти лет, но gRPC набирает популярность для внутренних коммуникаций благодаря высокой производительности и строгой типизации.

В этой статье мы сравним оба протокола, разберём их преимущества и недостатки, и определим, когда что использовать.

## Архитектурные различия

### REST

**REST** — это архитектурный стиль, основанный на HTTP-методах и ресурсах.

```
┌─────────────┐     HTTP/JSON     ┌─────────────┐
│   Client    │ ────────────────▶ │   Server    │
│             │ ◀──────────────── │             │
└─────────────┘     HTTP/JSON     └─────────────┘

Методы: GET, POST, PUT, DELETE, PATCH
Формат: JSON, XML, текст
Коды состояния: 200, 201, 400, 404, 500...
```

**Пример REST запроса:**

```bash
# Получить пользователя
GET /api/users/123
Accept: application/json

# Ответ
HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": 123,
  "name": "Alice",
  "email": "alice@example.com"
}

# Создать заказ
POST /api/orders
Content-Type: application/json

{
  "user_id": 123,
  "items": [{"product_id": 1, "qty": 2}]
}
```

### gRPC

**gRPC** — это фреймворк удалённого вызова процедур от Google, использующий HTTP/2 и Protocol Buffers.

```
┌─────────────┐    HTTP/2 + Protobuf  ┌─────────────┐
│   Client    │ ────────────────────▶ │   Server    │
│  (stub)     │ ◀──────────────────── │  (handler)  │
└─────────────┘    HTTP/2 + Protobuf  └─────────────┘

Методы: унарные, server streaming, client streaming, bidirectional
Формат: Protocol Buffers (бинарный)
Статусы: OK, INVALID_ARGUMENT, NOT_FOUND, INTERNAL...
```

**Пример gRPC определения:**

```protobuf
// user.proto
syntax = "proto3";

package user;

service UserService {
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
  rpc CreateUser(CreateUserRequest) returns (CreateUserResponse);
  rpc ListUsers(ListUsersRequest) returns (stream User);
  rpc StreamUsers(stream User) returns (stream User);
}

message User {
  int32 id = 1;
  string name = 2;
  string email = 3;
}

message GetUserRequest {
  int32 id = 1;
}

message GetUserResponse {
  User user = 1;
}

message CreateUserRequest {
  string name = 1;
  string email = 2;
}

message CreateUserResponse {
  User user = 1;
}
```

## Protocol Buffers

**Protocol Buffers (Protobuf)** — бинарный формат сериализации от Google.

### Преимущества Protobuf

**Компактность** — бинарный формат в 3-10 раз меньше JSON:

```
JSON:  {"id": 123, "name": "Alice", "email": "alice@example.com"}
Размер: ~55 байт

Protobuf: \x08{\x12\x05Alice\x1a\x11alice@example.com
Размер: ~25 байт
```

**Скорость** — парсинг в 5-10 раз быстрее JSON:

```python
# JSON
import json
data = json.loads(json_string)  # Медленный парсинг текста

# Protobuf
from user_pb2 import User
user = User()
user.ParseFromString(binary_data)  # Быстрый бинарный парсинг
```

**Строгая типизация** — схема определяет типы данных:

```protobuf
message User {
  int32 id = 1;           // 32-битное целое
  int64 created_at = 2;   // 64-битное целое
  string name = 3;        // Строка
  bool active = 4;        // Булево
  repeated string tags = 5;  // Массив
  map<string, string> metadata = 6;  // Словарь
}
```

**Эволюция схемы** — обратная и прямая совместимость:

```protobuf
// Версия 1
message User {
  int32 id = 1;
  string name = 2;
}

// Версия 2 (совместима)
message User {
  int32 id = 1;
  string name = 2;
  string email = 3;      // Добавлено новое поле
  string phone = 4;      // Добавлено ещё одно
  // string old_field = 3;  // ❌ Нельзя переиспользовать номер
}
```

### Типы данных Protobuf

```protobuf
message Types {
  // Числа
  int32 age = 1;
  int64 timestamp = 2;
  uint32 count = 3;
  float price = 4;
  double precise = 5;
  sfixed32 fixed = 6;  // Signed fixed
  
  // Строки и байты
  string name = 7;
  bytes data = 8;
  
  // Булево
  bool active = 9;
  
  // Перечисления
  Status status = 10;
  
  // Массивы
  repeated string tags = 11;
  repeated Item items = 12;
  
  // Maps
  map<string, int32> scores = 13;
  
  // Oneof (одно из)
  oneof contact {
    string email = 14;
    string phone = 15;
  }
}

enum Status {
  STATUS_UNKNOWN = 0;
  STATUS_ACTIVE = 1;
  STATUS_INACTIVE = 2;
}

message Item {
  string name = 1;
  int32 quantity = 2;
}
```

## gRPC типы вызовов

### Унарный вызов (Unary)

Один запрос — один ответ. Аналог REST POST.

```python
# Сервер
class UserServiceServicer(UserServiceServicer):
    def GetUser(self, request, context):
        user = db.get_user(request.id)
        return GetUserResponse(user=user)

# Клиент
response = stub.GetUser(GetUserRequest(id=123))
print(response.user.name)
```

### Server streaming

Один запрос — поток ответов.

```protobuf
rpc ListOrders(ListOrdersRequest) returns (stream Order);
```

```python
# Клиент
for order in stub.ListOrders(ListOrdersRequest(user_id=123)):
    print(f"Order: {order.id}")
```

**Использование:** загрузка больших файлов, чаты, уведомления.

### Client streaming

Поток запросов — один ответ.

```protobuf
rpc UploadData(stream DataChunk) returns (UploadResponse);
```

```python
# Клиент
def generate_chunks():
    for chunk in file_chunks:
        yield DataChunk(data=chunk)

response = stub.UploadData(generate_chunks())
print(f"Uploaded: {response.total_bytes}")
```

**Использование:** загрузка файлов, потоковая запись данных.

### Bidirectional streaming

Двусторонний поток.

```protobuf
rpc Chat(stream ChatMessage) returns (stream ChatMessage);
```

```python
# Клиент
def chat_stream():
    while True:
        message = input("You: ")
        yield ChatMessage(text=message)

for response in stub.Chat(chat_stream()):
    print(f"Other: {response.text}")
```

**Использование:** чаты, онлайн-игры, collaborative editing.

## Производительность

### Сравнение размеров

```
Запрос: получить список из 100 пользователей

REST + JSON:
├─ Заголовки HTTP: ~500 байт
├─ Тело JSON: ~15 000 байт
└─ Итого: ~15 500 байт

gRPC + Protobuf:
├─ Заголовки HTTP/2: ~100 байт (HPACK сжатие)
├─ Тело Protobuf: ~3 000 байт
└─ Итого: ~3 100 байт

Экономия: ~5x меньше трафика
```

### Сравнение скорости

```python
import time
import json
import grpc

# REST JSON
start = time.time()
for _ in range(1000):
    response = requests.get('http://api/users')
    data = response.json()
rest_time = time.time() - start

# gRPC
start = time.time()
for _ in range(1000):
    response = stub.ListUsers(ListUsersRequest())
grpc_time = time.time() - start

print(f"REST: {rest_time:.2f}s")
print(f"gRPC: {grpc_time:.2f}s")
# gRPC обычно в 2-5 раз быстрее
```

### HTTP/1.1 vs HTTP/2

**HTTP/1.1 (REST):**
- Одно соединение — один запрос одновременно
- Head-of-line blocking
- Текстовые заголовки без сжатия

**HTTP/2 (gRPC):**
- Мультиплексирование (множество запросов в одном соединении)
- Двоичный протокол
- HPACK сжатие заголовков
- Server push

```
HTTP/1.1:
Client: GET /users ──┐
                     ├── Blocking
Client: GET /orders ─┘

HTTP/2:
Client: GET /users ──┐
Client: GET /orders ─┼── Multiplexed
Client: GET /items ──┘
```

## Реализация на Python

### REST с FastAPI

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class UserCreate(BaseModel):
    name: str
    email: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True

@app.post("/users", response_model=UserResponse)
def create_user(user: UserCreate):
    db_user = db.create_user(user.name, user.email)
    return db_user

@app.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int):
    user = db.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Запуск
# uvicorn main:app --reload
```

**Клиент REST:**

```python
import requests

# Создание пользователя
response = requests.post(
    'http://localhost:8000/users',
    json={'name': 'Alice', 'email': 'alice@example.com'}
)
user = response.json()

# Получение пользователя
response = requests.get(f'http://localhost:8000/users/{user["id"]}')
print(response.json())
```

### gRPC с grpcio

```python
# user.proto уже определён выше

# Генерация кода
# python -m grpc_tools.protoc -I. --python_out=. --grpc_python_out=. user.proto

# Сервер
from concurrent import futures
import grpc
import user_pb2
import user_pb2_grpc

class UserServiceServicer(user_pb2_grpc.UserServiceServicer):
    def GetUser(self, request, context):
        user = db.get_user(request.id)
        if not user:
            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details("User not found")
            return user_pb2.GetUserResponse()
        return user_pb2.GetUserResponse(
            user=user_pb2.User(
                id=user.id,
                name=user.name,
                email=user.email
            )
        )
    
    def CreateUser(self, request, context):
        user = db.create_user(request.name, request.email)
        return user_pb2.CreateUserResponse(
            user=user_pb2.User(
                id=user.id,
                name=user.name,
                email=user.email
            )
        )
    
    def ListUsers(self, request, context):
        for user in db.list_users():
            yield user_pb2.User(
                id=user.id,
                name=user.name,
                email=user.email
            )

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    user_pb2_grpc.add_UserServiceServicer_to_server(
        UserServiceServicer(), server
    )
    server.add_insecure_port('[::]:50051')
    server.start()
    server.wait_for_termination()

if __name__ == '__main__':
    serve()
```

**Клиент gRPC:**

```python
import grpc
import user_pb2
import user_pb2_grpc

def run():
    channel = grpc.insecure_channel('localhost:50051')
    stub = user_pb2_grpc.UserServiceStub(channel)
    
    # Унарный вызов
    response = stub.CreateUser(
        user_pb2.CreateUserRequest(
            name='Alice',
            email='alice@example.com'
        )
    )
    print(f"Created user: {response.user.name}")
    
    # Получение пользователя
    response = stub.GetUser(
        user_pb2.GetUserRequest(id=response.user.id)
    )
    print(f"User: {response.user}")
    
    # Streaming
    for user in stub.ListUsers(user_pb2.ListUsersRequest()):
        print(f"User: {user.name}")

if __name__ == '__main__':
    run()
```

## Обработка ошибок

### REST ошибки

```python
from fastapi import HTTPException

@app.get("/users/{user_id}")
def get_user(user_id: int):
    user = db.get_user(user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found",
            headers={"X-Error-Code": "USER_NOT_FOUND"}
        )
```

**HTTP статус коды:**
- `200 OK` — успех
- `201 Created` — ресурс создан
- `400 Bad Request` — ошибка валидации
- `401 Unauthorized` — не аутентифицирован
- `403 Forbidden` — нет доступа
- `404 Not Found` — ресурс не найден
- `409 Conflict` — конфликт (дубликат)
- `422 Unprocessable Entity` — ошибка валидации
- `500 Internal Server Error` — ошибка сервера

### gRPC ошибки

```python
import grpc

def GetUser(self, request, context):
    user = db.get_user(request.id)
    if not user:
        context.set_code(grpc.StatusCode.NOT_FOUND)
        context.set_details("User not found")
        return user_pb2.GetUserResponse()
    
    if not context.is_active():
        context.set_code(grpc.StatusCode.CANCELLED)
        return user_pb2.GetUserResponse()
    
    return user_pb2.GetUserResponse(user=user)
```

**gRPC статус коды:**
- `OK (0)` — успех
- `INVALID_ARGUMENT (3)` — невалидный аргумент
- `NOT_FOUND (5)` — ресурс не найден
- `ALREADY_EXISTS (6)` — уже существует
- `PERMISSION_DENIED (7)` — нет доступа
- `UNAUTHENTICATED (16)` — не аутентифицирован
- `INTERNAL (13)` — внутренняя ошибка
- `UNAVAILABLE (14)` — сервис недоступен
- `DEADLINE_EXCEEDED (4)` — таймаут

**Клиентская обработка:**

```python
try:
    response = stub.GetUser(request)
except grpc.RpcError as e:
    if e.code() == grpc.StatusCode.NOT_FOUND:
        print("User not found")
    elif e.code() == grpc.StatusCode.UNAVAILABLE:
        print("Service unavailable")
    elif e.code() == grpc.StatusCode.DEADLINE_EXCEEDED:
        print("Request timeout")
    else:
        print(f"Error: {e.code()} - {e.details()}")
```

## Интерсепторы (Middleware)

### gRPC интерсепторы

```python
class AuthInterceptor(grpc.ServerInterceptor):
    def intercept_service(self, continuation, handler_call_details):
        metadata = dict(handler_call_details.invocation_metadata)
        token = metadata.get('authorization')
        
        if not token or not validate_token(token):
            return grpc.unary_unary_rpc_method_handler(
                lambda req, ctx: ctx.abort(
                    grpc.StatusCode.UNAUTHENTICATED,
                    "Invalid token"
                )
            )
        
        return continuation(handler_call_details)

class LoggingInterceptor(grpc.ServerInterceptor):
    def intercept_service(self, continuation, handler_call_details):
        print(f"Method: {handler_call_details.method}")
        return continuation(handler_call_details)

# Регистрация
server = grpc.server(
    futures.ThreadPoolExecutor(),
    interceptors=[AuthInterceptor(), LoggingInterceptor()]
)
```

### REST middleware (FastAPI)

```python
from fastapi import FastAPI, Request
from fastapi.middleware import Middleware

@app.middleware("http")
async def log_requests(request: Request, call_next):
    print(f"Method: {request.method}, Path: {request.url.path}")
    response = await call_next(request)
    print(f"Status: {response.status_code}")
    return response
```

## Когда использовать REST

**✅ REST подходит для:**

**Публичные API** — стандарт де-факто, документация через OpenAPI/Swagger.

```
# Публичный API для внешних разработчиков
GET /api/v1/users
POST /api/v1/orders
```

**Простые CRUD приложения** — когда не нужна высокая производительность.

```python
# Блог, CMS, админка
GET /posts
POST /posts
PUT /posts/{id}
DELETE /posts/{id}
```

**Browser-based приложения** — нативная поддержка в браузерах.

```javascript
fetch('/api/users')
  .then(r => r.json())
  .then(data => console.log(data));
```

**Кэширование на уровне HTTP** — встроенная поддержка.

```
GET /users/123
Cache-Control: max-age=3600
ETag: "abc123"

# Следующий запрос с If-None-Match
GET /users/123
If-None-Match: "abc123"
# 304 Not Modified
```

## Когда использовать gRPC

**✅ gRPC подходит для:**

**Микросервисная архитектура** — внутренняя коммуникация между сервисами.

```
┌─────────────┐     gRPC    ┌─────────────┐
│ API Gateway │ ──────────▶ │ User Service│
└─────────────┘             └─────────────┘
                                    │
                                 gRPC
                                    ▼
                             ┌─────────────┐
                             │Order Service│
                             └─────────────┘
```

**Высокая производительность** — когда важна скорость и трафик.

```python
# Финтех, биржевые данные, real-time аналитика
# Миллионы запросов в секунду
```

**Streaming данные** — чаты, уведомления, live обновления.

```protobuf
rpc SubscribeOrders(SubscribeRequest) returns (stream Order);
rpc SendChatMessage(stream ChatMessage) returns (stream ChatMessage);
```

**Полиглот окружение** — код генерируется для многих языков.

```
.proto файл → Python, Go, Java, C++, Node.js, C#, Ruby, PHP
```

**Mobile приложения** — экономия трафика и батареи.

```
Mobile ←gRPC→ Backend
# Меньше трафика = меньше батарея
```

## Hybrid подход: gRPC + REST Gateway

```python
from grpc_gateway import GRPCGateway

# gRPC для внутренней коммуникации
# REST Gateway для внешних клиентов

┌─────────────┐     REST     ┌─────────────┐     gRPC    ┌─────────────┐
│   Client    │ ───────────▶ │   Gateway   │ ──────────▶ │   Service   │
│  (Browser)  │ ◀─────────── │ (Translates)│ ◀────────── │             │
└─────────────┘     JSON     └─────────────┘   Protobuf  └─────────────┘
```

**gRPC-Gateway (Go):**

```protobuf
service UserService {
  rpc GetUser(GetUserRequest) returns (User) {
    option (google.api.http) = {
      get: "/api/v1/users/{id}"
    };
  }
  
  rpc CreateUser(CreateUserRequest) returns (User) {
    option (google.api.http) = {
      post: "/api/v1/users"
      body: "*"
    };
  }
}
```

**FastAPI + gRPC клиент:**

```python
from fastapi import FastAPI
import grpc
import user_pb2
import user_pb2_grpc

app = FastAPI()

@app.get("/users/{user_id}")
def get_user(user_id: int):
    channel = grpc.insecure_channel('user-service:50051')
    stub = user_pb2_grpc.UserServiceStub(channel)
    response = stub.GetUser(user_pb2.GetUserRequest(id=user_id))
    return {
        "id": response.user.id,
        "name": response.user.name,
        "email": response.user.email
    }
```

## Заключение

**Выбирайте REST, если:**
- Публичный API для внешних разработчиков
- Простое CRUD приложение
- Нужна поддержка браузеров без дополнительных библиотек
- Требуется HTTP кэширование
- Команда не знакома с gRPC

**Выбирайте gRPC, если:**
- Внутренняя коммуникация микросервисов
- Критична производительность и размер трафика
- Нужен streaming (real-time данные)
- Полиглот окружение (множество языков)
- Mobile клиенты (экономия батареи)

**Hybrid подход:** gRPC для внутренней коммуникации + REST Gateway для внешних клиентов — лучшее из обоих миров.
