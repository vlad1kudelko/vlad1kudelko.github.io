+++
lang = "ru"
title = "Python async/await: асинхронное программирование"
description = "Подробное руководство по асинхронному программированию в Python с использованием async/await: теория, примеры, лучшие практики."
template = "posts"
thumb = "/imgs/python-async-await-async-programming.png"
publication_date = "2025-07-13"
+++

# Python async/await: асинхронное программирование

> **Читайте также:**
> - [FastAPI + Docker: контейнеризация](/posts/fastapi-docker-containerization)
> - [FastAPI + Celery: асинхронные задачи](/posts/fastapi-celery-async-tasks)
> - [Django ORM: продвинутые запросы и оптимизация](/posts/django-orm-advanced-queries-optimization)

Асинхронное программирование позволяет эффективно выполнять множество операций ввода-вывода (I/O) одновременно, не блокируя основной поток выполнения. В Python для этого используются ключевые слова `async` и `await`, которые появились начиная с версии 3.5. Такой подход особенно полезен для приложений, которые часто обращаются к сети, базам данных или работают с файлами, где время ожидания ответа может быть значительным.

## 1. Зачем нужен async/await?

В традиционном (синхронном) коде каждая операция выполняется последовательно. Если одна из них требует времени (например, запрос к сети или базе данных), программа "ждёт" завершения этой операции, не делая ничего полезного. Асинхронный подход позволяет запускать такие операции параллельно, не блокируя выполнение других задач. Это особенно важно для серверных приложений, которые должны обслуживать множество клиентов одновременно, не тратя время на ожидание ответа от внешних сервисов.

**Преимущества async/await:**
- Высокая производительность при большом количестве I/O-операций
- Эффективное использование ресурсов (один поток может обслуживать тысячи соединений)
- Простота написания и поддержки кода по сравнению с потоками и callback-ами
- Более чистый и читаемый код по сравнению с классическим подходом через callbacks

## 2. Основные понятия

- **Coroutine (корутина)** — специальная функция, объявленная с помощью `async def`, которую можно приостанавливать и возобновлять. Корутины позволяют писать асинхронный код, который выглядит как обычный последовательный.
- **Event loop (цикл событий)** — механизм, который управляет выполнением корутин и обработкой событий. Event loop запускает корутины, отслеживает их состояние и переключает выполнение между ними, когда одна из них ожидает завершения операции.
- **await** — оператор, который "приостанавливает" выполнение корутины до завершения асинхронной операции. Это позволяет другим задачам выполняться в это время.

## 3. Простой пример

Рассмотрим базовый пример асинхронной функции:

```python
import asyncio

async def main():
    print('Начало')
    await asyncio.sleep(1)
    print('Конец')

asyncio.run(main())
```

**Пояснения:**
- `async def main()` — определяем корутину, то есть функцию, которую можно приостанавливать с помощью `await`.
- `await asyncio.sleep(1)` — приостанавливаем выполнение на 1 секунду. Важно, что в это время event loop может выполнять другие задачи, если они есть.
- `asyncio.run(main())` — запускаем корутину через цикл событий. Это основной способ запуска асинхронного кода в современных версиях Python.

Этот пример показывает, что асинхронный код очень похож на обычный, но позволяет не блокировать выполнение программы во время ожидания.

## 4. Одновременное выполнение нескольких задач

Асинхронность особенно полезна, когда нужно параллельно выполнять несколько операций. Например, если вы делаете несколько сетевых запросов, вы можете запустить их одновременно и дождаться завершения всех сразу:

```python
import asyncio

async def task(name, delay):
    print(f"{name} стартует")
    await asyncio.sleep(delay)
    print(f"{name} завершена")

async def main():
    await asyncio.gather(
        task("A", 2),
        task("B", 1),
        task("C", 3)
    )

asyncio.run(main())
```

**Пояснения:**
- Функция `task` имитирует асинхронную задачу с задержкой.
- В функции `main` используется `asyncio.gather`, чтобы запустить сразу три задачи. Все они стартуют одновременно, и выполнение продолжается, когда завершатся все задачи.
- Благодаря асинхронности, общее время выполнения будет равно самой долгой задаче (3 секунды), а не сумме всех задержек.

**Результат:**
```
A стартует
B стартует
C стартует
B завершена
A завершена
C завершена
```

Это демонстрирует, как можно эффективно использовать время ожидания, не простаивая впустую.

## 5. Асинхронные запросы к сети (пример с aiohttp)

Асинхронные библиотеки, такие как `aiohttp`, позволяют делать HTTP-запросы без блокировки. Это особенно важно для приложений, которые должны быстро обрабатывать множество запросов к разным сайтам или API.

```python
import asyncio
import aiohttp

async def fetch(url):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.text()

async def main():
    urls = [
        'https://example.com',
        'https://python.org',
        'https://github.com'
    ]
    results = await asyncio.gather(*(fetch(url) for url in urls))
    for i, content in enumerate(results):
        print(f"URL {i+1}: {len(content)} символов")

asyncio.run(main())
```

**Пояснения:**
- `aiohttp.ClientSession()` — создаёт сессию для HTTP-запросов. Использование контекстного менеджера (`async with`) гарантирует корректное закрытие соединения.
- `session.get(url)` — выполняет асинхронный GET-запрос.
- `await response.text()` — асинхронно читает тело ответа.
- В функции `main` мы формируем список URL и с помощью `asyncio.gather` одновременно отправляем запросы ко всем адресам. Это позволяет получить ответы максимально быстро, не дожидаясь завершения каждого запроса по отдельности.
- В цикле выводится длина полученного содержимого для каждого URL, что подтверждает успешное выполнение запросов.

## 6. Ошибки и обработка исключений

Асинхронные функции поддерживают стандартный try/except, что позволяет обрабатывать ошибки так же, как и в обычном коде. Это важно для надёжности приложения, чтобы сбой одной задачи не приводил к падению всей программы.

```python
async def safe_task():
    try:
        await asyncio.sleep(1)
        raise ValueError("Ошибка!")
    except Exception as e:
        print(f"Поймано исключение: {e}")
```

**Пояснения:**
- Внутри корутины можно использовать try/except для перехвата и обработки исключений.
- Если в асинхронной задаче возникает ошибка, она не "зависает" в event loop, а может быть обработана привычным способом.
- Такой подход позволяет делать асинхронные приложения устойчивыми к ошибкам и сбоям.

## 7. Лучшие практики

- Используйте асинхронность только для I/O-операций (сетевые запросы, работа с файлами, БД). Для вычислительно сложных задач (CPU-bound) лучше использовать процессы или потоки, так как event loop не ускоряет такие операции.
- Не забывайте обрабатывать исключения внутри корутин, чтобы не терять ошибки и не получать "тихие" сбои.
- Используйте `asyncio.gather` для параллельного запуска нескольких задач — это позволяет максимально эффективно использовать асинхронность.
- Старайтесь писать асинхронный код так, чтобы его было легко читать и поддерживать: избегайте вложенных callbacks, используйте явные имена функций и переменных.
- Не смешивайте синхронный и асинхронный код без необходимости — это может привести к неожиданным блокировкам.

## 8. Полезные ссылки

- [Документация asyncio](https://docs.python.org/3/library/asyncio.html)
- [aiohttp — асинхронные HTTP-клиент и сервер](https://docs.aiohttp.org/)
- [PEP 492 — Coroutines with async and await syntax](https://peps.python.org/pep-0492/)

## Заключение

Асинхронное программирование с помощью async/await — мощный инструмент для создания быстрых и отзывчивых приложений на Python. Освоив основы, вы сможете эффективно работать с сетевыми запросами, базами данных и другими I/O-операциями, не блокируя выполнение программы и максимально используя возможности языка. Даже если вы только начинаете знакомство с асинхронностью, попробуйте реализовать простые примеры — и вы увидите, насколько это удобно и современно для реальных задач. 