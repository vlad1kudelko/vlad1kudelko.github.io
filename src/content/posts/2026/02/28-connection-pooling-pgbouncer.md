---
title: "Connection pooling и PgBouncer, режимы, настройка"
description: "Настройте Connection pooling и PgBouncer: режимы работы, настройка, мониторинг. Оптимизируйте БД для высоких нагрузок."
pubDate: "2026-02-28"
---

# Connection pooling: PgBouncer, режимы

PgBouncer снижает нагрузку на PostgreSQL в 10-50 раз, позволяя тысячам клиентских соединений работать через пул из 20-50 реальных соединений к базе. Если ваше приложение открывает новое соединение на каждый запрос или держит сотни idle-соединений, PgBouncer решает это без изменения кода.

PostgreSQL обрабатывает каждое соединение как отдельный OS-процесс. Fork нового процесса стоит дорого: 5-10 МБ RAM плюс overhead на аутентификацию. При 500 одновременных соединениях PostgreSQL тратит несколько гигабайт RAM только на управление ими, не считая реальных данных. Это физический потолок, в который упирается почти каждый проект на стадии роста.

> **Key Takeaways**
> - Transaction pooling позволяет 1000+ клиентам работать через 25 реальных соединений к PostgreSQL
> - Session pooling безопаснее, но экономия минимальна; transaction pooling несовместим с LISTEN/NOTIFY и SET вне транзакции
> - `cl_waiting > 0` в SHOW POOLS сигнализирует о нехватке пула -- нужно увеличить `default_pool_size`
> - PgBouncer является точкой отказа: в продакшене запускают два экземпляра за HAProxy
> - В SQLAlchemy с PgBouncer в transaction mode уменьшайте `pool_size` до 3-5 и выключайте prepared statements

## Три режима работы

PgBouncer работает в трёх режимах, которые принципиально отличаются гарантиями:

**Session pooling** -- соединение занято на всё время сессии клиента. Клиент открыл сессию, получил соединение к PostgreSQL, и это соединение не возвращается в пул до полного закрытия клиентской сессии. Экономия минимальная: если 200 клиентов одновременно подключены, всё равно нужно 200 соединений к PostgreSQL. Зато полная совместимость с любым SQL: `SET`, `PREPARE`, advisory locks, `LISTEN/NOTIFY` работают без ограничений.

**Transaction pooling** -- соединение возвращается в пул после каждой транзакции. Это основной режим для большинства приложений: 20-25 активных соединений к PostgreSQL обслуживают 1000+ клиентов, потому что большинство клиентов между транзакциями просто ждут. Ограничения существенные: нельзя использовать `LISTEN/NOTIFY`, `SET session_config`, `PREPARE` вне явной транзакции. Приложения с session-level временными таблицами или pg_advisory_lock в session режиме сломаются.

**Statement pooling** -- соединение освобождается после каждого SQL-оператора. Самый агрессивный режим несовместим с multi-statement транзакциями: любой `BEGIN` завершается сразу после первого оператора. На практике почти не используется.

Для большинства случаев выбор такой: если приложение использует подготовленные запросы или advisory locks на уровне сессии -- session mode. Во всех остальных случаях -- transaction mode с пулом 20-30 соединений.

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

# Сколько соединений держать незанятыми для резерва
reserve_pool_size = 5
reserve_pool_timeout = 3

# Таймаут на получение соединения
query_wait_timeout = 120

# Закрывать серверные соединения, молчащие дольше N секунд
server_idle_timeout = 600

# Логирование (в продакшне отключить для скорости)
log_connections = 0
log_disconnections = 0
```

Файл паролей содержит SCRAM-верификаторы, а не открытые пароли:

```bash
# userlist.txt
"app_user" "SCRAM-SHA-256$4096:base64salt$base64storedkey:base64serverkey"
```

Получить верификатор для существующего пользователя:

```sql
SELECT rolpassword FROM pg_authid WHERE rolname = 'app_user';
```

Если PostgreSQL настроен с `scram-sha-256`, `rolpassword` уже содержит верификатор в нужном формате. Скопируйте его в `userlist.txt` как есть.

### Systemd unit

```ini
[Unit]
Description=PgBouncer connection pooler
After=network.target

[Service]
User=postgres
ExecStart=/usr/sbin/pgbouncer /etc/pgbouncer/pgbouncer.ini
ExecReload=/bin/kill -HUP $MAINPID
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

PgBouncer перечитывает конфигурацию без перезапуска по сигналу SIGHUP, что позволяет менять `default_pool_size` без прерывания соединений.

## Мониторинг через псевдобазу pgbouncer

PgBouncer предоставляет статус через специальную базу `pgbouncer`, подключиться к которой может только пользователь `pgbouncer` (admin):

```bash
psql -h 127.0.0.1 -p 6432 -U pgbouncer pgbouncer
```

```sql
-- Текущие пулы и использование
SHOW POOLS;
-- database | user  | cl_active | cl_waiting | sv_active | sv_idle | maxwait
-- mydb     | app   | 18        | 2          | 20        | 5       | 0

-- Общая статистика запросов
SHOW STATS;

-- Активные клиентские соединения
SHOW CLIENTS;

-- Серверные соединения к PostgreSQL
SHOW SERVERS;

-- Текущие настройки
SHOW CONFIG;
```

Ключевые метрики для мониторинга:

- `cl_waiting > 0` -- клиенты ждут свободного соединения. Нужно увеличить `default_pool_size` или найти долгие транзакции через `SHOW CLIENTS` + `state=cl_active_cancel_req`
- `maxwait > 1` -- максимальное время ожидания превышает секунду, критично для interactive workloads
- `sv_idle` -- количество свободных соединений к PostgreSQL, не должно быть всегда 0
- `total_wait_time` в `SHOW STATS` -- суммарное время ожидания клиентов, растёт при перегрузке пула

### Prometheus

```bash
docker run -e DATA_SOURCE_NAME="postgres://pgbouncer:adminpass@localhost:6432/pgbouncer" \
  prometheuscommunity/pgbouncer-exporter
```

Ключевые метрики Prometheus: `pgbouncer_pools_cl_waiting`, `pgbouncer_pools_sv_active`, `pgbouncer_stats_total_wait_time_seconds`.

Алерт на критическое ожидание:

```yaml
- alert: PgBouncerHighWait
  expr: pgbouncer_pools_cl_waiting > 5
  for: 1m
  labels:
    severity: warning
  annotations:
    summary: "PgBouncer pool exhausted, {{ $value }} clients waiting"
```

## Настройка приложения

С PgBouncer приложение подключается к `localhost:6432` вместо `localhost:5432`. Внутренний пул ORM нужно сократить до минимума -- реальный пулинг управляется PgBouncer:

```python
# SQLAlchemy + asyncpg + PgBouncer в transaction mode
engine = create_async_engine(
    "postgresql+asyncpg://app_user:pass@localhost:6432/mydb",
    pool_size=5,        # небольшой пул на стороне приложения
    max_overflow=0,     # не создавать extra соединений сверх pool_size
    pool_pre_ping=True, # проверять соединения перед использованием
    pool_recycle=1800,  # переоткрывать соединения каждые 30 минут
)
```

В transaction pooling нельзя использовать prepared statements по умолчанию -- они привязаны к серверному соединению, которое может смениться между транзакциями. Для asyncpg отключить кэш:

```python
async def create_pool():
    return await asyncpg.create_pool(
        "postgresql://app_user:pass@localhost:6432/mydb",
        statement_cache_size=0,  # отключить prepared statements
        max_size=5,              # маленький пул, PgBouncer делает реальный
    )
```

Для psycopg3 аналогично:

```python
conn = psycopg.connect(
    "host=localhost port=6432 dbname=mydb user=app_user",
    prepare_threshold=None,  # отключить автоматическое кэширование
)
```

Если приложение использует SQLAlchemy с `NullPool` (без пула на стороне ORM), PgBouncer полностью управляет мультиплексированием:

```python
from sqlalchemy.pool import NullPool

engine = create_async_engine(
    "postgresql+asyncpg://...",
    poolclass=NullPool,  # каждый запрос идёт через PgBouncer напрямую
)
```

## Высокая доступность

PgBouncer -- точка отказа. Его сбой означает полную недоступность базы для всех приложений. В продакшене запускают два экземпляра с виртуальным IP:

**HAProxy перед двумя PgBouncer:**

```
Client → HAProxy:6432 → PgBouncer-1:6433
                      → PgBouncer-2:6434
```

```ini
# haproxy.cfg
frontend pgbouncer_frontend
    bind *:6432
    default_backend pgbouncer_backend

backend pgbouncer_backend
    balance leastconn
    option tcp-check
    server pgb1 127.0.0.1:6433 check inter 5s
    server pgb2 127.0.0.1:6434 check inter 5s backup
```

**Keepalived с VIP:**

```
PgBouncer-1 (master, VIP: 10.0.0.10)
PgBouncer-2 (standby, готов принять VIP при failover)
```

Для Kubernetes используют DaemonSet: PgBouncer запускается на каждой ноде, приложение обращается к `localhost:6432` без сетевого hop.

## Подводные камни

**`LISTEN/NOTIFY` не работает в transaction mode.** Если приложение подписывается на уведомления PostgreSQL, нужен отдельный прямой коннект в обход PgBouncer или session mode для этого соединения.

**Таймауты.** PgBouncer закрывает серверные соединения, молчащие дольше `server_idle_timeout` (по умолчанию 600 секунд). Приложения, держащие долгие пустые сессии, получат `server closed the connection unexpectedly`. Настройте `pool_pre_ping = True` в ORM.

**`server_reset_query`.** В transaction mode PgBouncer выполняет `DISCARD ALL` между клиентами по умолчанию. Это сбрасывает временные таблицы, SET-переменные и advisory locks. Если приложение рассчитывает на сохранение сессионного состояния, transaction mode сломает его.

**Логирование.** В высоконагруженных системах `log_connections = 1` генерирует гигабайты логов. Отключайте в продакшене.

**pgBouncer и транзакционный SAVEPOINT.** `SAVEPOINT` работает нормально в transaction mode, но только внутри явной транзакции. Savepoints вне транзакционного блока вызывают ошибку.

## Итог

PgBouncer закрывает главное узкое место PostgreSQL при горизонтальном масштабировании: дорогие форк-процессы на каждое соединение. Transaction mode с `default_pool_size = 25` на практике обслуживает несколько тысяч клиентов на обычном сервере. Главное -- понимать ограничения режима и правильно настроить ORM на стороне приложения.

Хотите углубиться в мониторинг производительности PostgreSQL? Следующий шаг -- [настройка pg_stat_statements и медленных запросов](/posts/2026/02/20-postgresql-performance).
