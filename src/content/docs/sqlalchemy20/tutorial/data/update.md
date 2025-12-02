---
title: "SQLAlchemy: UPDATE и DELETE в Core и ORM — полное руководство с примерами"
description: "Полное руководство по UPDATE и DELETE в SQLAlchemy 2.x: от базовых запросов Core и executemany до коррелированных обновлений, UPDATE…FROM, RETURNING и ORM-enabled DML. Примеры для PostgreSQL, MySQL, SQLite и MSSQL + советы по rowcount и производительности."
pubDate: "2025-12-02"
order: 9
official: "https://docs.sqlalchemy.org/en/20/tutorial/data_update.html"
---

# Использование операторов UPDATE и DELETE

До сих пор мы рассматривали INSERT — чтобы добавить данные в базу, и затем долго изучали SELECT, который отвечает за все основные сценарии получения данных из базы. В этом разделе мы разберём конструкции UPDATE и DELETE, которые используются для изменения уже существующих строк и для их удаления. Раздел написан с точки зрения Core-подхода SQLAlchemy.

**Для читателей, использующих ORM**

Как уже упоминалось в разделе про INSERT, операции UPDATE и DELETE при работе с ORM обычно вызываются автоматически объектом Session в рамках процесса unit of work.

Однако, в отличие от INSERT, конструкции UPDATE и DELETE можно использовать и напрямую с ORM — через механизм, называемый «ORM-enabled update и delete». Поэтому знание этих конструкций полезно и при работе с ORM. Оба подхода рассматриваются в разделах «Обновление объектов ORM через паттерн Unit of Work» и «Удаление объектов ORM через паттерн Unit of Work».

## Конструкция update() — SQL-выражение

Функция `update()` создаёт новый экземпляр объекта `Update`, который представляет SQL-оператор UPDATE и служит для изменения существующих данных в таблице.

Как и в случае с `insert()`, существует «традиционная» форма `update()`, которая генерирует UPDATE только для одной таблицы за раз и не возвращает строк. Однако некоторые СУБД поддерживают UPDATE, изменяющий сразу несколько таблиц, а также поддерживают клаузу RETURNING, благодаря которой можно вернуть значения столбцов из изменённых строк.

Простейший UPDATE выглядит так:

```python
>>> from sqlalchemy import update
>>> stmt = (
...     update(user_table)
...     .where(user_table.c.name == "patrick")
...     .values(fullname="Patrick the Star")
... )
>>> print(stmt)
```

```sql
UPDATE user_account SET fullname=:fullname WHERE user_account.name = :name_1
```

Метод `.values()` управляет содержимым части SET оператора UPDATE. Это тот же самый метод, что используется в конструкции Insert. Параметры обычно передаются в виде именованных аргументов — ключей, соответствующих именам столбцов.

UPDATE поддерживает все основные формы SQL-оператора UPDATE, включая обновление на основе выражений, где можно использовать выражения над столбцами:

```python
>>> stmt = update(user_table).values(fullname="Username: " + user_table.c.name)
>>> print(stmt)
```

```sql
UPDATE user_account SET fullname=(:name_1 || user_table.name)
```

Для поддержки «executemany» (когда один и тот же запрос выполняется с множеством наборов параметров) можно использовать конструкцию `bindparam()`, которая создаёт именованные параметры вместо конкретных значений:

```python
>>> from sqlalchemy import bindparam
>>> stmt = (
...     update(user_table)
...     .where(user_table.c.name == bindparam("oldname"))
...     .values(name=bindparam("newname"))
... )
>>> with engine.begin() as conn:
...     conn.execute(
...         stmt,
...         [
...             {"oldname": "jack", "newname": "ed"},
...             {"oldname": "wendy", "newname": "mary"},
...             {"oldname": "jim", "newname": "jake"},
...         ],
...     )
```

```
BEGIN (implicit)
UPDATE user_account SET name=? WHERE user_account.name = ?
[...] [('ed', 'jack'), ('mary', 'wendy'), ('jake', 'jim')]
<sqlalchemy.engine.cursor.CursorResult object at 0x...>
COMMIT
```

К UPDATE можно применять и другие приёмы:

### Коррелированные обновления (Correlated Updates)

Оператор UPDATE может использовать строки из других таблиц через коррелированный подзапрос. Подзапрос можно разместить в любом месте, где допустимо выражение-столбец:

```python
>>> scalar_subq = (
...     select(address_table.c.email_address)
...     .where(address_table.c.user_id == user_table.c.id)
...     .order_by(address_table.c.id)
...     .limit(1)
...     .scalar_subquery()
... )
>>> update_stmt = update(user_table).values(fullname=scalar_subq)
>>> print(update_stmt)
```

```sql
UPDATE user_account SET fullname=(
    SELECT address.email_address
    FROM address
    WHERE address.user_id = user_account.id ORDER BY address.id
    LIMIT :param_1
)
```

### UPDATE … FROM

Некоторые СУБД (PostgreSQL, MSSQL, MySQL) поддерживают синтаксис UPDATE … FROM, где дополнительные таблицы указываются прямо в специальной клаузе FROM. SQLAlchemy генерирует этот синтаксис автоматически, если в WHERE присутствуют другие таблицы:

```python
>>> update_stmt = (
...     update(user_table)
...     .where(user_table.c.id == address_table.c.user_id)
...     .where(address_table.c.email_address == "patrick@aol.com")
...     .values(fullname="Pat")
... )
>>> print(update_stmt)
```

```sql
UPDATE user_account SET fullname=:fullname FROM address
WHERE user_account.id = address.user_id AND address.email_address = :email_address_1
```

Существует также специфичный для MySQL синтаксис, позволяющий обновлять несколько таблиц одновременно. Для этого в `.values()` нужно явно указывать объекты Table:

```python
>>> update_stmt = (
...     update(user_table)
...     .where(user_table.c.id == address_table.c.user_id)
...     .where(address_table.c.email_address == "patrick@aol.com")
...     .values(
...         {
...             user_table.c.fullname: "Pat",
...             address_table.c.email_address: "pat@aol.com",
...         }
...     )
... )
>>> from sqlalchemy.dialects import mysql
>>> print(update_stmt.compile(dialect=mysql.dialect()))
```

```sql
UPDATE user_account, address
SET address.email_address=%s, user_account.fullname=%s
WHERE user_account.id = address.user_id AND address.email_address = %s
```

Синтаксис UPDATE … FROM можно комбинировать с конструкцией `Values` (на PostgreSQL и др.) для массового обновления множества строк одним запросом:

```python
>>> from sqlalchemy import Values
>>> values = Values(
...     user_table.c.id,
...     user_table.c.name,
...     name="my_values",
... ).data([(1, "new_name"), (2, "another_name"), ("3", "name_name")])
>>> update_stmt = (
...     user_table.update().values(name=values.c.name).where(user_table.c.id == values.c.id)
... )
>>> from sqlalchemy.dialects import postgresql
>>> print(update_stmt.compile(dialect=postgresql.dialect()))
```

```sql
UPDATE user_account
SET name=my_values.name
FROM (VALUES (%(param_1)s, %(param_2)s), (%(param_3)s, %(param_4)s), (%(param_5)s, %(param_6)s)) AS my_values (id, name)
WHERE user_account.id = my_values.id
```

### Порядок параметров в UPDATE (только MySQL)

В MySQL порядок выражений в SET действительно влияет на результат вычисления. Для точного контроля порядка можно использовать метод `Update.ordered_values()`, передавая последовательность кортежей:

```python
>>> update_stmt = update(some_table).ordered_values(
...     (some_table.c.y, 20), (some_table.c.x, some_table.c.y + 10)
... )
>>> print(update_stmt)
```

```sql
UPDATE some_table SET y=:y, x=(some_table.y + :y_1)
```

> Хотя словари в Python начиная с версии 3.7 сохраняют порядок вставки, метод `ordered_values()` всё равно даёт дополнительную ясность намерений, когда критически важен порядок обработки SET-клауз в MySQL.

## Конструкция delete() — SQL-выражение

Функция `delete()` создаёт новый экземпляр объекта `Delete`, представляющий SQL-оператор DELETE, который удаляет строки из таблицы.

С точки зрения API `delete()` очень похож на `update()`: традиционно он не возвращает строк, но на некоторых СУБД поддерживает вариант с RETURNING.

```python
>>> from sqlalchemy import delete
>>> stmt = delete(user_table).where(user_table.c.name == "patrick")
>>> print(stmt)
```

```sql
DELETE FROM user_account WHERE user_account.name = :name_1
```

### Удаление из нескольких таблиц

Как и Update, Delete поддерживает коррелированные подзапросы в WHERE и специфичные для СУБД синтаксисы, например DELETE … USING в MySQL:

```python
>>> delete_stmt = (
...     delete(user_table)
...     .where(user_table.c.id == address_table.c.user_id)
...     .where(address_table.c.email_address == "patrick@aol.com")
... )
>>> from sqlalchemy.dialects import mysql
>>> print(delete_stmt.compile(dialect=mysql.dialect()))
```

```sql
DELETE FROM user_account USING user_account, address
WHERE user_account.id = address.user_id AND address.email_address = %s
```

## Получение количества затронутых строк для UPDATE и DELETE

Оба конструкта Update и Delete позволяют узнать количество строк, удовлетворяющих условию WHERE, после выполнения запроса (при использовании Core-интерфейса Connection). Это значение доступно через атрибут `CursorResult.rowcount`:

```python
>>> with engine.begin() as conn:
...     result = conn.execute(
...         update(user_table)
...         .values(fullname="Patrick McStar")
...         .where(user_table.c.name == "patrick")
...     )
...     print(result.rowcount)
```

```
BEGIN (implicit)
UPDATE user_account SET fullname=? WHERE user_account.name = ?
[...] ('Patrick McStar', 'patrick')
1
COMMIT
```

**Важные замечания о `rowcount`:**

- Возвращается количество строк, подходящих под WHERE, независимо от того, были ли они действительно изменены.
- `rowcount` может быть недоступен для запросов с RETURNING или при использовании `executemany` — зависит от DBAPI.
- Если драйвер не может определить количество строк, возвращается `-1`.
- SQLAlchemy заранее сохраняет значение `cursor.rowcount`, потому что некоторые драйверы запрещают обращаться к нему после закрытия курсора.
- Некоторые сторонние драйверы (особенно для NoSQL) могут вообще не поддерживать `rowcount`. Это проверяется через `CursorResult.supports_sane_rowcount`.

`rowcount` активно используется ORM в процессе unit of work для проверки корректности UPDATE/DELETE и для работы механизма версионирования (version counter).

## Использование RETURNING с UPDATE и DELETE

Как и Insert, конструкции Update и Delete поддерживают клаузу RETURNING через методы `.returning()`. При использовании на СУБД, поддерживающих RETURNING, в результате будут возвращены выбранные столбцы из всех строк, удовлетворяющих условию WHERE:

```python
>>> update_stmt = (
...     update(user_table)
...     .where(user_table.c.name == "patrick")
...     .values(fullname="Patrick the Star")
...     .returning(user_table.c.id, user_table.c.name)
... )
>>> print(update_stmt)
```

```sql
UPDATE user_account SET fullname=:fullname
WHERE user_account.name = :name_1
RETURNING user_account.id, user_account.name
```

```python
>>> delete_stmt = (
...     delete(user_table)
...     .where(user_table.c.name == "patrick")
...     .returning(user_table.c.id, user_table.c.name)
... )
>>> print(delete_stmt)
```

```sql
DELETE FROM user_account
WHERE user_account.name = :name_1
RETURNING user_account.id, user_account.name
```
