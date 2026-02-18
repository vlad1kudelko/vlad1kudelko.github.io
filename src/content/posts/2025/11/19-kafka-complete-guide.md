---
title: "Apache Kafka: полное руководство по потоковой обработке данных"
description: "Исчерпывающий гид по Apache Kafka: топики, партиции, продюсеры, консьюмеры, Kafka Streams,Exactly-Once семантика и кластеризация для продакшена."
heroImage: "../../../../assets/imgs/2025/11/19-kafka-complete-guide.webp"
pubDate: "2025-11-19"
---

# Apache Kafka: полное руководство для разработчика

**Apache Kafka** — это распределённая платформа для потоковой обработки данных с открытым исходным кодом, разработанная LinkedIn и ставшая проектом Apache. Kafka обеспечивает высокую пропускную способность, горизонтальную масштабируемость и отказоустойчивость для обработки потоков событий в реальном времени.

В этой статье мы разберём архитектуру Kafka, продюсеры, консьюмеры, партиции, репликацию, Kafka Streams и лучшие практики для продакшена.

## Установка и запуск

```bash
# Установка через Homebrew (macOS)
brew install kafka

# Запуск через Docker Compose
version: '3.8'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
    ports:
      - "2181:2181"
  
  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

# Запуск
docker-compose up -d

# Проверка
docker-compose exec kafka kafka-topics --bootstrap-server localhost:9092 --list
```

**Kafka без Zookeeper (KRaft mode, Kafka 3.0+):**

```bash
# Генерация cluster.id
KAFKA_CLUSTER_ID="$(bin/kafka-storage.sh random-uuid)"

# Форматирование storage
bin/kafka-storage.sh format -t $KAFKA_CLUSTER_ID -c config/kraft/server.properties

# Запуск
bin/kafka-server-start.sh config/kraft/server.properties
```

## Архитектура Kafka

### Основные компоненты

**Broker (Брокер)** — сервер Kafka, хранящий данные и обслуживающий клиентов. Кластер состоит из нескольких брокеров.

**Topic (Топик)** — логическая категория для сообщений. Продюсеры пишут в топики, консьюмеры читают из них.

**Partition (Партиция)** — топики разделяются на партиции для масштабирования. Каждая партиция — упорядоченный лог сообщений.

```
Topic: orders
├─ Partition 0: [msg1, msg4, msg7]
├─ Partition 1: [msg2, msg5, msg8]
└─ Partition 2: [msg3, msg6, msg9]
```

**Offset (Смещение)** — уникальный идентификатор сообщения в партиции (порядковый номер).

**Consumer Group (Группа консьюмеров)** — группа консьюмеров, совместно потребляющих данные из топика.

**Producer (Продюсер)** — приложение, публикующее сообщения в Kafka.

**Consumer (Консьюмер)** — приложение, читающее сообщения из Kafka.

### Zookeeper vs KRaft

**Zookeeper (традиционный):**
- Хранит метаданные кластера
- Управляет лидерами партиций
- Отдельный компонент для поддержки

**KRaft (Kafka Raft, новый):**
- Встроенный консенсус-протокол
- Упрощённая архитектура
- Лучшая масштабируемость

## Работа с топиками

### Создание топиков

```bash
# Базовое создание
kafka-topics --bootstrap-server localhost:9092 \
  --create \
  --topic orders \
  --partitions 3 \
  --replication-factor 2

# С конфигурацией
kafka-topics --bootstrap-server localhost:9092 \
  --create \
  --topic orders \
  --partitions 6 \
  --replication-factor 3 \
  --config retention.ms=604800000 \
  --config max.message.bytes=1048576

# Параметры:
# partitions — количество партиций (масштабируемость)
# replication-factor — количество реплик (отказоустойчивость)
# retention.ms — время хранения сообщений
# max.message.bytes — максимальный размер сообщения
```

**Управление топиками:**

```bash
# Список топиков
kafka-topics --bootstrap-server localhost:9092 --list

# Информация о топике
kafka-topics --bootstrap-server localhost:9092 \
  --describe --topic orders

# Удаление топика
kafka-topics --bootstrap-server localhost:9092 \
  --delete --topic orders

# Изменение количества партиций
kafka-topics --bootstrap-server localhost:9092 \
  --alter --topic orders --partitions 12

# Изменение конфигурации
kafka-configs --bootstrap-server localhost:9092 \
  --entity-type topics --entity-name orders \
  --alter --add-config retention.ms=86400000

# Просмотр конфигурации
kafka-configs --bootstrap-server localhost:9092 \
  --entity-type topics --entity-name orders \
  --describe
```

### Встроенные топики

```
__consumer_offsets — хранит смещения консьюмеров
__transaction_state — хранит состояние транзакций
```

## Продюсеры (Producers)

### Базовая отправка сообщений

```python
from kafka import KafkaProducer
import json

# Создание продюсера
producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    key_serializer=lambda k: k.encode('utf-8') if k else None
)

# Отправка сообщения (асинхронно)
future = producer.send(
    'orders',
    key='order-123',
    value={'order_id': 123, 'amount': 99.99}
)

# Получение результата
record_metadata = future.get(timeout=10)
print(f"Partition: {record_metadata.partition}")
print(f"Offset: {record_metadata.offset}")
print(f"Timestamp: {record_metadata.timestamp}")

# Отправка с колбэком
def on_send_success(record_metadata):
    print(f"Sent to {record_metadata.topic}")

def on_send_error(excp):
    print(f"Error: {excp}")

producer.send(
    'orders',
    key='order-124',
    value={'order_id': 124}
).add_callback(on_send_success).add_errback(on_send_error)

# Отправка и ожидание
producer.flush()
producer.close()
```

### Синхронная отправка

```python
# Синхронная отправка
producer.send('orders', value=data).get()

# Пакетная отправка
for i in range(100):
    producer.send('orders', value={'id': i})
producer.flush()  # Отправить все буферизированные
```

### Partitioning

```python
from kafka import KafkaProducer

# Кастомный партиционер
def partitioner(key, all_partitions, available_partitions):
    # Хэш ключа для определения партиции
    return hash(key) % len(all_partitions)

producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    partitioner=partitioner
)

# Отправка с ключом (ключ определяет партицию)
producer.send('orders', key='user-100', value=data)
# Все сообщения user-100 попадут в одну партицию

# Отправка без ключа (round-robin)
producer.send('orders', value=data)
```

### Конфигурация продюсера

```python
producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    
    # Надёжность
    acks='all',  # '0', '1', 'all'
    retries=3,
    retry_backoff_ms=100,
    
    # Производительность
    batch_size=16384,  # 16KB
    linger_ms=5,  # Ждать 5ms для заполнения батча
    buffer_memory=33554432,  # 32MB
    
    # Сжатие
    compression_type='gzip',  # 'none', 'gzip', 'snappy', 'lz4', 'zstd'
    
    # Идемпотентность
    enable_idempotence=True,  # Exactly-once
    
    # Таймауты
    request_timeout_ms=30000,
    delivery_timeout_ms=120000
)
```

**Уровни acks:**
- `acks=0` — не ждать подтверждения (быстро, возможна потеря)
- `acks=1` — ждать лидера (баланс)
- `acks=all` — ждать все реплики (надёжно, медленно)

## Консьюмеры (Consumers)

### Базовое потребление

```python
from kafka import KafkaConsumer
import json

# Создание консьюмера
consumer = KafkaConsumer(
    'orders',
    bootstrap_servers=['localhost:9092'],
    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
    key_deserializer=lambda k: k.decode('utf-8') if k else None,
    group_id='order-processors',
    auto_offset_reset='earliest',  # 'earliest', 'latest', 'none'
    enable_auto_commit=True,
    auto_commit_interval_ms=1000
)

# Потребление сообщений
for message in consumer:
    print(f"Received: {message.key} -> {message.value}")
    print(f"Partition: {message.partition}, Offset: {message.offset}")
```

### Ручной коммит

```python
consumer = KafkaConsumer(
    'orders',
    bootstrap_servers=['localhost:9092'],
    group_id='order-processors',
    enable_auto_commit=False  # Отключаем автокоммит
)

try:
    for message in consumer:
        # Обработка сообщения
        process(message.value)
        
        # Ручной коммит после обработки
        consumer.commit()
        
except Exception as e:
    print(f"Error: {e}")
    # Коммит не выполнен, сообщение будет обработано снова
finally:
    consumer.close()
```

### Асинхронный коммит с колбэком

```python
consumer = KafkaConsumer(
    'orders',
    bootstrap_servers=['localhost:9092'],
    group_id='order-processors',
    enable_auto_commit=False
)

for message in consumer:
    process(message.value)
    
    # Асинхронный коммит
    consumer.commit_async(callback=lambda resp, err: print(f"Committed: {resp}"))

# Синхронный коммит перед закрытием
consumer.commit()
```

### Подписка на несколько топиков

```python
# Несколько топиков
consumer = KafkaConsumer(
    'orders', 'payments', 'shipments',
    bootstrap_servers=['localhost:9092'],
    group_id='processors'
)

# Подписка по паттерну
consumer = KafkaConsumer(
    bootstrap_servers=['localhost:9092'],
    group_id='processors'
)
consumer.subscribe(pattern='orders-.*')  # orders-dev, orders-prod

# Динамическая подписка
consumer.subscribe(['topic1'])
consumer.unsubscribe()
consumer.subscribe(['topic2', 'topic3'])
```

### Consumer Group

```python
# Все консьюмеры с одинаковым group_id образуют группу
# Сообщения распределяются между участниками группы

# Группа из 3 консьюмеров
consumer1 = KafkaConsumer('orders', group_id='order-processors', ...)
consumer2 = KafkaConsumer('orders', group_id='order-processors', ...)
consumer3 = KafkaConsumer('orders', group_id='order-processors', ...)

# Если 6 партиций, каждый консьюмер получит 2 партиции
```

**Управление consumer group:**

```bash
# Список групп
kafka-consumer-groups --bootstrap-server localhost:9092 --list

# Информация о группе
kafka-consumer-groups --bootstrap-server localhost:9092 \
  --group order-processors --describe

# Сброс смещений
kafka-consumer-groups --bootstrap-server localhost:9092 \
  --group order-processors \
  --reset-offsets --to-earliest --execute \
  --topic orders

# Сброс к конкретному времени
kafka-consumer-groups --bootstrap-server localhost:9092 \
  --group order-processors \
  --reset-offsets --to-datetime 2025-11-19T00:00:00.000 \
  --execute --topic orders
```

### Конфигурация консьюмера

```python
consumer = KafkaConsumer(
    'orders',
    bootstrap_servers=['localhost:9092'],
    group_id='order-processors',
    
    # Смещения
    auto_offset_reset='earliest',  # earliest, latest, none
    enable_auto_commit=False,
    
    # Производительность
    fetch_min_bytes=1,
    fetch_max_bytes=52428800,  # 50MB
    fetch_max_wait_ms=500,
    max_partition_fetch_bytes=1048576,
    
    # Сессия
    session_timeout_ms=30000,
    heartbeat_interval_ms=10000,
    max_poll_interval_ms=300000,
    max_poll_records=500,
    
    # Изоляция транзакций
    isolation_level='read_committed'  # read_uncommitted, read_committed
)
```

## Партиции и репликация

### Лидеры и реплики

```
Partition 0:
├─ Leader (Broker 1) — обслуживает чтение/запись
├─ Follower (Broker 2) — реплика
└─ Follower (Broker 3) — реплика

In-Sync Replicas (ISR): [1, 2, 3]
```

**High Watermark (HW)** — последнее подтверждённое сообщение, видимое консьюмерам.

**Log End Offset (LEO)** — последнее сообщение в партиции.

### Минимальное количество ISR

```properties
# server.properties
min.insync.replicas=2
# Требуется минимум 2 реплики в ISR для записи с acks=all
```

### Предпочтительная реплика

```bash
# Перевод лидерства на preferred replica
kafka-leader-election --bootstrap-server localhost:9092 \
  --election-type preferred --all-topic-partitions
```

## Exactly-Once семантика

### Идемпотентный продюсер

```python
producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    enable_idempotence=True,  # Включает идемпотентность
    acks='all',
    retries=2147483647,  # Max retries
    max_in_flight_requests_per_connection=5  # <= 5 для идемпотентности
)
```

**Sequence numbers** — каждый продюсер имеет уникальный PID и sequence numbers для дедупликации.

### Транзакции

```python
from kafka import KafkaProducer

producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    transactional_id='order-processor-1',
    enable_idempotence=True
)

# Инициализация транзакций
producer.init_transactions()

try:
    # Начало транзакции
    producer.begin_transaction()
    
    # Отправка сообщений
    producer.send('orders', {'order_id': 1})
    producer.send('inventory', {'product_id': 100, 'qty': -1})
    
    # Коммит транзакции
    producer.commit_transaction()
    
except Exception as e:
    # Откат транзакции
    producer.abort_transaction()
```

### Транзакционные консьюмеры

```python
consumer = KafkaConsumer(
    'orders',
    bootstrap_servers=['localhost:9092'],
    group_id='order-processors',
    isolation_level='read_committed'  # Только закоммиченные сообщения
)

producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    transactional_id='processor-1'
)
producer.init_transactions()

for message in consumer:
    try:
        producer.begin_transaction()
        
        # Обработка
        result = process(message.value)
        
        # Отправка результата
        producer.send('processed-orders', result)
        
        # Коммит смещения и транзакции
        producer.send_offsets_to_transaction(
            consumer.position(message.topic),
            consumer.group_id
        )
        producer.commit_transaction()
        
    except Exception:
        producer.abort_transaction()
```

## Kafka Streams

Библиотека для потоковой обработки данных.

### Word Count пример

```python
from kafka.streams import KafkaStreams, StreamsConfig
from kafka.streams.kstream import KStream

config = {
    StreamsConfig.APPLICATION_ID_CONFIG: 'wordcount-app',
    StreamsConfig.BOOTSTRAP_SERVERS_CONFIG: 'localhost:9092',
    StreamsConfig.DEFAULT_KEY_SERDE_CLASS_CONFIG: 'org.apache.kafka.common.serialization.Serdes$StringSerde',
    StreamsConfig.DEFAULT_VALUE_SERDE_CLASS_CONFIG: 'org.apache.kafka.common.serialization.Serdes$StringSerde'
}

def build_topology():
    builder = StreamsBuilder()
    
    # Чтение из топика
    text_lines = builder.stream('input-topic')
    
    # Обработка
    word_counts = (text_lines
        .flat_map(lambda key, value: [(word, 1) for word in value.split()])
        .group_by_key()
        .count()
        .to_stream()
        .map_values(lambda count: str(count))
    )
    
    # Запись в топик
    word_counts.to('output-topic')
    
    return builder.build()

streams = KafkaStreams(build_topology(), config)
streams.start()
```

### Python с Faust (Kafka Streams для Python)

```python
import faust

class Order(faust.Record):
    order_id: int
    amount: float
    customer_id: str

app = faust.App('order-processor', broker='kafka://localhost:9092')

@app.agent(Order.topic('orders'))
async def process_orders(orders):
    async for order in orders:
        print(f"Processing order: {order.order_id}")
        if order.amount > 1000:
            print(f"High value order from {order.customer_id}")

@app.timer(interval=10.0)
async def example_producer():
    await Order.send(
        value=Order(order_id=1, amount=99.99, customer_id='cust-1')
    )

if __name__ == '__main__':
    app.main()
```

### Windowed агрегации

```python
from kafka.streams import Windowed

# Tumbling window (неперекрывающиеся окна)
orders.group_by_key()\
    .window_by(TimeWindows.of(60000))\
    .count()

# Hopping window (перекрывающиеся окна)
orders.group_by_key()\
    .window_by(TimeWindows.of_size_with_grace_period(60000, 10000))\
    .count()

# Session window (окна сессии)
orders.group_by_key()\
    .window_by(SessionWindows.with_gap(300000))\
    .count()
```

### KTable и GlobalKTable

```python
# KTable — изменяемая таблица
users = builder.table('users-topic')

# Присоединение stream к table
orders = builder.stream('orders-topic')
enriched_orders = orders.join(
    users,
    lambda order, user: {**order, **user}
)

# GlobalKTable — полная копия на каждом инстансе
products = builder.global_table('products-topic')

orders = builder.stream('orders-topic')
enriched = orders.join(
    products,
    lambda order, products: {**order, 'product': products[order.product_id]}
)
```

## Kafka Connect

Интеграция с внешними системами.

### Source Connector (чтение из внешней БД)

```json
{
  "name": "mysql-source-connector",
  "config": {
    "connector.class": "io.debezium.connector.mysql.MySqlConnector",
    "database.hostname": "localhost",
    "database.port": "3306",
    "database.user": "debezium",
    "database.password": "dbz",
    "database.server.id": "184054",
    "database.server.name": "dbserver1",
    "database.include.list": "inventory",
    "table.include.list": "inventory.customers",
    "topic.prefix": "dbserver1"
  }
}
```

### Sink Connector (запись в Elasticsearch)

```json
{
  "name": "elasticsearch-sink-connector",
  "config": {
    "connector.class": "io.confluent.connect.elasticsearch.ElasticsearchSinkConnector",
    "connection.url": "http://elasticsearch:9200",
    "topics": "orders",
    "key.ignore": "false",
    "schema.ignore": "true",
    "type.name": "_doc",
    "behavior.on.null.values": "delete"
  }
}
```

**Управление Connect:**

```bash
# Регистрация коннектора
curl -X POST http://localhost:8083/connectors \
  -H "Content-Type: application/json" \
  -d @mysql-source.json

# Список коннекторов
curl http://localhost:8083/connectors

# Статус коннектора
curl http://localhost:8083/connectors/mysql-source/status

# Удаление коннектора
curl -X DELETE http://localhost:8083/connectors/mysql-source
```

## Best Practices

### Продюсеры

```python
# ✅ Хорошо: идемпотентность для exactly-once
producer = KafkaProducer(
    enable_idempotence=True,
    acks='all',
    compression_type='lz4'
)

# ✅ Хорошо: обработка ошибок
future = producer.send('topic', value=data)
try:
    metadata = future.get(timeout=10)
except KafkaError as e:
    logger.error(f"Failed to send: {e}")

# ❌ Плохо: синхронная отправка в цикле
for item in items:
    producer.send('topic', item).get()  # Медленно!

# ✅ Хорошо: батчинг
for item in items:
    producer.send('topic', item)
producer.flush()
```

### Консьюмеры

```python
# ✅ Хорошо: ручной коммит после обработки
consumer = KafkaConsumer(enable_auto_commit=False)
for message in consumer:
    process(message)
    consumer.commit()

# ✅ Хорошо: обработка исключений
try:
    for message in consumer:
        process(message)
        consumer.commit()
except Exception as e:
    logger.error(f"Error: {e}")
    consumer.commit()  # Или пропустить сообщение

# ❌ Плохо: автокоммит до обработки
consumer = KafkaConsumer(enable_auto_commit=True)  # Может потерять сообщения
```

### Партиции

```
# Количество партиций = максимальное количество консьюмеров в группе
# Нельзя увеличить после создания (только в большую сторону)

# Рекомендации:
# - 10-100 MB на партицию
# - Не более 4000 партиций на брокер
# - Кратное количество партиций количеству брокеров
```

### Мониторинг

```bash
# Lag консьюмера (отставание)
kafka-consumer-groups --bootstrap-server localhost:9092 \
  --group order-processors --describe

# Ключевые метрики:
# - Consumer lag — количество необработанных сообщений
# - Under replicated partitions — проблемы с репликацией
# - Offline partitions — недоступные партиции
# - Active controller count — должен быть 1
```

### Конфигурация брокера

```properties
# server.properties
num.partitions=6
default.replication.factor=3
min.insync.replicas=2

# Хранение
log.retention.hours=168
log.segment.bytes=1073741824
log.retention.check.interval.ms=300000

# Производительность
num.network.threads=8
num.io.threads=16
socket.send.buffer.bytes=102400
socket.receive.buffer.bytes=102400
```

## Заключение

Apache Kafka — это мощная платформа для потоковой обработки данных:

- **Высокая пропускная способность** — миллионы сообщений в секунду
- **Горизонтальная масштабируемость** — добавление брокеров и партиций
- **Отказоустойчивость** — репликация и автоматический failover
- **Exactly-Once семантика** — транзакции и идемпотентность
- **Экосистема** — Kafka Streams, Connect, Schema Registry

Используйте Kafka для event-driven архитектуры, потоковой аналитики, интеграции микросервисов и обработки данных в реальном времени.
