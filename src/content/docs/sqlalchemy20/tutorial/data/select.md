---
title: "Использование SELECT запросов в SQLAlchemy (Core и ORM) для получения данных"
description: "Построение и выполнение SQLAlchemy SELECT-запросов: примеры кода, объяснение генеративного подхода, работа с ORM-сущностями, JOIN, WHERE, ORDER BY, GROUP BY, подзапросы, CTE, оконные функции."
pubDate: "2025-11-26"
order: 8
official: "https://docs.sqlalchemy.org/en/20/tutorial/data_select.html"
---

# Использование операторов SELECT

Как в Core, так и в ORM функция select() генерирует конструкцию Select, используемую для всех запросов SELECT. При передаче в такие методы, как Connection.execute() в Core и Session.execute() в ORM, в текущей транзакции генерируется оператор SELECT, а строки результата доступны через возвращаемый объект Result.

**Читатели ORM** — материалы этого раздела одинаково применимы как к Core, так и к ORM, и здесь рассматриваются базовые варианты использования ORM. Однако существует и множество других функций, специфичных для ORM; они описаны в руководстве по запросам ORM.

## Конструкция выражения SQL select()

Конструкция select() формирует оператор так же, как и insert(), используя генеративный подход, где каждый метод добавляет к объекту большее состояние. Как и другие конструкции SQL, её можно преобразовать в строку на месте:

```python
>>> from sqlalchemy import select
>>> stmt = select(user_table).where(user_table.c.name == "spongebob")
>>> print(stmt)
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account
WHERE user_account.name = :name_1
```

Также, как и все другие конструкции SQL на уровне операторов, для выполнения оператора мы передаём его методу выполнения. Поскольку оператор SELECT возвращает строки, мы всегда можем перебрать результирующий объект, чтобы получить объекты Row:

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

При использовании ORM, особенно с конструкцией select(), составленной из сущностей ORM, нам потребуется выполнить ее с помощью метода Session.execute() в Session; при использовании этого подхода мы продолжаем получать объекты Row из результата, однако теперь эти строки могут включать в себя полные сущности, такие как экземпляры класса User, как отдельные элементы в каждой строке:

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

## select() из таблицы против класса ORM

Хотя SQL-запрос, сгенерированный в этих примерах, выглядит одинаково независимо от того, вызываем ли мы select(user_table) или select(User), в более общем случае они не обязательно выдают одно и то же, поскольку класс, сопоставленный с ORM, может быть сопоставлен с другими типами «выбираемых» объектов, помимо таблиц. Функция select(), применяемая к сущности ORM, также указывает, что в результате должны быть возвращены экземпляры, сопоставленные с ORM, чего нельзя сказать о выборе из объекта Table.

В следующих разделах конструкция SELECT будет рассмотрена более подробно.

## Настройка пунктов COLUMNS и FROM

Функция select() принимает позиционные элементы, представляющие любое количество выражений типа «столбец» и/или «таблица», а также широкий спектр совместимых объектов, которые преобразуются в список SQL-выражений, из которых выполняется выборка, возвращаемая в качестве столбцов в результирующем наборе. Эти элементы также служат в более простых случаях для создания команды FROM, которое выводится из переданных столбцов и табличных выражений:

```python
>>> print(select(user_table))
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account
```

Чтобы выполнить SELECT из отдельных столбцов с использованием подхода Core, доступ к объектам Column осуществляется из метода доступа Table.c, и их можно отправлять напрямую; команда FROM будет выведена как набор всех объектов Table и других объектов FromClause, представленных этими столбцами:

```python
>>> print(select(user_table.c.name, user_table.c.fullname))
SELECT user_account.name, user_account.fullname
FROM user_account
```

В качестве альтернативы, при использовании коллекции FromClause.c любого FromClause, например Table, для select() можно указать несколько столбцов, используя кортеж имен строк:

```python
>>> print(select(user_table.c["name", "fullname"]))
SELECT user_account.name, user_account.fullname
FROM user_account
```

Добавлено в версии 2.0: Возможность доступа через кортеж к коллекции FromClause.c

### Выбор сущностей и столбцов ORM

Сущности ORM, такие как наш класс User и сопоставленные с ним атрибуты столбцов, такие как User.name, также участвуют в системе языка выражений SQL, представляющей таблицы и столбцы. Ниже показан пример выбора из сущности User, который в конечном итоге отображается так же, как если бы мы использовали user_table напрямую:

```python
>>> print(select(User))
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account
```

При выполнении оператора, подобного приведённому выше, с помощью метода ORM Session.execute(), существует важное отличие при выборе из полной сущности, например, User, от user_table. Сущность возвращается как отдельный элемент в каждой строке. То есть, когда мы извлекаем строки из приведённого выше оператора, поскольку в списке извлекаемых данных присутствует только сущность User, мы получаем объекты Row, содержащие только один элемент, содержащий экземпляры класса User:

```python
>>> row = session.execute(select(User)).first()
BEGIN...
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account
[...] ()
>>> row
(User(id=1, name='spongebob', fullname='Spongebob Squarepants'),)
```

Приведенная выше строка содержит только один элемент, представляющий сущность «Пользователь»:

```python
>>> row[0]
User(id=1, name='spongebob', fullname='Spongebob Squarepants')
```

Настоятельно рекомендуемый удобный метод достижения того же результата, что и выше, — это использование метода Session.scalars() для непосредственного выполнения оператора; этот метод вернет объект ScalarResult, который сразу возвращает первый «столбец» каждой строки, в данном случае — экземпляры класса User:

```python
>>> user = session.scalars(select(User)).first()
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account
[...] ()
>>> user
User(id=1, name='spongebob', fullname='Spongebob Squarepants')
```

В качестве альтернативы мы можем выбрать столбцы сущности ORM как отдельные элементы в строках результата, используя атрибуты, связанные с классом; когда они передаются в конструкцию, такую как select(), они преобразуются в Column или другое выражение SQL, представленное каждым атрибутом:

```python
>>> print(select(User.name, User.fullname))
SELECT user_account.name, user_account.fullname
FROM user_account
```

При вызове этого оператора с помощью Session.execute() мы теперь получаем строки, которые имеют отдельные элементы для каждого значения, каждое из которых соответствует отдельному столбцу или другому выражению SQL:

```python
>>> row = session.execute(select(User.name, User.fullname)).first()
SELECT user_account.name, user_account.fullname
FROM user_account
[...] ()
>>> row
('spongebob', 'Spongebob Squarepants')
```

Подходы также можно смешивать, как показано ниже, где мы выбираем атрибут имени сущности «Пользователь» в качестве первого элемента строки и объединяем его с полными сущностями «Адрес» во втором элементе:

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

Подходы к выбору сущностей и столбцов ORM, а также общие методы преобразования строк обсуждаются далее в разделе Выбор сущностей и атрибутов ORM.

### Выбор из помеченных выражений SQL

Метод `ColumnElement.label()`, как и одноименный метод, доступный для атрибутов ORM, предоставляет SQL-метку столбца или выражения, позволяя присвоить ему конкретное имя в результирующем наборе. Это может быть полезно при обращении к произвольным SQL-выражениям в строке результата по имени:

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

Имена меток, которые мы создаем, также могут быть упомянуты в команде ORDER BY или GROUP BY оператора Select.

### Выбор с помощью выражений текстовых столбцов

При создании объекта Select с помощью функции select() мы обычно передаём ему ряд объектов Table и Column, определённых с помощью метаданных таблицы, или, при использовании ORM, можем передавать атрибуты, сопоставленные ORM, представляющие столбцы таблицы. Однако иногда также возникает необходимость создавать произвольные блоки SQL внутри операторов, например, константные строковые выражения или просто произвольный SQL-код, который быстрее записать буквально.

Конструкцию `text()`, представленную в разделе Работа с транзакциями и DBAPI, на самом деле можно напрямую встроить в конструкцию Select, например, как показано ниже, где мы создаем жестко закодированный строковый литерал «some phrase» и встраиваем его в оператор SELECT:

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

Хотя конструкция text() может использоваться в большинстве случаев для внедрения литеральных SQL-фраз, чаще всего мы имеем дело с текстовыми блоками, каждый из которых представляет отдельное выражение столбца. В этом распространённом случае мы можем расширить функциональность нашего текстового фрагмента, используя конструкцию `literal_column()`. Этот объект похож на text(), за исключением того, что вместо представления произвольного SQL-запроса любой формы он явно представляет один «столбец», который затем может быть помечен и на него можно ссылаться в подзапросах и других выражениях:

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

Обратите внимание, что в обоих случаях при использовании text() или literal_column() мы пишем синтаксическое выражение SQL, а не литеральное значение. Поэтому нам необходимо включить все необходимые кавычки или синтаксис для SQL-кода, который мы хотим отобразить.

## Команда WHERE

SQLAlchemy позволяет составлять SQL-выражения, такие как name = 'squidward' или user_id > 10, используя стандартные операторы Python в сочетании с объектами Column и подобными. Для булевых выражений большинство операторов Python, таких как ==, !=, <, >= и т. д., генерируют новые объекты SQL-выражений, а не простые булевы значения True/False:

```python
>>> print(user_table.c.name == "squidward")
user_account.name = :name_1

>>> print(address_table.c.user_id > 10)
address.user_id > :user_id_1
```

Мы можем использовать подобные выражения для генерации команды WHERE, передавая полученные объекты методу Select.where():

```python
>>> print(select(user_table).where(user_table.c.name == "squidward"))
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account
WHERE user_account.name = :name_1
```

Для создания нескольких выражений, объединенных оператором AND, метод Select.where() можно вызывать любое количество раз:

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

Один вызов Select.where() также принимает несколько выражений с тем же эффектом:

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

Союзы «AND» и «OR» доступны напрямую с использованием функций `and_()` и `or_()`, что проиллюстрировано ниже в терминах сущностей ORM:

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

> Отображение скобок основано на правилах приоритета операторов (во время выполнения невозможно обнаружить скобки в выражении Python), поэтому, если мы объединим AND и OR таким образом, чтобы это соответствовало естественному приоритету AND, то в отрисованном выражении скобки могут выглядеть не так, как в нашем коде Python.

Для простых сравнений на равенство с одной сущностью существует также популярный метод `Select.filter_by()`, который принимает ключевые аргументы, соответствующие ключам столбцов или именам атрибутов ORM. Он выполняет фильтрацию по самому левому выражению FROM или последней объединённой сущности:

```python
>>> print(select(User).filter_by(name="spongebob", fullname="Spongebob Squarepants"))
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account
WHERE user_account.name = :name_1 AND user_account.fullname = :fullname_1
```

## Явные FROM и JOIN

Как упоминалось ранее, команда FROM обычно выводится на основе выражений, которые мы устанавливаем в columns, а также других элементов Select.

Если мы установим один столбец из определенной таблицы в COLUMNS, то эта таблица также будет помещена в команду FROM:

```python
>>> print(select(user_table.c.name))
SELECT user_account.name
FROM user_account
```

Если бы мы поместили столбцы из двух таблиц, то получили бы команду FROM, разделенную запятыми:

```python
>>> print(select(user_table.c.name, address_table.c.email_address))
SELECT user_account.name, address.email_address
FROM user_account, address
```

Чтобы объединить эти две таблицы, мы обычно используем один из двух методов Select. Первый — метод `Select.join_from()`, который позволяет явно указать левую и правую стороны объединения:

```python
>>> print(
...     select(user_table.c.name, address_table.c.email_address).join_from(
...         user_table, address_table
...     )
... )
SELECT user_account.name, address.email_address
FROM user_account JOIN address ON user_account.id = address.user_id
```

Другой метод — `Select.join()`, который указывает только правую часть JOIN, левая часть выводится:

```python
>>> print(select(user_table.c.name, address_table.c.email_address).join(address_table))
SELECT user_account.name, address.email_address
FROM user_account JOIN address ON user_account.id = address.user_id
```

> При использовании Select.join_from() или Select.join() мы можем заметить, что команда ON при соединении вводится за нас в случаях простых внешних ключей. Подробнее об этом в следующем разделе.

Мы также можем явно добавлять элементы в команду FROM, если это не выводится из columns так, как нам нужно. Для этого мы используем метод `Select.select_from()`, как показано ниже: мы устанавливаем user_table первым элементом FROM, а Select.join() — вторым элементом address_table:

```python
>>> print(select(address_table.c.email_address).select_from(user_table).join(address_table))
SELECT address.email_address
FROM user_account JOIN address ON user_account.id = address.user_id
```

Другой пример, когда может понадобиться Select.select_from(), — это когда в columns недостаточно информации для команды FROM. Например, для выполнения SELECT из общего выражения SQL count(*) мы используем элемент SQLAlchemy, известный как sqlalchemy.sql.expression.func, для создания функции SQL count():

```python
>>> from sqlalchemy import func
>>> print(select(func.count("*")).select_from(user_table))
SELECT count(:count_2) AS count_1
FROM user_account
```

### Указание ON

Предыдущие примеры использования JOIN иллюстрировали, что конструкция Select может объединять две таблицы и автоматически формировать содержимое ON. В этих примерах это происходит, поскольку объекты таблиц user_table и address_table содержат единое определение ForeignKeyConstraint, которое используется для формирования этого выражения ON.

Если левая и правая цели соединения не имеют такого ограничения или имеется несколько ограничений, необходимо напрямую указать ON. Как Select.join(), так и Select.join_from() принимают дополнительный аргумент для команды ON, который задаётся с использованием той же механики SQL-выражений, что и во WHERE:

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

### OUTER и FULL join

Оба метода Select.join() и Select.join_from() принимают ключевые аргументы `Select.join.isouter` и `Select.join.full`, которые отобразят LEFT OUTER JOIN и FULL OUTER JOIN соответственно:

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

Существует также метод Select.outerjoin(), который эквивалентен использованию .join(..., isouter=True).

> В SQL также есть «RIGHT OUTER JOIN». SQLAlchemy не отображает его напрямую; вместо этого нужно изменить порядок таблиц на обратный и использовать «LEFT OUTER JOIN».

## ORDER BY, GROUP BY, HAVING

Оператор SQL SELECT имеет команду ORDER BY, которое используется для возврата выбранных строк в заданном порядке.

Команда GROUP BY построена аналогично ORDER BY и предназначена для разделения выбранных строк на группы, к которым могут быть применены агрегатные функции. HAVING обычно используется с GROUP BY и имеет форму, аналогичную WHERE, за исключением того, что применяется к агрегатным функциям, используемым внутри групп.

### ORDER BY

ORDER BY строится на основе конструкций SQL-выражений, обычно основанных на объектах Column или подобных. Метод `Select.order_by()` принимает одно или несколько из этих выражений позиционно:

```python
>>> print(select(user_table).order_by(user_table.c.name))
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account ORDER BY user_account.name
```

Сортировка по возрастанию/убыванию доступна с помощью модификаторов `ColumnElement.asc()` и `ColumnElement.desc()`, которые также присутствуют в атрибутах, связанных с ORM:

```python
>>> print(select(User).order_by(User.fullname.desc()))
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account ORDER BY user_account.fullname DESC
```

Приведенный выше оператор выведет строки, отсортированные по столбцу user_account.fullname в порядке убывания.

### Аггрегатные функции с GROUP BY / HAVING

В SQL агрегатные функции позволяют объединять выражения столбцов из нескольких строк для получения единого результата. Примерами служат подсчёт, вычисление средних значений, а также поиск максимального или минимального значения в наборе значений.

SQLAlchemy предоставляет SQL-функции открытым способом, используя пространство имён, известное как func. Это специальный объект-конструктор, который создаёт новые экземпляры Function, если задано имя конкретной SQL-функции (которое может иметь любое имя), а также ноль или более аргументов для передачи функции, которые, как и во всех других случаях, являются конструкциями SQL-выражений. Например, чтобы отобразить SQL-функцию COUNT() для столбца user_account.id, мы вызываем имя count():

```python
>>> from sqlalchemy import func
>>> count_fn = func.count(user_table.c.id)
>>> print(count_fn)
count(user_account.id)
```

При использовании агрегатных функций в SQL оператор GROUP BY играет ключевую роль, поскольку позволяет разбивать строки на группы, к каждой из которых агрегатные функции применяются отдельно. Когда в списке SELECT указываются неагрегированные столбцы, SQL требует, чтобы все такие столбцы были включены в GROUP BY — либо напрямую, либо косвенно (через зависимость от первичного ключа). Оператор HAVING используется аналогично WHERE, но с важным отличием: он фильтрует строки на основе результатов агрегации, а не исходных значений в строках.

SQLAlchemy реализует эти два оператора с помощью методов `Select.group_by()` и `Select.having()`. Ниже показан пример выборки имен пользователей и количества их адресов для тех пользователей, у которых имеется более одного адреса:

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

### Сортировка или группировка по метке

Важным приёмом, особенно для некоторых СУБД, является возможность применять ORDER BY или GROUP BY к выражению, уже указанному в списке столбцов SELECT, без повторного написания этого выражения — вместо этого можно использовать имя столбца или его метку из SELECT. Такая форма доступна при передаче строки с именем в методы Select.order_by() или Select.group_by(). При этом переданный текст не подставляется напрямую в SQL; вместо этого используется имя, присвоенное выражению в списке столбцов, которое и попадает в итоговый запрос. Если совпадение не найдено, возникает ошибка. Унарные модификаторы asc() и desc() также могут использоваться в этой форме:

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

Теперь, когда мы выбираем данные из нескольких таблиц и используем объединения, мы быстро сталкиваемся с необходимостью многократно ссылаться на одну и ту же таблицу в секции FROM. Это достигается с помощью псевдонимов SQL — синтаксиса, предоставляющего альтернативное имя таблице или подзапросу, из которого на них можно ссылаться в операторе.

В языке выражений SQLAlchemy эти «имена» представлены объектами FromClause, известными как конструкция Alias, которая в Core создается с помощью метода `FromClause.alias()`. Конструкция Alias похожа на конструкцию Table тем, что также имеет пространство имён объектов Column в коллекции Alias.c. Например, приведённый ниже оператор SELECT возвращает все уникальные пары имён пользователей:

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

### Алиасы сущностей ORM

Эквивалентом метода FromClause.alias() в ORM является функция ORM `aliased()`, которую можно применить к таким сущностям, как User и Address. Это создаёт внутренний объект Alias, сопоставленный исходному объекту Table, сохраняя при этом функциональность ORM. Оператор SELECT ниже выбирает из сущности User все объекты, содержащие два конкретных адреса электронной почты:

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

SQLAlchemy использует объект Subquery для представления подзапроса, а CTE — для представления CTE, обычно получаемых методами `Select.subquery()` и `Select.cte()` соответственно. Любой из этих объектов может использоваться как элемент FROM внутри более крупной конструкции select().

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

Для соединения таблицы user_account с address мы использовали метод Select.join_from(). Как было показано ранее, предложение ON этого соединения снова было автоматически выведено на основе ограничений внешнего ключа. Несмотря на то, что SQL-подзапрос сам по себе не имеет никаких ограничений, SQLAlchemy может учитывать ограничения, представленные в столбцах, определяя, что столбец subq.c.user_id является производным от столбца address_table.c.user_id, который, в свою очередь, содержит связь по внешнему ключу со столбцом user_table.c.id. Эта информация затем используется для формирования предложения ON.

### Common Table Expressions (CTE) (Общие табличные выражения)

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

Конструкция CTE также может использоваться в «рекурсивном» стиле и в более сложных случаях может быть составлена из предложения RETURNING операторов INSERT, UPDATE или DELETE.

В обоих случаях подзапрос и CTE-выражение были названы на уровне SQL с использованием «анонимного» имени. В коде Python нам вообще не нужно указывать эти имена. Идентификатор объекта подзапроса или CTE служит синтаксическим идентификатором объекта при рендеринге. Имя, которое будет отображено в SQL-запросе, можно указать, передав его в качестве первого аргумента методам Select.subquery() или Select.cte().

### Подзапросы/CTE сущностей ORM

В ORM конструкция aliased() может использоваться для связывания сущности ORM, например, класса User или Address, с любым FromClause, представляющим источник строк. В предыдущем разделе «Псевдонимы сущностей ORM» было показано использование aliased() для связывания сопоставленного класса с псевдонимом сопоставленной ему таблицы. Здесь мы демонстрируем, как aliased() выполняет то же самое действие как для подзапроса, так и для CTE-выражения, сгенерированного для конструкции Select, которая в конечном итоге выводится из той же сопоставленной таблицы.

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

**Скалярный подзапрос** — это подзапрос, который возвращает ровно ноль или одну строку и ровно один столбец. Такой подзапрос используется в списке столбцов SELECT или в условии WHERE основного запроса. Главное отличие от обычного подзапроса: скалярный не используется в секции FROM. **Коррелированный подзапрос** — это подзапрос, который ссылается на столбцы из внешнего запроса и выполняется для каждой строки этого внешнего запроса.

В SQLAlchemy скалярный подзапрос представлен конструкцией ScalarSelect, которая относится к иерархии выражений ColumnElement. Для сравнения: обычный подзапрос представлен конструкцией Subquery из иерархии FromClause.

Скалярные подзапросы часто (но не обязательно) используются вместе с агрегатными функциями, о которых говорилось ранее в разделе «Агрегатные функции с GROUP BY / HAVING». Чтобы создать скалярный подзапрос, используйте метод `Select.scalar_subquery()`, как показано ниже. При преобразовании в строку он выглядит как обычный SELECT-запрос, выбирающий данные из двух таблиц:

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

### Корреляция LATERAL

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

### Выбор сущностей ORM из UNION

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

### Функции имеют возвращаемые типы

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

### Встроенные функции имеют предварительно настроенные типы возвращаемых данных

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

### Расширенные методы работы с функциями SQL

Следующие подразделы иллюстрируют менее распространенные, продвинутые техники, популярные благодаря PostgreSQL, включая table- и column-valued формы для JSON.

#### Использование оконных функций

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

#### Специальные модификаторы WITHIN GROUP, FILTER

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

#### Таблицозначные функции

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

#### Функции со столбчатым значением — табличная функция как скалярный столбец

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

### type_coerce() - только Python "cast"

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
