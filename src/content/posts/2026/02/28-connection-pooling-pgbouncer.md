---
title: "Connection pooling и PgBouncer — режимы, настройка"
description: "Настройте Connection pooling и PgBouncer: режимы работы, настройка, мониторинг. Оптимизируйте БД для высоких нагрузок."
pubDate: "2026-02-28"
---

# Connection pooling: PgBouncer, режимы

PostgreSQL обрабатывает каждое соединение как отдельный процесс. Это дорого: fork + 5–10 МБ памяти + overhead на аутентификацию. При 500 одновременных соединениях PostgreSQL тратит гигабайты RAM только на управление ими. PgBouncer решает это, поддерживая небольшой пул соединений к базе и раздавая их приложениям по очереди.

## Три режима работы

PgBouncer работает в трёх режимах, которые принципиально отличаются гарантиями:

**Session pooling** — соединение занято на всё время сессии клиента. Экономия минимальная, но полная совместимость с любым SQL (SET, PREPARE, advisory locks).

**Transaction pooling** — соединение возвращается в пул после каждой транзакции. Это основной режим для большинства приложений: 100 активных соединений к PostgreSQL обслуживают 1000+ клиентов. Ограничение: нельзя использовать `LISTEN/NOTIFY`, `SET`, `PREPARE` вне транзакции.

**Statement pooling** — соединение освобождается после каждого оператора. Самый агрессивный режим; несовместим с multi-statement транзакциями. Практически не используется.

## Конфигурация

```ini
# pgbouncer.ini
[databases]
mydb = host=127.0.0.1 port=5432 dbname=mydb

[pgbouncer]
listen_port = 6432
listen_addr = *
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

# Режим пула
pool_mode = transaction

# Размер пула на одну пару (база, пользователь)
default_pool_size = 25

# Максимум клиентских соединений
max_client_conn = 1000

# Сколько соединений держать незанятыми
reserve_pool_size = 5
reserve_pool_timeout = 3

# Логирование
log_connections = 0
log_disconnections = 0
```

```bash
# userlist.txt — хэши паролей или SCRAM-верификаторы
"app_user" "SCRAM-SHA-256$4096:..."
```

Получить SCRAM-верификатор для пользователя:
```sql
SELECT rolpassword FROM pg_authid WHERE rolname = 'app_user';
```

## Мониторинг через псевдобазу pgbouncer

PgBouncer предоставляет статус через специальную базу `pgbouncer`:

```bash
psql -h 127.0.0.1 -p 6432 -U pgbouncer pgbouncer
```

```sql
-- Текущие пулы и использование
SHOW POOLS;
-- database | user     | cl_active | cl_waiting | sv_active | sv_idle | sv_used | maxwait
-- mydb     | app_user | 18        | 2          | 20        | 5       | 0       | 0

-- Общая статистика по базам
SHOW STATS;

-- Текущие соединения клиентов
SHOW CLIENTS;

-- Серверные соединения к PostgreSQL
SHOW SERVERS;
```

`cl_waiting > 0` означает, что клиенты ждут свободного соединения — нужно увеличить `default_pool_size` или оптимизировать долгие транзакции.

## Настройка приложения

С PgBouncer приложение подключается к `localhost:6432` вместо `localhost:5432`. Параметры пула в самом приложении (SQLAlchemy, asyncpg) нужно сократить до минимума — реальный пул управляется PgBouncer:

```python
# SQLAlchemy + PgBouncer в transaction mode
engine = create_async_engine(
    "postgresql+asyncpg://app_user:pass@localhost:6432/mydb",
    pool_size=5,          # небольшой пул на стороне приложения
    max_overflow=0,
    pool_pre_ping=True,   # проверять соединения перед использованием
)
```

В transaction pooling нельзя использовать prepared statements по умолчанию, потому что они привязаны к серверному соединению. Для asyncpg это решается отключением кэша:

```python
async def get_conn():
    conn = await asyncpg.connect(
        "postgresql://app_user:pass@localhost:6432/mydb",
        statement_cache_size=0,  # отключить prepared statements
    )
```

## Подводные камни

**PgBouncer — точка отказа**. Его сбой означает полную недоступность базы для всех приложений. Для надёжности запускают два экземпляра за HAProxy или keepalived.

**`LISTEN/NOTIFY` не работает в transaction mode**. Если приложение использует уведомления PostgreSQL — нужен отдельный процесс с прямым соединением или session mode.

**Таймауты**. PgBouncer закрывает соединения, которые молчат дольше `server_idle_timeout`. Это иногда удивляет приложения, которые держат долгие пустые сессии. Проверяйте `pool_pre_ping` в ORM.

**Prometheus-метрики** — через `pgbouncer_exporter`:
```bash
docker run -e DATA_SOURCE_NAME="postgres://pgbouncer:@localhost:6432/pgbouncer" \
  prometheuscommunity/pgbouncer-exporter
```

Ключевые метрики: `pgbouncer_pools_cl_waiting`, `pgbouncer_pools_sv_active`, `pgbouncer_stats_total_wait_time`.
