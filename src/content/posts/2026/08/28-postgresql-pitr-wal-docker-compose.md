---
title: "PostgreSQL PITR на стенде: WAL-архив, base backup и восстановление в Docker Compose"
description: "Практический разбор Point-in-Time Recovery в PostgreSQL 17: настройка archive_command, pg_basebackup, recovery_target_time и запуск восстановления во втором контейнере."
heroImage: "../../../../assets/imgs/2026/08/28-postgresql-pitr-wal-docker-compose.png"
pubDate: "2026-08-28"
---

# Как откатить базу к моменту перед ошибочным DELETE

Логический дамп через `pg_dump` снимается раз в сутки и фиксирует состояние базы только на момент запуска. Если ошибочная транзакция прошла через шесть часов после дампа, эти шесть часов работы потеряны. Point-in-Time Recovery (PITR) закрывает этот разрыв: полная физическая копия кластера плюс непрерывный архив WAL позволяют восстановить PostgreSQL до любой секунды между бэкапом и аварией.

Ниже — рабочий стенд на Docker Compose с PostgreSQL 17, где база сознательно ломается ошибочным `DELETE`, а затем откатывается к состоянию за одну секунду до него. Восстановление идёт в отдельном контейнере, чтобы исходный кластер оставался нетронутым.

## Как устроен PITR

Три сущности, вокруг которых крутится вся механика:

- **WAL (Write-Ahead Log)** — журнал изменений. Любая правка сначала попадает в WAL и только потом асинхронно сбрасывается в файлы данных. После сбоя PostgreSQL проигрывает WAL и доводит кластер до согласованного состояния.
- **LSN (Log Sequence Number)** — позиция в потоке WAL. По LSN PostgreSQL адресует записи журнала и определяет, с какого места накатывать изменения на базовую копию.
- **Base backup** — физическая копия файлов кластера, снятая `pg_basebackup`. В ней зафиксирован LSN старта, от которого начинается воспроизведение WAL.

Схема восстановления: берётся base backup, поверх него последовательно проигрываются WAL-сегменты из архива, процесс останавливается на заданном `recovery_target_time`. Всё, что произошло после этой отметки, включая ошибочную транзакцию, в восстановленную базу не попадает.

Физическая копия здесь обязательна. WAL оперирует физическими блоками диска и конкретными LSN, поэтому накатить его можно только на побайтово совместимый слепок кластера. Логический дамп для этой цели не подходит.

## Стенд на Docker Compose

Два сервиса на одном образе `postgres:17`. Первый — боевой кластер, второй поднимается только для восстановления. Каталоги `base_backup` и `wal_archive` проброшены на хост, чтобы оба контейнера видели одни и те же файлы.

```yaml
services:
  postgresql:
    container_name: psql
    image: postgres:17
    restart: always
    shm_size: 128mb
    environment:
      POSTGRES_PASSWORD: pwd
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./base_backup:/var/lib/postgresql/base_backup
      - ./wal_archive:/var/lib/postgresql/wal_archive

  postgresql-recovery:
    container_name: psql-recovery
    image: postgres:17
    restart: always
    shm_size: 128mb
    environment:
      POSTGRES_PASSWORD: pwd
    volumes:
      - ./base_backup:/var/lib/postgresql/data
      - ./wal_archive:/var/lib/postgresql/wal_archive

volumes:
  postgres_data:
```

У контейнера восстановления каталог `base_backup` смонтирован прямо в `data`. При старте PostgreSQL увидит инициализированный кластер и пропустит `initdb`. Важный нюанс: файлы внутри `base_backup` должны принадлежать пользователю `postgres`, а не `root`, иначе кластер не стартует.

Поднимаем боевой контейнер и готовим тестовые данные:

```bash
docker compose up -d postgresql
docker exec -it psql bash
su - postgres
psql
```

```sql
CREATE DATABASE appdb;
\c appdb
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    balance NUMERIC(10,2) NOT NULL
);
INSERT INTO users (name, email, balance) VALUES
    ('Roman', 'mail@gmail.com', 5000),
    ('Lera', 'mail2@gmail.com', 100),
    ('John', 'mail3@gmail.com', 1000000);
```

## Настройка архивирования WAL

Меняем владельца каталога архива и проверяем текущие параметры:

```bash
chown postgres:postgres /var/lib/postgresql/wal_archive
```

```sql
SHOW wal_level;       -- replica, для PITR достаточно
SHOW archive_mode;    -- off
SHOW archive_command; -- пусто
```

Включаем архивирование и задаём команду копирования сегмента в архив. Плейсхолдер `%p` разворачивается в путь к готовому WAL-файлу, `%f` — в его имя:

```sql
ALTER SYSTEM SET archive_mode = 'on';
ALTER SYSTEM SET archive_command = 'cp %p /var/lib/postgresql/wal_archive/%f';
```

`archive_mode` применяется только при рестарте, поэтому перезапускаем кластер. Для `pg_ctl` нужен полный путь: `PATH` в контейнере настроен под `root`.

```bash
su - postgres
/usr/lib/postgresql/17/bin/pg_ctl -D /var/lib/postgresql/data restart
```

После рестарта проверяем статистику архиватора. Ключевое поле — `failed_count`: любое ненулевое значение означает, что сегменты не доезжают до архива, и дальше идти нельзя.

```sql
SELECT archived_count, last_archived_wal, last_archived_time,
       failed_count, last_failed_wal, last_failed_time
FROM pg_stat_archiver;

SELECT pg_switch_wal(); -- принудительно закрыть текущий сегмент
```

## Base backup и симуляция аварии

Снимаем физическую копию. Флаг `-Xs` подтягивает необходимые WAL прямо во время копирования, формат `-Fp` сохраняет файлы как есть:

```bash
pg_basebackup -h localhost -U postgres \
  -D /var/lib/postgresql/base_backup \
  -Fp -Xs -P -v
```

Дальше вносим изменения и фиксируем время каждого шага через `SELECT now()` — эти отметки понадобятся для выбора точки восстановления:

```sql
SELECT now();                              -- 09:40:18
INSERT INTO users (name, email, balance)
  VALUES ('Alice', 'alice@gmail.com', 2500);
UPDATE users SET balance = 9999 WHERE name = 'Roman';
SELECT now();                              -- 09:40:30
DELETE FROM users WHERE name = 'Roman';    -- ошибочная операция
SELECT now();                              -- 09:40:43
```

Итоговая хронология:

```
base backup
  -> 09:40:18  INSERT Alice
  -> 09:40:30  UPDATE Roman -> 9999
  -> 09:40:43  DELETE Roman   <- сюда откатываться нельзя
```

Снова переключаем сегмент, чтобы последние изменения гарантированно попали в архив: по умолчанию WAL закрывает сегмент только при накоплении 16 МБ.

```sql
SELECT pg_switch_wal();
```

## Восстановление во втором контейнере

В `base_backup/postgresql.conf` дописываем команду выборки WAL из архива и целевое время. Отметка стоит на секунду раньше ошибочного `DELETE`:

```
restore_command = 'cp /var/lib/postgresql/wal_archive/%f %p'
recovery_target_time = '2026-08-28 09:40:42'
```

Файл-триггер `recovery.signal` переводит кластер в режим восстановления:

```bash
touch ./base_backup/recovery.signal
docker compose up -d postgresql-recovery
```

В логах контейнера восстановления видно ход процесса:

```
starting point-in-time recovery to 2026-08-28 09:40:42+00
...
recovery stopping before commit of transaction ... time 2026-08-28 09:40:43.951449+00
```

PostgreSQL взял base backup, дотянул нужные сегменты через `restore_command`, проиграл их до целевой отметки и остановился перед коммитом ошибочной транзакции. Проверяем данные:

```sql
SELECT * FROM users;
 id | name  |     email        | balance
----+-------+------------------+----------
  1 | Roman | mail@gmail.com    |  9999.00
  2 | Lera  | mail2@gmail.com   |   100.00
  3 | John  | mail3@gmail.com   | 1000000.00
  4 | Alice | alice@gmail.com   |  2500.00
```

Строка `Roman` на месте, баланс равен 9999 после `UPDATE`, `Alice` добавлена. Отменён только `DELETE`. Кластер пока в режиме чтения:

```sql
SELECT pg_is_in_recovery();  -- t
```

Когда результат устраивает, выполняем promotion. PostgreSQL удаляет `recovery.signal`, открывает запись и начинает новую линию времени:

```sql
SELECT pg_promote();
SELECT pg_is_in_recovery();  -- f
```

## Что поменять перед продакшеном

Стенд намеренно упрощён: один хост, ручные шаги, `cp` вместо нормальной доставки в хранилище. Для реальной эксплуатации стоит держать в голове несколько вещей.

- **Архив WAL живёт отдельно от базы.** Хранить сегменты на том же сервере или диске бессмысленно: авария заберёт и базу, и архив. Обычный вариант — выгрузка в объектное хранилище или на отдельный узел, часто через `pgBackRest` или `wal-g` вместо самописного `cp`.
- **RPO и RTO задают требования к схеме.** RPO в 5 минут означает, что допустимо потерять максимум пять минут изменений, — отсюда частота отгрузки WAL. RTO в 30 минут означает, что за полчаса восстановление должно завершиться, и эта цифра имеет смысл только при регулярных учебных прогонах.
- **Репликация решает другую задачу.** Physical replication с потоковой передачей WAL от primary к реплике защищает от отказа железа и быстрого переключения нагрузки. Ошибочный `DELETE` реплика послушно повторит. На проде оба механизма дополняют друг друга: реплика — против аппаратных сбоев, base backup плюс WAL — против логических ошибок и повреждения данных.
- **Восстановление проверяется по расписанию.** Архив, из которого ни разу не поднимали базу, нельзя считать рабочим. Прогон PITR на тестовом стенде стоит автоматизировать и запускать так же регулярно, как снимаются бэкапы.
