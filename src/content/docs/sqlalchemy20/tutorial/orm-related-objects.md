---
title: "Работа со связями в SQLAlchemy ORM: relationship(), загрузка и запросы"
description: "Подробное руководство по работе со связями в SQLAlchemy ORM: relationship(), каскадирование, загрузка данных, lazy load, selectinload, joinedload и оптимизация запросов."
pubDate: "2025-12-03"
order: 11
official: "https://docs.sqlalchemy.org/en/20/tutorial/orm_related_objects.html"
---

# Работа с связанными объектами ORM

В этом разделе мы рассмотрим еще один важный концепт ORM, который касается того, как ORM взаимодействует с отображенными классами, ссылающимися на другие объекты. В разделе «Объявление отображенных классов» примеры отображенных классов использовали конструкцию под названием `relationship()`. Эта конструкция определяет связь между двумя разными отображенными классами или между отображенным классом и самим собой, что называется самореферентной связью.

Чтобы описать основную идею `relationship()`, сначала мы кратко рассмотрим отображение, опустив отображения `mapped_column()` и другие директивы:

```python
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "user_account"
    # ... mapped_column() mappings
    addresses: Mapped[List["Address"]] = relationship(back_populates="user")

class Address(Base):
    __tablename__ = "address"
    # ... mapped_column() mappings
    user: Mapped["User"] = relationship(back_populates="addresses")
```

Выше класс `User` теперь имеет атрибут `User.addresses`, а класс `Address` имеет атрибут `Address.user`. Конструкция `relationship()` в сочетании с конструкцией `Mapped` для указания поведения типизации будет использоваться для инспекции табличных связей между объектами `Table`, которые отображены на классы `User` и `Address`. Поскольку объект `Table`, представляющий таблицу `address`, имеет `ForeignKeyConstraint`, который ссылается на таблицу `user_account`, `relationship()` может однозначно определить, что существует связь «один-ко-многим» от класса `User` к классу `Address` вдоль связи `User.addresses`; одна конкретная строка в таблице `user_account` может ссылаться на многие строки в таблице `address`.

Все связи «один-ко-многим» естественно соответствуют связи «многие-к-одному» в обратном направлении, в данном случае той, что указана в `Address.user`. Параметр `relationship.back_populates`, видимый выше и настроенный на обоих объектах `relationship()`, ссылающихся на другое имя, устанавливает, что эти две конструкции `relationship()` должны считаться взаимодополняющими; мы увидим, как это проявляется в следующем разделе.

## Сохранение и загрузка связей

Мы можем начать с иллюстрации того, что `relationship()` делает с экземплярами объектов. Если мы создадим новый объект `User`, мы заметим, что существует список Python при доступе к элементу `.addresses`:

```
>>> u1 = User(name="pkrabs", fullname="Pearl Krabs")
>>> u1.addresses
[]
```

Этот объект — это специфическая для SQLAlchemy версия списка Python, которая имеет возможность отслеживать и реагировать на изменения, внесенные в него. Коллекция также появилась автоматически при доступе к атрибуту, даже если мы не присваивали ее объекту. Это похоже на поведение, отмеченное в разделе «Вставка строк с использованием шаблона unit of work ORM», где наблюдалось, что атрибуты на основе столбцов, которым мы не присваиваем значение явно, также отображаются как `None` автоматически, вместо того чтобы вызывать `AttributeError`, как это было бы обычным поведением Python.

Поскольку объект `u1` все еще является транзитным, а список, который мы получили из `u1.addresses`, не был мутирован (т.е. добавлен или расширен), он на самом деле еще не ассоциирован с объектом, но по мере внесения в него изменений он станет частью состояния объекта `User`.

Коллекция специфична для класса `Address`, который является единственным типом объекта Python, который может быть сохранен в ней. Используя метод `list.append()`, мы можем добавить объект `Address`:

```
>>> a1 = Address(email_address="pearl.krabs@gmail.com")
>>> u1.addresses.append(a1)
```

На этом этапе коллекция `u1.addresses`, как ожидалось, содержит новый объект `Address`:

```
>>> u1.addresses
[Address(id=None, email_address='pearl.krabs@gmail.com')]
```

Поскольку мы ассоциировали объект `Address` с коллекцией `User.addresses` экземпляра `u1`, также произошло другое поведение: связь `User.addresses` синхронизировала себя со связью `Address.user`, так что мы можем перемещаться не только от объекта `User` к объекту `Address`, но также от объекта `Address` обратно к «родительскому» объекту `User`:

```
>>> a1.user
User(id=None, name='pkrabs', fullname='Pearl Krabs')
```

Эта синхронизация произошла в результате использования параметра `relationship.back_populates` между двумя объектами `relationship()`. Этот параметр называет другую `relationship()`, для которой должно происходить взаимодополняющее присваивание атрибутов / мутация списка. Он будет работать одинаково хорошо в обратном направлении: если мы создадим другой объект `Address` и присвоим его атрибуту `Address.user`, этот `Address` станет частью коллекции `User.addresses` на том объекте `User`:

```
>>> a2 = Address(email_address="pearl@aol.com", user=u1)
>>> u1.addresses
[Address(id=None, email_address='pearl.krabs@gmail.com'), Address(id=None, email_address='pearl@aol.com')]
```

Мы фактически использовали параметр `user` как аргумент с ключевым словом в конструкторе `Address`, который принимается так же, как любой другой отображенный атрибут, объявленный в классе `Address`. Это эквивалентно присваиванию атрибута `Address.user` постфактум:

```
# equivalent effect as a2 = Address(user=u1)
>>> a2.user = u1
```

### Каскадирование объектов в сессии

Теперь у нас есть объект `User` и два объекта `Address`, которые ассоциированы в bidirectional структуре в памяти, но, как отмечено ранее в разделе «Вставка строк с использованием шаблона unit of work ORM», эти объекты считаются в транзитном состоянии, пока они не ассоциированы с объектом `Session`.

Мы используем сессию, которая все еще продолжается, и отмечаем, что при применении метода `Session.add()` к ведущему объекту `User` связанный объект `Address` также добавляется в ту же сессию:

```
>>> session.add(u1)
>>> u1 in session
True
>>> a1 in session
True
>>> a2 in session
True
```

Вышеописанное поведение, когда `Session` получила объект `User` и прошла вдоль связи `User.addresses` для поиска связанного объекта `Address`, известно как каскад сохранения-обновления и подробно обсуждается в справочной документации ORM в разделе «Каскады».

Три объекта теперь находятся в состоянии ожидания; это означает, что они готовы быть субъектом операции INSERT, но это еще не произошло; все три объекта еще не имеют присвоенного первичного ключа, и, кроме того, объекты `a1` и `a2` имеют атрибут `user_id`, который ссылается на `Column` с `ForeignKeyConstraint`, ссылающимся на столбец `user_account.id`; эти также равны `None`, поскольку объекты еще не ассоциированы с реальной строкой базы данных:

```
>>> print(u1.id)
None
>>> print(a1.user_id)
None
```

Именно на этом этапе становится особенно заметна огромная польза, которую даёт механизм **unit of work**. Вспомним, что в разделе «INSERT обычно генерирует предложение VALUES автоматически» нам приходилось вручную вставлять строки в таблицы `user_account` и `address`, используя довольно громоздкие конструкции, чтобы правильно связать значения столбца `address.user_id` с только что созданными строками в `user_account`. При этом было критически важно сначала выполнить `INSERT` для `user_account`, а уже потом — для `address`, потому что строки в таблице `address` зависят от родительской строки и не могут получить значение внешнего ключа `user_id`, пока эта родительская строка не будет вставлена и не получит свой первичный ключ.

При использовании `Session` вся эта рутина полностью автоматизируется, и даже самый убеждённый поклонник «чистого» SQL в итоге оценит удобство: не нужно вручную следить за порядком вставок и подставлять сгенерированные ключи. Как только мы вызываем `Session.commit()`, процесс unit of work сам расставляет всё по местам — сначала вставляет строку в `user_account`, получает для неё первичный ключ, автоматически подставляет его в столбец `address.user_id` связанных адресов и только после этого выполняет `INSERT` для таблиц `address`. Всё происходит в правильной последовательности, в рамках одной транзакции и без единой лишней строки кода с нашей стороны:

```
>>> session.commit()
INSERT INTO user_account (name, fullname) VALUES (?, ?)
[...] ('pkrabs', 'Pearl Krabs')
INSERT INTO address (email_address, user_id) VALUES (?, ?) RETURNING id
[... (insertmanyvalues) 1/2 (ordered; batch not supported)] ('pearl.krabs@gmail.com', 6)
INSERT INTO address (email_address, user_id) VALUES (?, ?) RETURNING id
[insertmanyvalues 2/2 (ordered; batch not supported)] ('pearl@aol.com', 6)
COMMIT
```

## Загрузка связей

В последнем шаге мы вызвали `Session.commit()` — он отправил в базу команду `COMMIT`, зафиксировав транзакцию, а затем, в соответствии с настройкой по умолчанию `expire_on_commit=True`, «истёк» все объекты в сессии, то есть пометил их состояние как устаревшее, чтобы при следующем обращении они заново загрузились из базы.

Как только мы после коммита обращаемся к любому атрибуту этих объектов, сразу видим эмитированный `SELECT` для получения актуальных значений строки — например, когда запрашиваем только что сгенерированный первичный ключ у объекта `u1`:

```
>>> u1.id
BEGIN (implicit)
SELECT user_account.id AS user_account_id, user_account.name AS user_account_name,
user_account.fullname AS user_account_fullname
FROM user_account
WHERE user_account.id = ?
[...] (6,)
6
```

Объект `User` `u1` теперь имеет персистентную коллекцию `User.addresses`, к которой мы также можем получить доступ. Поскольку эта коллекция состоит из дополнительного набора строк из таблицы `address`, когда мы запросим данные в этой коллекции, мы снова увидим ленивую загрузку, эмитированную для получения объектов:

```
>>> u1.addresses
SELECT address.id AS address_id, address.email_address AS address_email_address,
address.user_id AS address_user_id
FROM address
WHERE ? = address.user_id
[...] (6,)
[Address(id=4, email_address='pearl.krabs@gmail.com'), Address(id=5, email_address='pearl@aol.com')]
```

Коллекции и связанные атрибуты в ORM SQLAlchemy являются персистентными в памяти; как только коллекция или атрибут заполнены, SQL больше не эмитируется, пока эта коллекция или атрибут не истекут. Мы можем снова обратиться к полю `u1.addresses`, а также добавлять или удалять элементы, и это не вызовет новых SQL-вызовов:

```
>>> u1.addresses
[Address(id=4, email_address='pearl.krabs@gmail.com'), Address(id=5, email_address='pearl@aol.com')]
```

Хотя загрузка, эмитируемая ленивой загрузкой, может быстро стать дорогой, если мы не предпримем явных шагов для ее оптимизации, сеть ленивой загрузки по крайней мере достаточно хорошо оптимизирована, чтобы не выполнять избыточную работу; поскольку коллекция `u1.addresses` была обновлена, в соответствии с картой идентичности это на самом деле те же экземпляры `Address`, что и объекты `a1` и `a2`, с которыми мы имели дело ранее, так что мы закончили загрузку всех атрибутов в этом конкретном графе объектов:

```
>>> a1
Address(id=4, email_address='pearl.krabs@gmail.com')
>>> a2
Address(id=5, email_address='pearl@aol.com')
```

Вопрос о том, как загружаются связи или нет, является целой темой сам по себе. Некоторое дополнительное введение в эти концепты приведено позже в этом разделе в «Стратегиях загрузки».

## Использование связей в запросах

В предыдущем разделе мы рассматривали, как `relationship()` работает с конкретными объектами в памяти — с экземплярами `u1`, `a1`, `a2` и как благодаря ему можно было перемещаться от `User` к его адресам и обратно. Теперь же мы переключаемся на другой уровень: покажем, как та же самая конструкция `relationship()` помогает на этапе построения запросов — то есть когда мы ещё не получили объекты, а только пишем `select(...)`. В этом случае атрибуты-классы `User.addresses` и `Address.user` выступают в роли «умных подсказок» для SQLAlchemy: они позволяют автоматически генерировать правильные `JOIN`, условия `ON` и другие части SQL без необходимости вручную указывать таблицы и внешние ключи.

### Использование связей для соединения

В разделах «Явные предложения FROM» и «JOINs и установка предложения ON» вводилось использование методов `Select.join()` и `Select.join_from()` для составления предложений SQL JOIN. Чтобы описать, как соединить таблицы, эти методы либо выводят предложение ON на основе наличия единственного однозначного объекта `ForeignKeyConstraint` в структуре метаданных таблицы, который связывает две таблицы, либо мы можем предоставить явную конструкцию SQL Expression, которая указывает конкретное предложение ON.

При использовании сущностей ORM доступен дополнительный механизм для помощи в настройке предложения ON соединения, который заключается в использовании объектов `relationship()`, которые мы настроили в нашем отображении пользователя, как было продемонстрировано в «Объявлении отображенных классов». Атрибут, связанный с классом, соответствующий `relationship()`, может быть передан как единственный аргумент в `Select.join()`, где он служит для указания как правой стороны соединения, так и предложения ON сразу:

```
>>> print(select(Address.email_address).select_from(User).join(User.addresses))
SELECT address.email_address
FROM user_account JOIN address ON user_account.id = address.user_id
```

Наличие ORM `relationship()` в отображении не используется `Select.join()` или `Select.join_from()` для вывода предложения ON, если мы не укажем его. Это значит, что если мы соединим от `User` к `Address` без предложения ON, это работает благодаря `ForeignKeyConstraint` между двумя отображенными объектами `Table`, а не из-за объектов `relationship()` в классах `User` и `Address`:

```
>>> print(select(Address.email_address).join_from(User, Address))
SELECT address.email_address
FROM user_account JOIN address ON user_account.id = address.user_id
```

Смотрите раздел «Соединения» в Руководстве по запросам ORM для многих других примеров того, как использовать `Select.join()` и `Select.join_from()` с конструкциями `relationship()`.

### Операторы WHERE для связей

Существуют некоторые дополнительные разновидности помощников по генерации SQL, которые поставляются с `relationship()` и обычно полезны при построении предложения WHERE оператора. Смотрите раздел «Операторы WHERE для связей» в Руководстве по запросам ORM.

## Стратегии загрузки

В разделе «Загрузка связей» мы ввели концепцию, что при работе с экземплярами отображенных объектов доступ к атрибутам, отображенным с использованием `relationship()`, в случае по умолчанию эмитирует ленивую загрузку, когда коллекция не заполнена, чтобы загрузить объекты, которые должны присутствовать в этой коллекции.

Ленивая загрузка — один из самых известных и одновременно самых спорных приёмов ORM: она очень удобна, но часто приводит к классической проблеме N+1 — когда вместо одного нормального запроса приложение незаметно генерирует десятки или сотни мелких SELECT-запросов. Эти запросы происходят неявно, их легко не заметить, а в случае закрытой сессии или законченной транзакции они падают с ошибкой; в асинхронном коде (`asyncio`) обычная ленивая загрузка и вовсе не работает. Поэтому, несмотря на всю популярность этого подхода, в простых случаях, в реальных приложениях её почти всегда нужно контролировать и заменять на более эффективные стратегии загрузки.

В то же время ленивая загрузка — это очень популярный и полезный шаблон, когда он совместим с используемым подходом параллелизма и в остальном не вызывает проблем. По этим причинам ORM SQLAlchemy уделяет много внимания возможности контролировать и оптимизировать это поведение загрузки.

Прежде всего, первый шаг в эффективном использовании ленивой загрузки ORM — это тестирование приложения, включение эха SQL и наблюдение за эмитируемым SQL. Если кажется, что существует множество избыточных операторов SELECT, которые очень похожи и могли бы быть объединены в один гораздо более эффективно, если происходят загрузки неуместно для объектов, которые были отсоединены от своей `Session`, именно тогда стоит рассмотреть использование стратегий загрузки.

Стратегии загрузки представляют собой объекты, которые могут быть ассоциированы с оператором SELECT с использованием метода `Select.options()`, например:

```python
for user_obj in session.execute(
    select(User).options(selectinload(User.addresses))
).scalars():
    user_obj.addresses # access addresses collection already loaded
```

Они также могут быть настроены как значения по умолчанию для `relationship()` с использованием опции `relationship.lazy`, например:

```python
from sqlalchemy.orm import Mapped
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "user_account"
    addresses: Mapped[List["Address"]] = relationship(
        back_populates="user", lazy="selectin"
    )
```

Каждый объект стратегии загрузки добавляет некоторую информацию в оператор, которая позже будет использована `Session` при принятии решения о том, как различные атрибуты должны загружаться и/или вести себя при доступе.

### Selectin Load

Наиболее полезная стратегия загрузки в современном SQLAlchemy — это опция загрузки `selectinload()`. Эта опция решает наиболее распространенную форму проблемы **N+1**, которая заключается в наборе объектов, ссылающихся на связанные коллекции. `selectinload()` гарантирует, что конкретная коллекция для полного ряда объектов загружается заранее с использованием одного запроса. Она делает это с использованием формы SELECT, которая в большинстве случаев может быть эмитирована только против связанной таблицы, без введения JOIN или подзапросов, и запрашивает только те родительские объекты, для которых коллекция еще не загружена. Ниже мы иллюстрируем `selectinload()`, загружая все объекты `User` и все их связанные объекты `Address`; хотя мы вызываем `Session.execute()` только один раз, для конструкции `select()`, когда база данных доступна, на самом деле эмитируются два оператора SELECT, второй из которых — для получения связанных объектов `Address`:

```
>>> from sqlalchemy.orm import selectinload
>>> stmt = select(User).options(selectinload(User.addresses)).order_by(User.id)
>>> for row in session.execute(stmt):
... print(
... f"{row.User.name} ({', '.join(a.email_address for a in row.User.addresses)})"
... )
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account ORDER BY user_account.id
[...] ()
SELECT address.user_id AS address_user_id, address.id AS address_id,
address.email_address AS address_email_address
FROM address
WHERE address.user_id IN (?, ?, ?, ?, ?, ?)
[...] (1, 2, 3, 4, 5, 6)
spongebob (spongebob@sqlalchemy.org)
sandy (sandy@sqlalchemy.org, sandy@squirrelpower.org)
patrick ()
squidward ()
ehkrabs ()
pkrabs (pearl.krabs@gmail.com, pearl@aol.com)
```

### Joined Load

Стратегия eager load `joinedload()` — это самая старая стратегия eager load в SQLAlchemy, которая дополняет оператор SELECT, передаваемый в базу данных, JOIN (который может быть внешним или внутренним соединением в зависимости от опций), который затем может загружать связанные объекты.

Стратегия `joinedload()` лучше всего подходит для загрузки связанных объектов «многие-к-одному», поскольку это требует только добавления дополнительных столбцов в первичную строку сущности, которая в любом случае извлекается. Для большей эффективности она также принимает опцию `joinedload.innerjoin`, чтобы вместо внешнего соединения могло быть использовано внутреннее соединение в случае, таком как ниже, где мы знаем, что все объекты `Address` имеют ассоциированный `User`:

```
>>> from sqlalchemy.orm import joinedload
>>> stmt = (
... select(Address)
... .options(joinedload(Address.user, innerjoin=True))
... .order_by(Address.id)
... )
>>> for row in session.execute(stmt):
... print(f"{row.Address.email_address} {row.Address.user.name}")
SELECT address.id, address.email_address, address.user_id, user_account_1.id AS id_1,
user_account_1.name, user_account_1.fullname
FROM address
JOIN user_account AS user_account_1 ON user_account_1.id = address.user_id
ORDER BY address.id
[...] ()
spongebob@sqlalchemy.org spongebob
sandy@sqlalchemy.org sandy
sandy@squirrelpower.org sandy
pearl.krabs@gmail.com pkrabs
pearl@aol.com pkrabs
```

`joinedload()` также работает для коллекций, то есть связей «один-ко-многим», однако это имеет эффект умножения первичных строк на связанные элементы в рекурсивном способе, который увеличивает объем передаваемых данных для набора результатов на порядки величины для вложенных коллекций и/или больших коллекций, поэтому его использование по сравнению с другой опцией, такой как `selectinload()`, должно оцениваться в каждом конкретном случае.

Важно отметить, что критерии WHERE и ORDER BY enclosing оператора `Select` не ориентированы на таблицу, рендеренную `joinedload()`. Выше видно в SQL, что анонимный псевдоним применяется к таблице `user_account`, так что она не адресуется напрямую в запросе. Эта концепция обсуждается подробнее в разделе «Дзен соединенной eager loading».

> Важно отметить, что eager loads «многие-к-одному» часто не нужны, поскольку проблема N+1 гораздо менее распространена в общем случае. Когда многие объекты ссылаются на один и тот же связанный объект, такой как многие объекты `Address`, каждый ссылающийся на одного и того же `User`, SQL будет эмитирован только один раз для этого объекта `User` с использованием нормальной ленивой загрузки. Рутина ленивой загрузки будет искать связанный объект по первичному ключу в текущей `Session` без эмиссии SQL, когда это возможно.

### Явное соединение + Eager load

Если бы мы загружали строки `Address`, соединяя с таблицей `user_account` с использованием метода, такого как `Select.join()` для рендеринга JOIN, мы также могли бы использовать это JOIN для eager load содержимого атрибута `Address.user` на каждом возвращенном объекте `Address`. По сути, мы используем «соединенную eager loading», но рендерим JOIN сами. Этот распространенный случай использования достигается с помощью опции `contains_eager()`. Эта опция очень похожа на `joinedload()`, за исключением того, что она предполагает, что мы настроили JOIN сами, и вместо этого только указывает, что дополнительные столбцы в предложении COLUMNS должны быть загружены в связанные атрибуты на каждом возвращенном объекте, например:

```
>>> from sqlalchemy.orm import contains_eager
>>> stmt = (
... select(Address)
... .join(Address.user)
... .where(User.name == "pkrabs")
... .options(contains_eager(Address.user))
... .order_by(Address.id)
... )
>>> for row in session.execute(stmt):
... print(f"{row.Address.email_address} {row.Address.user.name}")
SELECT user_account.id, user_account.name, user_account.fullname,
address.id AS id_1, address.email_address, address.user_id
FROM address JOIN user_account ON user_account.id = address.user_id
WHERE user_account.name = ? ORDER BY address.id
[...] ('pkrabs',)
pearl.krabs@gmail.com pkrabs
pearl@aol.com pkrabs
```

Выше мы как отфильтровали строки по `user_account.name`, так и загрузили строки из `user_account` в атрибут `Address.user` возвращенных строк. Если бы мы применили `joinedload()` отдельно, мы получили бы SQL-запрос, который ненужным образом соединяет дважды:

```
>>> stmt = (
... select(Address)
... .join(Address.user)
... .where(User.name == "pkrabs")
... .options(joinedload(Address.user))
... .order_by(Address.id)
... )
>>> print(stmt) # SELECT has a JOIN and LEFT OUTER JOIN unnecessarily
SELECT address.id, address.email_address, address.user_id,
user_account_1.id AS id_1, user_account_1.name, user_account_1.fullname
FROM address JOIN user_account ON user_account.id = address.user_id
LEFT OUTER JOIN user_account AS user_account_1 ON user_account_1.id = address.user_id
WHERE user_account.name = :name_1 ORDER BY address.id
```

### Raiseload

Одна дополнительная стратегия загрузки, которую стоит упомянуть, — это `raiseload()`. Эта опция используется для полного блокирования проблемы N плюс один в приложении, вызывая ошибку вместо того, что обычно было бы ленивой загрузкой. У нее есть два варианта, контролируемые опцией `raiseload.sql_only`, чтобы блокировать либо ленивые загрузки, требующие SQL, либо все операции «load», включая те, которые только нуждаются в консультации с текущей `Session`.

Один способ использовать `raiseload()` — настроить его на самой `relationship()`, установив `relationship.lazy` в значение «raise_on_sql», так что для конкретного отображения определенная связь никогда не попытается эмитировать SQL:

```python
>>> from sqlalchemy.orm import Mapped
>>> from sqlalchemy.orm import relationship
>>> class User(Base):
... __tablename__ = "user_account"
... id: Mapped[int] = mapped_column(primary_key=True)
... addresses: Mapped[List["Address"]] = relationship(
... back_populates="user", lazy="raise_on_sql"
... )
>>> class Address(Base):
... __tablename__ = "address"
... id: Mapped[int] = mapped_column(primary_key=True)
... user_id: Mapped[int] = mapped_column(ForeignKey("user_account.id"))
... user: Mapped["User"] = relationship(back_populates="addresses", lazy="raise_on_sql")
```

Используя такое отображение, приложение блокируется от ленивой загрузки, указывая, что конкретный запрос должен указать стратегию загрузки:

```
>>> u1 = session.execute(select(User)).scalars().first()
SELECT user_account.id FROM user_account
[...] ()
>>> u1.addresses
Traceback (most recent call last):
...
sqlalchemy.exc.InvalidRequestError: 'User.addresses' is not available due to lazy='raise_on_sql'
```

Исключение указывало бы, что эта коллекция должна быть загружена заранее вместо этого:

```
>>> u1 = (
... session.execute(select(User).options(selectinload(User.addresses)))
... .scalars()
... .first()
... )
SELECT user_account.id
FROM user_account
[...] ()
SELECT address.user_id AS address_user_id, address.id AS address_id
FROM address
WHERE address.user_id IN (?, ?, ?, ?, ?, ?)
[...] (1, 2, 3, 4, 5, 6)
```

Опция `lazy="raise_on_sql"` пытается быть умной также в отношении связей «многие-к-одному»; выше, если атрибут `Address.user` объекта `Address` не был загружен, но этот объект `User` был локально присутствующим в той же `Session`, стратегия «raiseload» не вызвала бы ошибку.
