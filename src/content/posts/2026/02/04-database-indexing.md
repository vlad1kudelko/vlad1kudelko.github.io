---
title: "Индексация баз данных"
description: "Индексы в PostgreSQL и MySQL: B-tree, Hash, GIN, оптимизация запросов"
heroImage: "../../../../assets/imgs/2026/02/04-database-indexing.webp"
pubDate: "2026-02-04"
---

Правильная индексация критически важна для производительности.

```sql
-- B-tree индекс (по умолчанию)
CREATE INDEX idx_users_email ON users(email);

-- Составной индекс
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);

-- Partial индекс
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';

-- GIN индекс для JSON
CREATE INDEX idx_data ON items USING GIN(data);

-- Проверка использования индексов
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'test@test.com';
```