+++
lang = "ru"
title = "Django: Аутентификация и авторизация"
description = "Руководство по аутентификации и авторизации пользователей в Django: базовые механизмы, настройка, примеры кода."
template = "posts"
thumb = "/imgs/django-authentication-authorization.png"
publication_date = "2025-07-03"
+++

# Django: Аутентификация и авторизация

Аутентификация и авторизация — ключевые аспекты безопасности любого веб-приложения. Django предоставляет мощные инструменты для управления пользователями, их правами и доступом к различным частям сайта.

## Основные понятия

- **Аутентификация** — процесс проверки личности пользователя (логин/пароль).
- **Авторизация** — предоставление пользователю определённых прав доступа после аутентификации.

## Встроенная система пользователей

Django по умолчанию включает приложение `django.contrib.auth`, которое обеспечивает:
- хранение пользователей и паролей,
- группы и права (permissions),
- формы для входа/выхода,
- декораторы и миксины для ограничения доступа.

## Создание пользователя

Пользователей можно создавать через админку или программно:
```python
from django.contrib.auth.models import User
user = User.objects.create_user(username='ivan', password='mypassword')
```

## Аутентификация пользователя

Для входа используйте функцию `authenticate` и `login`:
```python
from django.contrib.auth import authenticate, login

def my_view(request):
    user = authenticate(request, username='ivan', password='mypassword')
    if user is not None:
        login(request, user)
        # Успешный вход
    else:
        # Ошибка аутентификации
```

## Ограничение доступа

### Декоратор @login_required

Ограничить доступ к представлению можно с помощью декоратора:
```python
from django.contrib.auth.decorators import login_required

@login_required
def profile(request):
    ...
```

### Проверка прав

Для проверки наличия у пользователя определённого права:
```python
if request.user.has_perm('app_label.permission_codename'):
    # Доступ разрешён
```

### Ограничение по группам

```python
if request.user.groups.filter(name='managers').exists():
    # Пользователь в группе managers
```

## Выход пользователя

```python
from django.contrib.auth import logout

def logout_view(request):
    logout(request)
    # Перенаправление на главную
```

## Кастомная модель пользователя

Если стандартной модели недостаточно, создайте свою:
```python
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    phone = models.CharField(max_length=20, blank=True)
```
И укажите её в настройках:
```python
# settings.py
AUTH_USER_MODEL = 'myapp.CustomUser'
```

## Заключение

Django делает аутентификацию и авторизацию максимально простой и гибкой. Используйте встроенные механизмы для защиты вашего приложения и расширяйте их при необходимости. 