---
title: "Redis: полное руководство по типам данных, кэшированию и кластеризации"
description: "Исчерпывающий гид по Redis: типы данных, команды, паттерны кэширования, pub/sub, транзакции, репликация и кластеризация для продакшена."
heroImage: "../../../../assets/imgs/2025/11/16-redis-complete-guide.webp"
pubDate: "2025-11-16"
---

# Redis: полное руководство для разработчика

**Redis (Remote Dictionary Server)** — это высокопроизводительная in-memory база данных с открытым исходным кодом, которая используется как кэш, брокер сообщений и хранилище данных. Благодаря хранению данных в оперативной памяти Redis обеспечивает время отклика менее миллисекунды.

В этой статье мы подробно разберём типы данных Redis, основные команды, паттерны кэширования, механизмы pub/sub, транзакции, репликацию и кластеризацию.

## Почему Redis так быстр

**In-memory хранение** — все данные находятся в оперативной памяти, что исключает задержки на чтение с диска.

**Однопоточная архитектура** — Redis использует один поток для обработки команд, что устраняет накладные расходы на переключение контекста и блокировки.

**Эффективные структуры данных** — Redis использует оптимизированные структуры: хэш-таблицы, skip lists, hyperloglog.

**I/O multiplexing** — неблокирующий ввод-вывод позволяет обрабатывать тысячи соединений одновременно.

## Установка и запуск

```bash
# Установка через apt (Debian/Ubuntu)
sudo apt update
sudo apt install redis-server

# Установка через yum (CentOS/RHEL)
sudo yum install redis

# Установка через Homebrew (macOS)
brew install redis

# Запуск сервера
redis-server

# Запуск клиента
redis-cli
```

**Проверка работы:**

```bash
redis-cli ping
# PONG
```

## Типы данных Redis

Redis поддерживает несколько типов данных, каждый из которых оптимизирован для определённых сценариев использования.

### Strings (Строки)

Базовый тип данных. Строка может содержать текст, числа или даже бинарные данные до 512 МБ.

```bash
# Установка значения
SET user:1:name "Alice"
SET counter 100

# Получение значения
GET user:1:name
# "Alice"

# Инкремент/декремент
INCR counter
# 101
INCRBY counter 10
# 111
DECR counter
# 110
DECRBY counter 5
# 105

# Установка с expiration (время жизни в секундах)
SET session:abc123 "user_data" EX 3600
SETEX session:abc123 3600 "user_data"

# Получение оставшегося времени жизни
TTL session:abc123
# 3599

# Атомарное получение и установка
GETSET counter 0
# Возвращает старое значение, устанавливает новое
```

**Использование в Python:**

```python
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

# Установка и получение
r.set('user:1:name', 'Alice')
name = r.get('user:1:name')

# Инкремент
r.incr('page:views')
r.incrby('page:views', 10)

# С expiration
r.setex('session:token', 3600, 'abc123')
```

### Hashes (Хэши)

Хэши удобны для хранения объектов с полями. Экономнее памяти, чем хранение JSON в строке.

```bash
# Установка полей
HSET user:100 name "Bob" email "bob@example.com" age 30

# Получение одного поля
HGET user:100 name
# "Bob"

# Получение всех полей
HGETALL user:100
# 1) "name"
# 2) "Bob"
# 3) "email"
# 4) "bob@example.com"
# 5) "age"
# 6) "30"

# Получение нескольких полей
HMGET user:100 name email
# 1) "Bob"
# 2) "bob@example.com"

# Установка нескольких полей
HMSET user:100 city "Moscow" status "active"

# Инкремент поля
HINCRBY user:100 age 1

# Проверка существования поля
HEXISTS user:100 name
# 1 (true)

# Удаление поля
HDEL user:100 status

# Количество полей
HLEN user:100
# 4

# Получение всех ключей/значений
HKEYS user:100
HVALS user:100
```

**Python пример:**

```python
# Хранение профиля пользователя
user_data = {
    'name': 'Bob',
    'email': 'bob@example.com',
    'age': 30
}
r.hset('user:100', mapping=user_data)

# Получение
name = r.hget('user:100', 'name')
all_data = r.hgetall('user:100')

# Инкремент
r.hincrby('user:100', 'login_count', 1)
```

### Lists (Списки)

Списки — это упорядоченные коллекции строк. Поддерживают операции с обоих концов.

```bash
# Добавление в начало (left push)
LPUSH tasks "task1" "task2" "task3"

# Добавление в конец (right push)
RPUSH tasks "task4"

# Получение диапазона
LRANGE tasks 0 -1
# 1) "task1"
# 2) "task2"
# 3) "task3"
# 4) "task4"

# Получение элемента по индексу
LINDEX tasks 0
# "task1"

# Удаление и получение первого элемента (для очередей)
LPOP tasks
# "task1"

# Удаление и получение последнего элемента (для стека)
RPOP tasks
# "task4"

# Длина списка
LLEN tasks
# 2

# Блокирующее извлечение (для worker'ов)
BLPOP tasks 0
# Блокирует пока список не пустой

# Вставка перед/после элемента
LINSERT tasks BEFORE "task2" "task1.5"
```

**Очередь задач на Python:**

```python
from redis import Redis

r = Redis()

# Producer
def add_task(task_data: str):
    r.rpush('tasks:queue', task_data)

# Consumer
def process_task(timeout: int = 5):
    task = r.blpop('tasks:queue', timeout=timeout)
    if task:
        queue, data = task
        return data.decode()
    return None
```

### Sets (Множества)

Множества — неупорядоченные коллекции уникальных элементов.

```bash
# Добавление элементов
SADD tags:article:1 "python" "redis" "database"

# Проверка наличия
SISMEMBER tags:article:1 "python"
# 1 (true)

# Получение всех элементов
SMEMBERS tags:article:1
# 1) "python"
# 2) "redis"
# 3) "database"

# Количество элементов
SCARD tags:article:1
# 3

# Удаление элемента
SREM tags:article:1 "database"

# Случайный элемент
SRANDMEMBER tags:article:1

# Извлечение случайного элемента (удаляет из множества)
SPOP tags:article:1

# Разница множеств
SDIFF tags:article:1 tags:article:2

# Пересечение
SINTER tags:article:1 tags:article:2

# Объединение
SUNION tags:article:1 tags:article:2
```

**Пример: уникальные посетители:**

```python
# Отслеживание уникальных посетителей за день
def track_visitor(day: str, user_id: str):
    r.sadd(f'visitors:{day}', user_id)

def get_unique_visitors_count(day: str) -> int:
    return r.scard(f'visitors:{day}')

# Пересечение: пользователи, заходившие несколько дней
def get_common_visitors(day1: str, day2: str) -> set:
    return r.sinter(f'visitors:{day1}', f'visitors:{day2}')
```

### Sorted Sets (Упорядоченные множества)

Элементы имеют уникальный score для сортировки.

```bash
# Добавление элементов со score
ZADD leaderboard 100 "player1" 250 "player2" 175 "player3"

# Получение диапазона (по рангу)
ZRANGE leaderboard 0 -1 WITHSCORES
# 1) "player1"
# 2) "100"
# 3) "player3"
# 4) "175"
# 5) "player2"
# 6) "250"

# По убыванию
ZREVRANGE leaderboard 0 -1 WITHSCORES

# Ранг элемента (0-based)
ZRANK leaderboard "player2"
# 2

# Score элемента
ZSCORE leaderboard "player1"
# 100

# Количество элементов в диапазоне score
ZCOUNT leaderboard 100 200
# 2

# Удаление элемента
ZREM leaderboard "player3"

# Инкремент score
ZINCRBY leaderboard 50 "player1"
# 150

# Диапазон по score
ZRANGEBYSCORE leaderboard 150 300 WITHSCORES
```

**Пример: лента новостей по времени:**

```python
import time

def add_post(feed_id: str, post_id: str, timestamp: float = None):
    if timestamp is None:
        timestamp = time.time()
    r.zadd(f'feed:{feed_id}', {post_id: timestamp})

def get_recent_posts(feed_id: str, limit: int = 20) -> list:
    # Последние посты (больший timestamp = новее)
    return r.zrevrange(f'feed:{feed_id}', 0, limit - 1)

def get_posts_in_range(feed_id: str, start: float, end: float) -> list:
    return r.zrangebyscore(f'feed:{feed_id}', start, end)
```

### Special types (Специальные типы)

**HyperLogLog** — вероятностная структура для подсчёта уникальных элементов:

```bash
# Добавление элементов
PFADD hll:user:day1 "user1" "user2" "user3"

# Подсчёт уникальных (погрешность ~0.81%)
PFCOUNT hll:user:day1
# 3

# Объединение нескольких HLL
PFMERGE hll:total hll:user:day1 hll:user:day2
```

**Bitmaps** — битовые массивы для эффективного хранения булевых данных:

```bash
# Установка бита
SETBIT user:online:2025-11-16 1001 1

# Получение бита
GETBIT user:online:2025-11-16 1001
# 1

# Подсчёт установленных битов
BITCOUNT user:online:2025-11-16

# Битовые операции
BITOP AND result key1 key2
BITOP OR result key1 key2
```

**Geospatial** — геопространственные данные:

```bash
# Добавление координат
GEOADD cities 37.6176 55.7558 "Moscow" 30.3141 59.9386 "Saint Petersburg"

# Расстояние между точками (в км)
GEODIST cities "Moscow" "Saint Petersburg" km
# 634.52

# Поиск рядом
GEORADIUS cities 37.6176 55.7558 500 km
```

## Паттерны кэширования

### Cache-Aside (Lazy Loading)

Приложение сначала проверяет кэш, при отсутствии — загружает из БД.

```python
def get_user(user_id: str) -> dict:
    # Попытка получить из кэша
    cached = r.get(f'user:{user_id}')
    if cached:
        return json.loads(cached)
    
    # Загрузка из БД
    user = db.query("SELECT * FROM users WHERE id = %s", user_id)
    
    # Сохранение в кэш с TTL
    r.setex(f'user:{user_id}', 3600, json.dumps(user))
    
    return user
```

**Проблема:** при первом запросе всегда идёт в БД (cache miss).

### Write-Through

Данные записываются одновременно в кэш и БД.

```python
def update_user(user_id: str, data: dict):
    # Обновление в БД
    db.execute("UPDATE users SET %s WHERE id = %s", data, user_id)
    
    # Обновление кэша
    r.setex(f'user:{user_id}', 3600, json.dumps(data))
```

**Преимущество:** кэш всегда актуален. **Недостаток:** задержка записи выше.

### Write-Behind (Write-Back)

Запись сначала в кэш, асинхронно — в БД.

```python
import asyncio
from queue import Queue

write_queue = Queue()

async def write_behind_worker():
    while True:
        key, data = await write_queue.get()
        db.execute("INSERT OR REPLACE INTO users %s", data)
        r.delete(f'write_pending:{key}')

def update_user_async(user_id: str, data: dict):
    # Быстрая запись в кэш
    r.setex(f'user:{user_id}', 3600, json.dumps(data))
    
    # Очередь на запись в БД
    write_queue.put((user_id, data))
```

**Риск:** потеря данных при сбое до записи в БД.

### Cache Invalidation (Инвалидация кэша)

**По TTL:**

```python
# Кэш истекает автоматически
r.setex('expensive_query:result', 300, result)  # 5 минут
```

**По событию:**

```python
def update_user(user_id: str, data: dict):
    db.update('users', user_id, data)
    # Инвалидация кэша
    r.delete(f'user:{user_id}')
```

**Версионирование ключей:**

```python
def get_user_key(user_id: str) -> str:
    version = r.get(f'user:{user_id}:version') or '1'
    return f'user:{user_id}:v{version}'

def invalidate_user_cache(user_id: str):
    r.incr(f'user:{user_id}:version')
```

## Pub/Sub (Публикация/Подписка)

Механизм обмена сообщениями между клиентами.

```bash
# Подписка на канал
SUBSCRIBE notifications:user:100

# Подписка по паттерну
PSUBSCRIBE notifications:user:*

# Публикация сообщения
PUBLISH notifications:user:100 "New message!"
# Возвращает количество получателей
```

**Python пример:**

```python
import redis
import threading

# Publisher
class Publisher:
    def __init__(self):
        self.r = redis.Redis()
    
    def notify(self, user_id: str, message: str):
        self.r.publish(f'notifications:user:{user_id}', message)

# Subscriber
class Subscriber:
    def __init__(self, channel: str):
        self.r = redis.Redis()
        self.pubsub = self.r.pubsub()
        self.pubsub.subscribe(channel)
    
    def listen(self):
        for message in self.pubsub.listen():
            if message['type'] == 'message':
                print(f"Received: {message['data'].decode()}")

# Использование
pub = Publisher()
pub.notify(100, "Your order is ready!")

# В отдельном потоке
sub = Subscriber('notifications:user:100')
threading.Thread(target=sub.listen, daemon=True).start()
```

**Streams для надёжной доставки:**

```python
# Добавление в stream
r.xadd('orders:stream', {'order_id': '123', 'status': 'created'})

# Чтение
messages = r.xread({'orders:stream': '0'}, count=10)

# Consumer groups
r.xgroup_create('orders:stream', 'order-processors', id='0', mkstream=True)
messages = r.xreadgroup('order-processors', 'worker-1', {'orders:stream': '>'}, count=10)

# Подтверждение обработки
r.xack('orders:stream', 'order-processors', message_id)
```

## Транзакции

### MULTI/EXEC

```bash
# Начало транзакции
MULTI

# Команды ставятся в очередь
SET counter 1
INCR counter
GET counter

# Выполнение
EXEC
# Возвращает результаты всех команд
```

**Python:**

```python
pipe = r.pipeline()
pipe.set('counter', 1)
pipe.incr('counter')
pipe.get('counter')
results = pipe.execute()
# [True, 2, b'2']
```

### WATCH (Оптимистичная блокировка)

```python
def increment_with_watch(key: str):
    while True:
        r.watch(key)
        current = int(r.get(key) or 0)
        
        pipe = r.pipeline()
        try:
            pipe.multi()
            pipe.set(key, current + 1)
            pipe.execute()
            break
        except redis.WatchError:
            # Другой клиент изменил ключ, повторяем
            continue
        finally:
            r.unwatch()
```

### Lua скрипты (Атомарные операции)

```lua
-- redis.lua
local key = KEYS[1]
local increment = tonumber(ARGV[1])
local current = tonumber(redis.call('GET', key) or '0')
local new_value = current + increment
redis.call('SET', key, new_value)
return new_value
```

**Вызов из Python:**

```python
lua_script = """
local key = KEYS[1]
local increment = tonumber(ARGV[1])
local current = tonumber(redis.call('GET', key) or '0')
local new_value = current + increment
redis.call('SET', key, new_value)
return new_value
"""

increment_script = r.register_script(lua_script)
result = increment_script(keys=['counter'], args=[1])
```

## Персистентность (Сохранение на диск)

### RDB (Snapshotting)

Периодические снимки данных:

```conf
# redis.conf
save 900 1        # Сохранить если 1 изменение за 900 сек
save 300 10       # Сохранить если 10 изменений за 300 сек
save 60 10000     # Сохранить если 10000 изменений за 60 сек

dbfilename dump.rdb
dir /var/lib/redis
```

**Команды:**

```bash
# Создать snapshot
BGSAVE

# Блокирующее сохранение
SAVE

# Последнее сохранение
LASTSAVE
```

### AOF (Append Only File)

Логирование всех операций записи:

```conf
appendonly yes
appendfilename "appendonly.aof"

# Частота синхронизации
appendfsync everysec  # fsync раз в секунду (баланс)
# appendfsync always  # fsync после каждой команды (медленно, надёжно)
# appendfsync no      # fsync на усмотрение ОС (быстро, риск потери)

# Автоматическая перекомпоновка
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

**Перекомпоновка AOF:**

```bash
# Фоновая перекомпоновка
BGREWRITEAOF
```

### Hybrid persistence

Redis 4.0+ поддерживает гибридный режим: RDB + AOF.

```conf
aof-use-rdb-preamble yes
```

## Репликация

### Настройка Master-Replica

**Master (redis-master.conf):**

```conf
bind 0.0.0.0
requirepass master_password
```

**Replica (redis-replica.conf):**

```conf
replicaof redis-master 6379
masterauth master_password
replica-read-only yes
```

**Команды репликации:**

```bash
# На реплике
INFO replication
# Показывает статус репликации

# Принудительная синхронизация
SLAVEOF redis-master 6379

# Отключение репликации (превращение в master)
SLAVEOF NO ONE
```

### Каскадная репликация

```
Master → Replica1 → Replica2
```

Replica2 подключается к Replica1, разгружая Master.

## Sentinel (Мониторинг и Failover)

Sentinel отслеживает состояние инстансов и автоматически выполняет failover.

**Конфигурация sentinel.conf:**

```conf
port 26379
sentinel monitor mymaster 127.0.0.1 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
```

**Параметры:**

- `sentinel monitor` — имя master, хост, порт, кворум
- `down-after-milliseconds` — время до признания master недоступным
- `failover-timeout` — таймаут failover
- `parallel-syncs` — сколько реплик одновременно синхронизируются

**Python с Sentinel:**

```python
from redis.sentinel import Sentinel

sentinel = Sentinel([('sentinel1', 26379), ('sentinel2', 26379)])

# Master для записи
master = sentinel.master_for('mymaster', password='master_password')
master.set('key', 'value')

# Replica для чтения
slave = sentinel.slave_for('mymaster', password='master_password')
value = slave.get('key')
```

## Кластеризация

### Redis Cluster

Автоматическое шардирование данных между нодами.

**Минимальный кластер:** 3 master + 3 replica (6 нод).

**Настройка ноды (redis-cluster-node.conf):**

```conf
port 7000
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
```

**Создание кластера:**

```bash
# Запуск 6 нод
redis-server redis-cluster-node-1.conf
redis-server redis-cluster-node-2.conf
# ...

# Создание кластера
redis-cli --cluster create \
  127.0.0.1:7000 127.0.0.1:7001 127.0.0.1:7002 \
  127.0.0.1:7003 127.0.0.1:7004 127.0.0.1:7005 \
  --cluster-replicas 1
```

**Работа с кластером:**

```python
from redis.cluster import RedisCluster

rc = RedisCluster(host='localhost', port=7000)

# Команды работают как обычно
rc.set('key1', 'value1')
rc.get('key1')

# Hash tags для группировки ключей
rc.set('user:{100}:name', 'Alice')
rc.set('user:{100}:email', 'alice@example.com')
# Оба ключа на одной ноде
```

### Hash slots

Кластер использует 16384 хэш-слота:

```
slot = CRC16(key) % 16384
```

Ключи распределяются по слотам, слоты — по нодам.

## Best Practices

### Именование ключей

```
# Хорошо
user:100:profile
session:abc123
cache:products:page:5

# Плохо
user_100
abc123
data5
```

### Избегайте KEYS и SCAN в продакшене

```bash
# ❌ Блокирует Redis
KEYS user:*

# ✅ Используйте SCAN
SCAN 0 MATCH user:* COUNT 100
```

### Оптимизация памяти

```python
# Используйте hashes вместо JSON
r.hset('user:100', mapping={'name': 'Alice', 'age': 30})
# Вместо r.set('user:100', json.dumps({...}))

# Hash compression
r.config_set('hash-max-ziplist-entries', '512')
r.config_set('hash-max-ziplist-value', '64')

# Устанавливайте TTL
r.setex('temp:data', 300, 'value')
```

### Connection pooling

```python
from redis import ConnectionPool, Redis

pool = ConnectionPool(
    host='localhost',
    port=6379,
    max_connections=50,
    decode_responses=True
)

redis_client = Redis(connection_pool=pool)
```

### Мониторинг

```bash
# Общая информация
INFO

# Статистика памяти
INFO memory

# Статистика команд
INFO stats

# Медленные запросы
SLOWLOG GET 10
CONFIG SET slowlog-log-slower-than 10000  # 10ms

# Реальное время
MONITOR  # Осторожно: влияет на производительность
```

## Заключение

Redis — это мощный инструмент с широкими возможностями:

- **6 типов данных** для различных сценариев
- **Паттерны кэширования** для ускорения приложений
- **Pub/Sub и Streams** для асинхронной коммуникации
- **Транзакции и Lua** для атомарных операций
- **Персистентность** RDB и AOF для надёжности
- **Репликация и Sentinel** для высокой доступности
- **Кластеризация** для горизонтального масштабирования

Изучите возможности Redis и применяйте их осознанно в зависимости от требований вашего проекта.
