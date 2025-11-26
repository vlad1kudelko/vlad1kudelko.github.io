---
title: "Использование SELECT запросов в SQLAlchemy (Core и ORM) для получения данных"
description: "Построение и выполнение SQLAlchemy SELECT-запросов: примеры кода, объяснение генеративного подхода, работа с ORM-сущностями, JOIN, WHERE, ORDER BY, GROUP BY, подзапросы, CTE, оконные функции."
pubDate: "2025-11-26"
official: "https://docs.sqlalchemy.org/en/20/tutorial/data_select.html"
---

# Использование операторов SELECT

Для Core и ORM функция select() создает конструкцию, используемую для всех SELECT-запросов. Она передается методам вроде Connection.execute() в Core и Session.execute() в ORM, где SELECT-выражение выполняется в текущей транзакции, а строки результатов доступны через возвращаемый объект Result.

Читатели ORM: содержание здесь одинаково применимо к Core и ORM, с упоминанием базовых случаев ORM. Более специфические для ORM функции описаны в Руководстве по запросам ORM.

## Конструкция `select()`

Конструкция select() строит выражение аналогично insert(), используя генеративный подход, где каждый метод добавляет состояние объекту. Как и другие SQL-конструкции, она может быть преобразована в строку на месте:

```python
>>> from sqlalchemy import select
>>> stmt = select(user_table).where(user_table.c.name == "spongebob")
>>> print(stmt)
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account
WHERE user_account.name = :name_1
```

Чтобы выполнить выражение, передаем его в метод выполнения. Поскольку SELECT возвращает строки, мы можем итеративно проходить по объекту результата для получения объектов Row:

```python
>>> with engine.connect() as conn:
...     for row in conn.execute(stmt):
...         print(row)
BEGIN (implicit)
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account
WHERE user_account.name = ?
[...] ('spongebob',)
(1, 'spongebob', 'Spongebob Squarepants')
ROLLBACK
```

При использовании ORM, особенно с конструкцией select() против ORM-сущностей, выполняем с помощью Session.execute() на Session; это возвращает Row, но они могут включать полные сущности, как экземпляры класса User, как отдельные элементы в строке:

```python
>>> stmt = select(User).where(User.name == "spongebob")
>>> with Session(engine) as session:
...     for row in session.execute(stmt):
...         print(row)
BEGIN (implicit)
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account
WHERE user_account.name = ?
[...] ('spongebob',)
(User(id=1, name='spongebob', fullname='Spongebob Squarepants'),)
ROLLBACK
```

## Table vs Class ORM

Хотя SQL в примерах выглядит одинаково для select(user_table) или select(User), в общем случае они не рендерят то же самое, так как ORM-класс может быть отображен на другие "выбираемые" элементы, кроме таблиц.

Дальнейшие разделы раскроют конструкцию SELECT подробнее.

## Установка COLUMNS и FROM

Функция select() принимает позиционные элементы, представляющие любые Column и/или Table выражения, а также широкий спектр совместимых объектов, разрешаемых в список SQL-выражений для SELECT, возвращаемых как столбцы в результирующем наборе. Эти элементы также создают FROM в простых случаях, выводимый из столбцов и табличных выражений:

```python
>>> print(select(user_table))
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account
```

Для SELECT отдельных столбцов в Core подходе Column доступны через Table.c, и FROM выводится как набор всех Table и других FromClause, представленных этими столбцами:

```python
>>> print(select(user_table.c.name, user_table.c.fullname))
SELECT user_account.name, user_account.fullname
FROM user_account
```

Альтернативно, при использовании FromClause.c любого FromClause, как Table, несколько столбцов могут быть указаны для select() через кортеж строковых имен:

```python
>>> print(select(user_table.c["name", "fullname"]))
SELECT user_account.name, user_account.fullname
FROM user_account
```

Добавлено в версии 2.0: Возможность доступа через кортеж к коллекции FromClause.c

## Выбор сущностей и столбцов ORM

Сущности ORM, такие как класс User и его столбцовые атрибуты вроде User.name, участвуют в системе SQL Expression Language, представляя таблицы и столбцы. Ниже пример SELECT из сущности User, рендерящийся как из user_table:

```python
>>> print(select(User))
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account
```

При выполнении с Session.execute() отличие в SELECT из полной сущности User от user_table в том, что сущность возвращается как один элемент в строке. Строки содержат только один элемент с экземплярами User:

```python
>>> row = session.execute(select(User)).first()
BEGIN...
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account
[...] ()
>>> row
(User(id=1, name='spongebob', fullname='Spongebob Squarepants'),)
```

Выше Row имеет один элемент, представляющий сущность User:

```python
>>> row[0]
User(id=1, name='spongebob', fullname='Spongebob Squarepants')
```

Удобный метод для этого - Session.scalars(), возвращающий ScalarResult с первыми "столбцами" строк, здесь экземплярами User:

```python
>>> user = session.scalars(select(User)).first()
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account
[...] ()
>>> user
User(id=1, name='spongebob', fullname='Spongebob Squarepants')
```

Отдельные столбцы сущности ORM выбираются как отдельные элементы в строках результатов, используя атрибуты класса; они разрешаются в Column или другие SQL-выражения:

```python
>>> print(select(User.name, User.fullname))
SELECT user_account.name, user_account.fullname
FROM user_account
```

При вызове с Session.execute() строки имеют отдельные элементы для каждого значения, соответствующие столбцам или выражениям:

```python
>>> row = session.execute(select(User.name, User.fullname)).first()
SELECT user_account.name, user_account.fullname
FROM user_account
[...] ()
>>> row
('spongebob', 'Spongebob Squarepants')
```

Подходы можно смешивать, как ниже, где выбирается атрибут name из User как первый элемент, комбинируя с полными Address в втором:

```python
>>> session.execute(
...     select(User.name, Address).where(User.id == Address.user_id).order_by(Address.id)
... ).all()
SELECT user_account.name, address.id, address.email_address, address.user_id
FROM user_account, address
WHERE user_account.id = address.user_id ORDER BY address.id
[...] ()
[('spongebob', Address(id=1, email_address='spongebob@sqlalchemy.org')),
('sandy', Address(id=2, email_address='sandy@sqlalchemy.org')),
('sandy', Address(id=3, email_address='sandy@squirrelpower.org'))]
```

Подходы к выбору сущностей и атрибутов ORM, а также методы преобразования строк обсуждаются в Выборе сущностей и атрибутов ORM - в Руководстве по запросам ORM.

## Выбор с помеченными SQL-выражениями

Метод ColumnElement.label() и аналогичный для ORM-атрибутов предоставляют метку столбца или выражения, позволяя указать имя в результирующем наборе. Полезно для ссылок на произвольные выражения по имени:

```python
>>> from sqlalchemy import func, cast
>>> stmt = select(
...     ("Username: " + user_table.c.name).label("username"),
... ).order_by(user_table.c.name)
>>> with engine.connect() as conn:
...     for row in conn.execute(stmt):
...         print(f"{row.username}")
BEGIN (implicit)
SELECT ? || user_account.name AS username
FROM user_account ORDER BY user_account.name
[...] ('Username: ',)
Username: patrick
Username: sandy
Username: spongebob
ROLLBACK
```

См. также Сортировка или группировка по метке - созданные метки могут ссылаться в ORDER BY или GROUP BY.

## Выбор с текстовыми выражениями столбцов

При построении Select с select() обычно передаем Table и Column, определенные в метаданных таблицы, или ORM-атрибуты. Иногда нужно создать произвольные SQL-блоки, как константные строки или буквальный SQL.

Конструкция text() может встраиваться в Select, как ниже, где создаем строковый литерал 'some phrase' и встраиваем в SELECT:

```python
>>> from sqlalchemy import text
>>> stmt = select(text("'some phrase'"), user_table.c.name).order_by(user_table.c.name)
>>> with engine.connect() as conn:
...     print(conn.execute(stmt).all())
BEGIN (implicit)
SELECT 'some phrase', user_account.name
FROM user_account ORDER BY user_account.name
[generated in ...] ()
[('some phrase', 'patrick'), ('some phrase', 'sandy'), ('some phrase', 'spongebob')]
ROLLBACK
```

Часто мы имеем дело с текстовыми единицами, представляющими отдельные столбцовые выражения. В таких случаях используем literal_column() вместо text(), который представляет один "столбец" и может быть помечен или использован в подзапросах:

```python
>>> from sqlalchemy import literal_column
>>> stmt = select(literal_column("'some phrase'").label("p"), user_table.c.name).order_by(
...     user_table.c.name
... )
>>> with engine.connect() as conn:
...     for row in conn.execute(stmt):
...         print(f"{row.p}, {row.name}")
BEGIN (implicit)
SELECT 'some phrase' AS p, user_account.name
FROM user_account ORDER BY user_account.name
[generated in ...] ()
some phrase, patrick
some phrase, sandy
some phrase, spongebob
ROLLBACK
```

В обоих случаях пишем синтаксическое SQL-выражение, а не литерал, включая кавычки или синтаксис для рендеринга.

## Предложение WHERE

SQLAlchemy позволяет составлять SQL-выражения вроде name = 'squidward' или user_id > 10 с Python-операторами на Column. Для булевых выражений операторы вроде ==, !=, <, >= генерируют SQL-выражения, а не True/False:

```python
>>> print(user_table.c.name == "squidward")
user_account.name = :name_1

>>> print(address_table.c.user_id > 10)
address.user_id > :user_id_1
```

Такие выражения передаем в Select.where() для WHERE:

```python
>>> print(select(user_table).where(user_table.c.name == "squidward"))
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account
WHERE user_account.name = :name_1
```

Для нескольких выражений с AND вызываем Select.where() несколько раз:

```python
>>> print(
...     select(address_table.c.email_address)
...     .where(user_table.c.name == "squidward")
...     .where(address_table.c.user_id == user_table.c.id)
... )
SELECT address.email_address
FROM address, user_account
WHERE user_account.name = :name_1 AND address.user_id = user_account.id
```

Одиночный вызов Select.where() принимает несколько выражений:

```python
>>> print(
...     select(address_table.c.email_address).where(
...         user_table.c.name == "squidward",
...         address_table.c.user_id == user_table.c.id,
...     )
... )
SELECT address.email_address
FROM address, user_account
WHERE user_account.name = :name_1 AND address.user_id = user_account.id
```

Конъюнкции AND и OR доступны с and_() и or_():

```python
>>> from sqlalchemy import and_, or_
>>> print(
...     select(Address.email_address).where(
...         and_(
...             or_(User.name == "squidward", User.name == "sandy"),
...             Address.user_id == User.id,
...         )
...     )
... )
SELECT address.email_address
FROM address, user_account
WHERE (user_account.name = :name_1 OR user_account.name = :name_2)
AND address.user_id = user_account.id
```

> Рендеринг скобок основан на приоритетах операторов (нет способа обнаружить скобки из Python-выражения в runtime), так что комбинация AND и OR может иметь скобки в рендере, отличные от кода Python.

Для простых сравнений на равенство с одной сущностью есть Select.filter_by(), принимающий ключевые аргументы, соответствующие ключам столбцов или именам ORM-атрибутов. Фильтрует по левому FROM или последней присоединенной сущности:

```python
>>> print(select(User).filter_by(name="spongebob", fullname="Spongebob Squarepants"))
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account
WHERE user_account.name = :name_1 AND user_account.fullname = :fullname_1
```

## Явные FROM и JOIN

Как упоминалось, FROM обычно выводится из выражений в столбцах и других элементах Select. Если указать один столбец из Table в COLUMNS, Table помещается в FROM:

```python
>>> print(select(user_table.c.name))
SELECT user_account.name
FROM user_account
```

Столбцы из двух таблиц дают FROM через запятую:

```python
>>> print(select(user_table.c.name, address_table.c.email_address))
SELECT user_account.name, address.email_address
FROM user_account, address
```

Для JOIN двух таблиц используем Select.join_from() для указания левой и правой стороны JOIN:

```python
>>> print(
...     select(user_table.c.name, address_table.c.email_address).join_from(
...         user_table, address_table
...     )
... )
SELECT user_account.name, address.email_address
FROM user_account JOIN address ON user_account.id = address.user_id
```

Или Select.join() для правой стороны, левая выводится:

```python
>>> print(select(user_table.c.name, address_table.c.email_address).join(address_table))
SELECT user_account.name, address.email_address
FROM user_account JOIN address ON user_account.id = address.user_id
```

> В примерах ON выводится автоматически из-за ForeignKeyConstraint в user_table и address_table. Подробнее в следующем разделе.

Можно добавить элементы в FROM явно с Select.select_from(), как ниже, где user_table - первый в FROM, а Select.join() добавляет address_table:

```python
>>> print(select(address_table.c.email_address).select_from(user_table).join(address_table))
SELECT address.email_address
FROM user_account JOIN address ON user_account.id = address.user_id
```

Другой пример - SELECT count(*) с sqlalchemy.sql.expression.func:

```python
>>> from sqlalchemy import func
>>> print(select(func.count("*")).select_from(user_table))
SELECT count(:count_2) AS count_1
FROM user_account
```

## Установка ON

В предыдущих примерах JOIN рендерил ON автоматически благодаря ForeignKeyConstraint. Если цели JOIN без такого ограничения или с несколькими, указываем ON явно. Select.join() и Select.join_from() принимают аргумент ON как SQL-выражение, как в WHERE:

```python
>>> print(
...     select(address_table.c.email_address)
...     .select_from(user_table)
...     .join(address_table, user_table.c.id == address_table.c.user_id)
... )
SELECT address.email_address
FROM user_account JOIN address ON user_account.id = address.user_id
```

> Другой способ генерации ON при ORM-сущностях - использование relationship().

## OUTER и FULL join

Select.join() и Select.join_from() принимают Select.join.isouter и Select.join.full для LEFT OUTER JOIN и FULL OUTER JOIN:

```python
>>> print(select(user_table).join(address_table, isouter=True))
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account LEFT OUTER JOIN address ON user_account.id = address.user_id
```

```python
>>> print(select(user_table).join(address_table, full=True))
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account FULL OUTER JOIN address ON user_account.id = address.user_id
```

Есть Select.outerjoin(), эквивалент .join(..., isouter=True).

> SQL имеет RIGHT OUTER JOIN. SQLAlchemy не рендерит его напрямую; вместо этого меняйте порядок таблиц и используйте LEFT OUTER JOIN.

## ORDER BY, GROUP BY, HAVING

SELECT включает ORDER BY для сортировки выбранных строк. GROUP BY делит строки на группы для аггрегатных функций. HAVING используется с GROUP BY для фильтра по аггрегатам, как WHERE, но для аггрегатов.

## ORDER BY

ORDER BY строится из SQL-выражений на Column. Select.order_by() принимает одно или более выражений позиционно:

```python
>>> print(select(user_table).order_by(user_table.c.name))
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account ORDER BY user_account.name
```

Восходящий/нисходящий доступны с ColumnElement.asc() и .desc(), также для ORM-атрибутов:

```python
>>> print(select(User).order_by(User.fullname.desc()))
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account ORDER BY user_account.fullname DESC
```

Выше строки сортируются по user_account.fullname DESC.

## Аггрегатные функции с GROUP BY / HAVING

SQLAlchemy предоставляет функции через func. Это конструктор, создающий Function с именем функции и аргументами как SQL-выражениями. Например, count() для user_account.id:

```python
>>> from sqlalchemy import func
>>> count_fn = func.count(user_table.c.id)
>>> print(count_fn)
count(user_account.id)
```

При использовании аггрегатов GROUP BY важен для разделения строк на группы. Неаггрегированные столбцы в COLUMNS должны быть в GROUP BY, напрямую или через primary key. HAVING фильтрует по аггрегатам.

SQLAlchemy использует Select.group_by() и Select.having(). Ниже выбор имен пользователей и подсчет адресов для тех у кого больше чем один адрес:

```python
>>> with engine.connect() as conn:
...     result = conn.execute(
...         select(User.name, func.count(Address.id).label("count"))
...         .join(Address)
...         .group_by(User.name)
...         .having(func.count(Address.id) > 1)
...     )
...     print(result.all())
BEGIN (implicit)
SELECT user_account.name, count(address.id) AS count
FROM user_account JOIN address ON user_account.id = address.user_id GROUP BY user_account.name
HAVING count(address.id) > ?
[...] (1,)
[('sandy', 2)]
ROLLBACK
```

## Сортировка или группировка по метке

Важная техника - ORDER BY или GROUP BY по выражению из столбцов, без повторения, используя имя столбца или метку. Доступно, передавая текст имени в Select.order_by() или .group_by(). Текст не рендерится напрямую; вместо этого ищется выражение по имени в столбцах:

```python
>>> from sqlalchemy import func, desc
>>> stmt = (
...     select(Address.user_id, func.count(Address.id).label("num_addresses"))
...     .group_by("user_id")
...     .order_by("user_id", desc("num_addresses"))
... )
>>> print(stmt)
SELECT address.user_id, count(address.id) AS num_addresses
FROM address GROUP BY address.user_id ORDER BY address.user_id, num_addresses DESC
```

## Использование алиасов

При выборе из нескольких таблиц с JOIN часто нужно ссылаться на одну таблицу несколько раз в FROM. Используем SQL-алиасы для альтернативных имен.

В SQLAlchemy Expression Language это FromClause-объекты вроде Alias, создаваемые с FromClause.alias(). Alias как Table с колонками в Alias.c. Ниже SELECT уникальных пар имен пользователей:

```python
>>> user_alias_1 = user_table.alias()
>>> user_alias_2 = user_table.alias()
>>> print(
...     select(user_alias_1.c.name, user_alias_2.c.name).join_from(
...         user_alias_1, user_alias_2, user_alias_1.c.id > user_alias_2.c.id
...     )
... )
SELECT user_account_1.name, user_account_2.name AS name_1
FROM user_account AS user_account_1
JOIN user_account AS user_account_2 ON user_account_1.id > user_account_2.id
```

## Алиасы сущностей ORM

<!-- TODO -->

Эквивалентом метода FromClause.alias() в ORM является функция ORM aliased(), которую можно применить к таким сущностям, как User и Address. Это создаёт внутренний объект Alias, сопоставленный исходному сопоставленному объекту Table, сохраняя при этом функциональность ORM. Оператор SELECT ниже выбирает из сущности User все объекты, содержащие два конкретных адреса электронной почты:

```python
>>> from sqlalchemy.orm import aliased
>>> address_alias_1 = aliased(Address)
>>> address_alias_2 = aliased(Address)
>>> print(
...     select(User)
...     .join_from(User, address_alias_1)
...     .where(address_alias_1.email_address == "patrick@aol.com")
...     .join_from(User, address_alias_2)
...     .where(address_alias_2.email_address == "patrick@gmail.com")
... )
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account
JOIN address AS address_1 ON user_account.id = address_1.user_id
JOIN address AS address_2 ON user_account.id = address_2.user_id
WHERE address_1.email_address = :email_address_1
AND address_2.email_address = :email_address_2
```

> Как уже упоминалось, ORM предоставляет другой способ объединения с помощью конструкции relation().

## Подзапросы и CTE

Подзапрос в SQL — это оператор SELECT, заключенный в скобки и помещенный в контекст включающего оператора, обычно оператора SELECT, но не обязательно.

В этом разделе мы рассмотрим так называемый «нескалярный» подзапрос, который обычно помещается в предложение FROM вложенного оператора SELECT. Мы также рассмотрим общее табличное выражение (CTE), которое используется аналогично подзапросу, но включает дополнительные функции.

SQLAlchemy использует объект Subquery для представления подзапроса, а CTE — для представления CTE, обычно получаемых методами Select.subquery() и Select.cte() соответственно. Любой из этих объектов может использоваться как элемент FROM внутри более крупной конструкции select().

Мы можем построить подзапрос, который выберет совокупное количество строк из таблицы адресов (агрегатные функции и GROUP BY были представлены ранее в разделе Агрегатные функции с GROUP BY / HAVING):

```python
>>> subq = (
...     select(func.count(address_table.c.id).label("count"), address_table.c.user_id)
...     .group_by(address_table.c.user_id)
...     .subquery()
... )
```

Строковая интерпретация подзапроса без его встраивания в другой оператор Select или другой оператор создает простой оператор SELECT без каких-либо закрывающих скобок:

```python
>>> print(subq)
SELECT count(address.id) AS count, address.user_id
FROM address GROUP BY address.user_id
```

Объект Subquery ведёт себя как любой другой объект FROM, например, таблица, в частности, он включает пространство имён Subquery.c для выбираемых им столбцов. Мы можем использовать это пространство имён для ссылки как на столбец user_id, так и на наше собственное маркированное выражение счёта:

```python
>>> print(select(subq.c.user_id, subq.c.count))
SELECT anon_1.user_id, anon_1.count
FROM (SELECT count(address.id) AS count, address.user_id AS user_id
FROM address GROUP BY address.user_id) AS anon_1
```

Выбрав строки, содержащиеся в объекте subq, мы можем применить объект к большему Select, который объединит данные с таблицей user_account:

```python
>>> stmt = select(user_table.c.name, user_table.c.fullname, subq.c.count).join_from(
...     user_table, subq
... )
>>> print(stmt)
SELECT user_account.name, user_account.fullname, anon_1.count
FROM user_account JOIN (SELECT count(address.id) AS count, address.user_id AS user_id
FROM address GROUP BY address.user_id) AS anon_1 ON user_account.id = anon_1.user_id
```

Для соединения от user_account к address мы использовали метод Select.join_from(). Как было показано ранее, предложение ON этого соединения снова было выведено на основе ограничений внешнего ключа. Несмотря на то, что подзапрос SQL сам по себе не имеет ограничений, SQLAlchemy может обрабатывать ограничения, представленные в столбцах, определяя, что столбец subq.c.user_id выведен из столбца address_table.c.user_id, что выражает связь по внешнему ключу со столбцом user_table.c.id, который затем используется для формирования предложения ON.

## Common Table Expressions (CTEs) (Общие табличные выражения)

Использование конструкции CTE в SQLAlchemy практически аналогично использованию конструкции Subquery. Изменив вызов метода Select.subquery() на Select.cte(), мы можем использовать полученный объект как элемент FROM тем же способом, но при этом полученный SQL-код будет иметь совершенно другой синтаксис общего табличного выражения:

```python
>>> subq = (
...     select(func.count(address_table.c.id).label("count"), address_table.c.user_id)
...     .group_by(address_table.c.user_id)
...     .cte()
... )
>>> stmt = select(user_table.c.name, user_table.c.fullname, subq.c.count).join_from(
...     user_table, subq
... )
>>> print(stmt)
WITH anon_1 AS
(SELECT count(address.id) AS count, address.user_id AS user_id
FROM address GROUP BY address.user_id)
 SELECT user_account.name, user_account.fullname, anon_1.count
FROM user_account JOIN anon_1 ON user_account.id = anon_1.user_id
```

Конструкция CTE также может использоваться в «рекурсивном» стиле и в более сложных случаях может быть составлена ​​из предложения RETURNING операторов INSERT, UPDATE или DELETE. Строка документации для CTE содержит подробную информацию об этих дополнительных шаблонах.

В обоих случаях подзапрос и CTE-выражение были названы на уровне SQL с использованием «анонимного» имени. В коде Python нам вообще не нужно указывать эти имена. Идентификатор объекта подзапроса или CTE служит синтаксическим идентификатором объекта при рендеринге. Имя, которое будет отображено в SQL-запросе, можно указать, передав его в качестве первого аргумента методам Select.subquery() или Select.cte().

## Подзапросы/CTE сущностей ORM

В ORM конструкция aliased() может использоваться для связывания сущности ORM, например, класса User или Address, с любым концептом FromClause, представляющим источник строк. В предыдущем разделе «Псевдонимы сущностей ORM» было показано использование aliased() для связывания сопоставленного класса с псевдонимом сопоставленной ему таблицы. Здесь мы демонстрируем, как aliased() выполняет то же самое действие как для подзапроса, так и для CTE-выражения, сгенерированного для конструкции Select, которая в конечном итоге выводится из той же сопоставленной таблицы.

Ниже приведён пример применения aliased() к конструкции Subquery, что позволяет извлекать сущности ORM из её строк. Результат показывает последовательность объектов User и Address, где данные для каждого объекта Address в конечном итоге были получены из подзапроса к таблице Address, а не непосредственно из неё:

```python
>>> subq = select(Address).where(~Address.email_address.like("%@aol.com")).subquery()
>>> address_subq = aliased(Address, subq)
>>> stmt = (
...     select(User, address_subq)
...     .join_from(User, address_subq)
...     .order_by(User.id, address_subq.id)
... )
>>> with Session(engine) as session:
...     for user, address in session.execute(stmt):
...         print(f"{user} {address}")
BEGIN (implicit)
SELECT user_account.id, user_account.name, user_account.fullname,
anon_1.id AS id_1, anon_1.email_address, anon_1.user_id
FROM user_account JOIN
(SELECT address.id AS id, address.email_address AS email_address, address.user_id AS user_id
FROM address
WHERE address.email_address NOT LIKE ?) AS anon_1 ON user_account.id = anon_1.user_id
ORDER BY user_account.id, anon_1.id
[...] ('%@aol.com',)
User(id=1, name='spongebob', fullname='Spongebob Squarepants') Address(id=1, email_address='spongebob@sqlalchemy.org')
User(id=2, name='sandy', fullname='Sandy Cheeks') Address(id=2, email_address='sandy@sqlalchemy.org')
User(id=2, name='sandy', fullname='Sandy Cheeks') Address(id=3, email_address='sandy@squirrelpower.org')
ROLLBACK
```

Ниже приведен еще один пример, который абсолютно такой же, за исключением того, что в нем используется конструкция CTE:

```python
>>> cte_obj = select(Address).where(~Address.email_address.like("%@aol.com")).cte()
>>> address_cte = aliased(Address, cte_obj)
>>> stmt = (
...     select(User, address_cte)
...     .join_from(User, address_cte)
...     .order_by(User.id, address_cte.id)
... )
>>> with Session(engine) as session:
...     for user, address in session.execute(stmt):
...         print(f"{user} {address}")
BEGIN (implicit)
WITH anon_1 AS
(SELECT address.id AS id, address.email_address AS email_address, address.user_id AS user_id
FROM address
WHERE address.email_address NOT LIKE ?)
SELECT user_account.id, user_account.name, user_account.fullname,
anon_1.id AS id_1, anon_1.email_address, anon_1.user_id
FROM user_account
JOIN anon_1 ON user_account.id = anon_1.user_id
ORDER BY user_account.id, anon_1.id
[...] ('%@aol.com',)
User(id=1, name='spongebob', fullname='Spongebob Squarepants') Address(id=1, email_address='spongebob@sqlalchemy.org')
User(id=2, name='sandy', fullname='Sandy Cheeks') Address(id=2, email_address='sandy@sqlalchemy.org')
User(id=2, name='sandy', fullname='Sandy Cheeks') Address(id=3, email_address='sandy@squirrelpower.org')
ROLLBACK
```

## Скалярные и коррелированные подзапросы

Скалярный подзапрос — это подзапрос, который возвращает ровно ноль или одну строку и ровно один столбец. Этот подзапрос затем используется в предложении COLUMNS или WHERE вложенного оператора SELECT и отличается от обычного подзапроса тем, что не используется в предложении FROM. Коррелированный подзапрос — это скалярный подзапрос, ссылающийся на таблицу вложенного оператора SELECT.

SQLAlchemy представляет скалярный подзапрос с помощью конструкции ScalarSelect, которая является частью иерархии выражений ColumnElement, в отличие от обычного подзапроса, представленного конструкцией Subquery, которая находится в иерархии FromClause.

Скалярные подзапросы часто, но не обязательно, используются с агрегатными функциями, представленными ранее в разделе «Агрегатные функции с GROUP BY / HAVING». Скалярный подзапрос явно указывается с помощью метода Select.scalar_subquery(), как показано ниже. Его строковая форма по умолчанию при преобразовании в строку отображается как обычный оператор SELECT, выбирающий данные из двух таблиц:

```python
>>> subq = (
...     select(func.count(address_table.c.id))
...     .where(user_table.c.id == address_table.c.user_id)
...     .scalar_subquery()
... )
>>> print(subq)
(SELECT count(address.id) AS count_1
FROM address, user_account
WHERE user_account.id = address.user_id)
```

Вышеуказанный объект subq теперь попадает в иерархию выражений SQL ColumnElement, поскольку его можно использовать как любое другое выражение столбца:

```python
>>> print(subq == 5)
(SELECT count(address.id) AS count_1
FROM address, user_account
WHERE user_account.id = address.user_id) = :param_1
```

Хотя скалярный подзапрос сам по себе отображает и user_account, и address в своем предложении FROM при его строковом преобразовании, при встраивании его во включающую конструкцию select(), которая работает с таблицей user_account, таблица user_account автоматически коррелируется, то есть она не отображается в предложении FROM подзапроса:

```python
>>> stmt = select(user_table.c.name, subq.label("address_count"))
>>> print(stmt)
SELECT user_account.name, (SELECT count(address.id) AS count_1
FROM address
WHERE user_account.id = address.user_id) AS address_count
FROM user_account
```

Простые коррелированные подзапросы обычно дают желаемый результат. Однако в случае неоднозначной корреляции SQLAlchemy сообщит нам о необходимости большей ясности:

```python
>>> stmt = (
...     select(
...         user_table.c.name,
...         address_table.c.email_address,
...         subq.label("address_count"),
...     )
...     .join_from(user_table, address_table)
...     .order_by(user_table.c.id, address_table.c.id)
... )
>>> print(stmt)
Traceback (most recent call last):
...
InvalidRequestError: Select statement '<... Select object at ...>' returned
no FROM clauses due to auto-correlation; specify correlate(<tables>) to
control correlation manually.
```

Чтобы указать, что мы хотим сопоставить именно user_table, мы используем методы ScalarSelect.correlate() или ScalarSelect.correlate_except():

```python
>>> subq = (
...     select(func.count(address_table.c.id))
...     .where(user_table.c.id == address_table.c.user_id)
...     .scalar_subquery()
...     .correlate(user_table)
... )
```

Затем оператор может вернуть данные для этого столбца, как и для любого другого:

```python
>>> with engine.connect() as conn:
...     result = conn.execute(
...         select(
...             user_table.c.name,
...             address_table.c.email_address,
...             subq.label("address_count"),
...         )
...         .join_from(user_table, address_table)
...         .order_by(user_table.c.id, address_table.c.id)
...     )
...     print(result.all())
BEGIN (implicit)
SELECT user_account.name, address.email_address, (SELECT count(address.id) AS count_1
FROM address
WHERE user_account.id = address.user_id) AS address_count
FROM user_account JOIN address ON user_account.id = address.user_id ORDER BY user_account.id, address.id
[...] ()
[('spongebob', 'spongebob@sqlalchemy.org', 1), ('sandy', 'sandy@sqlalchemy.org', 2),
 ('sandy', 'sandy@squirrelpower.org', 2)]
ROLLBACK
```

## Корреляция LATERAL

Латеральная корреляция — это особый подвид корреляции SQL, позволяющий одному выбираемому элементу ссылаться на другой выбираемый элемент в пределах одного предложения FROM. Это крайне специфический случай использования, который, хотя и является частью стандарта SQL, поддерживается только последними версиями PostgreSQL.

Обычно, если оператор SELECT ссылается на подзапрос table1 JOIN (SELECT ...) AS в своём предложении FROM, подзапрос в правой части не может ссылаться на выражение «table1» в левой части; корреляция может ссылаться только на таблицу, являющуюся частью другого оператора SELECT, который полностью включает в себя этот оператор SELECT. Ключевое слово LATERAL позволяет изменить это поведение и разрешить корреляцию из оператора JOIN в правой части.

SQLAlchemy поддерживает эту функцию с помощью метода Select.lateral(), который создаёт объект Lateral. Lateral относится к тому же семейству, что и Subquery и Alias, но также включает корреляционное поведение при добавлении конструкции к предложению FROM вложенного оператора SELECT. Следующий пример иллюстрирует SQL-запрос, использующий LATERAL, который выбирает данные «учётная запись пользователя / количество адресов электронной почты», как обсуждалось в предыдущем разделе:

```python
>>> subq = (
...     select(
...         func.count(address_table.c.id).label("address_count"),
...         address_table.c.email_address,
...         address_table.c.user_id,
...     )
...     .where(user_table.c.id == address_table.c.user_id)
...     .lateral()
... )
>>> stmt = (
...     select(user_table.c.name, subq.c.address_count, subq.c.email_address)
...     .join_from(user_table, subq)
...     .order_by(user_table.c.id, subq.c.email_address)
... )
>>> print(stmt)
SELECT user_account.name, anon_1.address_count, anon_1.email_address
FROM user_account
JOIN LATERAL (SELECT count(address.id) AS address_count,
address.email_address AS email_address, address.user_id AS user_id
FROM address
WHERE user_account.id = address.user_id) AS anon_1
ON user_account.id = anon_1.user_id
ORDER BY user_account.id, anon_1.email_address
```

Выше, правая часть JOIN представляет собой подзапрос, который соответствует таблице user_account, которая находится на левой стороне объединения.

При использовании Select.lateral() поведение методов Select.correlate() и Select.correlate_except() применяется также к конструкции Lateral.

## UNION, UNION ALL и другие операции над множествами

В SQL операторы SELECT можно объединять с помощью SQL-операции UNION или UNION ALL, которая создаёт множество всех строк, полученных одним или несколькими операторами. Также возможны другие операции над множествами, такие как INTERSECT [ALL] и EXCEPT [ALL].

Конструкция Select в SQLAlchemy поддерживает подобные композиции с помощью таких функций, как union(), intersect() и except_(), а также их аналогов типа «all»: union_all(), intersect_all() и except_all(). Все эти функции принимают произвольное количество подвыборов, которые обычно являются конструкциями Select, но могут также представлять собой существующую композицию.

Конструкция, создаваемая этими функциями, называется CompoundSelect и используется так же, как и конструкция Select, но имеет меньше методов. Например, CompoundSelect, создаваемый функцией union_all(), можно вызвать напрямую с помощью Connection.execute():

```python
>>> from sqlalchemy import union_all
>>> stmt1 = select(user_table).where(user_table.c.name == "sandy")
>>> stmt2 = select(user_table).where(user_table.c.name == "spongebob")
>>> u = union_all(stmt1, stmt2)
>>> with engine.connect() as conn:
...     result = conn.execute(u)
...     print(result.all())
BEGIN (implicit)
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account
WHERE user_account.name = ?
UNION ALL SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account
WHERE user_account.name = ?
[generated in ...] ('sandy', 'spongebob')
[(2, 'sandy', 'Sandy Cheeks'), (1, 'spongebob', 'Spongebob Squarepants')]
ROLLBACK
```

Чтобы использовать CompoundSelect в качестве подзапроса, как и Select, предусмотрен метод SelectBase.subquery(), который создаст объект Subquery с коллекцией FromClause.c, на которую можно ссылаться во вложенном select():

```python
>>> u_subq = u.subquery()
>>> stmt = (
...     select(u_subq.c.name, address_table.c.email_address)
...     .join_from(address_table, u_subq)
...     .order_by(u_subq.c.name, address_table.c.email_address)
... )
>>> with engine.connect() as conn:
...     result = conn.execute(stmt)
...     print(result.all())
BEGIN (implicit)
SELECT anon_1.name, address.email_address
FROM address JOIN
  (SELECT user_account.id AS id, user_account.name AS name, user_account.fullname AS fullname
  FROM user_account
  WHERE user_account.name = ?
UNION ALL
  SELECT user_account.id AS id, user_account.name AS name, user_account.fullname AS fullname
  FROM user_account
  WHERE user_account.name = ?)
AS anon_1 ON anon_1.id = address.user_id
ORDER BY anon_1.name, address.email_address
[generated in ...] ('sandy', 'spongebob')
[('sandy', 'sandy@sqlalchemy.org'), ('sandy', 'sandy@squirrelpower.org'), ('spongebob', 'spongebob@sqlalchemy.org')]
ROLLBACK
```

## Выбор сущностей ORM из UNION

В предыдущих примерах показано, как создать UNION для двух объектов Table, чтобы затем вернуть строки базы данных. Если мы хотим использовать UNION или другую операцию над множествами для выбора строк, которые затем будут получены как объекты ORM, можно использовать два подхода. В обоих случаях мы сначала создаём объект select() или CompoundSelect, представляющий оператор SELECT / UNION / etc, который мы хотим выполнить; этот оператор должен быть составлен с целевыми сущностями ORM или их базовыми сопоставленными объектами Table:

```python
>>> stmt1 = select(User).where(User.name == "sandy")
>>> stmt2 = select(User).where(User.name == "spongebob")
>>> u = union_all(stmt1, stmt2)
```

Для простого оператора SELECT с UNION, который ещё не вложен в подзапрос, их часто можно использовать в контексте выборки объекта ORM с помощью метода Select.from_statement(). При таком подходе оператор UNION представляет собой весь запрос; после использования Select.from_statement() нельзя добавить дополнительные критерии:

```python
>>> orm_stmt = select(User).from_statement(u)
>>> with Session(engine) as session:
...     for obj in session.execute(orm_stmt).scalars():
...         print(obj)
BEGIN (implicit)
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account
WHERE user_account.name = ? UNION ALL SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account
WHERE user_account.name = ?
[generated in ...] ('sandy', 'spongebob')
User(id=2, name='sandy', fullname='Sandy Cheeks')
User(id=1, name='spongebob', fullname='Spongebob Squarepants')
ROLLBACK
```

Чтобы более гибко использовать UNION или другую конструкцию, связанную с множествами, в качестве компонента сущности, конструкцию CompoundSelect можно организовать в подзапрос с помощью CompoundSelect.subquery(), который затем связывается с объектами ORM с помощью функции aliased(). Это работает аналогично представленному в ORM Entity Subqueries/CTE: сначала создается произвольное сопоставление нужной сущности с подзапросом, а затем из этой новой сущности выбираются данные, как если бы это был любой другой сопоставленный класс. В примере ниже мы можем добавить дополнительные критерии, такие как ORDER BY, вне самого UNION, поскольку мы можем фильтровать или сортировать данные по столбцам, экспортируемым подзапросом:

```python
>>> user_alias = aliased(User, u.subquery())
>>> orm_stmt = select(user_alias).order_by(user_alias.id)
>>> with Session(engine) as session:
...     for obj in session.execute(orm_stmt).scalars():
...         print(obj)
BEGIN (implicit)
SELECT anon_1.id, anon_1.name, anon_1.fullname
FROM (SELECT user_account.id AS id, user_account.name AS name, user_account.fullname AS fullname
FROM user_account
WHERE user_account.name = ? UNION ALL SELECT user_account.id AS id, user_account.name AS name, user_account.fullname AS fullname
FROM user_account
WHERE user_account.name = ?) AS anon_1 ORDER BY anon_1.id
[generated in ...] ('sandy', 'spongebob')
User(id=1, name='spongebob', fullname='Spongebob Squarepants')
User(id=2, name='sandy', fullname='Sandy Cheeks')
ROLLBACK
```

## Подзапросы EXISTS

Ключевое слово SQL EXISTS — это оператор, который используется со скалярными подзапросами для возврата логического значения true или false в зависимости от того, вернёт ли оператор SELECT строку. В SQLAlchemy есть вариант объекта ScalarSelect под названием Exists, который генерирует подзапрос EXISTS и удобнее всего генерируется с помощью метода SelectBase.exists(). Ниже мы создаём EXISTS, чтобы возвращать строки user_account, имеющие более одной связанной строки в адресе:

```python
>>> subq = (
...     select(func.count(address_table.c.id))
...     .where(user_table.c.id == address_table.c.user_id)
...     .group_by(address_table.c.user_id)
...     .having(func.count(address_table.c.id) > 1)
... ).exists()
>>> with engine.connect() as conn:
...     result = conn.execute(select(user_table.c.name).where(subq))
...     print(result.all())
BEGIN (implicit)
SELECT user_account.name
FROM user_account
WHERE EXISTS (SELECT count(address.id) AS count_1
FROM address
WHERE user_account.id = address.user_id GROUP BY address.user_id
HAVING count(address.id) > ?)
[...] (1,)
[('sandy',)]
ROLLBACK
```

Конструкция EXISTS чаще всего используется для отрицания, например, NOT EXISTS, поскольку она обеспечивает эффективный для SQL способ поиска строк, для которых в связанной таблице нет строк. Ниже мы выбираем имена пользователей, у которых нет адресов электронной почты; обратите внимание на бинарный оператор отрицания (~), используемый во втором предложении WHERE:

```python
>>> subq = (
...     select(address_table.c.id).where(user_table.c.id == address_table.c.user_id)
... ).exists()
>>> with engine.connect() as conn:
...     result = conn.execute(select(user_table.c.name).where(~subq))
...     print(result.all())
BEGIN (implicit)
SELECT user_account.name
FROM user_account
WHERE NOT (EXISTS (SELECT address.id
FROM address
WHERE user_account.id = address.user_id))
[...] ()
[('patrick',)]
ROLLBACK
```

## Работа с SQL-функциями

Впервые представленный ранее в этом разделе объект func служит фабрикой для создания новых объектов Function, которые при использовании в конструкции, подобной select(), формируют отображение SQL-функции, обычно состоящее из имени, скобок (хотя и не всегда) и, возможно, аргументов. Примеры типичных SQL-функций:

Функция count() — агрегатная функция, которая подсчитывает количество возвращенных строк:

```python
>>> print(select(func.count()).select_from(user_table))
SELECT count(*) AS count_1
FROM user_account
```

Функция lower() — строковая функция, преобразующая строку в нижний регистр:

```python
>>> print(select(func.lower("A String With Much UPPERCASE")))
SELECT lower(:lower_2) AS lower_1
```

Функция now(), которая предоставляет текущую дату и время; поскольку это общая функция, SQLAlchemy знает, как отображать ее по-разному для каждого бэкэнда, в случае SQLite используется функция CURRENT_TIMESTAMP:

```python
>>> stmt = select(func.now())
>>> with engine.connect() as conn:
...     result = conn.execute(stmt)
...     print(result.all())
BEGIN (implicit)
SELECT CURRENT_TIMESTAMP AS now_1
[...] ()
[(datetime.datetime(...),)]
ROLLBACK
```

Поскольку большинство бэкендов баз данных содержат десятки, если не сотни различных SQL-функций, func старается быть максимально либеральным в отношении принимаемых имён. Любое имя, к которому осуществляется доступ из этого пространства имён, автоматически считается SQL-функцией, которая будет отображаться в общем виде:

```python
>>> print(select(func.some_crazy_function(user_table.c.name, 17)))
SELECT some_crazy_function(user_account.name, :some_crazy_function_2) AS some_crazy_function_1
FROM user_account
```

В то же время, относительно небольшой набор чрезвычайно распространённых функций SQL, таких как count, now, max и concat, включает в себя предупакованные версии, которые обеспечивают корректную типизацию, а также в некоторых случаях генерацию SQL-запросов, специфичных для бэкенда. В примере ниже сравнивается генерация SQL-запросов для диалекта PostgreSQL и диалекта Oracle Database для функции now:

```python
>>> from sqlalchemy.dialects import postgresql
>>> print(select(func.now()).compile(dialect=postgresql.dialect()))
SELECT now() AS now_1
```

```python
>>> from sqlalchemy.dialects import oracle
>>> print(select(func.now()).compile(dialect=oracle.dialect()))
SELECT CURRENT_TIMESTAMP AS now_1 FROM DUAL
```

## Функции имеют возвращаемые типы

Поскольку функции являются выражениями столбцов, у них также есть типы данных SQL, которые описывают тип данных сгенерированного SQL-выражения. Мы называем эти типы «возвращаемыми типами SQL», имея в виду тип SQL-значения, возвращаемого функцией в контексте SQL-выражения на стороне базы данных, в отличие от «возвращаемого типа» функции Python.

Доступ к возвращаемому типу SQL любой функции SQL можно получить, как правило, в целях отладки, обратившись к атрибуту Function.type; он будет предварительно настроен для нескольких наиболее распространенных функций SQL, но для большинства функций SQL это тип данных «null», если не указано иное:

```python
>>> # преднастроенная (несколько десятков)
>>> func.now().type
DateTime()

>>> # произвольная
>>> func.run_some_calculation().type
NullType()
```

Эти возвращаемые типы SQL важны при использовании выражения функции в контексте более сложных выражений. То есть математические операторы будут работать лучше, если тип данных выражения — целочисленный или числовой. Для корректной работы методов доступа JSON необходимо использовать тип, подобный JSON. Некоторые классы функций возвращают целые строки вместо значений столбцов, когда требуется ссылаться на конкретные столбцы. Такие функции называются функциями с табличными значениями.

Тип возвращаемого значения SQL-функции также может иметь значение при выполнении оператора и получении строк, когда SQLAlchemy приходится применять обработку результирующего набора. Ярким примером этого являются функции SQLite, связанные с датами, где DateTime и связанные с ним типы данных SQLAlchemy выполняют преобразование строковых значений в объекты datetime() Python по мере получения результирующих строк.

Чтобы применить определённый тип к создаваемой функции, мы передаём его через параметр Function.type_; аргумент типа может быть как классом TypeEngine, так и экземпляром. В примере ниже мы передаём класс JSON для генерации функции PostgreSQL json_object(), отмечая, что возвращаемый тип SQL будет иметь тип JSON:

```python
>>> from sqlalchemy import JSON
>>> function_expr = func.json_object('{a, 1, b, "def", c, 3.5}', type_=JSON)
```

Создавая нашу функцию JSON с типом данных JSON, объект выражения SQL приобретает функции, связанные с JSON, такие как доступ к элементам:

```python
>>> stmt = select(function_expr["def"])
>>> print(stmt)
SELECT (json_object(:json_object_1))[:json_object_2] AS anon_1
```

## Встроенные функции имеют предварительно настроенные типы возвращаемых данных

Для распространённых агрегатных функций, таких как count, max, min, а также для очень небольшого числа функций даты, таких как now, и строковых функций, таких как concat, тип возвращаемого значения SQL настраивается соответствующим образом, иногда в зависимости от использования. Функция max и аналогичные функции фильтрации агрегатных данных настраивают тип возвращаемого значения SQL на основе переданного аргумента:

```python
>>> m1 = func.max(Column("some_int", Integer))
>>> m1.type
Integer()

>>> m2 = func.max(Column("some_str", String))
>>> m2.type
String()
```

Функции даты и времени обычно соответствуют выражениям SQL, описываемым DateTime, Date или Time:

```python
>>> func.now().type
DateTime()
>>> func.current_date().type
Date()
```

Известная строковая функция, такая как concat, будет знать, что выражение SQL будет иметь тип String:

```python
>>> func.concat("x", "y").type
String()
```

Однако для подавляющего большинства функций SQL в SQLAlchemy они явно не представлены в его очень небольшом списке известных функций. Например, хотя обычно не возникает проблем с использованием SQL-функций func.lower() и func.upper() для преобразования регистра строк, SQLAlchemy фактически не знает об этих функциях, поэтому они возвращают тип SQL «null»:

```python
>>> func.upper("lowercase").type
NullType()
```

Для простых функций, таких как upper и lower, эта проблема обычно незначительна, поскольку строковые значения могут быть получены из базы данных без какой-либо специальной обработки типов на стороне SQLAlchemy, а правила приведения типов SQLAlchemy часто также могут правильно угадывать намерения; например, оператор + в Python будет правильно интерпретироваться как оператор конкатенации строк на основе рассмотрения обеих сторон выражения:

```python
>>> print(select(func.upper("lowercase") + " suffix"))
SELECT upper(:upper_1) || :upper_2 AS anon_1
```

Сценарий, где Function.type_ нужен:

- Функция не встроенная SQLAlchemy; проверяется по Function.type.

- Нужно выражение с функциями типа, как JSON/ARRAY операторы.

- Обработка результатов, как DateTime, Boolean, Enum, JSON, ARRAY.

## Расширенные методы работы с функциями SQL

Следующие подразделы иллюстрируют менее распространенные, продвинутые техники, популярные благодаря PostgreSQL, включая table- и column-valued формы для JSON.

## Использование оконных функций

Оконная функция — это особый вариант использования агрегатной функции SQL, которая вычисляет агрегированное значение для возвращаемых строк в группе по мере обработки отдельных строк результата. В то время как функция MAX() возвращает максимальное значение столбца в наборе строк, использование той же функции в качестве «оконной функции» возвращает максимальное значение для каждой строки по состоянию на эту строку.

В SQL оконные функции позволяют указывать строки, к которым должна применяться функция, значение «раздела», которое рассматривает окно по различным подмножествам строк, и выражение «order by», которое указывает порядок, в котором строки должны применяться к агрегатной функции.

В SQLAlchemy все функции SQL, генерируемые пространством имен func, включают метод FunctionElement.over(), который предоставляет синтаксис оконной функции или «OVER»; создаваемая конструкция — это конструкция Over.

Функция row_number() часто используется в оконных функциях и просто подсчитывает количество строк. Мы можем разделить это количество строк по имени пользователя, чтобы подсчитать адреса электронной почты отдельных пользователей:

```python
>>> stmt = (
...     select(
...         func.row_number().over(partition_by=user_table.c.name),
...         user_table.c.name,
...         address_table.c.email_address,
...     )
...     .select_from(user_table)
...     .join(address_table)
... )
>>> with engine.connect() as conn:  
...     result = conn.execute(stmt)
...     print(result.all())
BEGIN (implicit)
SELECT row_number() OVER (PARTITION BY user_account.name) AS anon_1,
user_account.name, address.email_address
FROM user_account JOIN address ON user_account.id = address.user_id
[...] ()
[(1, 'sandy', 'sandy@sqlalchemy.org'), (2, 'sandy', 'sandy@squirrelpower.org'), (1, 'spongebob', 'spongebob@sqlalchemy.org')]
ROLLBACK
```

Выше параметр FunctionElement.over.partition_by используется для отображения предложения PARTITION BY внутри предложения OVER. Мы также можем использовать предложение ORDER BY с помощью FunctionElement.over.order_by:

```python
>>> stmt = (
...     select(
...         func.count().over(order_by=user_table.c.name),
...         user_table.c.name,
...         address_table.c.email_address,
...     )
...     .select_from(user_table)
...     .join(address_table)
... )
>>> with engine.connect() as conn:  
...     result = conn.execute(stmt)
...     print(result.all())
BEGIN (implicit)
SELECT count(*) OVER (ORDER BY user_account.name) AS anon_1,
user_account.name, address.email_address
FROM user_account JOIN address ON user_account.id = address.user_id
[...] ()
[(2, 'sandy', 'sandy@sqlalchemy.org'), (2, 'sandy', 'sandy@squirrelpower.org'), (3, 'spongebob', 'spongebob@sqlalchemy.org')]
ROLLBACK
```

Дополнительные возможности оконных функций включают использование диапазонов.

> Важно отметить, что метод FunctionElement.over() применяется только к тем функциям SQL, которые фактически являются агрегатными функциями. В то время как конструкция Over успешно отобразит себя для любой заданной функции SQL, база данных отклонит выражение, если сама функция не является агрегатной функцией SQL.

## Специальные модификаторы WITHIN GROUP, FILTER

Синтаксис SQL «WITHIN GROUP» используется совместно с агрегатной функцией «упорядоченный набор» или «гипотетический набор». К распространённым функциям для «упорядоченных наборов» относятся percentile_cont() и rank(). SQLAlchemy включает встроенные реализации rank, dense_rank, mode, percentile_cont и percentile_disc, включающие метод FunctionElement.within_group():

```python
>>> print(
...     func.unnest(
...         func.percentile_disc([0.25, 0.5, 0.75, 1]).within_group(user_table.c.name)
...     )
... )
unnest(percentile_disc(:percentile_disc_1) WITHIN GROUP (ORDER BY user_account.name))
```

«FILTER» поддерживается некоторыми бэкэндами для ограничения диапазона агрегатной функции определенным подмножеством строк по сравнению с общим диапазоном возвращаемых строк, доступным с помощью метода FunctionElement.filter():

```python
>>> stmt = (
...     select(
...         func.count(address_table.c.email_address).filter(user_table.c.name == "sandy"),
...         func.count(address_table.c.email_address).filter(
...             user_table.c.name == "spongebob"
...         ),
...     )
...     .select_from(user_table)
...     .join(address_table)
... )
>>> with engine.connect() as conn:  
...     result = conn.execute(stmt)
...     print(result.all())
BEGIN (implicit)
SELECT count(address.email_address) FILTER (WHERE user_account.name = ?) AS anon_1,
count(address.email_address) FILTER (WHERE user_account.name = ?) AS anon_2
FROM user_account JOIN address ON user_account.id = address.user_id
[...] ('sandy', 'spongebob')
[(2, 1)]
ROLLBACK
```

## Таблицозначные функции

Табличные функции SQL поддерживают скалярное представление, содержащее именованные подэлементы. Часто используется для функций, ориентированных на JSON и ARRAY, а также для функций, таких как generate_series(). Табличная функция указывается в предложении FROM, а затем упоминается как таблица, а иногда даже как столбец. Функции такого типа широко распространены в базе данных PostgreSQL, однако некоторые формы табличных функций также поддерживаются SQLite, Oracle Database и SQL Server.

Хотя многие базы данных поддерживают табличные значения и другие специальные формы, именно в PostgreSQL эти функции наиболее востребованы. Дополнительные примеры синтаксиса PostgreSQL и описание дополнительных функций см. в этом разделе.

SQLAlchemy предоставляет метод FunctionElement.table_valued() в качестве базовой конструкции «табличной функции», которая преобразует объект func в предложение FROM, содержащее ряд именованных столбцов, на основе строковых имён, переданных позиционно. Этот метод возвращает объект TableValuedAlias, представляющий собой конструкцию Alias с поддержкой функций, которую можно использовать как любое другое предложение FROM, как описано в разделе «Использование псевдонимов». Ниже мы иллюстрируем функцию json_each(), которая, хотя и распространена в PostgreSQL, также поддерживается современными версиями SQLite:

```python
>>> onetwothree = func.json_each('["one", "two", "three"]').table_valued("value")
>>> stmt = select(onetwothree).where(onetwothree.c.value.in_(["two", "three"]))
>>> with engine.connect() as conn:
...     result = conn.execute(stmt)
...     result.all()
BEGIN (implicit)
SELECT anon_1.value
FROM json_each(?) AS anon_1
WHERE anon_1.value IN (?, ?)
[...] ('["one", "two", "three"]', 'two', 'three')
[('two',), ('three',)]
ROLLBACK
```

Выше мы использовали функцию JSON json_each(), поддерживаемую SQLite и PostgreSQL, для генерации табличного выражения с одним столбцом, называемым значением, а затем выбрали две из трех его строк.

## Функции со столбчатым значением — табличная функция как скалярный столбец

Специальный синтаксис, поддерживаемый PostgreSQL и Oracle Database, заключается в ссылке на функцию в предложении FROM, которая затем предоставляется как отдельный столбец в предложении columns оператора SELECT или другом контексте выражения столбца. PostgreSQL эффективно использует этот синтаксис для таких функций, как json_array_elements(), json_object_keys(), json_each_text(), json_each() и т. д.

SQLAlchemy называет это функцией «со значением столбца» и доступ к ней можно получить, применив модификатор FunctionElement.column_valued() к конструкции Function:

```python
>>> from sqlalchemy import select, func
>>> stmt = select(func.json_array_elements('["one", "two"]').column_valued("x"))
>>> print(stmt)
SELECT x
FROM json_array_elements(:json_array_elements_1) AS x
```

Форма «со значением столбца» также поддерживается диалектами Oracle Database, где ее можно использовать для пользовательских функций SQL:

```python
>>> from sqlalchemy.dialects import oracle
>>> stmt = select(func.scalar_strings(5).column_valued("s"))
>>> print(stmt.compile(dialect=oracle.dialect()))
SELECT s.COLUMN_VALUE
FROM TABLE (scalar_strings(:scalar_strings_1)) s
```

## Приведение типов и приведение данных

В SQL часто требуется явно указать тип данных выражения, чтобы сообщить базе данных, какой тип ожидается в выражении, которое иначе было бы неоднозначным, или в некоторых случаях, когда мы хотим преобразовать подразумеваемый тип данных SQL-выражения во что-то другое. Для этой задачи используется ключевое слово SQL CAST, которое в SQLAlchemy предоставляется функцией cast(). Эта функция принимает в качестве аргументов выражение столбца и объект типа данных, как показано ниже, где мы создаём выражение SQL CAST(user_account.id AS VARCHAR) из объекта столбца user_table.c.id:

```python
>>> from sqlalchemy import cast
>>> stmt = select(cast(user_table.c.id, String))
>>> with engine.connect() as conn:
...     result = conn.execute(stmt)
...     result.all()
BEGIN (implicit)
SELECT CAST(user_account.id AS VARCHAR) AS id
FROM user_account
[...] ()
[('1',), ('2',), ('3',)]
ROLLBACK
```

Функция cast() не только отображает синтаксис SQL CAST, но и создаёт выражение столбца SQLAlchemy, которое также будет действовать как заданный тип данных на стороне Python. Строковое выражение, преобразованное с помощью cast() в JSON, добавит операторы индексации и сравнения JSON, например:

```python
>>> from sqlalchemy import JSON
>>> print(cast("{'a': 'b'}", JSON)["a"])
CAST(:param_1 AS JSON)[:param_2]
```

## type_coerce() - только Python "cast"

Иногда необходимо, чтобы SQLAlchemy знала тип данных выражения, по всем упомянутым выше причинам, но при этом не отображала само выражение CAST на стороне SQL, поскольку это может помешать выполнению SQL-операции, которая уже выполняется без него. Для этого довольно распространённого случая существует другая функция type_coerce(), тесно связанная с cast(), поскольку она устанавливает для выражения Python определённый тип базы данных SQL, но не отображает ключевое слово или тип данных CAST на стороне базы данных. Функция type_coerce() особенно важна при работе с типом данных JSON, который обычно имеет сложную взаимосвязь со строковыми типами данных на разных платформах и может даже не быть явным типом данных, например, в SQLite и MariaDB. Ниже мы используем type_coerce() для передачи структуры Python в виде JSON-строки в одну из JSON-функций MySQL:

```python
>>> import json
>>> from sqlalchemy import JSON
>>> from sqlalchemy import type_coerce
>>> from sqlalchemy.dialects import mysql
>>> s = select(type_coerce({"some_key": {"foo": "bar"}}, JSON)["some_key"])
>>> print(s.compile(dialect=mysql.dialect()))
SELECT JSON_EXTRACT(%s, %s) AS anon_1
```

Выше была вызвана SQL-функция JSON_EXTRACT из MySQL, поскольку мы использовали type_coerce(), чтобы указать, что наш словарь Python следует обрабатывать как JSON. В результате стал доступен оператор Python __getitem__, в данном случае ['some_key'], что позволило отобразить выражение пути JSON_EXTRACT (не показано, однако в данном случае это будет '$."some_key"').
