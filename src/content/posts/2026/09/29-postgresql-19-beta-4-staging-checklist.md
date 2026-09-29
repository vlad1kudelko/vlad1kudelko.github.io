---
title: "PostgreSQL 19 Beta 4: что прогнать на staging до GA"
description: "REPACK (CONCURRENTLY), WAIT FOR LSN, приоритеты autovacuum, репликация sequence и pg_plan_advice: где каждая возможность экономит работу и какие у неё ограничения."
heroImage: "../../../../assets/imgs/2026/09/29-postgresql-19-beta-4-staging-checklist.png"
pubDate: "2026-09-29"
---

# Пять изменений PostgreSQL 19, которые стоит проверить на своём workload

PostgreSQL 19 Beta 4 вышла 24 сентября, до release candidate осталось немного. Beta в production проект по-прежнему не рекомендует, зато сейчас самое время собрать стенд и понять, какие самописные обвязки вокруг базы после обновления можно выбросить.

Тестировать нужно именно Beta 4. В ней из релиза убрали несколько крупных возможностей, заявленных раньше: SQL/PGQ, online-переключение checksums, `FOR PORTION OF` для `UPDATE`/`DELETE` и merge/split partitions. Обзоры времён Beta 1 уже неактуальны.

## REPACK: место возвращается ОС без долгой блокировки

Сценарий знакомый: таблица пережила массовые `UPDATE`/`DELETE`, файл раздулся, обычный `VACUUM` пометил место как переиспользуемое, но операционной системе его не отдал. `VACUUM FULL` место вернёт, только переписывает таблицу под `ACCESS EXCLUSIVE`, и на горячей таблице это означает maintenance window или внешние инструменты.

В 19 появилась отдельная команда:

```sql
REPACK orders;
```

Без опций она ведёт себя так же жёстко: `ACCESS EXCLUSIVE` на всё время работы. Полезен второй вариант:

```sql
REPACK (CONCURRENTLY) orders;
```

PostgreSQL создаёт новые файлы таблицы и индексов, а параллельные изменения отслеживает через logical decoding. Эксклюзивная блокировка берётся в основном на финальный swap файлов. Если за время копирования накопилось много изменений, их надо применить до swap, так что эта финальная пауза может затянуться.

Ограничения:

- у таблицы должна быть подходящая replica identity;
- partitioned и unlogged таблицы не поддерживаются;
- нужен дополнительный replication slot;
- нужно свободное место на диске под копию.

На стенде измеряйте четыре вещи: пиковое временное место на диске, объём WAL и replication lag, длительность финального `ACCESS EXCLUSIVE` и поведение при параллельном DDL. На таблице в 20 ГБ всё может пройти гладко, на горячей таблице в несколько сотен гигабайт профиль будет другим. Прогресс виден в `pg_stat_progress_repack`. В cron сразу после обновления команду лучше не ставить.

## WAIT FOR LSN для read-after-write на репликах

Схема «пишем в primary, читаем с replica» ломается на простом кейсе: пользователь сменил имя, открыл профиль и видит старое. `UPDATE` на primary закоммичен, а standby ещё не применила WAL. Обычно это лечат чтением с primary какое-то время после записи, sticky-флагом в сессии или собственным ожиданием lag.

Теперь можно опереться на конкретную позицию WAL. После записи на primary:

```sql
UPDATE users SET display_name = 'Alice' WHERE id = 42;
SELECT pg_current_wal_insert_lsn();  -- например 0/0306EE20
```

Перед зависимым чтением на реплике:

```sql
WAIT FOR LSN '0/0306EE20'
  WITH (MODE 'standby_replay', TIMEOUT '200ms', NO_THROW);
```

Команда возвращает `success`, `timeout` или `not in recovery`. На `success` читаем с реплики, на `timeout` уходим на primary:

```python
async def consistent_read(lsn, replica, primary):
    status = await replica.wait_for_lsn(lsn, timeout_ms=200)
    if status == "success":
        return await replica.fetch_user()
    return await primary.fetch_user()
```

Асинхронная реплика от этого синхронной не становится. LSN приложение (или pooler) должно получить после `COMMIT` и само передать в следующий запрос: PostgreSQL не знает, что два запроса пользователя логически связаны. Внутри длинной транзакции `WAIT` вызывать нельзя: replay на standby может ждать блокировку, которую держит та же сессия, а сессия ждёт replay. Документация отдельно ограничивает работу со snapshot и locks из-за этого цикла.

Рабочий порядок:

```text
primary: transaction -> COMMIT -> capture LSN
replica: WAIT FOR LSN -> success -> SELECT
                      -> timeout -> fallback to primary
```

Timeout подбирайте по реальным p50/p95/p99 replication lag на стенде.

## Autovacuum получил приоритеты и параллельные воркеры

На больших базах autovacuum часто упирается в очередь: несколько крупных таблиц одновременно пересекли thresholds, воркеры заняты, остальные ждут. В 19 кандидаты получают score по нескольким компонентам: возраст XID, multixact, объём `UPDATE`/`DELETE`, `INSERT` и потребность в `ANALYZE`. Веса компонентов настраиваются, а порядок виден в новой view:

```sql
SELECT * FROM pg_stat_autovacuum_scores ORDER BY score DESC;
```

Вопрос «почему autovacuum пошёл в эту таблицу первой» теперь решается запросом.

Кроме того, autovacuum научился использовать parallel workers. Глобальный лимит задаёт `autovacuum_max_parallel_workers`, для отдельной таблицы есть storage parameter `autovacuum_parallel_workers`. Параллелится прежде всего обработка индексов (vacuuming и cleanup), индекс должен быть достаточно большим, а реально запущенных воркеров может оказаться меньше настроенных. Таблица с одним небольшим индексом ничего не выиграет, таблица с несколькими тяжёлыми индексами выиграет заметно.

Старый конфиг autovacuum вслепую переносить не стоит. Снимите baseline на текущей версии: длительность vacuum, отставание по dead tuples, I/O, эпизоды wraparound pressure. Потом прогоните тот же workload на 19 и сравните порядок обработки и конкуренцию за диск.

## Sequence в логической репликации

Классическая проблема логической миграции: таблицы доехали, cutover почти готов, а sequence на subscriber отстала, и первый `nextval()` после переключения выдаёт уже использованное значение.

В 19 sequence можно публиковать:

```sql
CREATE PUBLICATION app_pub FOR ALL TABLES, ALL SEQUENCES;
```

При создании subscription с `copy_data = true` начальные значения синхронизируются, а дальше их можно подтянуть вручную:

```sql
ALTER SUBSCRIPTION app_sub REFRESH SEQUENCES;
```

Потоковой репликации каждого `nextval()` нет: publisher продолжает уходить вперёд, и subscriber снова отстаёт до следующего `REFRESH`. Выигрыш в том, что скрипт, который обходит `pg_sequences`, считает максимумы и делает `setval()`, заменяется штатной командой. Шаг проверки в runbook остаётся:

```text
stop writes -> wait for table replication -> REFRESH SEQUENCES
-> validate sequence state -> switch traffic
```

## pg_plan_advice как временная заплатка для регрессий плана

Запрос вчера шёл 20 мс, после обновления статистики идёт 4 секунды, в `EXPLAIN ANALYZE` неудачный join order. Раньше оставалось чинить статистику, переписывать запрос, добавлять индекс, крутить planner settings в сессии или ставить внешние расширения с hints. В 19 появился `pg_plan_advice`:

```sql
SET pg_plan_advice.advice = 'JOIN_ORDER(f d)';
EXPLAIN SELECT * FROM join_fact f JOIN join_dim d ON f.dim_id = d.id;
```

Расширение ограничивает набор вариантов, которые рассматривает штатный planner; окончательный выбор по-прежнему делает он. Рядом есть `pg_stash_advice`: он привязывает advice к query identifier и применяет автоматически, но за это платится дополнительная стоимость на каждый запрос.

Если план испортился из-за неверной оценки cardinality, advice быстро вернёт latency. Причина при этом остаётся: данные завтра распределятся иначе, зафиксированный план станет плохим, а planner уже не сможет подстроиться. Поэтому у каждого advice должен быть срок жизни:

```text
регрессия -> зафиксировать хороший advice -> стабилизировать prod
-> найти причину (statistics / index / query / data skew)
-> исправить -> удалить advice
```

## Чеклист стенда

- Большая раздутая таблица: `REPACK (CONCURRENTLY)`, временное место, WAL, длительность финальной блокировки.
- Primary + async replica: `WAIT FOR LSN` под реальным lag, подбор timeout для fallback.
- Таблица с несколькими крупными индексами: autovacuum с parallel workers и `pg_stat_autovacuum_scores`.
- Логическая миграция: синхронизация sequence в составе cutover runbook.
- Запросы с историей plan regressions: `pg_plan_advice` как временная страховка.
- JIT: в 19 он выключен по умолчанию, потому что cost-модель признали недостаточно надёжной. OLTP этого, скорее всего, не заметит, а аналитические запросы, которые выигрывали от JIT, прогоните отдельно.

Архитектуру по feature list беты планировать рано, Beta 4 это наглядно показала. Прогнать свой workload на ней стоит уже сейчас, пока до GA есть время найти сюрпризы.
