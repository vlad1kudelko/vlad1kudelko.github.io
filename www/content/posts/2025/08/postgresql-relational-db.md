+++
lang = "ru"
title = "PostgreSQL: реляционная БД"
description = "Полное руководство по PostgreSQL – популярной реляционной базе данных с открытым исходным кодом. В статье рассматриваются основные возможности, установка, базовые SQL‑операции, индексы, транзакции и лучшие практики."
template = "posts"
thumb = "/imgs/2025/08/postgresql-relational-db.png"
publication_date = "2025-08-29"
+++

# PostgreSQL: реляционная БД

## Что такое PostgreSQL

PostgreSQL – это объектно-реляционная система управления базами данных (ORDBMS), которая поддерживает расширенные типы данных, полнотекстовый поиск, геопространственные запросы и многое другое. Она известна своей стабильностью, расширяемостью и совместимостью с SQL‑стандартом.

## Ключевые особенности

- **ACID‑совместимость** – гарантирует целостность данных.
- **Расширяемость** – пользовательские типы, операторы, функции, индексы.
- **Поддержка JSON/JSONB** – гибкая работа с полуструктурированными данными.
- **Масштабируемость** – репликация, шардирование, партиционирование.
- **Безопасность** – ролей, SSL, аутентификация через LDAP, PAM, SCRAM.

## Установка

### На Ubuntu

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

### На macOS (Homebrew)

```bash
brew update
brew install postgresql
brew services start postgresql
```

После установки создайте пользователя и базу:

```bash
sudo -u postgres createuser --interactive
sudo -u postgres createdb mydb
```

## Базовый SQL

### Создание таблицы

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Вставка данных

```sql
INSERT INTO users (username, email) VALUES
('alice', 'alice@example.com'),
('bob', 'bob@example.com');
```

### Запросы

```sql
SELECT * FROM users WHERE username = 'alice';
```

### Обновление

```sql
UPDATE users SET email = 'alice@newdomain.com' WHERE username = 'alice';
```

### Удаление

```sql
DELETE FROM users WHERE username = 'bob';
```

## Индексы

Индексы ускоряют поиск, но замедляют вставку. Создайте индекс для часто используемых колонок:

```sql
CREATE INDEX idx_users_email ON users(email);
```

Для полнотекстового поиска используйте `GIN` индекс:

```sql
ALTER TABLE articles ADD COLUMN content TEXT;
CREATE INDEX idx_articles_content ON articles USING GIN (to_tsvector('english', content));
```

## Транзакции

```sql
BEGIN;
INSERT INTO users (username, email) VALUES ('charlie', 'charlie@example.com');
-- Если что-то пошло не так
ROLLBACK; -- отмена
-- Иначе
COMMIT;   -- подтверждение
```

## Лучшие практики

- **Нормализация** – избегайте избыточности.
- **Параметризованные запросы** – защита от SQL‑инъекций.
- **Мониторинг** – `pg_stat_activity`, `pg_stat_user_tables`.
- **Резервное копирование** – `pg_dump`, `pg_basebackup`.
- **Планировщик** – `pg_cron` для регулярных задач.

## Заключение

PostgreSQL – мощная и гибкая СУБД, подходящая как для небольших проектов, так и для крупных корпоративных систем. Изучив базовые команды и принципы работы, вы сможете эффективно использовать её возможности в своих приложениях.