+++
lang = "ru"
title = "Django REST Framework: создание API"
description = "Подробное руководство по созданию REST API с использованием Django REST Framework: сериализаторы, представления, аутентификация и документация API."
template = "posts"
thumb = "/imgs/django-rest-framework-api-guide.jpg"
publication_date = "2025-07-01"
+++

# Django REST Framework: создание API

**Django REST Framework (DRF)** — это мощная библиотека для создания REST API на основе Django. Она предоставляет набор инструментов для быстрой разработки веб-API, включая сериализацию данных, аутентификацию, документацию и многое другое. В этой статье мы рассмотрим основы создания API с помощью DRF.

## Установка и настройка

Сначала установите Django REST Framework:

```bash
pip install djangorestframework
```

Добавьте `rest_framework` в `INSTALLED_APPS` в файле `settings.py`:

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

## Создание моделей

Начнём с создания простой модели для нашего API:

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

## Сериализаторы

Сериализаторы преобразуют модели Django в JSON и обратно. Создайте файл `serializers.py`:

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

## Представления (Views)

DRF предоставляет несколько типов представлений. Рассмотрим основные:

### 1. APIView

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

### 2. ViewSets (рекомендуемый подход)

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

## URL-маршрутизация

### Для APIView:

```python
# urls.py
from django.urls import path
from .views import ArticleListAPIView, ArticleDetailAPIView

urlpatterns = [
    path('articles/', ArticleListAPIView.as_view(), name='article-list'),
    path('articles/<int:pk>/', ArticleDetailAPIView.as_view(), name='article-detail'),
]
```

### Для ViewSets:

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

## Аутентификация и разрешения

DRF предоставляет различные способы аутентификации:

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

### Применение разрешений в представлениях:

```python
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly

class ArticleViewSet(viewsets.ModelViewSet):
    queryset = Article.objects.all()
    serializer_class = ArticleSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]  # Чтение всем, создание авторизованным
```

## Фильтрация и поиск

Установите `django-filter` для расширенной фильтрации:

```bash
pip install django-filter
```

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

## Документация API

DRF автоматически генерирует интерактивную документацию. Добавьте в `urls.py`:

```python
from rest_framework.documentation import include_docs_urls

urlpatterns = [
    # ... ваши URL-паттерны
    path('docs/', include_docs_urls(title='My API')),
]
```

## Пример полного API

Вот пример полного API для блога:

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

## Тестирование API

Создайте тесты для вашего API:

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

## Заключение

Django REST Framework предоставляет мощные инструменты для создания профессиональных API. Основные преимущества:

- **Быстрая разработка** — готовые классы для типовых операций
- **Гибкость** — возможность настройки под любые требования
- **Безопасность** — встроенные механизмы аутентификации и авторизации
- **Документация** — автоматическая генерация API документации
- **Тестирование** — удобные инструменты для тестирования

Начните с простых ViewSets, постепенно добавляйте фильтрацию, аутентификацию и другие возможности. DRF значительно упрощает создание REST API и позволяет сосредоточиться на бизнес-логике вашего приложения. 