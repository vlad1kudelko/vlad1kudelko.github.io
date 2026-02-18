---
title: "MongoDB: полное руководство по документоориентированным базам данных"
description: "Исчерпывающий гид по MongoDB: CRUD операции, агрегации, индексы, репликация, шардирование и лучшие практики для продакшена."
heroImage: "../../../../assets/imgs/2025/11/17-mongodb-complete-guide.webp"
pubDate: "2025-11-17"
---

# MongoDB: полное руководство для разработчика

**MongoDB** — это документоориентированная NoSQL база данных, которая хранит данные в формате BSON (бинарный JSON). В отличие от реляционных баз, MongoDB не требует фиксированной схемы и позволяет хранить данные в гибкой, иерархической структуре.

В этой статье мы разберём CRUD операции, агрегации, индексы, репликацию, шардирование и лучшие практики использования MongoDB в продакшене.

## Установка и запуск

```bash
# Установка через apt (Debian/Ubuntu)
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Установка через Homebrew (macOS)
brew tap mongodb/brew
brew install mongodb-community

# Запуск сервера
sudo systemctl start mongod
# или
mongod --config /etc/mongod.conf

# Запуск клиента
mongosh
```

**Проверка подключения:**

```bash
mongosh "mongodb://localhost:27017"
# test> db.runCommand({ ping: 1 })
# { ok: 1 }
```

## Основные понятия

**Документ** — основная единица хранения, аналог строки в реляционных БД. Записывается в формате BSON.

```json
{
  "_id": ObjectId("654f8a2b1c9d440012345678"),
  "name": "Alice",
  "email": "alice@example.com",
  "age": 30,
  "tags": ["python", "mongodb"],
  "address": {
    "city": "Moscow",
    "street": "Tverskaya",
    "building": "1"
  }
}
```

**Коллекция** — группа документов, аналог таблицы. Коллекции не требуют фиксированной схемы.

**База данных** — контейнер для коллекций. Один сервер MongoDB может хранить множество баз данных.

**_id** — уникальный идентификатор документа. Если не указан, MongoDB автоматически генерирует ObjectId.

## CRUD операции

### Create (Создание)

```javascript
// Вставка одного документа
db.users.insertOne({
  name: "Bob",
  email: "bob@example.com",
  age: 25,
  createdAt: new Date()
})

// Вставка нескольких документов
db.users.insertMany([
  { name: "Charlie", email: "charlie@example.com", age: 35 },
  { name: "Diana", email: "diana@example.com", age: 28 },
  { name: "Eve", email: "eve@example.com", age: 32 }
])

// Вставка с явным _id
db.users.insertOne({
  _id: "user_001",
  name: "Frank",
  email: "frank@example.com"
})
```

**Python с PyMongo:**

```python
from pymongo import MongoClient
from datetime import datetime

client = MongoClient("mongodb://localhost:27017/")
db = client.myapp
users = db.users

# Вставка одного документа
result = users.insert_one({
    "name": "Alice",
    "email": "alice@example.com",
    "age": 30,
    "created_at": datetime.utcnow()
})
print(f"Inserted ID: {result.inserted_id}")

# Вставка нескольких документов
results = users.insert_many([
    {"name": "Bob", "email": "bob@example.com", "age": 25},
    {"name": "Charlie", "email": "charlie@example.com", "age": 35}
])
print(f"Inserted IDs: {results.inserted_ids}")
```

### Read (Чтение)

```javascript
// Найти все документы
db.users.find()

// Найти с фильтром
db.users.find({ age: 30 })

// Найти один документ
db.users.findOne({ email: "alice@example.com" })

// Операторы сравнения
db.users.find({ age: { $gt: 25 } })        // > 25
db.users.find({ age: { $gte: 25 } })       // >= 25
db.users.find({ age: { $lt: 30 } })        // < 30
db.users.find({ age: { $lte: 30 } })       // <= 30
db.users.find({ age: { $ne: 30 } })        // != 30
db.users.find({ age: { $in: [25, 30, 35] } })
db.users.find({ age: { $nin: [20, 40] } })

// Логические операторы
db.users.find({
  $and: [
    { age: { $gt: 25 } },
    { age: { $lt: 35 } }
  ]
})

db.users.find({
  $or: [
    { age: 25 },
    { age: 30 }
  ]
})

db.users.find({
  age: { $not: { $lt: 30 } }
})

// Работа с вложенными полями
db.users.find({ "address.city": "Moscow" })

// Работа с массивами
db.users.find({ tags: "python" })          // Содержит "python"
db.users.find({ tags: { $all: ["python", "mongodb"] } })
db.users.find({ tags: { $size: 3 } })      // Ровно 3 элемента

// Регулярные выражения
db.users.find({ name: { $regex: /^A/i } })  // Начинается на A

// Проекция (выбор полей)
db.users.find(
  { age: { $gt: 25 } },
  { name: 1, email: 1, _id: 0 }  // Вернуть name, email, без _id
)

// Сортировка
db.users.find().sort({ age: 1 })    // По возрастанию
db.users.find().sort({ age: -1 })   // По убыванию

// Лимит и пропуск
db.users.find().limit(10)
db.users.find().skip(20).limit(10)  // Пагинация

// Подсчёт документов
db.users.countDocuments({ age: { $gt: 25 } })
db.users.estimatedDocumentCount()   // Быстрая приблизительная оценка
```

**Python примеры:**

```python
from pymongo import ASCENDING, DESCENDING

# Найти все документы
for user in users.find():
    print(user)

# Найти с фильтром
user = users.find_one({ "email": "alice@example.com" })

# Операторы
adult_users = users.find({ "age": { "$gte": 18 } })

# Сортировка и лимит
top_users = users.find().sort("age", DESCENDING).limit(5)

# Проекция
names_only = users.find({}, { "name": 1, "_id": 0 })

# Подсчёт
count = users.count_documents({ "age": { "$gt": 25 } })
```

### Update (Обновление)

```javascript
// Обновление одного документа
db.users.updateOne(
  { email: "alice@example.com" },
  { $set: { age: 31 } }
)

// Обновление нескольких документов
db.users.updateMany(
  { age: { $lt: 18 } },
  { $set: { isMinor: true } }
)

// Операторы обновления
$set       // Установить значение
$unset     // Удалить поле
$inc       // Инкремент
$mul       // Умножение
$min       // Минимум (если меньше текущего)
$max       // Максимум (если больше текущего)
$rename    // Переименовать поле

// Примеры
db.users.updateOne(
  { _id: 1 },
  {
    $set: { name: "Alice Updated" },
    $inc: { age: 1 },
    $unset: { tempField: "" }
  }
)

// Обновление массивов
$push      // Добавить элемент
$pop       // Удалить первый/последний элемент
$pull      // Удалить по значению
$addToSet  // Добавить, если нет (уникальность)
$each      // Несколько элементов
$slice     // Ограничить размер массива

db.users.updateOne(
  { _id: 1 },
  {
    $push: { tags: "django" },
    $addToSet: { tags: "python" },  // Не добавит, если уже есть
    $pull: { tags: "old_tag" }
  }
)

// Обновление вложенных документов
db.users.updateOne(
  { _id: 1 },
  { $set: { "address.city": "Saint Petersburg" } }
)

// Замена всего документа
db.users.replaceOne(
  { _id: 1 },
  { name: "New Name", email: "new@example.com" }
  // _id сохраняется, остальные поля заменяются
)

// Upsert (обновление или вставка)
db.users.updateOne(
  { email: "newuser@example.com" },
  { $set: { name: "New User", age: 25 } },
  { upsert: true }  // Создаст, если не найден
)
```

**Python примеры:**

```python
# Обновление одного документа
result = users.update_one(
    { "email": "alice@example.com" },
    { "$set": { "age": 31 } }
)
print(f"Matched: {result.matched_count}, Modified: {result.modified_count}")

# Обновление нескольких
result = users.update_many(
    { "age": { "$lt": 18 } },
    { "$set": { "isMinor": True } }
)

# Upsert
result = users.update_one(
    { "email": "newuser@example.com" },
    { "$set": { "name": "New User", "age": 25 } },
    { "upsert": True }
)
print(f"Upserted ID: {result.upserted_id}")

# Обновление массива
users.update_one(
    { "_id": 1 },
    { "$push": { "tags": "django" } }
)
```

### Delete (Удаление)

```javascript
// Удаление одного документа
db.users.deleteOne({ email: "alice@example.com" })

// Удаление нескольких документов
db.users.deleteMany({ age: { $lt: 18 } })

// Удаление всех документов (осторожно!)
db.users.deleteMany({})

// Проверка перед удалением
db.users.countDocuments({ age: { $lt: 18 } })
```

**Python:**

```python
# Удаление одного
result = users.delete_one({ "email": "alice@example.com" })
print(f"Deleted: {result.deleted_count}")

# Удаление нескольких
result = users.delete_many({ "age": { "$lt": 18 } })
print(f"Deleted: {result.deleted_count}")
```

## Агрегации

Агрегации позволяют обрабатывать данные через конвейер (pipeline).

### Основные этапы конвейера

```javascript
// $match - фильтрация (как find)
// $project - трансформация документов
// $group - группировка
// $sort - сортировка
// $limit - ограничение
// $skip - пропуск
// $lookup - JOIN с другой коллекцией
// $unwind - развернуть массив
// $addFields - добавить вычисляемые поля

// Пример: статистика по возрастам
db.users.aggregate([
  {
    $match: { age: { $gte: 18 } }
  },
  {
    $group: {
      _id: "$age",
      count: { $sum: 1 },
      avgSalary: { $avg: "$salary" }
    }
  },
  {
    $sort: { count: -1 }
  },
  {
    $limit: 10
  }
])

// Пример: группировка по диапазонам
db.users.aggregate([
  {
    $group: {
      _id: {
        $switch: {
          branches: [
            { case: { $lt: ["$age", 18] }, then: "minor" },
            { case: { $lt: ["$age", 30] }, then: "young" },
            { case: { $lt: ["$age", 50] }, then: "middle" }
          ],
          default: "senior"
        }
      },
      count: { $sum: 1 }
    }
  }
])

// $lookup - LEFT JOIN
db.orders.aggregate([
  {
    $lookup: {
      from: "users",
      localField: "userId",
      foreignField: "_id",
      as: "user"
    }
  },
  { $unwind: "$user" }  // Преобразовать массив в документ
])

// $unwind - развернуть массив
db.posts.aggregate([
  { $unwind: "$tags" },
  {
    $group: {
      _id: "$tags",
      count: { $sum: 1 }
    }
  }
])

// Вычисляемые поля
db.products.aggregate([
  {
    $addFields: {
      discountedPrice: { $multiply: ["$price", 0.9] },
      fullName: { $concat: ["$firstName", " ", "$lastName"] },
      createdAt: { $toDate: "$_id" }  // Из ObjectId
    }
  }
])

// Кондициональная логика
db.users.aggregate([
  {
    $addFields: {
      status: {
        $cond: {
          if: { $gte: ["$age", 18] },
          then: "adult",
          else: "minor"
        }
      }
    }
  }
])
```

**Python примеры:**

```python
# Простая агрегация
pipeline = [
    { "$match": { "age": { "$gte": 18 } } },
    { "$group": {
        "_id": "$age",
        "count": { "$sum": 1 }
    }},
    { "$sort": { "count": -1 } }
]
results = users.aggregate(pipeline)

# С lookup (JOIN)
pipeline = [
    { "$lookup": {
        "from": "orders",
        "localField": "_id",
        "foreignField": "userId",
        "as": "orders"
    }},
    { "$addFields": {
        "totalOrders": { "$size": "$orders" }
    }}
]
results = users.aggregate(pipeline)
```

### Агрегатные функции

```javascript
$sum      // Сумма
$avg      // Среднее
$min      // Минимум
$max      // Максимум
$push     // Массив значений
$addToSet // Уникальный массив
$first    // Первое значение
$last     // Последнее значение
$count    // Количество
$stdDevPop    // Стандартное отклонение
$stdDevSamp   // Стандартное отклонение (выборка)
```

## Индексы

Индексы ускоряют чтение, но замедляют запись.

### Типы индексов

```javascript
// Одиночный индекс
db.users.createIndex({ email: 1 })  // 1 = ascending, -1 = descending

// Составной индекс
db.users.createIndex({ lastName: 1, firstName: 1 })

// Мультиключевой индекс (для массивов)
db.posts.createIndex({ tags: 1 })

// Текстовый индекс
db.articles.createIndex({ title: "text", content: "text" })

// Поиск по тексту
db.articles.find({
  $text: { $search: "python mongodb" }
})

// Геоспространственный индекс
db.places.createIndex({ location: "2dsphere" })

// Поиск рядом
db.places.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [37.6176, 55.7558] },
      $maxDistance: 5000  // метров
    }
  }
})

// Уникальный индекс
db.users.createIndex({ email: 1 }, { unique: true })

// Частичный индекс (только для документов с условием)
db.users.createIndex(
  { email: 1 },
  { partialFilterExpression: { isActive: true } }
)

// TTL индекс (автоудаление по времени)
db.sessions.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 3600 }
)
```

**Управление индексами:**

```javascript
// Показать все индексы
db.users.getIndexes()

// Удалить индекс
db.users.dropIndex("email_1")

// Удалить все кроме _id
db.users.dropIndexes()

// Перестроить индекс
db.users.reIndex()

// Анализ использования индексов
db.users.aggregate([{ $indexStats: {} }])
```

**Python:**

```python
# Создание индекса
users.create_index([("email", ASCENDING)], unique=True)
users.create_index([("lastName", ASCENDING), ("firstName", ASCENDING)])

# Текстовый индекс
users.create_index([("bio", "text")])

# Частичный индекс
users.create_index(
    [("email", ASCENDING)],
    partialFilterExpression={"isActive": True}
)
```

### Explain (Анализ запросов)

```javascript
// Анализ плана выполнения
db.users.find({ email: "alice@example.com" }).explain("executionStats")

// Вывод:
// - winningPlan: выбранный план
// - executionStats: статистика выполнения
// - nReturned: количество возвращённых документов
// - totalDocsExamined: сколько документов просмотрено
// - indexName: использованный индекс
```

## Репликация

Репликация обеспечивает отказоустойчивость и чтение с реплик.

### Replica Set

Минимум 3 ноды: 1 primary + 2 secondary.

**Запуск реплика-сета (локально):**

```bash
# Терминал 1
mkdir -p /data/rs0-0
mongod --replSet rs0 --port 27017 --dbpath /data/rs0-0 --bind_ip localhost

# Терминал 2
mkdir -p /data/rs0-1
mongod --port 27018 --dbpath /data/rs0-1 --bind_ip localhost

# Терминал 3
mkdir -p /data/rs0-2
mongod --port 27019 --dbpath /data/rs0-2 --bind_ip localhost
```

**Инициализация:**

```javascript
// Подключение к первой ноде
mongosh --port 27017

// Инициализация реплика-сета
rs.initiate({
  _id: "rs0",
  members: [
    { _id: 0, host: "localhost:27017", priority: 2 },
    { _id: 1, host: "localhost:27018", priority: 1 },
    { _id: 2, host: "localhost:27019", priority: 1 }
  ]
})

// Проверка статуса
rs.status()

// Проверка конфигурации
rs.conf()

// Добавление члена
rs.add("localhost:27020")

// Удаление члена
rs.remove("localhost:27020")

// Принудительный failover
rs.stepDown()
```

**Подключение с реплика-сетом:**

```python
from pymongo import MongoClient, ReadPreference

# Подключение к реплика-сету
client = MongoClient(
    "mongodb://localhost:27017,localhost:27018,localhost:27019/?replicaSet=rs0"
)

# Чтение с secondary (для снижения нагрузки на primary)
client = MongoClient(
    "mongodb://localhost:27017,localhost:27018,localhost:27019/?replicaSet=rs0&readPreference=secondaryPreferred"
)
```

## Шардирование

Шардирование — горизонтальное масштабирование через разделение данных.

### Компоненты кластера

**Shard** — хранит часть данных (реплика-сет).

**Config Server** — хранит метаданные кластера (реплика-сет).

**Mongos** — роутер запросов (stateless).

### Настройка шардирования

```bash
# Запуск config server
mongod --configsvr --replSet csReplSet --port 27019 --dbpath /data/config

# Запуск shard
mongod --shardsvr --replSet shard01 --port 27018 --dbpath /data/shard01

# Запуск mongos
mongos --configdb csReplSet/localhost:27019 --port 27017
```

**Инициализация:**

```javascript
// Подключение к mongos
mongosh --port 27017

// Добавление шарда
sh.addShard("shard01/localhost:27018")

// Включение шардирования для базы
sh.enableSharding("myapp")

// Шардирование коллекции
sh.shardCollection("myapp.users", { userId: "hashed" })

// Составной шардированный ключ
sh.shardCollection("myapp.orders", { customerId: 1, orderId: 1 })

// Зонирование (привязка данных к шардам)
sh.addTagRange(
  "myapp.users",
  { region: "EU" },
  { region: "EU~" },
  "shard-eu"
)
```

### Выбор шардированного ключа

**Хороший ключ:**
- Высокая кардинальность (много уникальных значений)
- Равномерное распределение записей
- Частые запросы используют ключ

**Плохой ключ:**
- Монотонно возрастающий (timestamp, _id)
- Низкая кардинальность (gender, status)

## Транзакции

MongoDB поддерживает многодокументные транзакции (с версии 4.0).

```javascript
const session = db.getMongo().startSession();
session.startTransaction();

try {
  db.accounts.updateOne(
    { _id: "acc1" },
    { $inc: { balance: -100 } },
    { session }
  );
  
  db.accounts.updateOne(
    { _id: "acc2" },
    { $inc: { balance: 100 } },
    { session }
  );
  
  session.commitTransaction();
} catch (error) {
  session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

**Python:**

```python
from pymongo import MongoClient

client = MongoClient()

with client.start_session() as session:
    with session.start_transaction():
        client.db.accounts.update_one(
            {"_id": "acc1"},
            {"$inc": {"balance": -100}},
            session=session
        )
        client.db.accounts.update_one(
            {"_id": "acc2"},
            {"$inc": {"balance": 100}},
            session=session
        )
```

## Best Practices

### Схема данных

**Встраивание vs Ссылки:**

```javascript
// Встраивание (для данных "один ко многим", читаемых вместе)
{
  _id: "order123",
  customer: {
    name: "Alice",
    email: "alice@example.com"
  },
  items: [
    { product: "Laptop", qty: 1, price: 1000 },
    { product: "Mouse", qty: 2, price: 50 }
  ]
}

// Ссылки (для больших данных или частых обновлений)
{
  _id: "order123",
  customerId: "user456",
  itemIds: ["item1", "item2", "item3"]
}
```

### Валидация схемы

```javascript
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "email", "age"],
      properties: {
        name: { bsonType: "string" },
        email: {
          bsonType: "string",
          pattern: "^.+@.+\\..+$"
        },
        age: { bsonType: "int", minimum: 0 }
      }
    }
  }
})
```

### Оптимизация запросов

```javascript
// Используйте проекцию
db.users.find({}, { name: 1, email: 1 })

// Избегайте $where и $function
// Вместо $where: { $where: "this.age > 25" }
// Используйте: { age: { $gt: 25 } }

// Ограничивайте результат
db.users.find().limit(100)

// Используйте покрывающие индексы
// Индекс покрывает все поля запроса и проекции
```

### Мониторинг

```javascript
// Текущие операции
db.currentOp()

// Медленные запросы
db.setProfileLevel(1, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(5)

// Статистика базы
db.stats()

// Статистика коллекции
db.users.stats()

// Размер коллекции
db.users.totalSize()
```

### Резервное копирование

```bash
# mongodump
mongodump --out /backup/mongodb

# mongorestore
mongorestore /backup/mongodb

# С конкретной базы
mongodump --db myapp --out /backup

# С конкретной коллекции
mongodump --db myapp --collection users --out /backup

# Восстановление
mongorestore --db myapp /backup/myapp/
```

## Заключение

MongoDB — это гибкая, масштабируемая база данных для современных приложений:

- **Гибкая схема** — быстрая итерация разработки
- **Мощные агрегации** — сложная аналитика без дополнительных инструментов
- **Горизонтальное масштабирование** — шардирование для больших объёмов
- **Отказоустойчивость** — репликация и автоматический failover
- **Богатый查询 язык** — поддержка сложных запросов и индексов

Используйте MongoDB для проектов с быстро меняющейся схемой, большими объёмами данных и высокими требованиями к масштабируемости.
