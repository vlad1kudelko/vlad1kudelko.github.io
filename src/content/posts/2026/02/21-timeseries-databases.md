---
title: "Timeseries базы данных — TimescaleDB, InfluxDB"
description: "Используйте Timeseries базы данных: TimescaleDB для PostgreSQL, InfluxDB. Храните и анализируйте временные ряды эффективно."
pubDate: "2026-02-21"
---

# Timeseries БД: TimescaleDB, InfluxDB

Метрики сервера, показания IoT-датчиков, события трекинга пользователей, биржевые котировки — всё это временные ряды. Стандартные реляционные базы данных плохо справляются с такими данными при больших объёмах: вставка миллионов строк в секунду, запросы агрегаций за месяц, автоматическое удаление устаревших данных — всё это болевые точки PostgreSQL без специализации.

## Чем timeseries данные отличаются от обычных?

Три ключевых свойства, определяющих архитектуру:

**Immutability** — данные почти никогда не обновляются после записи. Запись датчика за прошлую секунду не меняется. Это позволяет применять агрессивное сжатие и особые стратегии хранения.

**Упорядоченность по времени** — большинство запросов содержат условие `WHERE time > X AND time < Y`. Данные физически хранятся в порядке времени для быстрого диапазонного чтения.

**Retention policy** — старые данные обычно удаляются или агрегируются (downsampling). Хранить посекундные метрики за 5 лет нет смысла, но месячные агрегаты — полезны.

## TimescaleDB: PostgreSQL для временных рядов

TimescaleDB — расширение PostgreSQL, превращающее обычную таблицу в гипертаблицу (hypertable). Данные автоматически разбиваются на чанки по времени, каждый из которых хранится отдельно.

### Установка и создание гипертаблицы

```sql
-- В PostgreSQL с установленным расширением
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE metrics (
    time        TIMESTAMPTZ NOT NULL,
    device_id   TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    value       DOUBLE PRECISION
);

-- Превращаем в гипертаблицу с чанками по 1 дню
SELECT create_hypertable('metrics', 'time', chunk_time_interval => INTERVAL '1 day');

-- Создаём индекс для запросов по device_id
CREATE INDEX ON metrics (device_id, time DESC);
```

После этого `INSERT` работает как обычно, но TimescaleDB автоматически распределяет данные по чанкам.

### Запросы с time_bucket

Killer feature TimescaleDB — функция `time_bucket`, аналог `DATE_TRUNC` но более гибкая:

```sql
-- Средняя температура по 5-минутным интервалам за последний час
SELECT
    time_bucket('5 minutes', time) AS bucket,
    device_id,
    AVG(value) AS avg_temp,
    MAX(value) AS max_temp
FROM metrics
WHERE
    metric_name = 'temperature'
    AND time >= NOW() - INTERVAL '1 hour'
GROUP BY bucket, device_id
ORDER BY bucket DESC;
```

Запрос использует индекс по времени и сканирует только 12 чанков (последний час) вместо всей таблицы.

### Политики удаления и сжатия

```sql
-- Автоматически удалять данные старше 90 дней
SELECT add_retention_policy('metrics', INTERVAL '90 days');

-- Включить сжатие для старых чанков (старше 7 дней)
ALTER TABLE metrics SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'device_id',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('metrics', INTERVAL '7 days');
```

Сжатие снижает занимаемое место в 10–20 раз для числовых данных.

### Непрерывные агрегаты (Continuous Aggregates)

Вместо того чтобы каждый раз считать агрегаты на лету, TimescaleDB может хранить их материализованно и обновлять автоматически:

```sql
CREATE MATERIALIZED VIEW metrics_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS hour,
    device_id,
    metric_name,
    AVG(value) AS avg_value,
    MIN(value) AS min_value,
    MAX(value) AS max_value,
    COUNT(*) AS sample_count
FROM metrics
GROUP BY hour, device_id, metric_name;

-- Автообновление каждые 10 минут
SELECT add_continuous_aggregate_policy('metrics_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset   => INTERVAL '10 minutes',
    schedule_interval => INTERVAL '10 minutes'
);
```

Запросы к `metrics_hourly` работают мгновенно даже при миллиардах строк в `metrics`.

## InfluxDB: специализированная timeseries БД

InfluxDB — база данных, спроектированная с нуля для временных рядов. Версия 3.0 использует Apache Arrow и Parquet под капотом, обеспечивая исключительную производительность.

### Концепции InfluxDB

- **Measurement** — аналог таблицы (`cpu`, `temperature`, `requests`)
- **Tags** — индексированные строковые метаданные (`host=server1`, `region=eu`)
- **Fields** — числовые значения (`usage_user=45.2`, `usage_idle=54.8`)
- **Timestamp** — временная метка записи

### Запись данных через Python

```python
import influxdb_client
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS
from datetime import datetime

client = InfluxDBClient(
    url="http://localhost:8086",
    token="my-token",
    org="my-org"
)

write_api = client.write_api(write_options=SYNCHRONOUS)

# Запись одной точки
point = (
    Point("cpu_usage")
    .tag("host", "server1")
    .tag("region", "eu-west")
    .field("usage_user", 45.2)
    .field("usage_system", 12.1)
    .field("usage_idle", 42.7)
    .time(datetime.utcnow())
)

write_api.write(bucket="metrics", org="my-org", record=point)

# Пакетная запись для высокой нагрузки
with client.write_api() as write_api:
    points = [
        Point("temperature")
        .tag("device_id", f"sensor_{i}")
        .field("value", 20.0 + i * 0.1)
        for i in range(1000)
    ]
    write_api.write(bucket="metrics", record=points)
```

### Flux и SQL запросы

InfluxDB 3.0 поддерживает SQL:

```sql
-- Среднее значение CPU за последние 24 часа по хостам
SELECT
    DATE_BIN(INTERVAL '1 hour', time, '1970-01-01') AS hour,
    host,
    AVG(usage_user) AS avg_cpu
FROM cpu_usage
WHERE time >= NOW() - INTERVAL '24 hours'
GROUP BY hour, host
ORDER BY hour DESC;
```

## TimescaleDB vs InfluxDB

Разница не в скорости — обе справляются с типичными нагрузками мониторинга. Разница в том, откуда вы стартуете.

TimescaleDB — это PostgreSQL. Joins с таблицей пользователей, транзакции, знакомый SQL, весь существующий инструментарий работает без изменений. Настройка гипертаблицы занимает 15 минут. Если у вас уже есть Postgres, добавить timeseries-хранение — это одна команда `CREATE EXTENSION`.

InfluxDB 3.0 строится на Apache Arrow и Parquet, что даёт более агрессивное сжатие (до 30x против 20x у TimescaleDB) и лучшую производительность на сверхвысоких частотах записи. Архитектура заточена под сценарии, где данные никогда не пересекаются с реляционными таблицами — чистый IoT или метрики без связей.
