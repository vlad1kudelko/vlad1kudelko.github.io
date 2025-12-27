---
title: "Продвинутые типы данных в FastAPI: UUID, datetime, Decimal и Annotated"
description: "Разбираем дополнительные типы данных в FastAPI: как использовать UUID, datetime, Decimal, bytes и Annotated для точной валидации входных данных и построения надёжных API."
heroImage: "../../../../assets/imgs/2025/11/05-fastapi-data-types-advanced.webp"
pubDate: "2025-11-05"
tags: "manual"
---

# Типы данных в FastAPI: выход за пределы `int` и `str`

Одна из сильных сторон FastAPI — глубокая интеграция с системой типов Python. Благодаря этому фреймворк умеет автоматически валидировать входные данные, генерировать OpenAPI-документацию и находить ошибки ещё до выполнения кода.

Большинство примеров для начинающих ограничиваются базовыми типами вроде `int`, `str` или `bool`. Но в реальных API этого почти всегда недостаточно. В этой статье разберём дополнительные типы данных, которые FastAPI поддерживает «из коробки», и посмотрим, зачем они нужны на практике.

## UUID — уникальные идентификаторы

`UUID` (Universally Unique Identifier) широко используется для идентификации сущностей в распределённых системах: пользователей, заказов, транзакций.

FastAPI умеет работать с UUID напрямую, без ручного парсинга строк.

```python
from uuid import UUID
from fastapi import FastAPI

app = FastAPI()

@app.get("/items/{item_id}")
async def get_item(item_id: UUID):
    return {"item_id": item_id}
```

Что происходит под капотом:

* FastAPI ожидает строку в формате UUID
* автоматически валидирует её
* передаёт в функцию уже объект `UUID`

Если клиент передаст некорректное значение, API вернёт понятную ошибку 422.

## Работа с датой и временем

FastAPI отлично дружит с типами из модуля `datetime`.

Поддерживаются:

* `datetime.datetime` — дата и время
* `datetime.date` — только дата
* `datetime.time` — только время

Пример эндпоинта:

```python
from datetime import datetime, date, time
from fastapi import FastAPI

app = FastAPI()

@app.get("/schedule/")
async def get_schedule(
    dt: datetime,
    day: date,
    t: time
):
    return {
        "datetime": dt,
        "date": day,
        "time": t
    }
```

Преимущества такого подхода:

* автоматический парсинг ISO-форматов
* строгая валидация
* корректное описание параметров в Swagger UI

Это особенно полезно для календарей, логирования, бронирований и любых API, связанных со временем.

## `frozenset` — неизменяемые коллекции

`frozenset` — это неизменяемое множество. В отличие от обычного `set`, его нельзя модифицировать после создания.

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/unique-items/")
async def get_unique_items(items: frozenset):
    return {"unique_items": items}
```

Зачем это может понадобиться:

* гарантировать уникальность элементов
* защитить данные от случайных изменений
* явно показать намерение разработчика в типе данных

Хотя используется нечасто, `frozenset` может быть полезен в API с фиксированными наборами параметров.

## `Decimal` — точность важнее скорости

Для финансовых расчётов `float` подходит плохо из-за ошибок округления. В таких случаях стоит использовать `Decimal`.

```python
from decimal import Decimal
from fastapi import FastAPI

app = FastAPI()

@app.get("/price/")
async def get_price(price: Decimal):
    return {"price": price}
```

Почему это важно:

* точные вычисления
* отсутствие накопленных ошибок
* корректная работа с валютами и процентами

FastAPI корректно сериализует `Decimal` и валидирует входные значения.

## `bytes` — бинарные данные

Тип `bytes` используется для работы с бинарным содержимым: файлами, изображениями, сериализованными объектами.

```python
from fastapi import FastAPI

app = FastAPI()

@app.post("/upload/")
async def upload_file(file: bytes):
    return {"file_size": len(file)}
```

На практике для загрузки файлов чаще используют `UploadFile`, но `bytes` может быть полезен для:

* передачи бинарных данных в теле запроса
* работы с небольшими файлами
* интеграции с нестандартными клиентами

## `Annotated`: типы + метаданные

Начиная с Python 3.9, FastAPI активно использует `Annotated` из модуля `typing`. Он позволяет добавлять метаданные к типам — ограничения, описания, параметры валидации.

```python
from typing import Annotated
from fastapi import FastAPI, Query

app = FastAPI()

@app.get("/items/")
async def get_items(
    query: Annotated[str, Query(min_length=3, max_length=50)]
):
    return {"query": query}
```

В этом примере:

* тип параметра — `str`
* дополнительные правила — минимальная и максимальная длина
* Swagger UI автоматически отобразит эти ограничения

`Annotated` — мощный инструмент для создания самодокументируемых и строго валидируемых API.

## Итоги

FastAPI поддерживает гораздо больше, чем просто базовые типы Python. Использование `UUID`, `datetime`, `Decimal`, `bytes`, `frozenset` и `Annotated` позволяет:

* точнее описывать входные данные
* снизить количество ошибок
* упростить валидацию
* получить более качественную OpenAPI-документацию

Чем сложнее становится API, тем важнее правильно выбирать типы данных. FastAPI даёт для этого все необходимые инструменты — остаётся лишь использовать их осознанно.
