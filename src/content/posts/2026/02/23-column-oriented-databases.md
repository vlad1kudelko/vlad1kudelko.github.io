---
title: "Column-oriented БД, ClickHouse, аналитика"
description: "Используйте Column-oriented БД: ClickHouse для аналитики. Быстрые запросы к большим данным и агрегации в реальном времени."
pubDate: "2026-02-23"
---

# Column-oriented БД: ClickHouse

ClickHouse делает аналитический запрос к 100 миллионам строк за меньше секунды -- тот же запрос в PostgreSQL займёт 30-60 секунд. Это не магия, а следствие колончатого хранения: для агрегаций читаются только нужные колонки, а не все данные каждой строки.

PostgreSQL -- рабочая лошадь для транзакций. ClickHouse -- гоночный болид для аналитики. Метрики продукта, воронки конверсии, retention-анализ, событийная аналитика -- всё это задачи ClickHouse. Реляционная БД с теми же данными либо не справится по скорости, либо потребует сложных предвычислений.

> **Key Takeaways**
> - Колончатое хранение читает только нужные поля: запрос по 2 из 100 колонок обрабатывает в 50 раз меньше данных
> - `PARTITION BY toYYYYMM(date)` делает удаление устаревших данных мгновенным -- один `DROP PARTITION`
> - Материализованные представления обновляются автоматически при вставке: дашборды читают готовые агрегаты за миллисекунды
> - `INSERT` поодиночке убивает производительность -- минимальный батч 1000 строк, оптимальный 10 000-100 000
> - DuckDB -- замена для аналитики внутри Python-процесса без отдельного сервера, до нескольких гигабайт данных

Если вы работаете с событийной аналитикой или метриками -- [посмотрите также на TimescaleDB для временных рядов](/posts/2026/02/21-timeseries-databases). Это близкие задачи с разными инструментами.

## Почему колончатое хранение?

В строковой БД (PostgreSQL, MySQL) данные хранятся строками:
```
[id=1, user=Alice, amount=1000, date=2026-01-15]
[id=2, user=Bob, amount=2500, date=2026-01-16]
[id=3, user=Carol, amount=750, date=2026-01-17]
```

В колончатой БД каждая колонка хранится отдельно:
```
id: [1, 2, 3, ...]
user: [Alice, Bob, Carol, ...]
amount: [1000, 2500, 750, ...]
date: [2026-01-15, 2026-01-16, 2026-01-17, ...]
```

Для запроса `SELECT SUM(amount) FROM orders WHERE date > '2026-01-01'` нужно прочитать только колонки `amount` и `date`. Строковая БД читает все колонки каждой строки. Колончатая -- только нужные. При 100 колонках в таблице это разница в 98% объёма I/O.

Дополнительный бонус: однородные данные в колонке сжимаются в 5-10 раз лучше. Тысячи похожих строк типа `page_view`, `click`, `purchase` сжимаются до минимума. Итог -- меньше диска и быстрее чтение.

## ClickHouse: ключевые концепции

### Движки таблиц

ClickHouse имеет множество движков. Основной для аналитики -- `MergeTree`:

```sql
CREATE TABLE events (
    event_date Date,
    event_time DateTime,
    user_id UInt64,
    event_type LowCardinality(String),
    properties String,
    session_id UUID
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_date, user_id, event_type)
SETTINGS index_granularity = 8192;
```

`ORDER BY` -- это первичный ключ. ClickHouse хранит данные отсортированными по нему, что обеспечивает быстрый поиск. `PARTITION BY` делит данные на партиции по месяцам. Удаление месячной партиции мгновенно: один DDL-запрос без сканирования данных.

### Вставка данных

ClickHouse оптимизирован для пакетной вставки:

```python
import clickhouse_connect

client = clickhouse_connect.get_client(host='localhost', port=8123)

# Пакетная вставка, так надо делать
rows = [
    ('2026-02-01', '2026-02-01 12:00:00', 1001, 'page_view', '{"page": "/home"}', 'abc-123'),
    ('2026-02-01', '2026-02-01 12:01:00', 1001, 'click', '{"button": "buy"}', 'abc-123'),
    ('2026-02-01', '2026-02-01 12:02:00', 1002, 'page_view', '{"page": "/cart"}', 'def-456'),
]

client.insert('events', rows,
    column_names=['event_date', 'event_time', 'user_id', 'event_type', 'properties', 'session_id'])
```

Никогда не делайте `INSERT` по одной строке в ClickHouse. Минимальный размер батча -- 1000 строк, оптимальный -- 10 000-100 000. Каждый отдельный INSERT создаёт part на диске; при высокой частоте вставок ClickHouse не успевает их сливать и начинает выдавать ошибки `Too many parts`.

### Аналитические запросы

```sql
-- Ежедневные активные пользователи за последний месяц
SELECT
    toDate(event_time) AS date,
    uniqExact(user_id) AS dau
FROM events
WHERE event_date >= today() - 30
GROUP BY date
ORDER BY date;

-- Воронка конверсии
SELECT
    countIf(event_type = 'page_view') AS views,
    countIf(event_type = 'click') AS clicks,
    countIf(event_type = 'purchase') AS purchases,
    ROUND(countIf(event_type = 'purchase') / countIf(event_type = 'page_view') * 100, 2) AS conversion_rate
FROM events
WHERE event_date = today();

-- Retention: пользователи, вернувшиеся через 7 дней
SELECT
    first_date,
    COUNT(DISTINCT user_id) AS cohort_size,
    COUNTDistinctIf(user_id, event_date >= first_date + 7 AND event_date < first_date + 8) AS retained,
    ROUND(retained / cohort_size * 100, 1) AS retention_7d
FROM (
    SELECT
        user_id,
        MIN(event_date) AS first_date
    FROM events
    GROUP BY user_id
) cohorts
JOIN events USING (user_id)
GROUP BY first_date
ORDER BY first_date;
```

### Материализованные представления

ClickHouse умеет автоматически агрегировать данные при вставке:

```sql
-- Движок SummingMergeTree для автоматической суммаризации
CREATE TABLE daily_stats (
    date Date,
    event_type LowCardinality(String),
    user_count UInt64,
    event_count UInt64
)
ENGINE = SummingMergeTree((user_count, event_count))
ORDER BY (date, event_type);

-- Материализованное представление: данные из events → daily_stats
CREATE MATERIALIZED VIEW events_to_daily_stats
TO daily_stats AS
SELECT
    toDate(event_time) AS date,
    event_type,
    uniq(user_id) AS user_count,
    count() AS event_count
FROM events
GROUP BY date, event_type;
```

Теперь каждая вставка в `events` автоматически обновляет `daily_stats`. Запросы к статистике работают мгновенно, без сканирования исходной таблицы. Дашборды читают `daily_stats` -- миллисекунды вместо секунд.

## Особенности, о которых нужно знать

### Нет UPDATE и DELETE в привычном смысле

ClickHouse -- append-only система. `UPDATE` и `DELETE` существуют, но работают асинхронно через мутации:

```sql
-- Это мутация, выполняется в фоне, не мгновенно!
ALTER TABLE events DELETE WHERE user_id = 1001;
ALTER TABLE events UPDATE event_type = 'click_v2' WHERE event_type = 'click';
```

Для сценариев с частыми обновлениями используйте `ReplacingMergeTree`: при слиянии чанков дубликаты по ключу автоматически удаляются, остаётся последняя версия. Это идиоматичный способ хранить "последнее состояние" объекта в ClickHouse.

### Eventual consistency при чтении

После вставки данные сразу видны, но несколько параллельных вставок могут не сразу слиться в один чанк. `FINAL` в запросе форсирует дедупликацию, но замедляет чтение. Для аналитики это обычно не проблема, но важно понимать при работе с `ReplacingMergeTree`.

### Distributed таблицы для кластера

```sql
-- Локальная таблица на каждом шарде
CREATE TABLE events_local ON CLUSTER my_cluster (...)
ENGINE = ReplicatedMergeTree(...)
ORDER BY (...);

-- Распределённая таблица поверх
CREATE TABLE events ON CLUSTER my_cluster
ENGINE = Distributed(my_cluster, default, events_local, rand());
```

## DuckDB как альтернатива

Если задача -- аналитика внутри Python-скрипта, Jupyter Notebook или локального ETL без отдельного сервера, стоит посмотреть на DuckDB. Он embedded, работает прямо в процессе, читает Parquet и CSV напрямую, поддерживает полный SQL с JOIN'ами. На данных до нескольких гигабайт DuckDB быстрее ClickHouse просто за счёт отсутствия сетевых накладных расходов.

```python
import duckdb

# Аналитика прямо по Parquet без загрузки в память
result = duckdb.sql("""
    SELECT
        DATE_TRUNC('day', event_time) AS date,
        COUNT(DISTINCT user_id) AS dau
    FROM read_parquet('s3://bucket/events/*.parquet')
    WHERE event_date >= CURRENT_DATE - INTERVAL 30 DAYS
    GROUP BY 1
    ORDER BY 1
""").fetchdf()
```

ClickHouse выигрывает на масштабе: 500K+ строк в секунду при вставке, горизонтальное шардирование, materialized views с автообновлением при записи. Яндекс, Cloudflare, Uber используют его там, где аналитика должна работать на петабайтах в реальном времени. На объёмах меньше нескольких сотен гигабайт возможности кластера часто не нужны -- DuckDB справится быстрее и проще.

## Итог

ClickHouse -- правильный выбор когда аналитика стала медленной в PostgreSQL, объём данных растёт, и нужны дашборды в реальном времени. Колончатое хранение, партиционирование по времени и материализованные представления дают скорость, которую реляционные БД не могут обеспечить на аналитических запросах.

Следующий шаг -- [SQLAlchemy 2.0 для работы с PostgreSQL из Python](/posts/2026/02/24-sqlalchemy-2/).
