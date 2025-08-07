+++
lang = "ru"
title = "FastAPI + Docker: контейнеризация"
description = "Подробное руководство по контейнеризации FastAPI приложений с Docker: создание Dockerfile, docker-compose, оптимизация образов и развертывание в продакшене."
template = "posts"
thumb = "/imgs/2025/07/fastapi-docker-containerization.png"
publication_date = "2025-07-10"
+++

# FastAPI + Docker: контейнеризация

**Docker** — это платформа для разработки, доставки и запуска приложений в контейнерах. Контейнеризация FastAPI приложений обеспечивает изоляцию зависимостей, упрощает развертывание и гарантирует консистентность среды выполнения между разработкой и продакшеном. В этой статье мы рассмотрим, как эффективно контейнеризировать FastAPI приложения с использованием Docker и docker-compose.

Контейнеризация позволяет "упаковать" приложение вместе со всеми его зависимостями, настройками и окружением в единый переносимый образ. Это избавляет от проблем "у меня работает, а у тебя нет" и делает процесс развертывания быстрым и предсказуемым.

## 1. Преимущества контейнеризации FastAPI

Контейнеризация FastAPI приложений предоставляет множество преимуществ:

- **Изоляция зависимостей** — каждое приложение работает в своей среде, что исключает конфликты версий библиотек. Например, если у вас несколько проектов с разными версиями FastAPI, они не будут мешать друг другу.
- **Консистентность среды** — одинаковое поведение в разработке, тестировании и продакшене. Вы уверены, что код, который работает у вас локально, будет работать и на сервере.
- **Упрощение развертывания** — один образ работает везде: локально, на сервере, в облаке. Не нужно вручную устанавливать зависимости на каждом сервере.
- **Масштабируемость** — легко запускать несколько экземпляров приложения для обработки большого количества запросов.
- **Управление ресурсами** — контроль над использованием CPU и памяти, что важно для стабильности и безопасности.
- **Быстрое развертывание** — образы можно быстро развертывать и обновлять, что ускоряет релизы и откаты.

В крупных компаниях контейнеризация — стандарт де-факто для всех современных микросервисов и API.

## 2. Базовая структура проекта

Перед тем как приступить к контейнеризации, важно правильно организовать структуру проекта. Это упростит поддержку и масштабирование приложения в будущем.

```
fastapi-docker-project/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── models.py
│   └── schemas.py
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
└── README.md
```

- **app/** — директория с исходным кодом приложения.
- **requirements.txt** — список Python-зависимостей.
- **Dockerfile** — инструкция для сборки Docker-образа.
- **docker-compose.yml** — файл для управления несколькими контейнерами (например, приложение + база данных).
- **.dockerignore** — список файлов и папок, которые не попадут в образ (ускоряет сборку).
- **README.md** — документация по проекту.

Всегда отделяйте код приложения от инфраструктурных файлов (Dockerfile, docker-compose.yml и т.д.).

## 3. Создание FastAPI приложения

Давайте создадим минимальное FastAPI-приложение, чтобы увидеть, как оно будет работать в контейнере.

Создайте файл `app/main.py`:

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

app = FastAPI(
    title="FastAPI Docker App",
    description="Пример FastAPI приложения в Docker",
    version="1.0.0"
)

class Item(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    price: float

# Простое хранилище в памяти
items_db = []
item_id_counter = 1

@app.get("/")
def read_root():
    return {"message": "Добро пожаловать в FastAPI Docker App!"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "fastapi-docker"}

@app.get("/items/", response_model=List[Item])
def get_items():
    return items_db

@app.get("/items/{item_id}", response_model=Item)
def get_item(item_id: int):
    item = next((item for item in items_db if item["id"] == item_id), None)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.post("/items/", response_model=Item)
def create_item(item: Item):
    global item_id_counter
    new_item = item.dict()
    new_item["id"] = item_id_counter
    items_db.append(new_item)
    item_id_counter += 1
    return new_item

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

**Пояснения к коду:**
- Мы создаём экземпляр FastAPI и определяем простую модель данных `Item` с помощью Pydantic.
- Для хранения данных используется обычный список `items_db` — это временное решение для примера (в реальных проектах используют базы данных).
- Реализованы базовые CRUD-эндпоинты: получить все товары, получить товар по id, добавить новый товар.
- Эндпоинт `/health` нужен для проверки работоспособности контейнера (например, в CI/CD или при мониторинге).
- Приложение запускается через Uvicorn — это быстрый ASGI-сервер, рекомендованный для FastAPI.

Создайте файл `requirements.txt` с зависимостями:

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
```

Этот файл позволяет Docker быстро и предсказуемо устанавливать все необходимые библиотеки для вашего приложения.

## 4. Создание Dockerfile

Dockerfile — это инструкция для создания Docker образа. Создайте файл `Dockerfile`:

```dockerfile
# Используем официальный Python образ как базовый
FROM python:3.11-slim

# Устанавливаем рабочую директорию в контейнере
WORKDIR /app

# Устанавливаем системные зависимости
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Копируем файл зависимостей
COPY requirements.txt .

# Устанавливаем Python зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код приложения
COPY ./app .

# Создаем непривилегированного пользователя
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
USER appuser

# Открываем порт
EXPOSE 8000

# Команда для запуска приложения
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Объяснение ключевых моментов:**

- `FROM python:3.11-slim` — используем легковесный Python образ
- `WORKDIR /app` — устанавливаем рабочую директорию
- `COPY requirements.txt .` — копируем зависимости отдельно для кэширования слоев
- `RUN pip install` — устанавливаем зависимости
- `USER appuser` — запускаем приложение от непривилегированного пользователя
- `EXPOSE 8000` — указываем порт, который будет слушать приложение

## 5. Создание .dockerignore

Файл `.dockerignore` исключает ненужные файлы из контекста сборки:

```dockerignore
__pycache__
*.pyc
*.pyo
*.pyd
.Python
env
pip-log.txt
pip-delete-this-directory.txt
.tox
.coverage
.coverage.*
.cache
nosetests.xml
coverage.xml
*.cover
*.log
.git
.mypy_cache
.pytest_cache
.hypothesis
.DS_Store
.env
.venv
venv/
ENV/
env.bak/
venv.bak/
.idea/
.vscode/
*.swp
*.swo
*~
```

## 6. Сборка и запуск образа

Теперь можно собрать и запустить Docker образ:

```bash
# Сборка образа
docker build -t fastapi-docker-app .

# Запуск контейнера
docker run -d -p 8000:8000 --name fastapi-container fastapi-docker-app

# Проверка работы
curl http://localhost:8000/
```

## 7. Использование docker-compose

Для более сложных приложений с базами данных и дополнительными сервисами используйте docker-compose. Создайте файл `docker-compose.yml`:

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/fastapi_db
    depends_on:
      - db
    volumes:
      - ./app:/app
    restart: unless-stopped

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=fastapi_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  postgres_data:
```

**Команды для работы с docker-compose:**

```bash
# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f web

# Остановка сервисов
docker-compose down

# Пересборка и запуск
docker-compose up --build -d
```

## 8. Оптимизация Docker образов

### Многоэтапная сборка

Для продакшена используйте многоэтапную сборку для уменьшения размера образа:

```dockerfile
# Этап сборки
FROM python:3.11-slim as builder

WORKDIR /app

COPY requirements.txt .

RUN pip install --user --no-cache-dir -r requirements.txt

# Этап продакшена
FROM python:3.11-slim

WORKDIR /app

# Копируем установленные пакеты из этапа сборки
COPY --from=builder /root/.local /root/.local

# Копируем код приложения
COPY ./app .

# Создаем пользователя
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
USER appuser

EXPOSE 8000

ENV PATH=/root/.local/bin:$PATH

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Использование .dockerignore

Правильно настроенный `.dockerignore` значительно ускоряет сборку:

```dockerignore
# Исключаем ненужные файлы
.git
.gitignore
README.md
.env
.venv
__pycache__
*.pyc
.pytest_cache
.coverage
```

## 9. Переменные окружения

Создайте файл `.env` для конфигурации:

```env
# База данных
DATABASE_URL=postgresql://user:password@db:5432/fastapi_db

# Redis
REDIS_URL=redis://redis:6379

# Настройки приложения
DEBUG=False
LOG_LEVEL=INFO
```

Обновите `docker-compose.yml` для использования переменных окружения:

```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    environment:
      - DEBUG=False
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15
    env_file:
      - .env
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-user}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-password}
      - POSTGRES_DB=${POSTGRES_DB:-fastapi_db}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  postgres_data:
```

## 10. Продакшен конфигурация

Для продакшена создайте отдельный `Dockerfile.prod`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Устанавливаем системные зависимости
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Копируем зависимости
COPY requirements.txt .

# Устанавливаем Python пакеты
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код приложения
COPY ./app .

# Создаем пользователя
RUN adduser --disabled-password --gecos '' appuser && chown -R appuser /app
USER appuser

# Настройки для продакшена
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Запуск с Gunicorn для продакшена
CMD ["gunicorn", "main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

Обновите `requirements.txt` для продакшена:

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
gunicorn==21.2.0
pydantic==2.5.0
psycopg2-binary==2.9.9
redis==5.0.1
```

## 11. Мониторинг и логирование

Добавьте логирование в приложение:

```python
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uvicorn

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="FastAPI Docker App",
    description="Пример FastAPI приложения в Docker",
    version="1.0.0"
)

@app.middleware("http")
async def log_requests(request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    response = await call_next(request)
    logger.info(f"Response: {response.status_code}")
    return response

# ... остальной код приложения
```

## 12. Безопасность

### Обновленный Dockerfile с улучшенной безопасностью:

```dockerfile
FROM python:3.11-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Обновляем систему и устанавливаем зависимости
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Создаем пользователя заранее
RUN adduser --disabled-password --gecos '' appuser

# Копируем зависимости
COPY requirements.txt .

# Устанавливаем Python пакеты
RUN pip install --no-cache-dir -r requirements.txt

# Копируем код приложения
COPY ./app .

# Меняем владельца файлов
RUN chown -R appuser:appuser /app

# Переключаемся на непривилегированного пользователя
USER appuser

# Настройки безопасности
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 13. Развертывание в продакшене

### Создайте скрипт развертывания `deploy.sh`:

```bash
#!/bin/bash

# Остановка старых контейнеров
docker-compose down

# Удаление старых образов
docker system prune -f

# Сборка новых образов
docker-compose build --no-cache

# Запуск сервисов
docker-compose up -d

# Проверка здоровья
sleep 10
curl -f http://localhost:8000/health || exit 1

echo "Развертывание завершено успешно!"
```

### Настройте CI/CD pipeline в `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.KEY }}
        script: |
          cd /path/to/your/app
          git pull origin main
          chmod +x deploy.sh
          ./deploy.sh
```

## 14. Полезные команды Docker

```bash
# Просмотр запущенных контейнеров
docker ps

# Просмотр логов контейнера
docker logs fastapi-container

# Вход в контейнер
docker exec -it fastapi-container /bin/bash

# Просмотр использования ресурсов
docker stats

# Очистка неиспользуемых ресурсов
docker system prune -a

# Просмотр слоев образа
docker history fastapi-docker-app
```

## 15. Отладка и troubleshooting

### Частые проблемы и решения:

1. **Контейнер не запускается:**
   ```bash
   # Проверьте логи
   docker logs container_name
   
   # Проверьте порты
   docker port container_name
   ```

2. **Проблемы с правами доступа:**
   ```dockerfile
   # В Dockerfile добавьте
   RUN chown -R appuser:appuser /app
   USER appuser
   ```

3. **Медленная сборка:**
   ```dockerfile
   # Оптимизируйте порядок слоев
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY . .
   ```

## Заключение

Контейнеризация FastAPI приложений с Docker предоставляет мощные инструменты для разработки, тестирования и развертывания. Правильно настроенная контейнеризация обеспечивает:

- **Изоляцию** — каждое приложение работает в своей среде
- **Консистентность** — одинаковое поведение во всех средах
- **Масштабируемость** — легко запускать несколько экземпляров
- **Упрощение развертывания** — один образ работает везде
- **Безопасность** — изоляция процессов и ресурсов

Используя Docker и docker-compose, вы можете быстро создавать сложные микросервисные архитектуры и эффективно управлять их жизненным циклом. Это особенно важно для современных веб-приложений, где требуется высокая надежность и простота развертывания. 