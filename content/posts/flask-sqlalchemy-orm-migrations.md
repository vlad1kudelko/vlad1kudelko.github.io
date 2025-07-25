+++
lang = "ru"
title = "Flask + SQLAlchemy: ORM и миграции"
description = "Практическое руководство по интеграции Flask с SQLAlchemy и управлению миграциями с помощью Flask-Migrate. Примеры кода, настройка, лучшие практики."
template = "posts"
thumb = "/imgs/flask-sqlalchemy-orm-migrations.png"
publication_date = "2025-07-12"
+++

# Flask + SQLAlchemy: ORM и миграции

> **Читайте также:**
> - [Django: Аутентификация и авторизация](/posts/django-authentication-authorization)
> - [Flask + Redis: кэширование](/posts/flask-redis-caching)
> - [FastAPI + Docker: контейнеризация](/posts/fastapi-docker-containerization)

**Flask** в сочетании с **SQLAlchemy** и расширением **Flask-Migrate** позволяет быстро и удобно работать с базой данных, используя объектно-реляционное отображение (ORM) и управлять изменениями структуры БД через миграции. В этой статье рассмотрим, как настроить связку Flask + SQLAlchemy, создавать модели и применять миграции. Материал рассчитан как на новичков, так и на тех, кто хочет структурировать свои знания.

## 1. Установка необходимых пакетов

Для начала установим Flask, SQLAlchemy и Flask-Migrate. Эти инструменты позволят нам создавать веб-приложение, работать с базой данных на уровне Python-объектов и управлять изменениями структуры БД без ручного написания SQL.

```bash
pip install flask flask-sqlalchemy flask-migrate
```

- `flask` — основной веб-фреймворк, который отвечает за маршрутизацию, обработку запросов и запуск сервера.
- `flask-sqlalchemy` — расширение, которое интегрирует SQLAlchemy с Flask, делая работу с БД максимально простой и «фласковой».
- `flask-migrate` — надстройка над Alembic, которая позволяет удобно управлять миграциями через команды Flask CLI.

## 2. Базовая настройка Flask + SQLAlchemy

Давайте создадим минимальное приложение, чтобы понять, как устроена интеграция Flask и SQLAlchemy. Такой шаблон пригодится для любого проекта.

```python
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
# Указываем строку подключения к базе данных. Здесь используется SQLite — простая файл-база, не требующая отдельного сервера.
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///example.db'
# Отключаем отслеживание изменений объектов для экономии памяти (рекомендуется для большинства случаев).
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Создаём объект SQLAlchemy, который будет управлять всеми операциями с БД.
db = SQLAlchemy(app)

# Описываем модель пользователя. Каждый класс — это отдельная таблица в базе данных.
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # Уникальный идентификатор пользователя (PRIMARY KEY)
    username = db.Column(db.String(80), unique=True, nullable=False)  # Имя пользователя, обязательно и уникально
    email = db.Column(db.String(120), unique=True, nullable=False)    # Email пользователя, обязательно и уникально

    def __repr__(self):
        return f'<User {self.username}>'
```

**Пояснения:**
- `SQLALCHEMY_DATABASE_URI` — строка подключения к БД. Для продакшена лучше использовать PostgreSQL или MySQL, но для тестов и прототипов SQLite отлично подходит.
- `db.Model` — все модели должны наследоваться от этого класса, чтобы SQLAlchemy мог их распознать и создать соответствующие таблицы.
- Каждый атрибут класса — это отдельная колонка в таблице. Можно задавать типы, ограничения, уникальность и т.д.

## 3. Инициализация и применение миграций

Когда структура моделей меняется (например, добавляются новые поля или таблицы), нужно синхронизировать эти изменения с реальной базой данных. Делать это вручную неудобно и опасно — можно потерять данные или сделать ошибку. Для этого и нужны миграции.

**Flask-Migrate** позволяет автоматически отслеживать изменения моделей и создавать миграционные скрипты, которые можно применять к базе данных.

### Шаги для работы с миграциями:

1. **Инициализация миграций** — создаёт служебную папку `migrations/` с настройками Alembic:

```bash
flask db init
```

2. **Создание первой миграции** — анализирует ваши модели и генерирует скрипт, который создаёт все нужные таблицы:

```bash
flask db migrate -m "Initial migration."
```

3. **Применение миграции** — выполняет сгенерированный скрипт и создаёт таблицы в базе данных:

```bash
flask db upgrade
```

**Пояснения:**
- После этих шагов в вашей базе появится таблица `user` (и другие, если они есть в моделях).
- Все миграции хранятся в папке `migrations/` и могут быть применены или откатаны в любой момент.
- Если вы измените модель (например, добавите поле), Flask-Migrate сам сгенерирует нужный SQL-код для обновления структуры БД.

### Пример добавления нового поля:

Допустим, вы решили добавить флаг активности пользователя. Просто добавьте новое поле в модель:

```python
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    is_active = db.Column(db.Boolean, default=True)  # Новое поле: активен ли пользователь
```

Теперь нужно повторить шаги миграции:

```bash
flask db migrate -m "Add is_active field to User."
flask db upgrade
```

**Пояснения:**
- `migrate` создаёт новый миграционный скрипт, который добавляет колонку `is_active` в таблицу `user`.
- `upgrade` применяет этот скрипт к базе данных.
- Все существующие пользователи получат значение `is_active = True` по умолчанию.

## 4. Полезные команды Flask-Migrate

Вот краткий справочник по основным командам:

- `flask db init` — инициализация директории миграций (делается один раз в начале проекта)
- `flask db migrate` — создание новой миграции на основе изменений в моделях
- `flask db upgrade` — применение всех новых миграций к базе данных
- `flask db downgrade` — откат последней (или нескольких) миграций
- `flask db history` — просмотр истории всех миграций

**Совет:**
Если вы работаете в команде, всегда синхронизируйте миграции через систему контроля версий (git), чтобы у всех разработчиков структура БД была одинаковой.

## 5. Советы и лучшие практики

- **Коммитьте миграции** в систему контроля версий вместе с кодом моделей.
- **Проверяйте миграции** на тестовой базе перед применением в продакшене, чтобы избежать потери данных.
- **Не редактируйте миграционные скрипты вручную**, если не уверены в своих действиях — лучше пересоздать миграцию.
- **Пишите осмысленные сообщения** к миграциям, чтобы потом было понятно, что и зачем менялось.
- **Делайте резервные копии** базы данных перед крупными изменениями.

## 6. Полезные ссылки

- [Документация Flask-SQLAlchemy](https://flask-sqlalchemy.palletsprojects.com/) — подробное описание всех возможностей расширения.
- [Документация Flask-Migrate](https://flask-migrate.readthedocs.io/) — как работать с миграциями.
- [Документация Alembic](https://alembic.sqlalchemy.org/) — если нужно больше гибкости и ручных настроек.
- [Официальный сайт Flask](https://flask.palletsprojects.com/) — общая документация по Flask.

## Заключение

Flask + SQLAlchemy + Flask-Migrate — мощная и гибкая связка для работы с базой данных в Python-проектах. Она позволяет быстро создавать и развивать структуру БД, не теряя данных и не усложняя процесс разработки. Используйте миграции для контроля изменений и поддержания целостности данных на всех этапах жизни вашего приложения.

Теперь вы знаете, как:
- Настроить Flask и SQLAlchemy для работы с БД
- Создавать и изменять модели данных
- Управлять структурой базы через миграции
- Безопасно и удобно развивать свой проект

Если остались вопросы — смело обращайтесь к документации или задавайте их в комментариях к статье! 