---
title: "OWASP Top 10: уязвимости веб-приложений — защита"
description: "Разбор OWASP Top 10: критические уязвимости и методы защиты. Обезопасьте своё веб-приложение от основных угроз безопасности."
heroImage: "../../../../assets/imgs/2025/12/07-owasp-top-10.webp"
pubDate: "2025-12-07"
---

# OWASP Top 10: защита веб-приложений

OWASP Top 10 — это список десяти наиболее критических уязвимостей веб-приложений. Знание этих уязвимостей необходимо каждому разработчику. Список обновляется каждые несколько лет на основе статистики атак и помогает сосредоточиться на наиболее важных угрозах безопасности.

## A01:2021 — Broken Access Control

Нарушение контроля доступа позволяет пользователям получать несанкционированный доступ к данным и функциям.

### Пример уязвимости

```javascript
// Уязвимый код
app.get('/api/user/:id', (req, res) => {
    const user = db.getUser(req.params.id);
    res.json(user);  // Любой может получить любого пользователя
});

// Безопасный код
app.get('/api/user/:id', requireAuth, (req, res) => {
    if (req.user.id !== req.params.id) {
        return res.status(403).json({ error: 'Access denied' });
    }
    const user = db.getUser(req.params.id);
    res.json(user);
});
```

### Защита

- Проверка прав доступа на каждом endpoint
- Принцип наименьших привилегий
- Логирование попыток доступа
- Отключение листинга директорий

## A02:2021 — Cryptographic Failures

Неправильное использование криптографии или её отсутствие.

### Примеры

```javascript
// Плохо: хранение паролей в открытом виде
const user = { email, password };  // plaintext!

// Хорошо: хеширование паролей
const bcrypt = require('bcrypt');
const hashedPassword = await bcrypt.hash(password, 10);

// Плохо: слабый алгоритм
const hash = crypto.createHash('md5');  // устарел!

// Хорошо: современный алгоритм
const hash = crypto.createHash('sha256');
```

### Защита

- Используйте bcrypt/argon2 для паролей
- TLS для всех коммуникаций
- Безопасные алгоритмы (AES-256, RSA-4096)
- Управление ключами через Vault

## A03:2021 — Injection

Внедрение вредоносного кода через пользовательский ввод.

### SQL Injection

```javascript
// Уязвимо
const query = `SELECT * FROM users WHERE email = '${req.body.email}'`;

// Безопасно: параметризованный запрос
const query = 'SELECT * FROM users WHERE email = $1';
const result = await db.query(query, [req.body.email]);

// Или ORM
const user = await User.findOne({ where: { email: req.body.email } });
```

### NoSQL Injection

```javascript
// Уязвимо
const user = await User.findOne({
    email: req.body.email,
    password: req.body.password  // можно отправить {$ne: ""}
});

// Безопасно
const user = await User.findOne({
    email: req.body.email,
    password: crypto.createHash('sha256').update(req.body.password).digest('hex')
});
```

### Защита

- Валидация ввода
- Параметризованные запросы
- ORM/фреймворки
- Принцип наименьших привилегий для БД

## A04:2021 — Insecure Design

Небезопасная архитектура и дизайн приложения.

### Защита

- Threat modeling на этапе проектирования
- Secure Design Patterns
- Разделение окружений
- Библиотеки с security review

## A05:2021 — Security Misconfiguration

Неправильная конфигурация безопасности.

### Примеры проблем

```yaml
# Docker - небезопасная конфигурация
services:
  app:
    image: myapp:latest
    privileged: true  # Опасно!
    ports:
      - "80:80"
    # Отладка в production
    environment:
      - DEBUG=true
```

```javascript
// Express - небезопасная конфигурация
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'unsafe-inline'"],  // Опасно!
    }
}));

// Отключённый CORS
app.use(cors({
    origin: '*'  # Опасно!
}));
```

### Защита

- Hardening окружений
- Регулярный аудит конфигурации
- Безопасные дефолтные настройки
- Минимум открытых портов

## A06:2021 — Vulnerable Components

Уязвимые и устаревшие компоненты.

### Проверка зависимостей

```bash
# npm audit
npm audit

# Snyk
npm install -g snyk
snyk test

# OWASP Dependency-Check
dependency-check package.json
```

### package.json

```json
{
  "scripts": {
    "security:audit": "npm audit",
    "security:update": "npm outdated"
  }
}
```

### Защита

- Регулярное обновление зависимостей
- Использование Known Vulnerabilities сканеров
- Удаление неиспользуемых зависимостей
- Проверка источника

## A07:2021 — Auth Failures

Ошибки аутентификации и авторизации.

```javascript
// Уязвимо: отсутствие ограничения попыток
app.post('/login', async (req, res) => {
    const user = await validateUser(req.body);
    // Нет ограничения попыток!
});

// Безопасно
const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5
});

app.post('/login', loginLimiter, async (req, res) => {
    const user = await validateUser(req.body);
    // ...
});
```

### Защита

- 2FA/MFA
- Ограничение попыток входа
- Безопасные сессии
- Сложные пароли

## A08:2021 — Data Failures

Потеря данных или их некорректная обработка.

### Пример

```javascript
// Нет валидации данных
app.post('/api/user', (req, res) => {
    const user = req.body;  // Нет валидации!
    db.save(user);
});

// С валидацией
const Joi = require('joi');
const schema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().max(100).required(),
    age: Joi.number().integer().min(0).max(150)
});

app.post('/api/user', async (req, res) => {
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json(error);
    // ...
});
```

### Защита

- Валидация всех данных
- Шифрование чувствительных данных
- Бэкапы
- Audit logging

## A09:2021 — Logging Failures

Отсутствие или неправильное логирование.

```javascript
// Плохо: нет логирования
app.post('/api/transfer', (req, res) => {
    transferMoney(req.body);
    res.json({ success: true });
});

// Хорошо
const logger = require('./logger');

app.post('/api/transfer', async (req, res) => {
    logger.info('Transfer initiated', { 
        userId: req.user.id, 
        amount: req.body.amount 
    });
    try {
        await transferMoney(req.body);
        logger.info('Transfer completed', { userId: req.user.id });
        res.json({ success: true });
    } catch (err) {
        logger.error('Transfer failed', { error: err.message, userId: req.user.id });
        res.status(500).json({ error: 'Transfer failed' });
    }
});
```

### Защита

- Логируйте безопасные события
- Не логируйте пароли и ключи
- Centralized logging
- Alerting на подозрительную активность

## A10:2021 — SSRF

Server-Side Request Forgery — подделка запросов на стороне сервера.

```javascript
// Уязвимо
app.get('/fetch', (req, res) => {
    const url = req.query.url;
    fetch(url).then(r => r.text()).then(res.send);  // Можно передать file:// или internal!
});

// Безопасно
const { URL } = require('url');

app.get('/fetch', async (req, res) => {
    const url = req.query.url;
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new Error('Invalid protocol');
        }
        const response = await fetch(url);
        const text = await response.text();
        res.send(text);
    } catch (err) {
        res.status(400).json({ error: 'Invalid URL' });
    }
});
```

### Защита

- Валидация URL
- Разрешённые списки (allowlist)
- Отключение перенаправлений
- Изоляция сетевых запросов

## Проверка безопасности

### Инструменты

```bash
# SAST
npm install -g snyk
snyk test

# DAST
zap-baseline.py -t https://mysite.com

# Dependency check
npm audit
```

### Checklists

- [ ] Валидация ввода на всех уровнях
- [ ] Параметризованные запросы
- [ ] Безопасная аутентификация
- [ ] HTTPS everywhere
- [ ] CSP заголовки
- [ ] Логирование аудита
- [ ] Обновлённые зависимости
- [ ] Hardened конфигурация

## Заключение

Безопасность должна быть встроена в процесс разработки. Понимание OWASP Top 10 помогает создавать более защищённые приложения.
