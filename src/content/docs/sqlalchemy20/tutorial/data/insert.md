---
title: "SQLAlchemy Core: использование INSERT запросов для добавления данных"
description: "Руководство по созданию INSERT запросов в SQLAlchemy Core: от простых одиночных вставок до продвинутых приёмов с подзапросами. Рассмотрим обычные конструкции Core, и особенности при работе с ORM."
pubDate: "2025-11-26"
official: "https://docs.sqlalchemy.org/en/20/tutorial/data_insert.html"
---

# Использование операторов INSERT

При работе как с Core, так и с ORM для массовых операций, SQL-запрос `INSERT` генерируется напрямую с помощью функции `insert()` — эта функция создаёт новый экземпляр `Insert`, представляющий SQL-выражение `INSERT`, которое добавляет новые данные в таблицу.

## Для пользователей ORM

В этом разделе описываются средства Core для генерации отдельных SQL-выражений `INSERT` с целью добавления строк в таблицу. При использовании ORM мы обычно применяем другой инструмент — **unit of work** (единица работы), который автоматически генерирует множество `INSERT`-ов одновременно. Тем не менее понимание того, как Core обрабатывает создание и изменение данных, очень полезно даже тогда, когда за нас всё делает ORM. Кроме того, ORM поддерживает прямое использование `INSERT` через функции **Bulk / Multi Row INSERT, UPSERT, UPDATE и DELETE**.

## Конструкция `insert()`

Простой пример:

```python
>>> from sqlalchemy import insert
>>> stmt = insert(user_table).values(name="spongebob", fullname="Spongebob Squarepants")
```

Переменная `stmt` (переводится как statement) — это экземпляр `Insert`. Большинство SQL-выражений можно вывести в виде строки, чтобы увидеть общий вид генерируемого запроса:

```python
>>> print(stmt)
```

**Вывод:**

```
INSERT INTO user_account (name, fullname) VALUES (:name, :fullname)
```

Строковое представление создаётся через компилируемую форму объекта, содержащую специфичную для СУБД строку SQL. Эту форму можно получить напрямую через метод `ClauseElement.compile()`:

```python
>>> compiled = stmt.compile()
```

Наш конструктор `Insert` — пример **параметризованного** выражения. Имена параметров `name` и `fullname` доступны в скомпилированном объекте:

```python
>>> compiled.params
{'name': 'spongebob', 'fullname': 'Spongebob Squarepants'}
```

## Выполнение запроса

Вызовем запрос, чтобы вставить строку в `user_table`. Сам INSERT и переданные параметры видны в логах SQL:

```python
>>> with engine.connect() as conn:
...     result = conn.execute(stmt)
...     conn.commit()
```

**Лог выполнения:**

```
BEGIN (implicit)
INSERT INTO user_account (name, fullname) VALUES (?, ?)
[...] ('spongebob', 'Spongebob Squarepants')
COMMIT
```

В привычной форме INSERT не возвращает строк. Если вставляется только одна строка, можно получить доступ к информации о значениях по умолчанию, сгенерированных на уровне столбцов (чаще всего — автоинкрементный первичный ключ). В SQLite первая строка обычно возвращает `1` как значение первичного ключа. Сделать это можно через аксессор `CursorResult.inserted_primary_key`:

```python
>>> result.inserted_primary_key
(1,)
```

> `CursorResult.inserted_primary_key` возвращает кортеж, потому что первичный ключ может быть составным (composite primary key). Этот аксессор всегда содержит полный первичный ключ только что вставленной записи (не просто `cursor.lastrowid`) и заполняется независимо от того, использовался ли autoincrement. Начиная с версии 1.4.8 кортеж является именованным (возвращается как объект `Row`).

## Автоматическая генерация VALUES

В примере выше мы явно использовали метод `Insert.values()` для создания `VALUES` части. Если не вызывать `Insert.values()` и просто вывести «пустое» выражение, получим INSERT со всеми столбцами таблицы:

```python
>>> print(insert(user_table))
```

**Вывод:**

```
INSERT INTO user_account (id, name, fullname) VALUES (:id, :name, :fullname)
```

Если взять конструктор `Insert` без вызова `.values()` и выполнить его, то при компиляции будут включены только те столбцы, параметры которых переданы в `Connection.execute()`. Это самый распространённый способ вставки без явного указания `VALUES`.

Пример вставки сразу нескольких строк списком словарей:

```python
>>> with engine.connect() as conn:
...     result = conn.execute(
...         insert(user_table),
...         [
...             {"name": "sandy", "fullname": "Sandy Cheeks"},
...             {"name": "patrick", "fullname": "Patrick Star"},
...         ],
...     )
...     conn.commit()
```

**Лог выполнения:**

```
BEGIN (implicit)
INSERT INTO user_account (name, fullname) VALUES (?, ?)
[...] [('sandy', 'Sandy Cheeks'), ('patrick', 'Patrick Star')]
COMMIT
```

Здесь используется форма **executemany**, но нам не пришлось писать SQL вручную. Передавая список словарей вместе с конструктором `Insert`, `Connection` автоматически формирует нужные имена столбцов в предложении `VALUES`.

> При передаче списка словарей в `Connection.execute()` вместе с Core-`Insert` только первый словарь определяет набор столбцов в `VALUES`. Остальные словари не сканируются — это соответствует традиционному поведению `executemany()` и позволяет избежать лишних накладных расходов.
>
> Такое поведение отличается от ORM-вставок (будут рассмотрены позже), где происходит полное сканирование всех наборов параметров.

## Deep Alchemy

Рассмотрим пример вставки связанных строк в `address_table` без необходимости вытаскивать первичные ключи из `user_table` в приложение. Мы явно используем `Insert.values()` и одновременно добавляем подзапрос с помощью `scalar_subquery()` и `bindparam()`.

```python
>>> from sqlalchemy import select, bindparam
>>> scalar_subq = (
...     select(user_table.c.id)
...     .where(user_table.c.name == bindparam("username"))
...     .scalar_subquery()
... )

>>> with engine.connect() as conn:
...     result = conn.execute(
...         insert(address_table).values(user_id=scalar_subq),
...         [
...             {
...                 "username": "spongebob",
...                 "email_address": "spongebob@sqlalchemy.org",
...             },
...             {"username": "sandy", "email_address": "sandy@sqlalchemy.org"},
...             {"username": "sandy", "email_address": "sandy@squirrelpower.org"},
...         ],
...     )
...     conn.commit()
```

**Лог выполнения:**

```
BEGIN (implicit)
INSERT INTO address (user_id, email_address) VALUES ((SELECT user_account.id
FROM user_account
WHERE user_account.name = ?), ?)
[...] [('spongebob', 'spongebob@sqlalchemy.org'), ('sandy', 'sandy@sqlalchemy.org'),
('sandy', 'sandy@squirrelpower.org')]
COMMIT
```

Теперь у нас есть более интересные данные в таблицах, которые будем использовать дальше.

> Настоящий «пустой» INSERT, вставляющий только значения по умолчанию без явных значений, генерируется вызовом `Insert.values()` без аргументов (не все СУБД это поддерживают). Вот что выдаёт SQLite:

```python
>>> print(insert(user_table).values().compile(engine))
```

**Вывод:**

```
INSERT INTO user_account DEFAULT VALUES
```

## INSERT ... RETURNING

Для поддерживаемых СУБД команда `RETURNING` используется автоматически, чтобы получить последний вставленный первичный ключ и значения серверных default-ов. Однако его можно задать явно через метод `Insert.returning()` — тогда объект `Result` будет содержать строки, которые можно получить:

```python
>>> insert_stmt = insert(address_table).returning(
...     address_table.c.id, address_table.c.email_address
... )
>>> print(insert_stmt)
```

**Вывод:**

```
INSERT INTO address (id, user_id, email_address)
VALUES (:id, :user_id, :email_address)
RETURNING address.id, address.email_address
```

Можно комбинировать с `Insert.from_select()`:

```python
>>> select_stmt = select(user_table.c.id, user_table.c.name + "@aol.com")
>>> insert_stmt = insert(address_table).from_select(
...     ["user_id", "email_address"], select_stmt
... )
>>> print(insert_stmt.returning(address_table.c.id, address_table.c.email_address))
```

**Вывод:**

```
INSERT INTO address (user_id, email_address)
SELECT user_account.id, user_account.name || :name_1 AS anon_1
FROM user_account RETURNING address.id, address.email_address
```

> `RETURNING` поддерживается также для `UPDATE` и `DELETE` (будет рассмотрено позже). Для `INSERT` работает как с одной строкой, так и с множественными вставками. Поддержка многорядового `INSERT ... RETURNING` зависит от диалекта, но реализована во всех диалектах SQLAlchemy, где вообще есть `RETURNING`.

## INSERT ... FROM SELECT

Редко используемая, но полезная возможность — конструктор `Insert` может формировать вставку данных напрямую из `SELECT` через метод `Insert.from_select()`.

Пример: добавляем всем пользователям бесплатный email на aol.com:

```python
>>> select_stmt = select(user_table.c.id, user_table.c.name + "@aol.com")
>>> insert_stmt = insert(address_table).from_select(
...     ["user_id", "email_address"], select_stmt
... )
>>> print(insert_stmt)
```

**Вывод:**

```
INSERT INTO address (user_id, email_address)
SELECT user_account.id, user_account.name || :name_1 AS anon_1
FROM user_account
```

Эта конструкция удобна, когда нужно скопировать данные из одной части базы в другую без выгрузки их в клиентское приложение.
