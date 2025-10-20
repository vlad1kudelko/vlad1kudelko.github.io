+++
lang = "ru"
title = "Django REST Framework: создание API"
description = "Подробное руководство по созданию REST API с использованием Django REST Framework: сериализаторы, представления, аутентификация и документация API."
template = "posts"
thumb = "/imgs/2025/07/django-rest-framework-api-guide.webp"
publication_date = "2025-07-01"
+++

# Django REST Framework: создание API

**Django REST Framework (DRF)** — это мощная библиотека для создания REST API на основе Django. Она предоставляет набор инструментов для быстрой разработки веб-API, включая сериализацию данных, аутентификацию, документацию и многое другое. В этой статье мы рассмотрим основы создания API с помощью DRF.

## Установка и настройка

Первым шагом к созданию API с помощью Django REST Framework является установка библиотеки. DRF не входит в стандартную установку Django, поэтому его нужно установить отдельно:

```bash
pip install djangorestframework
```

После установки необходимо добавить `rest_framework` в список установленных приложений Django. Это позволит Django распознать DRF и использовать его компоненты:

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',  # Добавьте эту строку
    'your_app_name',
]
```

**Важно:** Замените `'your_app_name'` на реальное имя вашего приложения. Если у вас ещё нет приложения, создайте его командой `python manage.py startapp your_app_name`.

## Создание моделей

Модели в Django REST Framework работают точно так же, как и в обычном Django. Они определяют структуру данных, которые будут передаваться через API. Давайте создадим простую модель для статей:

```python
# models.py
from django.db import models

class Article(models.Model):
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_published = models.BooleanField(default=False)

    def __str__(self):
        return self.title

    class Meta:
        ordering = ['-created_at']
```

**Объяснение полей модели:**
- `title` — заголовок статьи с ограничением в 200 символов
- `content` — содержимое статьи без ограничений по длине
- `author` — имя автора статьи
- `created_at` — дата создания (автоматически заполняется при создании записи)
- `updated_at` — дата последнего обновления (автоматически обновляется при каждом сохранении)
- `is_published` — флаг публикации статьи

**Метод `__str__`** используется для отображения объекта в административной панели Django и в отладочных сообщениях.

**Класс `Meta`** с `ordering` автоматически сортирует статьи по дате создания в обратном порядке (новые сначала).

После создания модели не забудьте выполнить миграции:
```bash
python manage.py makemigrations
python manage.py migrate
```

## Сериализаторы

Сериализаторы — это ключевой компонент Django REST Framework. Они отвечают за преобразование сложных типов данных Django (модели, QuerySets) в простые типы данных (словари, списки), которые можно легко сериализовать в JSON, XML или другие форматы. Также они выполняют валидацию данных и обратное преобразование.

Создайте файл `serializers.py` в вашем приложении:

```python
# serializers.py
from rest_framework import serializers
from .models import Article

class ArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = ['id', 'title', 'content', 'author', 'created_at', 'updated_at', 'is_published']
        read_only_fields = ['created_at', 'updated_at']

# Сериализатор для создания статей (без некоторых полей)
class ArticleCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = ['title', 'content', 'author', 'is_published']
```

**Объяснение сериализаторов:**

**`ArticleSerializer`** — основной сериализатор для полного представления статьи:
- `fields` — список полей, которые будут включены в API ответ
- `read_only_fields` — поля, которые можно только читать, но нельзя изменять через API (автоматически заполняются Django)

**`ArticleCreateSerializer`** — специализированный сериализатор для создания новых статей:
- Не включает поля `id`, `created_at`, `updated_at`, так как они генерируются автоматически
- Используется только для операций создания (POST запросы)

**Преимущества использования разных сериализаторов:**
- Безопасность — контроль над тем, какие поля можно изменять
- Гибкость — разные представления для разных операций
- Валидация — специфичные правила для создания и обновления

## Представления (Views)

Представления в Django REST Framework определяют, как обрабатывать HTTP запросы и возвращать ответы. DRF предоставляет несколько типов представлений, каждый из которых подходит для разных сценариев использования.

### 1. APIView

`APIView` — это базовый класс для создания представлений API. Он похож на обычные Django views, но специально адаптирован для работы с REST API. Этот подход даёт максимальную гибкость, но требует написания большего количества кода.

```python
# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Article
from .serializers import ArticleSerializer

class ArticleListAPIView(APIView):
    def get(self, request):
        articles = Article.objects.all()
        serializer = ArticleSerializer(articles, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ArticleSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ArticleDetailAPIView(APIView):
    def get_object(self, pk):
        try:
            return Article.objects.get(pk=pk)
        except Article.DoesNotExist:
            return None

    def get(self, request, pk):
        article = self.get_object(pk)
        if article is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = ArticleSerializer(article)
        return Response(serializer.data)

    def put(self, request, pk):
        article = self.get_object(pk)
        if article is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = ArticleSerializer(article, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        article = self.get_object(pk)
        if article is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        article.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
```

**Объяснение методов APIView:**

**`ArticleListAPIView`** — обрабатывает запросы к списку статей:
- `get()` — возвращает список всех статей (GET /articles/)
- `post()` — создаёт новую статью (POST /articles/)

**`ArticleDetailAPIView`** — обрабатывает запросы к конкретной статье:
- `get_object()` — вспомогательный метод для получения статьи по ID
- `get()` — возвращает конкретную статью (GET /articles/1/)
- `put()` — обновляет статью (PUT /articles/1/)
- `delete()` — удаляет статью (DELETE /articles/1/)

**Коды состояния HTTP:**
- `201_CREATED` — ресурс успешно создан
- `400_BAD_REQUEST` — ошибка в данных запроса
- `404_NOT_FOUND` — ресурс не найден
- `204_NO_CONTENT` — ресурс успешно удалён

### 2. ViewSets (рекомендуемый подход)

`ViewSets` — это более высокоуровневый подход, который объединяет логику для набора связанных представлений в один класс. Это значительно сокращает количество кода и делает API более консистентным.

`ModelViewSet` — самый популярный тип ViewSet, который автоматически предоставляет все CRUD операции (Create, Read, Update, Delete) для модели.

```python
# views.py
from rest_framework import viewsets
from .models import Article
from .serializers import ArticleSerializer

class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer
    filterset_fields = ['author', 'is_published']
    search_fields = ['title', 'content']
    ordering_fields = ['created_at', 'title']
```

**Объяснение атрибутов ViewSet:**

- `queryset` — определяет набор объектов, с которыми работает ViewSet
- `serializer_class` — указывает, какой сериализатор использовать
- `filterset_fields` — поля, по которым можно фильтровать результаты
- `search_fields` — поля, по которым можно выполнять поиск
- `ordering_fields` — поля, по которым можно сортировать результаты

**Автоматически создаваемые эндпоинты:**
- `GET /articles/` — список всех статей
- `POST /articles/` — создание новой статьи
- `GET /articles/{id}/` — получение конкретной статьи
- `PUT /articles/{id}/` — полное обновление статьи
- `PATCH /articles/{id}/` — частичное обновление статьи
- `DELETE /articles/{id}/` — удаление статьи

**Преимущества ViewSets:**
- Меньше кода — одна строка вместо десятков
- Автоматическая документация — DRF генерирует полную документацию API
- Консистентность — все эндпоинты следуют одним и тем же правилам
- Расширяемость — легко добавить кастомную логику

## URL-маршрутизация

URL-маршрутизация в Django REST Framework зависит от типа используемых представлений. Для APIView нужно явно определять каждый маршрут, а для ViewSets DRF предоставляет автоматическую маршрутизацию через роутеры.

### Для APIView:

При использовании APIView необходимо вручную определить каждый URL-маршрут. Это даёт полный контроль над структурой URL, но требует больше кода:

```python
# urls.py
from django.urls import path
from .views import ArticleListAPIView, ArticleDetailAPIView

urlpatterns = [
    path('articles/', ArticleListAPIView.as_view(), name='article-list'),
    path('articles/<int:pk>/', ArticleDetailAPIView.as_view(), name='article-detail'),
]
```

**Объяснение маршрутов:**
- `articles/` — обрабатывает запросы к списку статей (GET, POST)
- `articles/<int:pk>/` — обрабатывает запросы к конкретной статье (GET, PUT, DELETE)
- `<int:pk>` — параметр пути, который будет передан в представление как `pk`

### Для ViewSets:

ViewSets используют роутеры для автоматической генерации URL-маршрутов. Это значительно упрощает настройку и обеспечивает консистентность:

```python
# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ArticleViewSet

router = DefaultRouter()
router.register(r'articles', ArticleViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]
```

**Объяснение роутера:**

`DefaultRouter` автоматически создаёт следующие маршруты:
- `articles/` — список и создание (GET, POST)
- `articles/{id}/` — детали, обновление, удаление (GET, PUT, PATCH, DELETE)
- `articles/{id}/` — дополнительные действия (если определены)

**Преимущества роутеров:**
- Автоматическая генерация URL — не нужно писать маршруты вручную
- Консистентность — все ViewSets следуют одной структуре URL
- Документация — роутер автоматически генерирует документацию API
- Расширяемость — легко добавить кастомные действия

**Включение в основной urls.py проекта:**
```python
# mysite/urls.py
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('your_app.urls')),  # Подключение API маршрутов
]
```

## Аутентификация и разрешения

Безопасность API — критически важный аспект разработки. Django REST Framework предоставляет мощные инструменты для аутентификации пользователей и контроля доступа к ресурсам.

### Настройка аутентификации

DRF поддерживает несколько типов аутентификации. Настройте их в `settings.py`:

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10
}
```

**Объяснение типов аутентификации:**

- **SessionAuthentication** — использует сессии Django (подходит для веб-приложений)
- **TokenAuthentication** — использует токены (подходит для мобильных приложений и SPA)
- **BasicAuthentication** — HTTP Basic Auth (не рекомендуется для продакшена)
- **OAuth2Authentication** — OAuth 2.0 (для интеграции с внешними сервисами)

**Объяснение разрешений по умолчанию:**

- **IsAuthenticatedOrReadOnly** — чтение доступно всем, создание/изменение только авторизованным
- **IsAuthenticated** — все операции требуют авторизации
- **AllowAny** — доступ без ограничений (не рекомендуется для продакшена)
- **IsAdminUser** — доступ только администраторам

### Применение разрешений в представлениях

Вы можете переопределить разрешения для конкретных представлений:

```python
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly

class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]  # Чтение всем, создание авторизованным
```

**Доступные классы разрешений:**

- `IsAuthenticated` — требует авторизации для всех операций
- `IsAuthenticatedOrReadOnly` — чтение всем, запись авторизованным
- `IsAdminUser` — доступ только администраторам
- `AllowAny` — доступ без ограничений
- `DjangoModelPermissions` — разрешения на основе модели Django
- `DjangoObjectPermissions` — разрешения на уровне объектов

**Пример с разными разрешениями для разных операций:**

```python
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated

class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def publish(self, request, pk=None):
        # Только авторизованные пользователи могут публиковать статьи
        article = self.get_object()
        article.is_published = True
        article.save()
        return Response({'status': 'article published'})
```

**Настройка токенов (для TokenAuthentication):**

```bash
python manage.py migrate  # Создаёт таблицу токенов
python manage.py shell
```

```python
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

user = User.objects.get(username='your_username')
token = Token.objects.create(user=user)
print(token.key)  # Используйте этот токен в заголовке Authorization
```

## Фильтрация и поиск

Современные API должны предоставлять возможности для фильтрации, поиска и сортировки данных. Django REST Framework предлагает мощные инструменты для этого, а библиотека `django-filter` расширяет эти возможности.

### Установка и настройка фильтров

Сначала установите `django-filter` для расширенной фильтрации:

```bash
pip install django-filter
```

Затем добавьте настройки в `settings.py`:

```python
# settings.py
INSTALLED_APPS = [
    # ...
    'django_filters',
]

REST_FRAMEWORK = {
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
}
```

**Объяснение фильтр-бэкендов:**

- **DjangoFilterBackend** — точная фильтрация по полям модели
- **SearchFilter** — полнотекстовый поиск по указанным полям
- **OrderingFilter** — сортировка результатов по полям

### Использование фильтров в ViewSet

```python
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['author', 'is_published', 'created_at']
    search_fields = ['title', 'content']
    ordering_fields = ['created_at', 'title', 'author']
    ordering = ['-created_at']  # Сортировка по умолчанию
```

**Примеры использования фильтров:**

- **Фильтрация:** `GET /api/articles/?author=John&is_published=true`
- **Поиск:** `GET /api/articles/?search=django`
- **Сортировка:** `GET /api/articles/?ordering=-created_at`
- **Комбинирование:** `GET /api/articles/?author=John&search=api&ordering=title`

### Создание кастомных фильтров

Для сложной фильтрации создайте кастомный фильтр:

```python
# filters.py
import django_filters
from .models import Article

class ArticleFilter(django_filters.FilterSet):
    title = django_filters.CharFilter(lookup_expr='icontains')
    content = django_filters.CharFilter(lookup_expr='icontains')
    created_after = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')

    class Meta:
        model = Article
        fields = ['author', 'is_published']

# views.py
class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer
    filterset_class = ArticleFilter
```

**Возможности кастомных фильтров:**

- `icontains` — поиск без учёта регистра
- `gte` — больше или равно
- `lte` — меньше или равно
- `exact` — точное совпадение
- `in` — значение из списка
- `range` — диапазон значений

### Пагинация

Для больших наборов данных используйте пагинацию:

```python
# settings.py
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10
}
```

**Примеры запросов с пагинацией:**

- `GET /api/articles/?page=1` — первая страница
- `GET /api/articles/?page=2&page_size=20` — вторая страница с 20 элементами

**Альтернативные типы пагинации:**

- `LimitOffsetPagination` — `GET /api/articles/?limit=10&offset=20`
- `CursorPagination` — для больших наборов данных с курсором

## Документация API

Одним из главных преимуществ Django REST Framework является автоматическая генерация интерактивной документации API. Это значительно упрощает разработку и тестирование API, а также облегчает работу с ним для других разработчиков.

### Базовая документация

DRF предоставляет встроенную документацию, которую можно легко подключить:

```python
from rest_framework.documentation import include_docs_urls

urlpatterns = [
    # ... ваши URL-паттерны
    path('docs/', include_docs_urls(title='My API')),
]
```

После этого документация будет доступна по адресу `/docs/` и будет включать:
- Список всех доступных эндпоинтов
- Описание методов HTTP для каждого эндпоинта
- Схемы запросов и ответов
- Интерактивную форму для тестирования API

### Улучшение документации

Для более подробной документации используйте docstrings в ваших ViewSets:

```python
class ArticleViewSet(viewsets.ModelViewSet):
    """
    ViewSet для работы со статьями.
    
    list:
        Возвращает список всех статей с возможностью фильтрации и поиска.
        
    create:
        Создаёт новую статью. Требует авторизации.
        
    retrieve:
        Возвращает детальную информацию о конкретной статье.
        
    update:
        Обновляет статью полностью. Требует авторизации.
        
    partial_update:
        Обновляет статью частично. Требует авторизации.
        
    destroy:
        Удаляет статью. Требует авторизации.
    """
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
```

### Использование drf-spectacular

Для более продвинутой документации в стиле OpenAPI/Swagger установите `drf-spectacular`:

```bash
pip install drf-spectacular
```

```python
# settings.py
INSTALLED_APPS = [
    # ...
    'drf_spectacular',
]

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'My API',
    'DESCRIPTION': 'Описание моего API',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

# urls.py
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    # ... ваши URL-паттерны
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]
```

**Преимущества drf-spectacular:**

- Генерация OpenAPI 3.0 схемы
- Красивый Swagger UI интерфейс
- Поддержка ReDoc для альтернативного отображения
- Автоматическое определение типов данных
- Поддержка кастомных полей и валидаторов

### Документирование сериализаторов

Добавляйте описания к полям сериализаторов:

```python
class ArticleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = ['id', 'title', 'content', 'author', 'created_at', 'updated_at', 'is_published']
        read_only_fields = ['created_at', 'updated_at']
        extra_kwargs = {
            'title': {'help_text': 'Заголовок статьи (максимум 200 символов)'},
            'content': {'help_text': 'Содержимое статьи'},
            'author': {'help_text': 'Имя автора статьи'},
            'is_published': {'help_text': 'Флаг публикации статьи'},
        }
```

### Примеры запросов и ответов

Добавляйте примеры в документацию:

```python
from drf_spectacular.utils import extend_schema, OpenApiExample

@extend_schema(
    examples=[
        OpenApiExample(
            'Valid example',
            summary='Пример создания статьи',
            description='Пример валидного запроса для создания статьи',
            value={
                'title': 'Моя первая статья',
                'content': 'Содержимое статьи...',
                'author': 'Иван Иванов',
                'is_published': True
            },
            request_only=True,
        ),
    ]
)
class ArticleViewSet(viewsets.ModelViewSet):
    # ... ваш код
```

## Пример полного API

Теперь давайте рассмотрим пример полного API для блога, который демонстрирует все изученные концепции в действии. Этот пример покажет, как создать связанные модели, сериализаторы и представления.

### Модели данных

Создадим модели для блога с категориями и постами:

```python
# models.py
from django.contrib.auth.models import User
from django.db import models

class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)

    def __str__(self):
        return self.name

class Post(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_published = models.BooleanField(default=False)

    def __str__(self):
        return self.title
```

**Объяснение моделей:**

- **Category** — модель для категорий постов с уникальным slug
- **Post** — модель для постов с связями к пользователю и категории
- **ForeignKey** — создаёт связь многие-к-одному между постами и авторами/категориями
- **SlugField** — URL-дружественные идентификаторы для SEO

### Сериализаторы

Создадим сериализаторы для обеих моделей:

```python
# serializers.py
from rest_framework import serializers
from .models import Category, Post

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class PostSerializer(serializers.ModelSerializer):
    author = serializers.ReadOnlyField(source='author.username')
    category_name = serializers.ReadOnlyField(source='category.name')

    class Meta:
        model = Post
        fields = ['id', 'title', 'slug', 'content', 'author', 'category', 
                 'category_name', 'created_at', 'updated_at', 'is_published']
        read_only_fields = ['created_at', 'updated_at']
```

**Объяснение сериализаторов:**

- **CategorySerializer** — простой сериализатор для категорий
- **PostSerializer** — расширенный сериализатор с дополнительными полями:
  - `author` — показывает имя пользователя вместо ID
  - `category_name` — показывает название категории вместо ID
  - `read_only_fields` — поля, которые нельзя изменять через API

### Представления

Создадим ViewSets для обработки запросов:

```python
# views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from .models import Category, Post
from .serializers import CategorySerializer, PostSerializer

class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer

class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filterset_fields = ['category', 'author', 'is_published']
    search_fields = ['title', 'content']
    ordering_fields = ['created_at', 'title']

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
```

**Объяснение ViewSets:**

- **CategoryViewSet** — только для чтения (ReadOnlyModelViewSet), так как категории обычно создаются администратором
- **PostViewSet** — полный CRUD с дополнительными возможностями:
  - Фильтрация по категории, автору и статусу публикации
  - Поиск по заголовку и содержимому
  - Сортировка по дате создания и заголовку
  - `perform_create` — автоматически устанавливает автора поста

### URL-маршрутизация

Настроим маршруты для API:

```python
# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategoryViewSet, PostViewSet

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'posts', PostViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]
```

**Созданные эндпоинты:**

- `GET /api/categories/` — список всех категорий
- `GET /api/categories/{id}/` — детали категории
- `GET /api/posts/` — список всех постов
- `POST /api/posts/` — создание нового поста
- `GET /api/posts/{id}/` — детали поста
- `PUT /api/posts/{id}/` — обновление поста
- `DELETE /api/posts/{id}/` — удаление поста

### Примеры использования API

**Получение всех постов:**
```bash
GET /api/posts/
```

**Создание нового поста:**
```bash
POST /api/posts/
Content-Type: application/json

{
    "title": "Мой первый пост",
    "slug": "moy-pervyy-post",
    "content": "Содержимое поста...",
    "category": 1,
    "is_published": true
}
```

**Фильтрация постов:**
```bash
GET /api/posts/?category=1&is_published=true
```

**Поиск постов:**
```bash
GET /api/posts/?search=django
```

**Сортировка постов:**
```bash
GET /api/posts/?ordering=-created_at
```

## Тестирование API

Тестирование — важная часть разработки API. Django REST Framework предоставляет специальные инструменты для тестирования API, которые упрощают написание unit-тестов и интеграционных тестов.

### Базовое тестирование API

DRF предоставляет класс `APITestCase`, который расширяет стандартный `TestCase` Django дополнительными возможностями для тестирования API:

```python
# tests.py
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth.models import User
from .models import Article

class ArticleAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.article = Article.objects.create(
            title='Test Article',
            content='Test content',
            author='Test Author'
        )

    def test_get_articles(self):
        response = self.client.get('/api/articles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_article(self):
        self.client.force_authenticate(user=self.user)
        data = {
            'title': 'New Article',
            'content': 'New content',
            'author': 'New Author'
        }
        response = self.client.post('/api/articles/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
```

**Объяснение тестов:**

- **setUp** — создаёт тестовые данные перед каждым тестом
- **test_get_articles** — проверяет получение списка статей
- **test_create_article** — проверяет создание новой статьи с авторизацией
- **force_authenticate** — эмулирует авторизованного пользователя

### Расширенное тестирование

Добавим больше тестов для покрытия всех операций API:

```python
class ArticleAPITestCase(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.article = Article.objects.create(
            title='Test Article',
            content='Test content',
            author='Test Author'
        )

    def test_get_articles_list(self):
        """Тест получения списка статей"""
        response = self.client.get('/api/articles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)  # С пагинацией
        self.assertEqual(response.data['results'][0]['title'], 'Test Article')

    def test_get_article_detail(self):
        """Тест получения конкретной статьи"""
        response = self.client.get(f'/api/articles/{self.article.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Test Article')

    def test_create_article_authenticated(self):
        """Тест создания статьи авторизованным пользователем"""
        self.client.force_authenticate(user=self.user)
        data = {
            'title': 'New Article',
            'content': 'New content',
            'author': 'New Author'
        }
        response = self.client.post('/api/articles/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Article.objects.count(), 2)

    def test_create_article_unauthenticated(self):
        """Тест создания статьи неавторизованным пользователем"""
        data = {
            'title': 'New Article',
            'content': 'New content',
            'author': 'New Author'
        }
        response = self.client.post('/api/articles/', data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_article(self):
        """Тест обновления статьи"""
        self.client.force_authenticate(user=self.user)
        data = {'title': 'Updated Article'}
        response = self.client.patch(f'/api/articles/{self.article.id}/', data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Updated Article')

    def test_delete_article(self):
        """Тест удаления статьи"""
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f'/api/articles/{self.article.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Article.objects.count(), 0)

    def test_filter_articles(self):
        """Тест фильтрации статей"""
        response = self.client.get('/api/articles/?author=Test Author')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)

    def test_search_articles(self):
        """Тест поиска статей"""
        response = self.client.get('/api/articles/?search=Test')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
```

### Тестирование с использованием фабрик

Для более сложных тестов используйте библиотеку `factory_boy`:

```bash
pip install factory-boy
```

```python
# factories.py
import factory
from django.contrib.auth.models import User
from .models import Article

class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f'user{n}')
    email = factory.LazyAttribute(lambda obj: f'{obj.username}@example.com')

class ArticleFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Article

    title = factory.Faker('sentence')
    content = factory.Faker('paragraph')
    author = factory.Faker('name')
    is_published = factory.Faker('boolean')

# tests.py
class ArticleAPITestCase(APITestCase):
    def setUp(self):
        self.user = UserFactory()
        self.articles = ArticleFactory.create_batch(5)

    def test_get_articles_with_pagination(self):
        response = self.client.get('/api/articles/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('count', response.data)
        self.assertIn('results', response.data)
        self.assertEqual(response.data['count'], 5)
```

### Запуск тестов

Запустите тесты с помощью стандартной команды Django:

```bash
python manage.py test your_app.tests
```

**Полезные флаги для тестирования:**

- `--verbosity=2` — подробный вывод
- `--keepdb` — сохранить тестовую базу данных между запусками
- `--parallel` — параллельное выполнение тестов
- `--failfast` — остановиться при первой ошибке

### Тестирование производительности

Для тестирования производительности API используйте `django-debug-toolbar` и профилирование:

```python
from django.test import override_settings

@override_settings(DEBUG=True)
class ArticlePerformanceTestCase(APITestCase):
    def test_articles_list_performance(self):
        # Создаём много статей для тестирования
        ArticleFactory.create_batch(100)
        
        with self.assertNumQueries(3):  # Проверяем количество SQL запросов
            response = self.client.get('/api/articles/')
            self.assertEqual(response.status_code, status.HTTP_200_OK)
```

## Заключение

Django REST Framework предоставляет мощные инструменты для создания профессиональных API. Основные преимущества:

- **Быстрая разработка** — готовые классы для типовых операций
- **Гибкость** — возможность настройки под любые требования
- **Безопасность** — встроенные механизмы аутентификации и авторизации
- **Документация** — автоматическая генерация API документации
- **Тестирование** — удобные инструменты для тестирования

Начните с простых ViewSets, постепенно добавляйте фильтрацию, аутентификацию и другие возможности. DRF значительно упрощает создание REST API и позволяет сосредоточиться на бизнес-логике вашего приложения. 
