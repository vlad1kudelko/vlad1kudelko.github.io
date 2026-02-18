---
title: "WebSocket: полное руководство по real-time коммуникации"
description: "Исчерпывающий гид по WebSocket: протокол, handshake, фреймы, комнаты, масштабирование, безопасность и лучшие практики для продакшена."
heroImage: "../../../../assets/imgs/2025/11/22-websocket-complete-guide.webp"
pubDate: "2025-11-22"
---

# WebSocket: полное руководство по real-time коммуникации

**WebSocket** — это протокол двусторонней связи поверх TCP, обеспечивающий постоянное соединение между клиентом и сервером. В отличие от HTTP с его моделью запрос-ответ, WebSocket позволяет серверу отправлять данные клиенту без запроса, что идеально подходит для real-time приложений.

В этой статье мы разберём протокол WebSocket, handshake, фреймы, комнаты, масштабирование, безопасность и лучшие практики для продакшена.

## Почему WebSocket, а не HTTP?

### Проблема HTTP для real-time

```
HTTP Polling (неэффективно):
Client: GET /messages?last_id=1 ──▶ Server: []
Client: GET /messages?last_id=1 ──▶ Server: []
Client: GET /messages?last_id=1 ──▶ Server: []
Client: GET /messages?last_id=1 ──▶ Server: [{id: 2, text: "Hello"}]

# Много пустых запросов, высокая задержка
```

```
HTTP Long Polling (лучше, но не идеально):
Client: GET /messages ──▶ Server: (ждёт 30 сек)
Server: [{id: 2, text: "Hello"}] ◀──
Client: GET /messages ──▶ Server: (ждёт 30 сек)

# Задержка до 30 сек, постоянное переподключение
```

```
WebSocket (оптимально):
Client: Upgrade to WebSocket ──▶ Server: 101 Switching Protocols
═══════════════════════════════════════════════════════════════
Server: {text: "Hello"} ──▶ Client: (получает мгновенно)
Client: {text: "Hi"} ──▶ Server: (получает мгновенно)
Server: {text: "How are you?"} ──▶ Client: (получает мгновенно)

# Постоянное соединение, мгновенная доставка
```

### Сравнение протоколов

**HTTP Polling:**
- Задержка: высокая
- Трафик: очень высокий
- Сложность: низкая

**HTTP Long Polling:**
- Задержка: средняя
- Трафик: высокий
- Сложность: средняя

**SSE (Server-Sent Events):**
- Задержка: низкая
- Трафик: низкий
- Сложность: низкая
- Ограничение: только сервер → клиент

**WebSocket:**
- Задержка: минимальная
- Трафик: минимальный
- Сложность: средняя
- Преимущество: двусторонняя связь

## Установка соединения (Handshake)

### Клиентский запрос

```http
GET /chat HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Sec-WebSocket-Protocol: chat, superchat
Sec-WebSocket-Extensions: permessage-deflate
Origin: https://example.com
```

### Ответ сервера

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
Sec-WebSocket-Protocol: chat
Sec-WebSocket-Extensions: permessage-deflate
```

**Sec-WebSocket-Accept** вычисляется из ключа:

```python
import hashlib
import base64

GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

def compute_accept(key: str) -> str:
    sha1 = hashlib.sha1((key + GUID).encode()).digest()
    return base64.b64encode(sha1).decode()

# dGhlIHNhbXBsZSBub25jZQ== → s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

## Структура фрейма WebSocket

```
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-------+-+-------------+-------------------------------+
|F|R|R|R| opcode|M| Payload len |    Extended payload length    |
|I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
|N|V|V|V|       |S|             |   (if Payload len==126/127)   |
| |1|2|3|       |K|             |                               |
+-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
|     Extended payload length continued, if payload len == 127  |
+ - - - - - - - - - - - - - - - +-------------------------------+
|                               |Masking-key, if MASK set to 1  |
+-------------------------------+-------------------------------+
| Masking-key (continued)       |          Payload Data         |
+-------------------------------- - - - - - - - - - - - - - - - +
:                     Payload Data continued ...                :
+ - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
|                     Payload Data continued ...                |
+---------------------------------------------------------------+
```

### Поля заголовка

**FIN (1 бит)** — последний фрейм сообщения.

**RSV1-3 (3 бита)** — расширения (например, сжатие).

**Opcode (4 бита)** — тип фрейма:
- `0x0` — продолжение
- `0x1` — текстовые данные
- `0x2` — бинарные данные
- `0x8` — закрытие соединения
- `0x9` — ping
- `0xA` — pong

**MASK (1 бит)** — данные замаскированы (обязательно для клиента).

**Payload length** — длина данных.

### Типы фреймов

```python
# Текстовое сообщение
frame = {
    'fin': 1,
    'opcode': 0x1,  # text
    'mask': 1,
    'payload': b'Hello, World!'
}

# Бинарное сообщение
frame = {
    'fin': 1,
    'opcode': 0x2,  # binary
    'mask': 1,
    'payload': b'\x00\x01\x02\x03'
}

# Ping (проверка соединения)
frame = {
    'fin': 1,
    'opcode': 0x9,  # ping
    'mask': 1,
    'payload': b'ping'
}

# Pong (ответ на ping)
frame = {
    'fin': 1,
    'opcode': 0xA,  # pong
    'mask': 0,
    'payload': b'ping'  # Те же данные
}

# Close (закрытие)
frame = {
    'fin': 1,
    'opcode': 0x8,  # close
    'mask': 1,
    'payload': b'\x03\xe8Normal closure'  # код + причина
}
```

## Реализация на Python

### Сервер на websockets

```bash
pip install websockets
```

```python
import asyncio
import websockets
import json

connected_clients = set()

async def handler(websocket):
    # Регистрация клиента
    connected_clients.add(websocket)
    print(f"Client connected. Total: {len(connected_clients)}")
    
    try:
        async for message in websocket:
            # Обработка входящего сообщения
            data = json.loads(message)
            print(f"Received: {data}")
            
            # Эхо всем клиентам
            broadcast_message = {
                'type': 'message',
                'data': data,
                'clients': len(connected_clients)
            }
            await broadcast(json.dumps(broadcast_message))
            
    except websockets.exceptions.ConnectionClosed:
        print("Client disconnected")
    finally:
        connected_clients.remove(websocket)

async def broadcast(message):
    """Отправка сообщения всем подключённым клиентам"""
    if connected_clients:
        await asyncio.gather(
            *[ws.send(message) for ws in connected_clients],
            return_exceptions=True
        )

async def main():
    async with websockets.serve(handler, "localhost", 8765):
        await asyncio.Future()  # Бесконечный цикл

if __name__ == "__main__":
    asyncio.run(main())
```

### Клиент на Python

```python
import asyncio
import websockets
import json

async def client():
    async with websockets.connect("ws://localhost:8765") as websocket:
        # Отправка сообщения
        await websocket.send(json.dumps({
            'type': 'chat',
            'text': 'Hello, World!'
        }))
        
        # Получение ответов
        async for message in websocket:
            data = json.loads(message)
            print(f"Received: {data}")

asyncio.run(client())
```

### Клиент в браузере

```javascript
const ws = new WebSocket('ws://localhost:8765');

ws.onopen = () => {
    console.log('Connected');
    ws.send(JSON.stringify({
        type: 'chat',
        text: 'Hello!'
    }));
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Received:', data);
};

ws.onclose = () => {
    console.log('Disconnected');
};

ws.onerror = (error) => {
    console.error('Error:', error);
};
```

## Реализация на Node.js

### Сервер на ws

```bash
npm install ws
```

```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const clients = new Set();

wss.on('connection', (ws) => {
    console.log('Client connected');
    clients.add(ws);
    
    // Отправка приветствия
    ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to WebSocket server',
        clients: clients.size
    }));
    
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        console.log('Received:', data);
        
        // Broadcast всем
        broadcast({
            type: 'message',
            data: data,
            clients: clients.size
        });
    });
    
    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(ws);
    });
});

function broadcast(data) {
    const message = JSON.stringify(data);
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    }
}

// Heartbeat для проверки соединений
const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
        if (ws.isAlive === false) {
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => {
    clearInterval(interval);
});
```

### Клиент с reconnect

```javascript
class WebSocketClient {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.reconnectInterval = 1000;
        this.maxReconnectInterval = 30000;
        this.reconnectTimer = null;
    }
    
    connect() {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
            console.log('Connected');
            this.reconnectInterval = 1000;
        };
        
        this.ws.onmessage = (event) => {
            this.onMessage(JSON.parse(event.data));
        };
        
        this.ws.onclose = () => {
            console.log('Disconnected');
            this.scheduleReconnect();
        };
        
        this.ws.onerror = (error) => {
            console.error('Error:', error);
        };
        
        // Heartbeat
        this.ws.isAlive = true;
        this.ws.on('pong', () => {
            this.ws.isAlive = true;
        });
    }
    
    scheduleReconnect() {
        this.reconnectTimer = setTimeout(() => {
            console.log('Reconnecting...');
            this.connect();
            this.reconnectInterval = Math.min(
                this.reconnectInterval * 2,
                this.maxReconnectInterval
            );
        }, this.reconnectInterval);
    }
    
    send(data) {
        if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }
    
    onMessage(data) {
        // Переопределить в подклассе
        console.log('Received:', data);
    }
    
    close() {
        clearTimeout(this.reconnectTimer);
        this.ws.close();
    }
}

// Использование
const client = new WebSocketClient('ws://localhost:8080');
client.connect();
client.send({ type: 'chat', text: 'Hello!' });
```

## Комнаты и каналы

### Реализация комнат

```python
import asyncio
import websockets
import json
from collections import defaultdict

class WebSocketServer:
    def __init__(self):
        self.rooms = defaultdict(set)  # room_id -> set of websockets
        self.client_rooms = {}  # websocket -> set of room_ids
    
    async def handler(self, websocket):
        try:
            async for message in websocket:
                data = json.loads(message)
                await self.handle_message(websocket, data)
        finally:
            await self.cleanup_client(websocket)
    
    async def handle_message(self, websocket, data):
        action = data.get('action')
        
        if action == 'join':
            room_id = data.get('room')
            await self.join_room(websocket, room_id)
            
        elif action == 'leave':
            room_id = data.get('room')
            await self.leave_room(websocket, room_id)
            
        elif action == 'message':
            room_id = data.get('room')
            message = data.get('message')
            await self.send_to_room(room_id, {
                'type': 'message',
                'room': room_id,
                'message': message,
                'client_id': id(websocket)
            })
    
    async def join_room(self, websocket, room_id):
        self.rooms[room_id].add(websocket)
        self.client_rooms.setdefault(websocket, set()).add(room_id)
        
        # Уведомление комнате
        await self.send_to_room(room_id, {
            'type': 'user_joined',
            'room': room_id,
            'client_id': id(websocket),
            'users': len(self.rooms[room_id])
        })
        
        # Подтверждение клиенту
        await websocket.send(json.dumps({
            'type': 'joined',
            'room': room_id
        }))
    
    async def leave_room(self, websocket, room_id):
        if room_id in self.rooms:
            self.rooms[room_id].discard(websocket)
            self.client_rooms.get(websocket, set()).discard(room_id)
            
            # Уведомление комнате
            await self.send_to_room(room_id, {
                'type': 'user_left',
                'room': room_id,
                'client_id': id(websocket),
                'users': len(self.rooms[room_id])
            })
    
    async def send_to_room(self, room_id, data):
        message = json.dumps(data)
        if room_id in self.rooms:
            await asyncio.gather(
                *[ws.send(message) for ws in self.rooms[room_id]],
                return_exceptions=True
            )
    
    async def cleanup_client(self, websocket):
        # Выход из всех комнат
        for room_id in list(self.client_rooms.get(websocket, [])):
            await self.leave_room(websocket, room_id)
        
        self.client_rooms.pop(websocket, None)

# Запуск
server = WebSocketServer()
asyncio.run(websockets.serve(server.handler, "localhost", 8765))
```

### Node.js комнаты с Socket.IO

```bash
npm install socket.io
```

```javascript
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer();
const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // Присоединение к комнате
    socket.on('join_room', (room) => {
        socket.join(room);
        console.log(`Client ${socket.id} joined room ${room}`);
        
        // Уведомление другим в комнате
        socket.to(room).emit('user_joined', {
            room,
            userId: socket.id,
            users: io.sockets.adapter.rooms.get(room)?.size || 1
        });
        
        socket.emit('joined', { room });
    });
    
    // Выход из комнаты
    socket.on('leave_room', (room) => {
        socket.leave(room);
        socket.to(room).emit('user_left', {
            room,
            userId: socket.id
        });
    });
    
    // Сообщение в комнату
    socket.on('message', ({ room, message }) => {
        io.to(room).emit('message', {
            room,
            userId: socket.id,
            message,
            timestamp: Date.now()
        });
    });
    
    // Сообщение конкретному пользователю
    socket.on('direct_message', ({ to, message }) => {
        io.to(to).emit('direct_message', {
            from: socket.id,
            message,
            timestamp: Date.now()
        });
    });
    
    // Отключение
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

server.listen(3000, () => {
    console.log('WebSocket server running on port 3000');
});
```

**Клиент Socket.IO:**

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000');

// Присоединение к комнате
socket.emit('join_room', 'room-1');

// Получение сообщений
socket.on('message', (data) => {
    console.log('Message:', data);
});

// Отправка сообщения
socket.emit('message', {
    room: 'room-1',
    message: 'Hello, Room!'
});

// Выход из комнаты
socket.emit('leave_room', 'room-1');
```

## Масштабирование

### Проблема масштабирования

Один сервер WebSocket хранит все соединения в памяти. Для масштабирования нужно:
1. Балансировка нагрузки
2. Синхронизация между серверами
3. Pub/Sub для broadcast

### Redis Pub/Sub для синхронизации

```python
import asyncio
import websockets
import json
import redis.asyncio as redis

class ScaledWebSocketServer:
    def __init__(self):
        self.clients = set()
        self.redis = redis.Redis(host='localhost', port=6379)
        self.pubsub = self.redis.pubsub()
    
    async def handler(self, websocket):
        self.clients.add(websocket)
        
        # Подписка на канал
        await self.pubsub.subscribe('broadcast')
        
        # Задача для получения сообщений из Redis
        receive_task = asyncio.create_task(self.receive_from_redis())
        
        try:
            async for message in websocket:
                # Отправка в Redis для других серверов
                await self.redis.publish('broadcast', message)
                
        finally:
            self.clients.remove(websocket)
            receive_task.cancel()
            await self.pubsub.unsubscribe('broadcast')
    
    async def receive_from_redis(self):
        try:
            async for message in self.pubsub.listen():
                if message['type'] == 'message':
                    # Отправка всем локальным клиентам
                    await asyncio.gather(
                        *[ws.send(message['data'].decode()) 
                          for ws in self.clients],
                        return_exceptions=True
                    )
        except asyncio.CancelledError:
            pass

# Запуск
server = ScaledWebSocketServer()
asyncio.run(websockets.serve(server.handler, "0.0.0.0", 8765))
```

### Node.js с Redis Adapter

```javascript
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
});

// Теперь комнаты работают across multiple servers
io.on('connection', (socket) => {
    socket.on('join_room', (room) => {
        socket.join(room);
        // Комната синхронизирована между всеми серверами
    });
    
    socket.on('message', ({ room, message }) => {
        // Отправка на все серверы
        io.to(room).emit('message', {
            userId: socket.id,
            message
        });
    });
});
```

### Балансировка нагрузки

**Nginx конфигурация:**

```nginx
upstream websocket_servers {
    least_conn;
    server 192.168.1.10:8765;
    server 192.168.1.11:8765;
    server 192.168.1.12:8765;
}

server {
    listen 80;
    
    location /ws {
        proxy_pass http://websocket_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Таймауты для WebSocket
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

**Sticky sessions** — клиент должен подключаться к одному серверу:

```nginx
upstream websocket_servers {
    ip_hash;  # Sticky sessions по IP
    server 192.168.1.10:8765;
    server 192.168.1.11:8765;
}
```

## Безопасность

### WSS (WebSocket Secure)

```python
import ssl

ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ssl_context.load_cert_chain('cert.pem', 'key.pem')

async with websockets.serve(
    handler,
    "0.0.0.0",
    8443,
    ssl=ssl_context
):
    await asyncio.Future()
```

**Клиент:**

```javascript
const ws = new WebSocket('wss://example.com:8443');
```

### Аутентификация

```python
import jwt

async def handler(websocket, path):
    # Получение токена из query params или заголовков
    token = websocket.request_headers.get('Authorization', '').replace('Bearer ', '')
    
    try:
        payload = jwt.decode(token, 'secret', algorithms=['HS256'])
        user_id = payload['user_id']
    except jwt.InvalidTokenError:
        await websocket.close(4001, 'Invalid token')
        return
    
    # Аутентифицированное соединение
    await authenticated_handler(websocket, user_id)
```

**Node.js middleware:**

```javascript
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    try {
        const payload = jwt.verify(token, 'secret');
        socket.user = payload;
        next();
    } catch (err) {
        next(new Error('Invalid token'));
    }
});

io.on('connection', (socket) => {
    console.log(`Authenticated user: ${socket.user.user_id}`);
});
```

### Rate Limiting

```python
from collections import defaultdict
import time

class RateLimiter:
    def __init__(self, max_requests=100, window_seconds=60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)
    
    def is_allowed(self, client_id):
        now = time.time()
        window_start = now - self.window_seconds
        
        # Очистка старых запросов
        self.requests[client_id] = [
            t for t in self.requests[client_id] if t > window_start
        ]
        
        if len(self.requests[client_id]) >= self.max_requests:
            return False
        
        self.requests[client_id].append(now)
        return True

limiter = RateLimiter(max_requests=100, window_seconds=60)

async def handler(websocket):
    client_id = websocket.remote_address[0]
    
    async for message in websocket:
        if not limiter.is_allowed(client_id):
            await websocket.close(4029, 'Rate limit exceeded')
            return
        
        await process_message(websocket, message)
```

## Best Practices

### Обработка ошибок

```javascript
ws.on('error', (error) => {
    console.error('WebSocket error:', error);
});

ws.on('close', (code, reason) => {
    console.log(`Closed: ${code} ${reason}`);
    
    // Коды закрытия
    // 1000 - нормальное закрытие
    // 1001 - клиент уходит
    // 1006 - аномальное закрытие (ошибка)
    // 4000-4999 - пользовательские коды
});
```

### Heartbeat (Ping/Pong)

```python
import asyncio

async def handler(websocket):
    websocket.is_alive = True
    
    async def heartbeat():
        while True:
            try:
                await asyncio.sleep(30)
                pong = await websocket.ping()
                await asyncio.wait_for(pong, timeout=10)
            except asyncio.TimeoutError:
                await websocket.close(1001, 'Heartbeat timeout')
                break
            except:
                break
    
    heartbeat_task = asyncio.create_task(heartbeat())
    
    try:
        async for message in websocket:
            websocket.is_alive = True
            await process_message(message)
    finally:
        heartbeat_task.cancel()
```

### Фрагментация больших сообщений

```javascript
function sendLargeData(ws, data) {
    const chunkSize = 16 * 1024; // 16KB
    const chunks = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
        chunks.push(data.slice(i, i + chunkSize));
    }
    
    // Первое сообщение с флагом продолжения
    chunks.forEach((chunk, index) => {
        const isLast = index === chunks.length - 1;
        ws.send(chunk, { fin: isLast });
    });
}
```

### Логирование

```python
import logging
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('websocket')

async def handler(websocket):
    client_id = id(websocket)
    logger.info(f"Client connected: {client_id}")
    
    try:
        async for message in websocket:
            logger.debug(f"Received from {client_id}: {message}")
            
            try:
                data = json.loads(message)
                response = await process_message(data)
                await websocket.send(json.dumps(response))
                logger.debug(f"Sent to {client_id}: {response}")
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON from {client_id}")
                await websocket.send(json.dumps({'error': 'Invalid JSON'}))
                
    except websockets.exceptions.ConnectionClosed as e:
        logger.info(f"Client disconnected: {client_id}, code={e.code}")
    except Exception as e:
        logger.error(f"Error handling {client_id}: {e}")
```

## Заключение

WebSocket — это мощный протокол для real-time коммуникации:

- **Двусторонняя связь** — сервер и клиент могут отправлять данные в любое время
- **Низкая задержка** — мгновенная доставка без polling
- **Эффективность** — одно соединение вместо множества запросов
- **Гибкость** — текстовые и бинарные данные, кастомные протоколы

**Используйте WebSocket для:**
- Чаты и мессенджеры
- Уведомления в реальном времени
- Совместное редактирование
- Онлайн-игры
- Финтех и трейдинг
- Мониторинг и дашборды
- Live-трансляции

**Выбирайте альтернативы, когда:**
- Простые запросы (REST)
- Только сервер → клиент (SSE)
- Мобильные с плохим соединением (HTTP/2 push)
