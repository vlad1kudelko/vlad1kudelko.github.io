---
title: "Unit of Work в SQLAlchemy: что это такое и какие бывают состояния ORM-объектов"
description: "Разбираем, как SQLAlchemy реализует паттерн Unit of Work, какие состояния проходят ORM-объекты (transient, pending, persistent, deleted, detached) и как работает Session."
heroImage: "../../../../assets/imgs/2025/11/02-sqlalchemy-unit-of-work.webp"
pubDate: "2025-11-02"
tags: "manual"
---

# Паттерн Unit of Work и состояния ORM-объектов в SQLAlchemy

Работа с SQLAlchemy ORM кажется простой на поверхности: создаёшь объект, добавляешь в сессию, вызываешь `commit()`. Но под капотом происходит гораздо больше — SQLAlchemy реализует паттерн **Unit of Work** и управляет жизненным циклом ORM-объектов через чёткую систему состояний. Понимание этих механизмов — ключевой шаг к уверенной работе с ORM.

## Что такое Unit of Work?

В контексте SQLAlchemy **Unit of Work = Session**. Session реализует паттерн Unit of Work следующим образом:

### 1. **Отслеживание изменений**

Session наблюдает за объектами ORM и автоматически фиксирует:

* какие объекты созданы (new)
* какие изменены (dirty)
* какие удалены (deleted)

Разработчику не нужно вручную писать SQL — Session сама понимает, что нужно обновить.

### 2. **Отложенная запись (deferred write)**

Когда вы пишете:

```python
session.add(user)
```

SQL не выполняется сразу. Session накапливает изменения в «единицу работы».

### 3. **Атомарное применение изменений**

При `session.commit()` SQLAlchemy:

1. выполняет `flush()` — отправляет *все* накопленные изменения в виде SQL-инструкций
2. выполняет COMMIT транзакции

Если что-то идёт не так — выполняется `rollback()` и данные остаются целыми.

### 4. **Единая транзакция для нескольких действий**

Операции:

```python
session.add(user)
session.add(order)
session.delete(comment)
session.commit()
```

— будут выполнены **одним атомарным действием**. Это и есть суть паттерна Unit of Work.

## Жизненный цикл ORM-объектов (5 состояний)

SQLAlchemy управляет объектами через набор фиксированных состояний. Поняв их, легко предсказать, когда и какой SQL будет выполнен.

### 1. **Transient** — переходное состояние

Объект создан, но:

* не связан с Session
* не существует в БД
* не будет сохранён автоматически

```python
user = User(name="Bob") # transient
```

### 2. **Pending** — в очереди на запись

После добавления объекта в сессию:

```python
session.add(user) # pending
```

Session знает о нём, но INSERT **ещё не выполнен**. Он произойдёт при:

* `flush()`
* `commit()`
* автозапуске autoflush перед SELECT.

### 3. **Persistent** — объект записан в базу

После flush или commit:

```python
session.commit() # persistent
```

Теперь:

* у объекта есть ID
* он управляется Session
* все изменения будут синхронизированы с БД
* он находится в identity map

Это «нормальное рабочее» состояние большинства объектов.

### 4. **Deleted** — объект помечен на удаление

```python
session.delete(user) # deleted
```

Но удаление из БД ещё не произошло — только после flush/commit. После commit объект автоматически становится **detached**, ведь его больше нет в БД.

### 5. **Detached** — объект больше не привязан к сессии

Причины:

* `session.close()`
* `session.commit()` (если включён expire_on_commit=True)
* `session.expunge(obj)`
* объект был удалён

В detached-состоянии:

* relationship с lazy-loading больше не работает
* данные читаются только из памяти
* изменения не попадут в базу

## Мини-пример всех состояний

```python
user = User(name="Bob")      # transient
session.add(user)            # pending
session.flush()              # persistent
session.delete(user)         # deleted
session.commit()             # detached
```
