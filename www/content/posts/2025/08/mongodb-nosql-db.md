+++
lang = "ru"
title = "MongoDB: NoSQL БД"
description = "Обзор MongoDB как NoSQL базы данных, основные концепции, преимущества и примеры использования."
template = "posts"
thumb = "/imgs/2025/08/mongodb-nosql-db.png"
publication_date = "2025-08-30"
+++

# MongoDB: NoSQL БД

**MongoDB** — одна из самых популярных NoSQL баз данных, работающая с документами в формате BSON (расширение JSON). В отличие от реляционных СУБД, MongoDB хранит данные в коллекциях, где каждый документ может иметь собственную схему.

## 1. Основные концепции

- **Документ** – единица хранения, представлена как JSON‑подобный объект.
- **Коллекция** – набор документов, аналог таблицы в реляционных БД, но без фиксированной схемы.
- **База данных** – контейнер для коллекций.
- **База данных MongoDB** может масштабироваться горизонтально с помощью шардирования и репликации.

## 2. Установка и подключение

Для локальной разработки достаточно установить Community Server и запустить сервис. В продакшене чаще используют контейнеры и управляемые сервисы (Atlas, облачные провайдеры), где конфигурация и обновления берут на себя платформы.

```bash
# Установить MongoDB Community Server
sudo apt-get install -y mongodb

# Запустить сервис
sudo systemctl start mongodb
```

Для подключения из Node.js используйте официальный драйвер. Ниже — минимальный пример: строка подключения указывает хост/порт, `client.connect()` открывает пул соединений, а `client.close()` корректно его закрывает.

```js
const { MongoClient } = require('mongodb');
const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db('mydb');
    const collection = db.collection('items');
    // CRUD операции
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
```

Пояснения:
- Строка подключения может включать параметры пула (`maxPoolSize`), таймауты (`serverSelectionTimeoutMS`) и авторизацию (`mongodb://user:pass@host:27017/db`).
- Пулы соединений важны для производительности веб‑приложений: драйвер повторно использует открытые TCP‑соединения.
- В продакшене задавайте явные таймауты и обработку ошибок подключения, чтобы не блокировать запросы при деградации сети.

## 3. CRUD операции

Базовые операции над документами выглядят так. Документы гибкие по схеме, но лучше поддерживать единообразие полей — это упростит индексацию и аналитику.

```js
// Создание
await collection.insertOne({ name: 'Item 1', qty: 10 });

// Чтение
const item = await collection.findOne({ name: 'Item 1' });

// Обновление
await collection.updateOne({ name: 'Item 1' }, { $set: { qty: 20 } });

// Удаление
await collection.deleteOne({ name: 'Item 1' });
```

Пояснения и приёмы:
- insertOne/insertMany возвращают `insertedId` — используйте его для дальнейших связок.
- findOne/find: добавляйте проекции, чтобы забирать только нужные поля, и лимиты/сортировки.

```js
// Проекция: вернём только name, без _id
const doc = await collection.findOne(
  { name: 'Item 1' },
  { projection: { _id: 0, name: 1 } }
);

// Пагинация: сортировка + пропуск + лимит
const page = await collection
  .find({ qty: { $gte: 1 } }, { projection: { _id: 0, name: 1, qty: 1 } })
  .sort({ qty: -1 })
  .skip(20)
  .limit(10)
  .toArray();

// Upsert: создадим документ, если его нет
await collection.updateOne(
  { name: 'Item 2' },
  { $inc: { qty: 1 }, $setOnInsert: { createdAt: new Date() } },
  { upsert: true }
);
```

## 4. Индексы

```js
// Создание простого индекса
await collection.createIndex({ name: 1 });

// Комплексный индекс
await collection.createIndex({ name: 1, qty: -1 });
```

Индексы ускоряют поиск, но занимают место и замедляют запись. Рекомендации: создавайте индексы под реальные фильтры и сортировки (проверяйте через `explain()` и профайлер), учитывайте порядок полей в составных индексах и избегайте чрезмерного количества индексов на «горячих» коллекциях.

Расширенные примеры:

```js
// Уникальный индекс по name (исключает дубликаты)
await collection.createIndex({ name: 1 }, { unique: true });

// Частичный индекс: только для активных пользователей
await collection.createIndex(
  { email: 1 },
  { unique: true, partialFilterExpression: { active: true } }
);

// TTL индекс: авто‑удаление документов спустя 7 дней после createdAt
await collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });
```

## 5. Агрегация

Aggregation Pipeline позволяет последовательно трансформировать и агрегировать данные, эффективно используя индексы на стадиях `$match`/`$sort`. Ниже — базовый пример: отфильтровать `qty > 5`, сгруппировать по `name` и посчитать сумму.

```js
const pipeline = [
  { $match: { qty: { $gt: 5 } } },
  { $group: { _id: '$name', total: { $sum: '$qty' } } }
];
const result = await collection.aggregate(pipeline).toArray();
```

Расширим пример полезными стадиями:

```js
const pipeline2 = [
  { $match: { category: 'books', qty: { $gt: 0 } } },
  { $project: { _id: 0, name: 1, qty: 1, price: 1, totalValue: { $multiply: ['$qty', '$price'] } } },
  { $sort: { totalValue: -1 } },
  { $limit: 10 }
];
const top = await collection.aggregate(pipeline2, { allowDiskUse: true }).toArray();
```

Ещё один частый паттерн — `$lookup` для соединения коллекций (осторожнее с объёмами и кардинальностью):

```js
const pipeline3 = [
  { $match: { status: 'paid' } },
  { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
  { $unwind: '$user' },
  { $project: { _id: 0, orderId: 1, 'user.email': 1, total: 1 } }
];
```

## 6. Лучшие практики

- Используйте **ObjectId** как уникальный идентификатор.
- Ограничьте размер документов до 16 МБ.
- Настраивайте **репликацию** для высокой доступности.
- Применяйте **шардирование** при больших объёмах данных.
- Храните чувствительные данные в **encryption at rest**.

Дополнительно:
- Проектируйте документы «как читаете»: данные, которые извлекаются вместе, стоит хранить вместе (денормализация с умом).
- Избегайте неограниченного роста массивов в одном документе — лучше выносить в отдельную коллекцию.
- Для критичных денежных операций и строгой консистентности используйте транзакции на replica set/cluster.

### Валидация схемы (JSON Schema)

MongoDB поддерживает валидацию на уровне коллекции — это помогает удерживать базовый контракт полей в гибкой схеме.

```js
await db.createCollection('items', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'qty'],
      properties: {
        name: { bsonType: 'string', minLength: 1 },
        qty: { bsonType: 'int', minimum: 0 },
        createdAt: { bsonType: ['date', 'null'] }
      }
    }
  },
  validationLevel: 'moderate'
});
```

### Транзакции (мульти‑документные)

Работают в replica set/шард‑кластере. Используйте, когда необходимо атомарно изменить несколько документов/коллекций.

```js
const session = client.startSession();
try {
  await session.withTransaction(async () => {
    await db.collection('accounts').updateOne({ _id: a }, { $inc: { balance: -100 } }, { session });
    await db.collection('accounts').updateOne({ _id: b }, { $inc: { balance: 100 } }, { session });
  }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
} finally {
  await session.endSession();
}
```

### Безопасность и доступ

- Включайте аутентификацию и роли (RBAC), ограничивайте права пользователям и сервисам.
- Шифруйте трафик TLS и хранение дисков (encryption at rest).
- Разносите прод и тестовые базы, используйте отдельные учётные записи и сети.

## 7. Заключение

MongoDB предоставляет гибкую схему, масштабируемость и богатый набор инструментов для работы с данными. Он подходит для проектов, где требуется быстрое развитие и динамическая структура данных.