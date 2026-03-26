---
title: "Аутентификация: сессии vs токены"
description: "Сравнение подходов к аутентификации: server-side сессии и JWT токены"
heroImage: "../../../../assets/imgs/2025/12/11-auth-sessions-vs-tokens.webp"
pubDate: "2025-12-11"
---

Выбор между сессиями и токенами — важное архитектурное решение. Рассмотрим преимущества и недостатки каждого подхода.

## Server-Side Sessions

### Как работает

```
1. Пользователь отправляет credentials
2. Сервер создаёт сессию, сохраняет в storage (Redis/БД)
3. Сервер отправляет session ID в cookie
4. При каждом запросе сервер проверяет сессию
```

### Реализация (Express + Redis)

```javascript
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redis = require('redis');

const app = express();
const redisClient = redis.createClient();

app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    name: 'sessionId',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: true,        // HTTPS only
        httpOnly: true,      // JS не может читать
        maxAge: 24 * 60 * 60 * 1000, // 24 часа
        sameSite: 'strict'
    }
}));

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await validateUser(email, password);
    
    if (user) {
        req.session.userId = user.id;
        req.session.role = user.role;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.get('/profile', (req, res) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    res.json({ userId: req.session.userId, role: req.session.role });
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});
```

### Хранение сессий

```yaml
# Redis структура
session:{sessionId} -> {
    userId: "123",
    role: "admin",
    loginAt: 1234567890,
    ip: "192.168.1.1",
    userAgent: "Mozilla/..."
}

# TTL - автоматическое удаление
```

### Преимущества сессий

- **Мгновенная инвалидация** — logout сразу生效
- **Централизованное хранилище** — один source of truth
- **Встроенная защита от XSS** — httpOnly cookies
- **Простота отладки** — видим все активные сессии

### Недостатки сессий

- **Требует stateful storage** — Redis/БД
- **Масштабирование** — sticky sessions или shared storage
- **Задержка** — каждый запрос к storage

## JWT Tokens

### Как работает

```
1. Пользователь отправляет credentials
2. Сервер подписывает JWT с user data
3. Клиент хранит токен (localStorage/cookie)
4. При каждом запросе сервер верифицирует подпись
```

### Реализация

```javascript
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await validateUser(email, password);
    
    if (user) {
        const accessToken = jwt.sign(
            { sub: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );
        
        const refreshToken = crypto.randomBytes(64).toString('hex');
        await saveRefreshToken(user.id, refreshToken);
        
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        
        res.json({ accessToken });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

app.get('/profile', authenticate, (req, res) => {
    res.json({ userId: req.user.sub, role: req.user.role });
});

// Middleware
const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'No token' });
    
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Refresh
app.post('/refresh', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    
    const stored = await getRefreshToken(refreshToken);
    if (!stored || stored.expiresAt < Date.now()) {
        return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    const accessToken = jwt.sign(
        { sub: stored.userId },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );
    
    res.json({ accessToken });
});

// Logout
app.post('/logout', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
        await deleteRefreshToken(refreshToken);
    }
    res.clearCookie('refreshToken');
    res.json({ success: true });
});
```

### Преимущества токенов

- **Stateless** — не требует central storage
- **Масштабирование** — любой сервер может верифицировать
- **Производительность** — проверка подписи быстрее БД
- **Cross-platform** — работает с мобильными и SPA

### Недостатки токенов

- **Сложность отзыва** — требует blacklist или short-lived
- **Размер** — токен передаётся с каждым запросом
- **Безопасность** — токены в localStorage уязвимы к XSS

## Сравнение

| Аспект | Сессии | JWT |
|--------|--------|-----|
| Storage | Redis/БД | Нет (stateless) |
| Масштабирование | Требует shared storage | Простое горизонтальное |
| Logout | Мгновенный | Требует blacklist |
| Размер запроса | Small cookie | Larger token |
| Сложность | Проще | Сложнее (refresh, blacklist) |
| Mobile API | Неудобно | Удобно |
| SSR | Отлично | Требует cookie |

## Гибридный подход

```javascript
// Access token - короткоживущий JWT
const accessToken = jwt.sign(
    { sub: user.id, role: user.role, jti: uuid() },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
);

// Refresh token - secure httpOnly cookie
res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
});

// Invalidation - добавляем jti в blacklist
const isTokenRevoked = async (jti) => {
    return await redisClient.exists(`revoked:${jti}`);
};
```

## Когда что использовать

### Используйте сессии когда:

- Монолитное приложение
- Простая архитектура
- Требуется мгновенный logout
- Single server или shared Redis

### Используйте JWT когда:

- Микросервисная архитектура
- Mobile/SPA приложения
- Требуется cross-domain auth
- Высокая нагрузка

## Security Best Practices

### Для сессий

```javascript
app.use(session({
    secret: process.env.SESSION_SECRET,
    name: 'sid',                    // Не используйте default connect.sid
    cookie: {
        secure: true,               // HTTPS only
        httpOnly: true,             // Защита от XSS
        sameSite: 'strict',         // CSRF protection
        maxAge: 24 * 60 * 60 * 1000
    },
    resave: false,
    saveUninitialized: false
}));
```

### Для JWT

```javascript
// 1. Short-lived access tokens
jwt.sign(payload, secret, { expiresIn: '15m' });

// 2. Secure storage - httpOnly cookie
res.cookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict'
});

// 3. Refresh token rotation
// Генерируйте новый refresh token при каждом обновлении

// 4. Blacklist для критических операций
```

## Заключение

Выбор между сессиями и токенами зависит от архитектуры. Для современных SPA и микросервисов — JWT с refresh token rotation. Для традиционных приложений — сессии.