---
title: "SQLAlchemy ORM — как работать с данными: Session, flush, commit, rollback и CRUD-операции"
description: "Подробное руководство по работе с данными в SQLAlchemy ORM: жизненный цикл Session, паттерн Unit of Work, получение объектов из identity map, автогенерация первичных ключей, откат и закрытие сессии. Практические примеры и разбор SQL-операций."
pubDate: "2025-12-02"
order: 10
official: "https://docs.sqlalchemy.org/en/20/tutorial/orm_data_manipulation.html"
---

# Манипулирование данными с помощью ORM

В предыдущем разделе **Работа с данными** внимание концентрировалось на SQL Expression Language с позиции Core, чтобы обеспечить целостность при рассмотрении основных SQL-конструкций. В этом разделе будет подробно разобран жизненный цикл **Session** и то, как он взаимодействует с этими конструкциями.

**Предварительные разделы**

Часть руководства, посвящённая ORM, основывается на двух предыдущих ORM-ориентированных разделах:

* **Выполнение с помощью ORM Session** — вводит понятие объекта Session
* **Использование декларативных форм ORM для определения метаданных таблиц** — там мы создавали ORM-классы User и Address
* **Выбор сущностей и столбцов ORM** — несколько примеров выполнения SELECT для сущностей User


## Вставка строк с использованием паттерна Unit of Work в ORM

При работе с ORM объект **Session** отвечает за создание объектов класса Insert и их выполнение как операторов **INSERT** в рамках открытой транзакции. Мы передаём данные в Session, добавляя в неё объектные записи; затем Session гарантирует, что они будут отправлены в базу данных тогда, когда это потребуется — процесс, называемый **flush**. Общий подход, который использует Session для сохранения объектов, называется **паттерн единицы работы (unit of work)**.

### Экземпляры классов представляют строки таблицы

Если ранее мы передавали словари Python для формирования INSERT, то при использовании ORM мы напрямую работаем с Python-классами, определёнными ранее в разделе **Использование декларативных форм ORM для определения метаданных таблиц**. На уровне классов User и Address мы определяли структуру таблиц. Эти же классы служат объектами-контейнерами данных, с помощью которых мы создаём и изменяем строки в транзакции.

Вот пример создания двух объектов User, каждый из которых представляет будущую строку таблицы:

```python
>>> squidward = User(name="squidward", fullname="Squidward Tentacles")
>>> krabs = User(name="ehkrabs", fullname="Eugene H. Krabs")
```

Мы заполняем эти объекты, передавая имена сопоставленных ORM-атрибутов как именованные аргументы конструктора. Это возможно, потому что класс User содержит автоматически сгенерированный метод `__init__()`, созданный ORM-маппингом, позволяющий принимать аргументы по именам колонок.

Как и в примерах Core с Insert, мы **не указываем первичный ключ (id)**, так как хотим воспользоваться автоинкрементом базы данных (SQLite), что полностью поддерживает ORM. Значение `id` отображается как `None`:

```python
>>> squidward
User(id=None, name='squidward', fullname='Squidward Tentacles')
```

`None` означает, что значению ещё не присвоено значение. Атрибуты, сопоставленные ORM, всегда возвращают какое-то значение и не выбрасывают `AttributeError`, даже если объект новый и значение ещё не назначено.

Пока что оба объекта находятся в состоянии **transient** — они не связаны с базой данных и ещё не прикреплены к Session.

### Добавление объектов в Session

Чтобы показать процесс пошагово, создадим Session **без контекстного менеджера** (поэтому закрывать его придётся вручную!):

```python
>>> session = Session(engine)
```

Теперь добавим объекты в Session:

```python
>>> session.add(squidward)
>>> session.add(krabs)
```

Теперь объекты находятся в состоянии **pending** — они ещё не вставлены в базу.

Это можно увидеть через коллекцию `Session.new`:

```python
>>> session.new
IdentitySet([User(id=None, name='squidward', fullname='Squidward Tentacles'), User(id=None, name='ehkrabs', fullname='Eugene H. Krabs')])
```

`IdentitySet` — это множество, которое хеширует элементы по их уникальной идентичности (функция id()), а не по значению.

### Flush

Session использует паттерн **unit of work**, то есть накапливает изменения, но **не отправляет их в базу данных**, пока это не потребуется. Это позволяет оптимально решать, какие DML-операции должны быть выполнены.

Когда Session отправляет изменения, происходит **flush**.

Выполним flush вручную:

```python
>>> session.flush()
BEGIN (implicit)
INSERT INTO user_account (name, fullname) VALUES (?, ?) RETURNING id
[... (insertmanyvalues) 1/2 (ordered; batch not supported)] ('squidward', 'Squidward Tentacles')
INSERT INTO user_account (name, fullname) VALUES (?, ?) RETURNING id
[insertmanyvalues 2/2 (ordered; batch not supported)] ('ehkrabs', 'Eugene H. Krabs')
```

Мы видим, что Session открыл транзакцию и выполнил соответствующие INSERT.
Транзакция остаётся открытой, пока не будут вызваны `commit()`, `rollback()` или `close()`.

Обычно `Session.flush()` вручную вызывать не нужно — работает механизм **autoflush**, который срабатывает автоматически.

### Автогенерированные значения первичного ключа

После вставки объекты переходят в состояние **persistent**, то есть связаны с Session.

ORM также извлёк новые первичные ключи:

```python
>>> squidward.id
4
>>> krabs.id
5
```

> Почему ORM отправил два отдельных INSERT, а не executemany? Потому что ему нужно получить первичный ключ для каждой вставленной строки. При автоинкременте SQLite это можно сделать только вставкой по одной строке.

### Получение объектов по первичному ключу через identity map

Identity map — это хранилище объектов в памяти, где каждый объект представлен единственным экземпляром на Session и первичный ключ.

Запросим объект:

```python
>>> some_squidward = session.get(User, 4)
>>> some_squidward
User(id=4, name='squidward', fullname='Squidward Tentacles')
```

Убедимся, что это тот же объект:

```python
>>> some_squidward is squidward
True
```

### Commit

Сделаем commit:

```python
>>> session.commit()
COMMIT
```

После commit атрибуты объектов **становятся “истёкшими” (expired)**, и при следующем доступе к ним Session выполнит SELECT. Это регулируется параметром **expire_on_commit**.

## Обновление ORM-объектов с использованием Unit of Work

Загрузим объект sandy:

```python
>>> sandy = session.execute(select(User).filter_by(name="sandy")).scalar_one()
BEGIN (implicit)
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account
WHERE user_account.name = ?
[...] ('sandy',)
```

Проверим объект:

```python
>>> sandy
User(id=2, name='sandy', fullname='Sandy Cheeks')
```

Изменим атрибут:

```python
>>> sandy.fullname = "Sandy Squirrel"
```

Теперь объект в `Session.dirty`:

```python
>>> sandy in session.dirty
True
```

При следующем SELECT произойдёт **autoflush**:

```python
>>> sandy_fullname = session.execute(select(User.fullname).where(User.id == 2)).scalar_one()
UPDATE user_account SET fullname=? WHERE user_account.id = ?
[...] ('Sandy Squirrel', 2)
SELECT user_account.fullname
FROM user_account
WHERE user_account.id = ?
[...] (2,)
>>> print(sandy_fullname)
Sandy Squirrel
```

Теперь объект не считается dirty:

```python
>>> sandy in session.dirty
False
```

Но изменения пока не зафиксированы — мы ещё в транзакции.

## Удаление ORM-объектов

Загрузим patrick:

```python
>>> patrick = session.get(User, 3)
SELECT user_account.id AS user_account_id, user_account.name AS user_account_name,
user_account.fullname AS user_account_fullname
FROM user_account
WHERE user_account.id = ?
[...] (3,)
```

Пометим на удаление:

```python
>>> session.delete(patrick)
```

Удаление произойдёт при следующем flush:

```python
>>> session.execute(select(User).where(User.name == "patrick")).first()
SELECT address.id AS address_id, address.email_address AS address_email_address,
address.user_id AS address_user_id
FROM address
WHERE ? = address.user_id
[...] (3,)
DELETE FROM user_account WHERE user_account.id = ?
[...] (3,)
SELECT user_account.id, user_account.name, user_account.fullname
FROM user_account
WHERE user_account.name = ?
[...] ('patrick',)
```

Теперь объект не persistent:

```python
>>> patrick in session
False
```

## Bulk / Multi-row операции INSERT/UPDATE/DELETE

Кроме unit of work ORM поддерживает **массовые операции**, не создавая ORM-объекты. Это важно для высокой производительности при больших объёмах данных.

## Откат (Rollback)

`Session.rollback()` откатывает транзакцию и **делает все объекты expired**.

```python
>>> session.rollback()
ROLLBACK
```

Проверим состояние объекта sandy:

```python
>>> sandy.__dict__
{'_sa_instance_state': <sqlalchemy.orm.state.InstanceState object at 0x...>}
```

Теперь обращение к атрибуту приведёт к SELECT:

```python
>>> sandy.fullname
BEGIN (implicit)
SELECT user_account.id AS user_account_id, user_account.name AS user_account_name,
user_account.fullname AS user_account_fullname
FROM user_account
WHERE user_account.id = ?
[...] (2,)
'Sandy Cheeks'
```

Теперь данные снова в объекте:

```python
>>> sandy.__dict__
{'_sa_instance_state': <sqlalchemy.orm.state.InstanceState object at 0x...>,
 'id': 2, 'name': 'sandy', 'fullname': 'Sandy Cheeks'}
```

patrick тоже восстановлен:

```python
>>> patrick in session
True
```

## Закрытие Session

Если Session используется без контекстного менеджера, его нужно закрыть вручную:

```python
>>> session.close()
ROLLBACK
```

Закрытие Session:

* освобождает соединение в пул
* откатывает незавершённые транзакции
* **expunge** — удаляет все объекты из Session
* превращает объекты в состояние **detached**

Попытка получить данные из объекта с истёкшими атрибутами вызывает ошибку:

```python
>>> squidward.name
Traceback (most recent call last):
  ...
sqlalchemy.orm.exc.DetachedInstanceError: Instance <User at 0x...> is not bound to a Session; attribute refresh operation cannot proceed
```

Чтобы вернуть объект в Session:

```python
>>> session.add(squidward)
>>> squidward.name
BEGIN (implicit)
SELECT user_account.id AS user_account_id, user_account.name AS user_account_name, user_account.fullname AS user_account_fullname
FROM user_account
WHERE user_account.id = ?
[...] (4,)
'squidward'
```

> Если возможно, избегайте использования объектов в состоянии **detached**. При закрытии Session удаляйте ссылки на объекты. Если необходимо отображать только что созданные объекты в веб-приложениях после закрытия Session, используйте `expire_on_commit=False`.
