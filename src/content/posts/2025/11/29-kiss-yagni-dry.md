---
title: "KISS, YAGNI, DRY: практическое применение"
description: "Принципы KISS, YAGNI, DRY в разработке. Как не переусложнять код и писать проще."
heroImage: "../../../../assets/imgs/2025/11/29-kiss-yagni-dry.webp"
pubDate: "2025-11-29"
---

# KISS, YAGNI, DRY: практическое применение

Три важнейших принципа разработки, которые помогают избежать переусложнения кода.

## KISS — Keep It Simple, Stupid

Простота — признак мастерства. Сложный код сложнее поддерживать и легче сломать.

### Пример

```python
# Сложно
def get_status(user):
    if user is not None:
        if user.is_active:
            if user.has_subscription:
                if user.subscription.is_valid:
                    return "active_subscriber"
                else:
                    return "expired_subscriber"
            else:
                return "free_user"
        else:
            return "inactive_user"
    else:
        return "guest"

# Просто (KISS)
def get_status(user):
    if user is None:
        return "guest"
    if not user.is_active:
        return "inactive_user"
    if not user.has_subscription:
        return "free_user"
    return "active_subscriber" if user.subscription.is_valid else "expired_subscriber"
```

### Когда усложнение оправдано

- Решение реальной проблемы производительности
- Улучшение читаемости для команды
- Решение известной задачи более эффективно

## YAGNI — You Aren't Gonna Need It

Не добавляй функциональность, которая может понадобиться в будущем. Это приводит к:
- Неиспользуемому коду
- Усложнению рефакторинга
- Путанице для новых разработчиков

### Антипаттерн YAGNI

```python
# Плохо: добавление "на будущее"
class UserService:
    def __init__(self):
        self.db = Database()
        self.cache = RedisCache()  # Пока не используется
        self.notification_service = NotificationService()  # Не нужен
        self.analytics = Analytics()  # Запланировано на v2
    
    def create_user(self, email, password):
        # Просто создаём пользователя
        user = self.db.create(email, password)
        return user
```

### Правильный подход

```python
# Хорошо: добавляем только когда нужно
class UserService:
    def __init__(self):
        self.db = Database()
    
    def create_user(self, email, password):
        user = self.db.create(email, password)
        return user

# Позже, когда понадобится кеширование:
class UserService:
    def __init__(self, cache: Cache = None):
        self.db = Database()
        self.cache = cache
    
    def get_user(self, user_id):
        if self.cache:
            cached = self.cache.get(f"user:{user_id}")
            if cached:
                return cached
        user = self.db.get(user_id)
        if self.cache and user:
            self.cache.set(f"user:{user_id}", user)
        return user
```

## DRY — Don't Repeat Yourself

Избегай дублирования кода. Выноси общую логику в функции, классы, модули.

### Антипаттерн DRY

```python
# Плохо: дублирование
def create_user_form(request):
    name = request.POST.get("name")
    email = request.POST.get("email")
    # Валидация
    if not name:
        return {"error": "Name required"}
    if len(name) < 2:
        return {"error": "Name too short"}
    if not email or "@" not in email:
        return {"error": "Invalid email"}
    # ... сохранение

def update_user_form(request):
    name = request.POST.get("name")
    email = request.POST.get("email")
    # Та же валидация!
    if not name:
        return {"error": "Name required"}
    if len(name) < 2:
        return {"error": "Name too short"}
    if not email or "@" not in email:
        return {"error": "Invalid email"}
    # ... обновление
```

### Правильный подход

```python
# Хорошо: вынос общей логики
def validate_user_data(data: dict) -> dict | None:
    errors = {}
    name = data.get("name")
    email = data.get("email")
    
    if not name:
        errors["name"] = "Name required"
    elif len(name) < 2:
        errors["name"] = "Name too short"
    
    if not email or "@" not in email:
        errors["email"] = "Invalid email"
    
    return errors if errors else None

def create_user_form(request):
    errors = validate_user_data(request.POST)
    if errors:
        return {"error": errors}
    # ... сохранение

def update_user_form(request):
    errors = validate_user_data(request.POST)
    if errors:
        return {"error": errors}
    # ... обновление
```

## Баланс между принципами

### Когда DRY может навредить

```python
# Излишнее обобщение
class EntityValidator:
    @staticmethod
    def validate_user(data): ...
    @staticmethod
    def validate_product(data): ...
    @staticmethod
    def validate_order(data): ...
    # 50 методов для разных сущностей

# Лучше: отдельные классы с общим базовым
class BaseValidator:
    def validate_required(self, data, fields): ...
    def validate_email(self, email): ...

class UserValidator(BaseValidator):
    pass

class ProductValidator(BaseValidator):
    pass
```

## Практические рекомендации

1. **Сначала просто** — начни с простого решения
2. **Рефакторинг потом** — заметил дублирование — вынеси
3. **Не переусердствуй** — абстракция ради абстракции — зло
4. **Думай о команде** — код должен быть понятен другим

## Заключение

Эти принципы работают вместе:

- **KISS** — пиши проще
- **YAGNI** — не добавляй лишнего
- **DRY** — не повторяйся

Следование этим принципам делает код чище, проще в поддержке и экономит время.