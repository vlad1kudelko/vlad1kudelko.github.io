+++
lang = "ru"
title = "FastAPI + Celery: асинхронные задачи"
description = "Подробное руководство по интеграции FastAPI с Celery: настройка брокера сообщений, создание задач, мониторинг и лучшие практики для обработки фоновых задач."
template = "posts"
thumb = "/imgs/fastapi-celery-async-tasks.jpg"
publication_date = "2025-07-09"
+++

# FastAPI + Celery: асинхронные задачи

**Celery** — это мощная библиотека для обработки асинхронных задач в Python, которая позволяет выполнять трудоёмкие операции в фоновом режиме, не блокируя основной поток выполнения. В сочетании с FastAPI она создаёт идеальную архитектуру для высоконагруженных приложений, где требуется обработка длительных операций, таких как отправка email, обработка файлов, генерация отчётов или интеграция с внешними API. В этой статье мы рассмотрим, как эффективно интегрировать Celery с FastAPI для создания масштабируемых приложений.

## 1. Что такое Celery и зачем он нужен

**Celery** — это мощная библиотека для обработки асинхронных задач в Python, которая решает одну из самых важных проблем в веб-разработке: как обрабатывать длительные операции, не блокируя основной поток выполнения приложения. В традиционных синхронных приложениях, когда пользователь отправляет запрос на выполнение трудоёмкой операции (например, генерацию отчёта или обработку большого файла), он должен ждать завершения этой операции, что может занять минуты или даже часы. Это приводит к плохому пользовательскому опыту и неэффективному использованию ресурсов сервера.

Celery решает эту проблему, предоставляя распределённую очередь задач (distributed task queue), которая позволяет:

- **Выполнять задачи асинхронно** — длительные операции выполняются в фоновом режиме, не блокируя основной поток обработки HTTP-запросов. Пользователь получает мгновенный ответ с идентификатором задачи и может отслеживать её прогресс.

- **Масштабировать приложение** — можно запускать несколько воркеров (worker) на разных машинах или в разных процессах. Это позволяет распределить нагрузку и увеличить пропускную способность системы.

- **Обрабатывать очереди** — задачи выполняются в порядке поступления или по приоритету. Можно создавать разные очереди для разных типов задач (высокий приоритет для критических операций, низкий для фоновых задач).

- **Мониторить выполнение** — отслеживать статус задач, получать результаты выполнения и обрабатывать ошибки. Это особенно важно для критически важных операций.

- **Планировать задачи** — выполнять операции по расписанию (например, ежедневная отправка отчётов или периодическая очистка временных файлов).

**Типичные сценарии использования Celery в реальных проектах:**

- **Отправка email-уведомлений** — вместо блокирования HTTP-запроса на время отправки email, задача помещается в очередь и выполняется асинхронно
- **Обработка загруженных файлов** — изображения, документы, видео обрабатываются в фоновом режиме (сжатие, конвертация, извлечение метаданных)
- **Генерация отчётов и аналитика** — сложные вычисления и формирование отчётов выполняются без блокировки интерфейса
- **Интеграция с внешними API** — запросы к сторонним сервисам, которые могут быть медленными или ненадёжными
- **Обработка данных в фоновом режиме** — импорт/экспорт данных, синхронизация с внешними системами
- **Кэширование и предварительная загрузка** — подготовка часто запрашиваемых данных заранее

**Почему именно Celery?** Существуют альтернативы, такие как RQ (Redis Queue), Huey или простые решения на основе потоков, но Celery выделяется своей зрелостью, богатой экосистемой, отличной документацией и поддержкой различных брокеров сообщений (Redis, RabbitMQ, Amazon SQS).

## 2. Архитектура Celery

Понимание архитектуры Celery критически важно для правильного проектирования системы. Celery использует архитектуру, основанную на принципах распределённых систем, где каждый компонент выполняет свою специфическую роль. Это позволяет создавать надёжные, масштабируемые и отказоустойчивые системы обработки задач.

**Основные компоненты архитектуры Celery:**

1. **Producer (Продюсер)** — это часть вашего приложения, которая создаёт задачи и отправляет их в очередь. В нашем случае это будет FastAPI приложение. Продюсер не ждёт завершения выполнения задачи, а сразу возвращает управление, что позволяет приложению оставаться отзывчивым.

2. **Broker (Брокер)** — это промежуточное хранилище для задач, которое действует как буфер между продюсером и воркером. Брокер гарантирует, что задачи не будут потеряны, даже если воркер временно недоступен. Популярные варианты: Redis, RabbitMQ, Amazon SQS.

3. **Worker (Воркер)** — это процесс, который извлекает задачи из очереди и выполняет их. Воркер может работать на том же сервере, что и приложение, или на отдельной машине. Можно запускать несколько воркеров для увеличения пропускной способности.

4. **Backend (Бэкенд)** — это хранилище для результатов выполнения задач. Позволяет получать статус задачи, её результат или информацию об ошибке. Обычно используется тот же Redis или база данных.

**Поток данных в системе:**

```
FastAPI App (Producer) → Broker → Worker → Backend
```

**Подробное описание процесса:**

1. **Создание задачи** — FastAPI приложение создаёт задачу и отправляет её в брокер
2. **Постановка в очередь** — брокер помещает задачу в соответствующую очередь (по умолчанию используется очередь "celery")
3. **Извлечение задачи** — воркер извлекает задачу из очереди и начинает её выполнение
4. **Выполнение** — воркер выполняет задачу и может обновлять её статус
5. **Сохранение результата** — результат выполнения сохраняется в бэкенде
6. **Получение результата** — приложение может запросить результат через бэкенд

**Преимущества такой архитектуры:**

- **Разделение ответственности** — каждый компонент выполняет свою задачу
- **Масштабируемость** — можно добавлять воркеры без изменения кода приложения
- **Отказоустойчивость** — задачи не теряются при сбоях отдельных компонентов
- **Гибкость** — можно использовать разные брокеры и бэкенды в зависимости от требований

## 3. Установка и настройка

Правильная установка и настройка Celery — это первый и очень важный шаг на пути к созданию надёжной системы обработки асинхронных задач. От качества начальной настройки зависит стабильность и производительность всей системы в будущем.

**Установка необходимых пакетов:**

Для работы с Celery в FastAPI потребуется установить несколько пакетов. Рекомендуется использовать виртуальное окружение для изоляции зависимостей:

```bash
# Создание виртуального окружения
python -m venv venv

# Активация виртуального окружения
# На Windows:
venv\Scripts\activate
# На Linux/Mac:
source venv/bin/activate

# Установка пакетов
pip install fastapi uvicorn celery redis
```

**Подробное объяснение каждого пакета:**

- **`fastapi`** — основной веб-фреймворк, который будет создавать HTTP API для взаимодействия с пользователями
- **`uvicorn`** — ASGI-сервер для запуска FastAPI приложения. ASGI (Asynchronous Server Gateway Interface) — это современный стандарт для асинхронных веб-приложений
- **`celery`** — основная библиотека для обработки асинхронных задач. Предоставляет весь функционал для создания, отправки и выполнения задач
- **`redis`** — драйвер для работы с Redis, который будет использоваться как брокер сообщений и бэкенд для результатов. Redis — это быстрая in-memory база данных, идеально подходящая для очередей задач

**Дополнительные пакеты для расширенного функционала:**

```bash
# Для мониторинга (опционально)
pip install flower

# Для работы с базами данных (если планируете использовать БД как бэкенд)
pip install sqlalchemy psycopg2-binary

# Для работы с RabbitMQ (альтернатива Redis)
pip install pika

# Для работы с Amazon SQS
pip install boto3
```

**Проверка установки:**

После установки можно проверить, что все пакеты установлены корректно:

```bash
python -c "import fastapi, uvicorn, celery, redis; print('Все пакеты установлены успешно!')"
```

**Установка Redis:**

Для работы с Redis вам потребуется установить сам Redis сервер:

**На Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**На macOS (с Homebrew):**
```bash
brew install redis
brew services start redis
```

**На Windows:**
Скачайте Redis с официального сайта или используйте WSL (Windows Subsystem for Linux).

**Проверка работы Redis:**
```bash
redis-cli ping
```
Должен вернуться ответ `PONG`.

## 4. Базовая структура проекта

Правильная организация структуры проекта — это основа для создания масштабируемого и поддерживаемого кода. Хорошо структурированный проект упрощает разработку, тестирование и развёртывание. В случае с FastAPI и Celery важно разделить ответственность между компонентами и обеспечить модульность.

**Создадим структуру проекта для демонстрации интеграции FastAPI с Celery:**

```
fastapi_celery_project/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── celery_app.py
│   ├── tasks.py
│   └── api/
│       ├── __init__.py
│       └── endpoints.py
├── celery_worker.py
└── requirements.txt
```

**Подробное объяснение каждого файла и его назначения:**

- **`app/__init__.py`** — пустой файл, который превращает директорию `app` в Python-пакет. Это позволяет импортировать модули из этой директории.

- **`app/main.py`** — основной файл FastAPI приложения. Содержит создание экземпляра приложения, подключение роутеров и настройку middleware.

- **`app/celery_app.py`** — конфигурация Celery. Содержит создание экземпляра Celery, настройку брокера, бэкенда и других параметров. Это центральное место для всех настроек, связанных с Celery.

- **`app/tasks.py`** — файл с определениями задач Celery. Здесь будут находиться все функции, декорированные `@celery_app.task`. Рекомендуется группировать связанные задачи в одном файле или создавать отдельные файлы для разных типов задач.

- **`app/api/`** — директория для API endpoints. Разделение API на отдельные модули улучшает организацию кода и упрощает поддержку.

- **`app/api/endpoints.py`** — файл с HTTP endpoints для взаимодействия с задачами Celery. Здесь будут определены маршруты для создания задач, получения их статуса и результатов.

- **`celery_worker.py`** — точка входа для запуска воркера Celery. Этот файл импортирует приложение Celery и запускает воркер.

- **`requirements.txt`** — файл с зависимостями проекта. Содержит список всех необходимых пакетов с указанием версий.

**Альтернативная структура для больших проектов:**

Для более крупных проектов рекомендуется использовать более детальную структуру:

```
fastapi_celery_project/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── celery_app.py
│   ├── config.py
│   ├── tasks/
│   │   ├── __init__.py
│   │   ├── email_tasks.py
│   │   ├── file_tasks.py
│   │   └── report_tasks.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   └── endpoints.py
│   │   └── dependencies.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── task_results.py
│   └── utils/
│       ├── __init__.py
│       └── helpers.py
├── celery_worker.py
├── celery_beat.py
├── requirements.txt
├── .env
└── README.md
```

**Преимущества такой структуры:**

- **Модульность** — каждый компонент имеет свою ответственность
- **Масштабируемость** — легко добавлять новые задачи и endpoints
- **Тестируемость** — каждый модуль можно тестировать независимо
- **Читаемость** — код организован логически
- **Переиспользование** — компоненты можно использовать в разных частях приложения

## 5. Настройка Celery

Настройка Celery — это критически важный этап, который определяет поведение всей системы обработки задач. Правильная конфигурация обеспечивает стабильность, производительность и надёжность системы. Неправильные настройки могут привести к потере задач, утечкам памяти или неэффективному использованию ресурсов.

**Основные компоненты настройки Celery:**

1. **Брокер сообщений** — это промежуточное хранилище для задач, которое действует как буфер между приложением и воркерами. Redis является популярным выбором благодаря простоте настройки, высокой производительности и богатому функционалу. Альтернативы включают RabbitMQ (более надёжный, но сложнее в настройке) и Amazon SQS (облачное решение).

2. **Бэкенд результатов** — это хранилище для результатов выполнения задач. Позволяет получать статус задачи, её результат или информацию об ошибке. Обычно используется тот же Redis, но можно использовать базу данных для более сложных сценариев.

3. **Конфигурация задач** — настройки, которые определяют поведение системы: таймауты выполнения, политики повторных попыток, приоритеты задач, ограничения на ресурсы.

4. **Импорт задач** — автоматический импорт всех задач при запуске воркера. Это позволяет Celery знать, какие задачи доступны для выполнения.

**Создание файла конфигурации Celery:**

Создайте файл `app/celery_app.py` со следующим содержимым:

```python
from celery import Celery
import os

# Получение настроек из переменных окружения
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)

# Создаём экземпляр Celery
celery_app = Celery(
    "fastapi_celery",  # Имя приложения
    broker=CELERY_BROKER_URL,  # URL брокера сообщений
    backend=CELERY_RESULT_BACKEND,  # URL бэкенда результатов
    include=["app.tasks"]  # Модули с задачами для автоматического импорта
)

# Конфигурация Celery
celery_app.conf.update(
    # Настройки сериализации
    task_serializer="json",  # Формат сериализации задач
    accept_content=["json"],  # Принимаемые форматы данных
    result_serializer="json",  # Формат сериализации результатов
    
    # Настройки времени
    timezone="Europe/Moscow",  # Часовой пояс
    enable_utc=True,  # Использовать UTC для внутренних операций
    
    # Настройки отслеживания
    task_track_started=True,  # Отслеживать начало выполнения задач
    task_ignore_result=False,  # Сохранять результаты задач
    
    # Настройки таймаутов
    task_time_limit=30 * 60,  # Максимальное время выполнения задачи (30 минут)
    task_soft_time_limit=25 * 60,  # Мягкий таймаут (25 минут)
    
    # Настройки воркера
    worker_prefetch_multiplier=1,  # Количество задач, которые воркер берёт одновременно
    worker_max_tasks_per_child=1000,  # Максимальное количество задач на дочерний процесс
    
    # Настройки очередей
    task_default_queue="default",  # Очередь по умолчанию
    task_routes={
        "app.tasks.email_tasks.*": {"queue": "email"},
        "app.tasks.file_tasks.*": {"queue": "files"},
        "app.tasks.report_tasks.*": {"queue": "reports"},
    },
    
    # Настройки повторных попыток
    task_acks_late=True,  # Подтверждать выполнение задачи только после успешного завершения
    worker_disable_rate_limits=False,  # Не отключать ограничения скорости
    
    # Настройки логирования
    worker_log_format="[%(asctime)s: %(levelname)s/%(processName)s] %(message)s",
    worker_task_log_format="[%(asctime)s: %(levelname)s/%(processName)s] [%(task_name)s(%(task_id)s)] %(message)s",
)

# Опционально: настройка для продакшена
# celery_app.conf.update(
#     broker_url="redis://:password@redis-host:6379/0",
#     result_backend="redis://:password@redis-host:6379/0",
#     security_key="your-security-key",
#     task_serializer="json",
#     result_serializer="json",
#     accept_content=["json"],
#     enable_utc=True,
#     timezone="Europe/Moscow",
# )
```

**Подробное объяснение настроек:**

**Настройки сериализации:**
- `task_serializer="json"` — определяет формат сериализации задач. JSON безопасен и читаем, но менее эффективен чем pickle
- `accept_content=["json"]` — указывает, какие форматы данных принимает воркер
- `result_serializer="json"` — формат сериализации результатов задач

**Настройки времени:**
- `timezone="Europe/Moscow"` — часовой пояс для логирования и планирования задач
- `enable_utc=True` — использовать UTC для внутренних операций (рекомендуется для продакшена)

**Настройки отслеживания:**
- `task_track_started=True` — отслеживать момент начала выполнения задачи
- `task_ignore_result=False` — сохранять результаты задач в бэкенде

**Настройки таймаутов:**
- `task_time_limit=30 * 60` — жёсткий таймаут (задача будет принудительно завершена)
- `task_soft_time_limit=25 * 60` — мягкий таймаут (задача может обработать сигнал и завершиться gracefully)

**Настройки воркера:**
- `worker_prefetch_multiplier=1` — количество задач, которые воркер берёт из очереди одновременно
- `worker_max_tasks_per_child=1000` — максимальное количество задач на дочерний процесс (помогает избежать утечек памяти)

**Настройки очередей:**
- `task_default_queue="default"` — очередь по умолчанию для задач
- `task_routes` — маршрутизация задач по разным очередям в зависимости от типа

**Настройки повторных попыток:**
- `task_acks_late=True` — подтверждать выполнение задачи только после успешного завершения
- `worker_disable_rate_limits=False` — не отключать ограничения скорости выполнения задач

**Переменные окружения:**

Для гибкости настройки рекомендуется использовать переменные окружения. Создайте файл `.env`:

```bash
# Redis настройки
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Настройки приложения
CELERY_TIMEZONE=Europe/Moscow
CELERY_TASK_TIME_LIMIT=1800
CELERY_TASK_SOFT_TIME_LIMIT=1500

# Настройки для продакшена
# REDIS_URL=redis://:password@redis-host:6379/0
# CELERY_BROKER_URL=redis://:password@redis-host:6379/0
# CELERY_RESULT_BACKEND=redis://:password@redis-host:6379/0
```

**Проверка конфигурации:**

После создания конфигурации можно проверить её корректность:

```python
from app.celery_app import celery_app

# Проверка подключения к брокеру
try:
    celery_app.control.inspect().active()
    print("Подключение к брокеру успешно!")
except Exception as e:
    print(f"Ошибка подключения к брокеру: {e}")
```

## 6. Создание задач

Создание задач — это сердце любой системы на основе Celery. Задачи представляют собой обычные Python-функции, которые декорированы специальным образом для работы с системой очередей. Понимание принципов создания задач критически важно для разработки эффективных и надёжных систем.

**Основные принципы создания задач в Celery:**

1. **Декоратор @celery_app.task** — это магический декоратор, который превращает обычную Python-функцию в задачу Celery. Он добавляет функционал для сериализации, отправки в очередь и отслеживания выполнения.

2. **Возврат результатов** — задачи могут возвращать данные любого типа, которые будут автоматически сериализованы и сохранены в бэкенде. Это позволяет получать результаты выполнения задач.

3. **Обработка ошибок** — Celery предоставляет встроенные механизмы для обработки ошибок, включая автоматические повторные попытки, логирование и уведомления.

4. **Метаданные и прогресс** — задачи могут обновлять свой статус и передавать метаданные о прогрессе выполнения, что особенно полезно для длительных операций.

5. **Связывание задач** — задачи могут быть связаны в цепочки, группы или аккорды для создания сложных рабочих процессов.

**Создание файла с задачами:**

Создайте файл `app/tasks.py` со следующими задачами:

```python
from app.celery_app import celery_app
import time
import logging
from typing import Dict, Any, Optional
from datetime import datetime

# Настройка логирования для задач
logger = logging.getLogger(__name__)

@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def long_running_task(self, data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Пример длительной задачи с отслеживанием прогресса и обработкой ошибок.
    
    Эта задача демонстрирует несколько важных концепций:
    - Отслеживание прогресса выполнения
    - Обработка ошибок с повторными попытками
    - Логирование процесса выполнения
    - Возврат структурированного результата
    """
    logger.info(f"Начало выполнения задачи {self.request.id} с данными: {data}")
    
    try:
        total_steps = data.get('total_steps', 10)
        items_to_process = data.get('items', [])
        
        results = []
        
        for step in range(total_steps):
            # Имитация длительной работы
            time.sleep(2)
            
            # Обработка элементов (если есть)
            if items_to_process and step < len(items_to_process):
                item = items_to_process[step]
                processed_item = f"Обработан: {item}"
                results.append(processed_item)
            
            # Обновляем прогресс выполнения
            progress = (step + 1) / total_steps * 100
            self.update_state(
                state="PROGRESS",
                meta={
                    "current": step + 1,
                    "total": total_steps,
                    "progress": round(progress, 2),
                    "status": f"Обработка шага {step + 1} из {total_steps}",
                    "processed_items": len(results)
                }
            )
            
            logger.info(f"Шаг {step + 1}/{total_steps} завершён, прогресс: {progress:.1f}%")
        
        # Формируем итоговый результат
        result = {
            "status": "completed",
            "task_id": self.request.id,
            "processed_items": len(results),
            "total_steps": total_steps,
            "results": results,
            "completed_at": datetime.now().isoformat(),
            "execution_time": time.time() - self.request.timestamp
        }
        
        logger.info(f"Задача {self.request.id} успешно завершена")
        return result
        
    except Exception as exc:
        logger.error(f"Ошибка в задаче {self.request.id}: {str(exc)}")
        # Повторная попытка при ошибке
        raise self.retry(exc=exc)

@celery_app.task(bind=True, max_retries=5, default_retry_delay=30)
def send_email_task(self, email: str, subject: str, message: str, 
                   template_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Задача для отправки email с поддержкой шаблонов и повторных попыток.
    
    Особенности:
    - Автоматические повторные попытки при ошибках
    - Поддержка HTML и текстовых шаблонов
    - Логирование процесса отправки
    - Возврат детальной информации о результате
    """
    logger.info(f"Отправка email на {email}: {subject}")
    
    try:
        # Имитация отправки email с возможными ошибками
        if "error" in email.lower():
            raise Exception("Имитация ошибки отправки email")
        
        # Имитация обработки шаблона
        if template_name:
            message = f"[Шаблон: {template_name}] {message}"
        
        # Имитация отправки
        time.sleep(3)
        
        result = {
            "status": "sent",
            "email": email,
            "subject": subject,
            "message": message,
            "template_used": template_name,
            "sent_at": datetime.now().isoformat(),
            "task_id": self.request.id
        }
        
        logger.info(f"Email успешно отправлен на {email}")
        return result
        
    except Exception as exc:
        logger.error(f"Ошибка отправки email на {email}: {str(exc)}")
        raise self.retry(exc=exc)

@celery_app.task(bind=True, max_retries=3, default_retry_delay=120)
def process_file_task(self, file_path: str, operations: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Задача для обработки файлов с поддержкой различных операций.
    
    Поддерживаемые операции:
    - Сжатие изображений
    - Конвертация форматов
    - Извлечение метаданных
    - Валидация файлов
    """
    logger.info(f"Начало обработки файла: {file_path}")
    
    try:
        # Имитация проверки существования файла
        if "nonexistent" in file_path:
            raise FileNotFoundError(f"Файл не найден: {file_path}")
        
        # Имитация обработки файла
        processing_time = 5
        time.sleep(processing_time)
        
        # Имитация различных операций
        operations = operations or {}
        processed_operations = []
        
        if operations.get('compress'):
            processed_operations.append("Сжатие выполнено")
        
        if operations.get('convert'):
            processed_operations.append("Конвертация выполнена")
        
        if operations.get('extract_metadata'):
            processed_operations.append("Метаданные извлечены")
        
        result = {
            "status": "processed",
            "file_path": file_path,
            "file_size": "1.2MB",
            "processing_time": f"{processing_time} секунд",
            "operations_performed": processed_operations,
            "processed_at": datetime.now().isoformat(),
            "task_id": self.request.id
        }
        
        logger.info(f"Файл {file_path} успешно обработан")
        return result
        
    except Exception as exc:
        logger.error(f"Ошибка обработки файла {file_path}: {str(exc)}")
        raise self.retry(exc=exc)

@celery_app.task(bind=True, max_retries=2, default_retry_delay=300)
def generate_report_task(self, user_id: int, report_type: str, 
                        parameters: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Задача для генерации отчётов с поддержкой различных типов и параметров.
    
    Типы отчётов:
    - sales: отчёт по продажам
    - analytics: аналитический отчёт
    - financial: финансовый отчёт
    - custom: пользовательский отчёт
    """
    logger.info(f"Генерация отчёта типа '{report_type}' для пользователя {user_id}")
    
    try:
        # Имитация сложной генерации отчёта
        generation_time = 10
        time.sleep(generation_time)
        
        # Имитация различных типов отчётов
        report_data = {
            "user_id": user_id,
            "report_type": report_type,
            "generated_at": datetime.now().isoformat(),
            "parameters": parameters or {},
            "task_id": self.request.id
        }
        
        if report_type == "sales":
            report_data.update({
                "report_url": f"/reports/sales/{user_id}_{datetime.now().strftime('%Y%m%d')}.pdf",
                "total_sales": 150000,
                "period": "2024"
            })
        elif report_type == "analytics":
            report_data.update({
                "report_url": f"/reports/analytics/{user_id}_analytics.pdf",
                "metrics": ["конверсия", "удержание", "доходность"],
                "period": "месяц"
            })
        elif report_type == "financial":
            report_data.update({
                "report_url": f"/reports/financial/{user_id}_financial.pdf",
                "revenue": 500000,
                "expenses": 300000,
                "profit": 200000
            })
        else:
            report_data.update({
                "report_url": f"/reports/custom/{user_id}_{report_type}.pdf",
                "custom_data": "Пользовательские данные"
            })
        
        result = {
            "status": "generated",
            "report_data": report_data,
            "generation_time": f"{generation_time} секунд",
            "file_size": "2.5MB"
        }
        
        logger.info(f"Отчёт типа '{report_type}' для пользователя {user_id} успешно сгенерирован")
        return result
        
    except Exception as exc:
        logger.error(f"Ошибка генерации отчёта для пользователя {user_id}: {str(exc)}")
        raise self.retry(exc=exc)

@celery_app.task
def cleanup_task() -> Dict[str, str]:
    """
    Простая задача для очистки временных файлов и данных.
    
    Эта задача демонстрирует простой случай без сложной логики.
    """
    logger.info("Выполнение задачи очистки")
    
    # Имитация очистки
    time.sleep(2)
    
    return {
        "status": "cleaned",
        "message": "Временные файлы очищены",
        "cleaned_at": datetime.now().isoformat()
    }
```

**Подробное объяснение особенностей задач:**

**Декораторы и параметры:**
- `@celery_app.task(bind=True)` — `bind=True` передаёт экземпляр задачи в функцию как первый параметр `self`
- `max_retries=3` — максимальное количество повторных попыток при ошибке
- `default_retry_delay=60` — задержка между повторными попытками в секундах

**Отслеживание прогресса:**
- `self.update_state()` — обновляет статус задачи и передаёт метаданные
- `state="PROGRESS"` — специальный статус для задач с прогрессом
- `meta` — словарь с метаданными (прогресс, текущий шаг, статус)

**Обработка ошибок:**
- `try/except` — перехват исключений
- `self.retry(exc=exc)` — повторная попытка выполнения задачи
- Логирование ошибок для отладки

**Возврат результатов:**
- Возвращаемые данные автоматически сериализуются и сохраняются в бэкенде
- Структурированные результаты с метаданными
- Временные метки для отслеживания

**Логирование:**
- Использование стандартного модуля `logging`
- Логирование начала, прогресса и завершения задач
- Запись ошибок для отладки

**Типы задач:**

1. **Длительные задачи** — `long_running_task` демонстрирует отслеживание прогресса
2. **Задачи с повторными попытками** — `send_email_task` показывает обработку ошибок
3. **Задачи обработки файлов** — `process_file_task` с поддержкой различных операций
4. **Задачи генерации отчётов** — `generate_report_task` с разными типами отчётов
5. **Простые задачи** — `cleanup_task` без сложной логики

## 7. Интеграция с FastAPI

Теперь создадим FastAPI приложение, которое будет использовать Celery для обработки асинхронных задач.

```python
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, Optional
from app.tasks import long_running_task, send_email_task, process_file_task, generate_report_task
from celery.result import AsyncResult

app = FastAPI(title="FastAPI + Celery Demo")

# Pydantic модели для запросов
class TaskRequest(BaseModel):
    data: Dict[str, Any]

class EmailRequest(BaseModel):
    email: str
    subject: str
    message: str

class FileRequest(BaseModel):
    file_path: str

class ReportRequest(BaseModel):
    user_id: int
    report_type: str

# Pydantic модели для ответов
class TaskResponse(BaseModel):
    task_id: str
    status: str
    message: str

class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    progress: Optional[Dict[str, Any]] = None

@app.post("/tasks/long-running", response_model=TaskResponse)
async def create_long_running_task(request: TaskRequest):
    """
    Создаёт длительную задачу с отслеживанием прогресса
    """
    task = long_running_task.delay(request.data)
    
    return TaskResponse(
        task_id=task.id,
        status="PENDING",
        message="Задача создана и поставлена в очередь"
    )

@app.post("/tasks/send-email", response_model=TaskResponse)
async def create_email_task(request: EmailRequest):
    """
    Создаёт задачу для отправки email
    """
    task = send_email_task.delay(
        email=request.email,
        subject=request.subject,
        message=request.message
    )
    
    return TaskResponse(
        task_id=task.id,
        status="PENDING",
        message="Задача отправки email создана"
    )

@app.post("/tasks/process-file", response_model=TaskResponse)
async def create_file_task(request: FileRequest):
    """
    Создаёт задачу для обработки файла
    """
    task = process_file_task.delay(request.file_path)
    
    return TaskResponse(
        task_id=task.id,
        status="PENDING",
        message="Задача обработки файла создана"
    )

@app.post("/tasks/generate-report", response_model=TaskResponse)
async def create_report_task(request: ReportRequest):
    """
    Создаёт задачу для генерации отчёта
    """
    task = generate_report_task.delay(
        user_id=request.user_id,
        report_type=request.report_type
    )
    
    return TaskResponse(
        task_id=task.id,
        status="PENDING",
        message="Задача генерации отчёта создана"
    )

@app.get("/tasks/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """
    Получает статус и результат задачи
    """
    task_result = AsyncResult(task_id)
    
    response = TaskStatusResponse(
        task_id=task_id,
        status=task_result.status
    )
    
    if task_result.ready():
        if task_result.successful():
            response.result = task_result.result
        else:
            response.result = {"error": str(task_result.info)}
    elif task_result.state == "PROGRESS":
        response.progress = task_result.info
    
    return response

@app.delete("/tasks/{task_id}")
async def cancel_task(task_id: str):
    """
    Отменяет выполнение задачи
    """
    task_result = AsyncResult(task_id)
    
    if task_result.state in ["PENDING", "STARTED"]:
        task_result.revoke(terminate=True)
        return {"message": f"Задача {task_id} отменена"}
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Невозможно отменить задачу в состоянии {task_result.state}"
        )

@app.get("/health")
async def health_check():
    """
    Проверка состояния приложения
    """
    return {
        "status": "healthy",
        "celery_connected": True,
        "timestamp": time.time()
    }
```

## 8. Запуск воркера Celery

Для обработки задач необходимо запустить воркер Celery. Создайте файл `celery_worker.py`:

```python
from app.celery_app import celery_app

if __name__ == "__main__":
    celery_app.start()
```

Запустите воркер командой:

```bash
celery -A celery_worker worker --loglevel=info
```

**Параметры запуска:**
- `-A celery_worker` — указывает на модуль с приложением Celery
- `--loglevel=info` — уровень логирования
- `--concurrency=4` — количество параллельных воркеров (по умолчанию равно количеству CPU)
- `--pool=prefork` — тип пула воркеров (prefork, eventlet, gevent)

## 9. Мониторинг и управление задачами

Celery предоставляет несколько инструментов для мониторинга и управления задачами:

### 9.1. Flower — веб-интерфейс для мониторинга

Установите Flower:

```bash
pip install flower
```

Запустите:

```bash
celery -A celery_worker flower
```

Flower предоставляет веб-интерфейс на http://localhost:5555 с возможностями:
- Просмотр активных задач
- Мониторинг воркеров
- Просмотр статистики
- Отмена задач
- Просмотр результатов

### 9.2. Командная строка

```bash
# Просмотр активных задач
celery -A celery_worker inspect active

# Просмотр статистики
celery -A celery_worker inspect stats

# Просмотр зарегистрированных задач
celery -A celery_worker inspect registered

# Отмена всех задач
celery -A celery_worker control purge
```

## 10. Продвинутые возможности

### 10.1. Цепочки задач

```python
from celery import chain

# Создание цепочки задач
task_chain = chain(
    task1.s(data),
    task2.s(),
    task3.s()
)
result = task_chain.apply_async()
```

### 10.2. Группы задач

```python
from celery import group

# Параллельное выполнение задач
task_group = group([
    task1.s(data1),
    task2.s(data2),
    task3.s(data3)
])
result = task_group.apply_async()
```

### 10.3. Планирование задач

```python
from datetime import datetime, timedelta

# Выполнение задачи в определённое время
task.apply_async(eta=datetime.now() + timedelta(hours=1))

# Периодические задачи
@celery_app.task
def periodic_task():
    return "Выполняется каждый час"

# В конфигурации Celery
celery_app.conf.beat_schedule = {
    'periodic-task': {
        'task': 'app.tasks.periodic_task',
        'schedule': 3600.0,  # каждые 3600 секунд
    },
}
```

### 10.4. Обработка ошибок и повторные попытки

```python
@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def task_with_retry(self, data):
    try:
        # Выполнение задачи
        result = process_data(data)
        return result
    except Exception as exc:
        # Повторная попытка при ошибке
        self.retry(exc=exc)
```

## 11. Лучшие практики

### 11.1. Структура проекта

```
project/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── celery_app.py
│   ├── tasks/
│   │   ├── __init__.py
│   │   ├── email_tasks.py
│   │   ├── file_tasks.py
│   │   └── report_tasks.py
│   └── api/
│       ├── __init__.py
│       └── endpoints.py
├── celery_worker.py
├── celery_beat.py
└── requirements.txt
```

### 11.2. Конфигурация для разных окружений

```python
import os

class Config:
    CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
    CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/0")
    CELERY_TASK_SERIALIZER = "json"
    CELERY_RESULT_SERIALIZER = "json"
    CELERY_ACCEPT_CONTENT = ["json"]
    CELERY_TIMEZONE = "Europe/Moscow"
    CELERY_ENABLE_UTC = True

class DevelopmentConfig(Config):
    DEBUG = True
    CELERY_TASK_ALWAYS_EAGER = False

class ProductionConfig(Config):
    DEBUG = False
    CELERY_TASK_ALWAYS_EAGER = False
    CELERY_WORKER_MAX_TASKS_PER_CHILD = 1000
    CELERY_WORKER_PREFETCH_MULTIPLIER = 1
```

### 11.3. Логирование

```python
import logging

# Настройка логирования для задач
@celery_app.task(bind=True)
def task_with_logging(self, data):
    logger = logging.getLogger(__name__)
    logger.info(f"Начало выполнения задачи {self.request.id}")
    
    try:
        result = process_data(data)
        logger.info(f"Задача {self.request.id} выполнена успешно")
        return result
    except Exception as e:
        logger.error(f"Ошибка в задаче {self.request.id}: {str(e)}")
        raise
```

### 11.4. Мониторинг производительности

```python
import time
from functools import wraps

def monitor_task_performance(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            # Логирование метрик
            print(f"Задача {func.__name__} выполнена за {execution_time:.2f} секунд")
            return result
        except Exception as e:
            execution_time = time.time() - start_time
            print(f"Задача {func.__name__} завершилась с ошибкой за {execution_time:.2f} секунд")
            raise
    return wrapper

@celery_app.task
@monitor_task_performance
def monitored_task(data):
    # Выполнение задачи
    time.sleep(5)
    return "Результат"
```

## 12. Развёртывание в продакшене

### 12.1. Docker Compose

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    depends_on:
      - redis
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/0

  worker:
    build: .
    command: celery -A celery_worker worker --loglevel=info
    depends_on:
      - redis
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/0

  beat:
    build: .
    command: celery -A celery_worker beat --loglevel=info
    depends_on:
      - redis
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/0

  flower:
    build: .
    command: celery -A celery_worker flower
    ports:
      - "5555:5555"
    depends_on:
      - redis
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/0
      - CELERY_RESULT_BACKEND=redis://redis:6379/0

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

### 12.2. Systemd сервисы

```ini
# /etc/systemd/system/celery-worker.service
[Unit]
Description=Celery Worker Service
After=network.target

[Service]
Type=forking
User=celery
Group=celery
EnvironmentFile=/etc/conf.d/celery
WorkingDirectory=/opt/celery
ExecStart=/bin/sh -c '${CELERY_BIN} multi start ${CELERYD_NODES} \
  -A ${CELERY_APP} --pidfile=${CELERYD_PID_FILE} \
  --logfile=${CELERYD_LOG_FILE} --loglevel=${CELERYD_LOG_LEVEL} ${CELERYD_OPTS}'
ExecStop=/bin/sh -c '${CELERY_BIN} multi stopwait ${CELERYD_NODES} \
  --pidfile=${CELERYD_PID_FILE}'
ExecReload=/bin/sh -c '${CELERY_BIN} multi restart ${CELERYD_NODES} \
  -A ${CELERY_APP} --pidfile=${CELERYD_PID_FILE} \
  --logfile=${CELERYD_LOG_FILE} --loglevel=${CELERYD_LOG_LEVEL} ${CELERYD_OPTS}'

[Install]
WantedBy=multi-user.target
```

## 13. Полезные ссылки

- [Официальная документация Celery](https://docs.celeryproject.org/)
- [Celery с FastAPI](https://fastapi.tiangolo.com/advanced/background-tasks/)
- [Flower — мониторинг Celery](https://flower.readthedocs.io/)
- [Redis — брокер сообщений](https://redis.io/)
- [RabbitMQ — альтернативный брокер](https://www.rabbitmq.com/)

## Заключение

Интеграция FastAPI с Celery создаёт мощную архитектуру для обработки асинхронных задач. Это решение позволяет:

- **Масштабировать приложения** — добавлять воркеры по мере роста нагрузки
- **Улучшать отзывчивость** — не блокировать основной поток длительными операциями
- **Обеспечивать надёжность** — автоматические повторные попытки и обработка ошибок
- **Мониторить выполнение** — отслеживать статус и прогресс задач
- **Планировать операции** — выполнять задачи по расписанию

Celery особенно полезен для приложений, где требуется обработка файлов, отправка уведомлений, интеграция с внешними сервисами или генерация отчётов. Правильная настройка и использование лучших практик позволит создать надёжную и масштабируемую систему обработки задач. 