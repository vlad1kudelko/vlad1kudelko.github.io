---
title: "Разработка сайта с использованием Django"
description: "Подробное руководство по созданию веб-приложений на Django: обзор структуры проекта, работа с базами данных, модели и административный интерфейс."
heroImage: "/imgs/2025/06/django-development-guide.webp"
pubDate: "2025-06-26"
---

# Разработка сайта с использованием Django

Django — это мощный и популярный фреймворк для разработки веб-приложений на языке Python. Он позволяет быстро создавать надёжные и масштабируемые сайты, предоставляя разработчику множество инструментов "из коробки". В этой статье мы рассмотрим структуру типового проекта Django и разберём основы работы с базами данных.

## Обзор структуры проекта Django

После создания нового проекта с помощью команды  
```bash
django-admin startproject mysite
```
у вас появится следующая структура каталогов:

```
mysite/
    manage.py
    mysite/
        __init__.py
        settings.py
        urls.py
        asgi.py
        wsgi.py
```

- **manage.py** — утилита для управления проектом (запуск сервера, миграции и т.д.).
- **mysite/** — основной пакет проекта.
  - **settings.py** — настройки проекта (БД, приложения, локализация и др.).
  - **urls.py** — маршрутизация (URL-адреса сайта).
  - **asgi.py/wsgi.py** — точки входа для серверов ASGI/WSGI.

Для добавления функциональности создаются приложения:
```bash
python manage.py startapp blog
```
Появится папка `blog/` с файлами для моделей, представлений, тестов и т.д.

## Урок по работе с базами данных

Django использует ORM (Object-Relational Mapping), что позволяет работать с базой данных через Python-код.

### 1. Определение моделей

В файле `models.py` приложения опишите структуру таблиц:

```python
from django.db import models

class Post(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    published = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
```

### 2. Миграции

После создания или изменения моделей необходимо создать и применить миграции:

```bash
python manage.py makemigrations
python manage.py migrate
```

### 3. Работа с данными

Django предоставляет удобный API для работы с данными:

- **Создание записи:**
  ```python
  post = Post.objects.create(title="Первая статья", content="Текст статьи")
  ```
- **Получение всех записей:**
  ```python
  posts = Post.objects.all()
  ```
- **Фильтрация:**
  ```python
  recent_posts = Post.objects.filter(published__year=2024)
  ```
- **Обновление:**
  ```python
  post.title = "Новое название"
  post.save()
  ```
- **Удаление:**
  ```python
  post.delete()
  ```

### 4. Админка

Django автоматически создаёт административный интерфейс. Для этого зарегистрируйте модель в `admin.py`:

```python
from django.contrib import admin
from .models import Post

admin.site.register(Post)
```

Теперь вы сможете управлять записями через веб-интерфейс `/admin`.

## Заключение

Django значительно упрощает разработку сайтов, предоставляя мощные инструменты для работы с базой данных и чёткую структуру проекта. Освоив основы, вы сможете быстро создавать и развивать собственные веб-приложения. 