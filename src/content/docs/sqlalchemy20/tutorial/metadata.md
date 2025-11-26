---
title: "Работа с метаданными базы данных в SQLAlchemy: таблицы, колонки и DDL"
description: "Полное руководство по работе с метаданными SQLAlchemy: создание таблиц с MetaData, Table и Column, декларативный стиль ORM, генерация DDL, ограничения и рефлексия существующих таблиц."
pubDate: "2025-11-26"
official: "https://docs.sqlalchemy.org/en/20/tutorial/metadata.html"
---

# Работа с метаданными базы данных

Теперь, когда мы разобрались с движками и выполнением SQL-запросов, можно приступать к настоящей алхимии. Центральным элементом как SQLAlchemy Core, так и ORM является **язык SQL-выражений** — он позволяет выразительно и компонуемо строить SQL-запросы. Основой этих запросов являются обычные Python-объекты, представляющие понятия базы данных: таблицы, столбцы и т.д. Все вместе они называются **метаданными базы данных**.

Самые распространённые базовые объекты метаданных в SQLAlchemy — это `MetaData`, `Table` и `Column`. Ниже мы покажем, как они используются как в стиле Core, так и в стиле ORM.

> Читателям ORM — не уходите! Как и в других разделах, пользователи Core могут пропустить части про ORM, но пользователям ORM очень полезно знать эти объекты с обеих сторон. Объект `Table`, о котором здесь идёт речь, при использовании ORM объявляется чуть более косвенно (и полностью типизированно), но под капотом он всё равно присутствует.

## Создание объекта MetaData и таблиц

При работе с реляционной базой данных основным контейнером данных, с которым мы работаем, является **таблица**. В SQLAlchemy таблица представлена одноимённым Python-объектом — `Table`.

Чтобы начать пользоваться языком выражений SQLAlchemy, нам нужно создать объекты `Table`, соответствующие интересующим нас таблицам в БД. Таблицы можно создавать:

- напрямую через конструктор `Table`;
- косвенно через ORM-классы (см. дальше);
- автоматически загрузить из уже существующей БД — это называется **рефлексия (reflection)**.

В любом случае всё начинается с коллекции, в которую мы будем класть таблицы — объекта `MetaData`. По сути это фасад над обычным Python-словарём, где ключи — имена таблиц. ORM предоставляет несколько вариантов получения этой коллекции, но мы всегда можем создать её напрямую:

```python
>>> from sqlalchemy import MetaData
>>> metadata_obj = MetaData()
```

После этого можно объявлять Table-объекты. В этом учебнике используется классический пример: таблица `user_account`, которая хранит, например, пользователей сайта; и связанная с ней таблица `address`, которая хранит email-адреса, связанные с пользователями. Если не используется ORM Declarative, то Table объявляется напрямую, и обычно ему присваивается переменная, через которую мы будем к ней обращаться в коде:

```python
>>> from sqlalchemy import Table, Column, Integer, String
>>> user_table = Table(
...     "user_account",
...     metadata_obj,
...     Column("id", Integer, primary_key=True),
...     Column("name", String(30)),
...     Column("fullname", String),
... )
```

Теперь в коде вместо имени таблицы мы будем использовать переменную `user_table`.

### Когда создавать объект MetaData?

Самый частый случай — один объект `MetaData` на всё приложение, объявленный как модульная переменная (обычно в пакете `models` или `db`). При использовании ORM этот же объект часто получают через реестр или базовый класс Declarative.

Можно создавать сколько угодно коллекций `MetaData`, таблицы из разных коллекций могут ссылаться друг на друга. Но если таблицы связаны между собой, гораздо удобнее держать их в одной коллекции — это упрощает и объявление, и корректный порядок генерации DDL (CREATE/DROP).

## Компоненты объекта Table

Конструкция `Table` в Python очень похожа на SQL-команду `CREATE TABLE`:

```python
Table(
    "user_account",          # имя таблицы
    metadata_obj,            # коллекция метаданных
    Column("id", Integer, primary_key=True),
    Column("name", String(30)),
    Column("fullname", String),
)
```

Используемые объекты:

- `Table` — представляет таблицу БД и автоматически добавляется в коллекцию `MetaData`.
- `Column` — представляет столбец. Обычно содержит имя и тип данных. Коллекция столбцов доступна через `Table.c`:
- `Integer`, `String` — классы, представляющие SQL-типы данных. Их можно передавать как класс, так и экземпляр:

```python
>>> user_table.c.name
Column('name', String(length=30), table=<user_account>)

>>> user_table.c.keys()
['id', 'name', 'fullname']
```

## Объявление простых ограничений

В первой колонке мы использовали параметр `primary_key=True` — это краткая запись того, что столбец входит в первичный ключ. Сам первичный ключ представлен объектом `PrimaryKeyConstraint`:

```python
>>> user_table.primary_key
PrimaryKeyConstraint(
    Column('id', Integer(), table=<user_account>, primary_key=True, nullable=False)
)
```

Самое частое ограничение, которое объявляют явно — это внешний ключ (`ForeignKeyConstraint`). SQLAlchemy использует их не только для генерации DDL, но и для построения корректных выражений.

Самый удобный способ объявить внешний ключ на один столбец — использовать объект `ForeignKey`:

```python
>>> from sqlalchemy import ForeignKey
>>> address_table = Table(
...     "address",
...     metadata_obj,
...     Column("id", Integer, primary_key=True),
...     Column("user_id", ForeignKey("user_account.id"), nullable=False),
...     Column("email_address", String, nullable=False),
... )
```

> При использовании `ForeignKey` внутри `Column` тип данных можно не указывать — он автоматически берётся из связанного столбца (`user_account.id` → `Integer`).

Ещё одно ограничение в примере — `nullable=False`, соответствующее `NOT NULL` в SQL.

## Генерация DDL в базу данных

Мы построили иерархию объектов: `MetaData` → два объекта `Table` → столбцы и ограничения. Эта структура будет в центре почти всех операций как в Core, так и в ORM.

Первое полезное действие — сгенерировать команды `CREATE TABLE` для нашей SQLite-базы:

```python
>>> metadata_obj.create_all(engine)
```

Вывод (SQLite):

```sql
BEGIN (implicit)
PRAGMA main.table_info("user_account")
...
CREATE TABLE user_account (
    id INTEGER NOT NULL,
    name VARCHAR(30),
    fullname VARCHAR,
    PRIMARY KEY (id)
)

CREATE TABLE address (
    id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    email_address VARCHAR NOT NULL,
    PRIMARY KEY (id),
    FOREIGN KEY(user_id) REFERENCES user_account (id)
)
COMMIT
```

- SQLite перед созданием проверяет существование таблиц через `PRAGMA`.
- Транзакция `BEGIN/COMMIT` нужна для поддержки transactional DDL.
- Порядок создания правильный: сначала таблица, на которую ссылаются, потом зависимая.
- Есть обратный метод `MetaData.drop_all()` — удаляет в обратном порядке.

> Функции `create_all()` / `drop_all()` хороши для тестов, небольших приложений и короткоживущих БД. Для долгосрочного управления схемой в продакшене рекомендуется использовать миграции — например, Alembic.

## Определение метаданных таблиц через Declarative-формы ORM

### А можно создавать Table по-другому?

Да! ORM предоставляет более удобный и «питонический» способ объявления таблиц — **Declarative Table**. При этом мы получаем сразу две вещи:

1. Обычный объект `Table` (как и раньше).
2. Класс-модель ORM (mapped class), с которым удобно работать в коде.

Преимущества Declarative-подхода:

- Более лаконичный синтаксис, особенно с аннотациями типов.
- Полная поддержка статической проверки типов (Mypy, Pyright, IDE).
- Метаданные таблицы и ORM-модель объявляются одновременно.

### Создание Declarative Base

```python
>>> from sqlalchemy.orm import DeclarativeBase

>>> class Base(DeclarativeBase):
...     pass
```

`Base` — это наш Declarative Base. У него автоматически создаётся:

```python
>>> Base.metadata
MetaData()

>>> Base.registry
<sqlalchemy.orm.decl_api.registry object at 0x...>
```

### Объявление mapped-классов (современный стиль 2.0+)

```python
>>> from typing import List, Optional
>>> from sqlalchemy.orm import Mapped, mapped_column, relationship

>>> class User(Base):
...     __tablename__ = "user_account"
...
...     id: Mapped[int] = mapped_column(primary_key=True)
...     name: Mapped[str] = mapped_column(String(30))
...     fullname: Mapped[Optional[str]]
...
...     addresses: Mapped[List["Address"]] = relationship(back_populates="user")
...
...     def __repr__(self) -> str:
...         return f"User(id={self.id!r}, name={self.name!r}, fullname={self.fullname!r})"

>>> class Address(Base):
...     __tablename__ = "address"
...
...     id: Mapped[int] = mapped_column(primary_key=True)
...     email_address: Mapped[str] = mapped_column(nullable=False)
...     user_id: int = mapped_column(ForeignKey("user_account.id"), nullable=False)
...
...     user: Mapped[User] = relationship(back_populates="addresses")
...
...     def __repr__(self) -> str:
...         return f"Address(id={self.id!r}, email_address={self.email_address!r})"
```

Что здесь происходит:

- `__tablename__` — имя таблицы в БД.
- `mapped_column()` + аннотации `Mapped[...]` — современный способ объявления колонок.
- Если колонка может быть NULL — используем `Optional[...]`.
- `relationship()` — объявление связей между моделями (подробнее в разделе про связанные объекты).
- Автоматически генерируется `__init__()`:

```python
>>> sandy = User(name="sandy", fullname="Sandy Cheeks")
```

### А где старый Declarative?

Старый стиль (SQLAlchemy ≤1.4) с прямым использованием `Column` всё ещё полностью поддерживается. Но новый стиль с `mapped_column()` и аннотациями даёт лучшую интеграцию с типами и dataclasses.

Если хотите старый синтаксис, но с поддержкой типов — просто замените `Column` на `mapped_column()`:

```python
class User(Base):
    __tablename__ = "user_account"

    id = mapped_column(Integer, primary_key=True)
    name = mapped_column(String(30))
    fullname = mapped_column(String)
    # ...
```

### Генерация DDL из ORM-моделей

Точно так же, как и раньше:

```python
>>> Base.metadata.create_all(engine)
```

Если таблицы уже есть — ничего не создастся, только проверит наличие.

## Отражение таблиц (Table Reflection)

**Необязательный раздел** — можно пропустить, если хотите сразу писать запросы.

Иногда нужно работать с уже существующей базой данных. Вместо ручного описания всех таблиц можно «отразить» (reflect) их автоматически:

```python
>>> some_table = Table("some_table", metadata_obj, autoload_with=engine)
```

Под капотом выполнятся запросы к системным таблицам БД, и в результате `some_table` будет полностью готов к использованию:

```python
>>> some_table
Table('some_table', MetaData(),
    Column('x', INTEGER(), table=<some_table>),
    Column('y', INTEGER(), table=<some_table>),
    schema=None)
```

> Рефлексия не обязательна. Часто даже при работе с готовой БД разработчики предпочитают описывать метаданные явно в Python-коде — так проще контролировать, какие именно таблицы и столбцы используются в приложении.

Готово! Теперь у нас есть полная структура метаданных — можно переходить к вставке данных и написанию запросов.
