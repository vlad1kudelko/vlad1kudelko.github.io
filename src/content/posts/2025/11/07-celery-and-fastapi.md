---
title: "Фоновые задачи в FastAPI с Celery и Redis: Полное руководство"
description: "Пошаговая инструкция по настройке Celery в FastAPI. Примеры кода для работы в одном файле и модульной структуры проекта."
heroImage: "../../../../assets/imgs/2025/11/07-celery-and-fastapi.webp"
pubDate: "2025-11-07"
tags: "manual"
---

# FastAPI + Celery: От «Hello World» до правильной архитектуры

Если ваш API должен выполнять тяжелые задачи (рассылка писем, генерация PDF или обработка данных), заставлять пользователя ждать ответа — плохая практика. Решение — перенос задач в фоновый режим с помощью **Celery**.

В этой статье мы разберем, как запустить Celery за 1 минуту и как потом правильно организовать код, чтобы не запутаться в импортах.

## Часть 1. Быстрый старт (всё в одном файле)

Для маленьких прототипов удобно держать всё под рукой. В этом примере FastAPI выступает в роли «продюсера» (создает задачи), а Celery — в роли «воркера» (выполняет их).

**main.py**

```python
import time
from fastapi import FastAPI
from celery import Celery

app = FastAPI()

celery_app = Celery("my_worker",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0")

@celery_app.task
def long_running_task(iter: int):
    for i in range(iter):
        time.sleep(1)
    return "Работа завершена успешно!"

@app.get("/process/{count}")
def start_processing(count: int):
    task = long_running_task.delay(count)
    return { "task_id": task.id }
```

### Запуск

Вам понадобятся два окна терминала.

1. **Запускаем API:**
```bash
uvicorn main:app --reload
```

2. **Запускаем воркер:**
```bash
celery -A main.celery_app worker --loglevel=info
```

*Здесь `-A main.celery_app` указывает Celery путь к объекту приложения: файл `main`, переменная `celery_app`.*

## Часть 2. Профессиональная структура (Shared Tasks)

Когда проект растет, хранить всё в одном файле становится больно. Возникают «циклические импорты»: FastAPI нужен файл с задачами, а задачам нужен объект `app` из файла с FastAPI.

Чтобы разорвать этот круг, используйте декоратор `@shared_task`. Это позволяет задачам быть «независимыми» от конкретного экземпляра приложения Celery.

Вот идеальная структура из трех файлов:

### 1. Конфигурация (`celery_config.py`)

Здесь мы только настраиваем подключение к брокеру.

```python
from celery import Celery

app = Celery("my_worker",
    broker="redis://localhost:6379/0",
    backend="redis://localhost:6379/0")
```

### 2. Фоновые задачи (`tasks.py`)

Мы используем `shared_task`. Обратите внимание: этот файл вообще ничего не знает про настройки Redis — он просто описывает логику.

```python
from celery import shared_task

@shared_task
def do_work():
    return "Done"
```

### 3. Основной сервер (`main.py`)

Тут мы соединяем всё вместе. Мы импортируем `celery_app`, чтобы процесс FastAPI «увидел» настройки брокера при старте.

```python
from fastapi import FastAPI
from tasks import do_work
from celery_config import app as celery_app # Важно для инициализации брокера

fastapi_app = FastAPI()

@fastapi_app.get("/do")
def run():
    do_work.delay()
    return {"status": "sent"}
```

### Запуск

Теперь воркер запускается через файл конфигурации:

```bash
celery -A celery_config.app worker
```

## Итог

* **Используйте один файл**, если проект крошечный.
* **Используйте `@shared_task**`, если планируете расширяться. Это избавит вас от ошибок импорта и сделает код модульным.
* **Не забывайте про Backend**, если вам нужно проверять статус задачи или получать результат её выполнения.
