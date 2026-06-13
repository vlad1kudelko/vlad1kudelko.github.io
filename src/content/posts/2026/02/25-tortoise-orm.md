---
title: "Tortoise ORM: async ORM, Django-like для async"
description: "Используйте Tortoise ORM: async ORM, Django-like для async. Асинхронная работа с БД на Python эффективно."
pubDate: "2026-02-25"
---

# Tortoise ORM: async ORM

Если вы привыкли к Django ORM, но хотите писать async код без тяжести SQLAlchemy, Tortoise ORM создан именно для вас. Он берёт лучшее из Django (простой декларативный синтаксис, удобные менеджеры, автомиграции через Aerich) и делает всё это нативно асинхронным.

## Установка и настройка

```bash
pip install tortoise-orm asyncpg # для PostgreSQL
pip install tortoise-orm aiosqlite # для SQLite
```

Для миграций:
```bash
pip install aerich
```

## Определение моделей

Синтаксис намеренно похож на Django:

```python
from tortoise import fields
from tortoise.models import Model

class User(Model):
 id = fields. IntField(pk=True)
 username = fields. CharField(max_length=100, unique=True)
 email = fields. CharField(max_length=255, unique=True)
 password = fields. CharField(max_length=255)
 is_active = fields. BooleanField(default=True)
 created_at = fields. DatetimeField(auto_now_add=True)

 posts: fields. ReverseRelation['Post']

 class Meta:
 table = 'users'

 def __str__(self):
 return self.username

class Category(Model):
 id = fields. IntField(pk=True)
 name = fields. CharField(max_length=100)
 slug = fields. CharField(max_length=100, unique=True)

 posts: fields. ReverseRelation['Post']

class Post(Model):
 id = fields. IntField(pk=True)
 title = fields. CharField(max_length=200)
 content = fields. TextField()
 published = fields. BooleanField(default=False)
 created_at = fields. DatetimeField(auto_now_add=True)
 updated_at = fields. DatetimeField(auto_now=True)

 author = fields. ForeignKeyField('models. User', related_name='posts')
 category = fields. ForeignKeyField('models. Category', related_name='posts', null=True)
 tags = fields. ManyToManyField('models. Tag', related_name='posts')

class Tag(Model):
 id = fields. IntField(pk=True)
 name = fields. CharField(max_length=50)

 posts: fields. ManyToManyRelation['Post']
```

## Инициализация и подключение

```python
from tortoise import Tortoise

TORTOISE_ORM = {
 "connections": {
 "default": "postgres://user:pass@localhost:5432/mydb"
 },
 "apps": {
 "models": {
 "models": ["app.models", "aerich.models"],
 "default_connection": "default",
 }
 },
}

async def init():
 await Tortoise.init(config=TORTOISE_ORM)
 await Tortoise.generate_schemas() # только для разработки

async def close():
 await Tortoise.close_connections()
```

## CRUD операции

```python
# Создание
user = await User.create(
 username='alice',
 email='alice@example.com',
 password='hashed_password'
)

# Или через save()
user = User(username='bob', email='bob@example.com', password='hashed')
await user.save()

# Чтение
user = await User.get(id=1)
user = await User.get_or_none(username='alice')

# Фильтрация
active_users = await User.filter(is_active=True).order_by('-created_at').limit(10)

# Сложные фильтры
from tortoise.expressions import Q

users = await User.filter(
 Q(username__startswith='a') | Q(email__contains='gmail')
).all()

# Обновление
await User.filter(id=1).update(is_active=False)
# или
user = await User.get(id=1)
user.is_active = False
await user.save(update_fields=['is_active'])

# Удаление
await User.filter(id=1).delete()
```

## Связанные объекты

```python
# ForeignKey, загрузка через prefetch или select_related
post = await Post.get(id=1).prefetch_related('author', 'category')
print(post.author.username) # не делает лишний запрос

# Или через select_related (JOIN)
posts = await Post.all().select_related('author')

# ManyToMany
post = await Post.get(id=1).prefetch_related('tags')
tags = post.tags # RelationManager

# Добавление тегов
tag1 = await Tag.create(name='python')
tag2 = await Tag.create(name='async')
await post.tags.add(tag1, tag2)

# Фильтрация через связи (похоже на Django)
python_posts = await Post.filter(tags__name='python').distinct()
alice_posts = await Post.filter(author__username='alice').all()
```

## Аннотации и агрегации

```python
from tortoise.functions import Count, Avg

# Количество постов у каждого пользователя
users = await User.annotate(post_count=Count('posts')).order_by('-post_count')
for u in users:
 print(f"{u.username}: {u.post_count} posts")

# Подзапросы
from tortoise.expressions import Subquery
active_author_ids = User.filter(is_active=True).values('id')
posts = await Post.filter(author_id__in=Subquery(active_author_ids)).all()
```

## Интеграция с FastAPI

```python
from fastapi import FastAPI
from tortoise.contrib.fastapi import RegisterTortoise

app = FastAPI()

@app.on_event('startup')
async def startup():
 await RegisterTortoise(
 app,
 config=TORTOISE_ORM,
 generate_schemas=False,
 add_exception_handlers=True,
 )

@app.get('/posts')
async def list_posts():
 posts = await Post.filter(published=True)\
 .prefetch_related('author', 'tags')\
 .order_by('-created_at')\
 .limit(20)
 return posts

@app.post('/posts')
async def create_post(title: str, content: str, author_id: int):
 post = await Post.create(title=title, content=content, author_id=author_id)
 return post
```

## Миграции с Aerich

```bash
# Инициализация
aerich init -t app.config. TORTOISE_ORM
aerich init-db

# Создание миграции после изменения моделей
aerich migrate --name "add_category_to_posts"

# Применение
aerich upgrade

# Откат
aerich downgrade
```

## Tortoise vs SQLAlchemy

Главное различие не в возможностях, а в том, насколько много кода вам нужно написать для стандартной задачи. В Tortoise `Post.filter(author__username='alice')`, одна строка. В SQLAlchemy это `select(Post).join(User).where(User.username == 'alice')` плюс импорты. Для CRUD-приложений это ощутимо.

Tortoise проигрывает на нестандартных сценариях: сложные подзапросы, window functions, кастомные типы данных, здесь приходится опускаться до raw SQL. SQLAlchemy `text()` и Core API дают полный контроль над генерируемым SQL, что важно при оптимизации запросов.

Ещё один момент: Tortoise ORM пока не поддерживает Python 3.12+ аннотации в стиле `Mapped[str]`. Если проект долгосрочный и строгая типизация важна, SQLAlchemy 2.0 с `mapped_column` и `Mapped[T]` даёт значительно лучший опыт работы с type checkers.
