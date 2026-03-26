---
title: "REST API Design: лучшие практики"
description: "Проектирование RESTful API: ресурсы, методы, статус коды, версионирование"
heroImage: "../../../../assets/imgs/2026/02/01-rest-api-design.webp"
pubDate: "2026-02-01"
---

REST — стандарт для проектирования веб-сервисов.

```yaml
# API Design
/users
  GET    # Список пользователей
  POST   # Создание пользователя

/users/{id}
  GET    # Получить пользователя
  PUT    # Обновить полностью
  PATCH  # Частичное обновление
  DELETE # Удалить

/users/{id}/posts
  GET    # Posts пользователя
```

## Status Codes

- `200 OK` — успех
- `201 Created` — создан
- `204 No Content` — успех без тела
- `400 Bad Request` — ошибка клиента
- `401 Unauthorized` — не авторизован
- `403 Forbidden` — нет доступа
- `404 Not Found` — не найден
- `500 Internal Server Error` — ошибка сервера