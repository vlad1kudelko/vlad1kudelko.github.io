---
title: "JWT: глубокий разбор — структура и безопасность"
description: "Полное руководство по JWT: структура, генерация, верификация, best practices. Научитесь безопасно использовать токены в приложении."
heroImage: "../../../../assets/imgs/2025/12/10-jwt.webp"
pubDate: "2025-12-10"
---

# JSON Web Tokens: полное руководство

JWT (JSON Web Token) — это компактный, URL-safe способ передачи claims между сторонами.

## Структура JWT

```
header.payload.signature

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### Header

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

### Payload

```json
{
  "sub": "user123",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "admin",
  "iat": 1516239022,
  "exp": 1516242622
```

### Standard Claims

- **iss** — Issuer (кто издал)
- **sub** — Subject (субъект)
- **aud** — Audience (получатель)
- **exp** — Expiration Time
- **nbf** — Not Before
- **iat** — Issued At
- **jti** — JWT ID

## Генерация

### Node.js

```javascript
const jwt = require('jsonwebtoken');

const payload = {
    sub: 'user123',
    email: 'user@example.com',
    role: 'admin'
};

const secret = process.env.JWT_SECRET;

// Создание токена
const token = jwt.sign(payload, secret, {
    expiresIn: '1h',
    issuer: 'my-app',
    audience: 'my-api'
});

// Создание с алгоритмом RS256 (асимметричный)
const privateKey = fs.readFileSync('private.pem');
const tokenRS256 = jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: '1h'
});
```

### Payload с несколькими claims

```javascript
const token = jwt.sign({
    // Стандартные
    sub: user.id,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    
    // Кастомные
    email: user.email,
    role: user.role,
    permissions: ['read', 'write', 'delete'],
    
    // Для refresh
    type: 'access' // или 'refresh'
}, secret, { expiresIn: '1h' });
```

## Верификация

### Проверка токена

```javascript
const jwt = require('jsonwebtoken');

app.get('/protected', (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
        const decoded = jwt.verify(token, secret, {
            issuer: 'my-app',
            audience: 'my-api',
            algorithms: ['HS256']
        });
        
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
});
```

### Асинхронная верификация

```javascript
const jwt = require('jsonwebtoken');

const verifyAsync = (token, secret) => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, secret, (err, decoded) => {
            if (err) reject(err);
            else resolve(decoded);
        });
    });
};

// Или с async/await
const decoded = await jwt.verifyAsync(token, secret);
```

## RS256 (асимметричное шифрование)

### Генерация ключей

```bash
# Приватный ключ
openssl genrsa -out private.pem 2048

# Публичный ключ
openssl rsa -in private.pem -pubout -out public.pem
```

### Подпись и верификация

```javascript
const fs = require('fs');
const jwt = require('jsonwebtoken');

const privateKey = fs.readFileSync('private.pem');
const publicKey = fs.readFileSync('public.pem');

// Подпись
const token = jwt.sign({ sub: 'user123' }, privateKey, {
    algorithm: 'RS256',
    expiresIn: '1h'
});

// Верификация
const decoded = jwt.verify(token, publicKey, {
    algorithms: ['RS256']
});
```

## Refresh Token

```javascript
const crypto = require('crypto');

// Генерация refresh токена
function generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
}

// Хранение в БД
async function refreshAccessToken(refreshToken) {
    const stored = await db.refreshTokens.find(refreshToken);
    
    if (!stored || stored.expiresAt < Date.now()) {
        throw new Error('Invalid refresh token');
    }
    
    // Ротация токена
    await db.refreshTokens.delete(refreshToken);
    const newRefreshToken = generateRefreshToken();
    await db.refreshTokens.create({
        token: newRefreshToken,
        userId: stored.userId,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 дней
    });
    
    const accessToken = jwt.sign(
        { sub: stored.userId },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );
    
    return { accessToken, refreshToken: newRefreshToken };
}
```

## Middleware примеры

### Express middleware

```javascript
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Опциональная авторизация
const optionalAuth = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
        try {
            req.user = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            // Игнорируем ошибку
        }
    }
    
    next();
};
```

### Проверка ролей

```javascript
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        
        next();
    };
};

// Использование
app.get('/admin', authenticate, requireRole('admin'), adminHandler);
```

## Best Practices

### Безопасность

```javascript
// 1. Используйте HTTPS
// 2. Храните секреты в env
const secret = process.env.JWT_SECRET;

// 3. Короткое время жизни access token
jwt.sign(payload, secret, { expiresIn: '15m' });

// 4. Используйте RS256 для распределённых систем
// 5. Проверяйте issuer и audience
jwt.verify(token, secret, { issuer: 'my-app', audience: 'my-api' });

// 6. Не храните чувствительные данные в payload
// payload виден всем, кто может декодировать токен
jwt.sign({ 
    sub: user.id, 
    // email: user.email  - НЕ рекомендуется!
}, secret);
```

### Хранение на клиенте

```javascript
// Безопасное хранение
// 1. HttpOnly cookies (рекомендуется)
res.cookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 3600000
});

// 2. В памяти (для SPA)
sessionStorage.setItem('token', token);
// НЕ используйте localStorage - XSS уязвимость
```

## Blacklist

```javascript
const jwt = require('jsonwebtoken');
const redis = require('redis');

const redisClient = redis.createClient();

// Blacklist проверка
const isTokenRevoked = async (token) => {
    const result = await redisClient.get(`blacklist:${token}`);
    return result !== null;
};

// Middleware с blacklist
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (await isTokenRevoked(token)) {
        return res.status(401).json({ error: 'Token revoked' });
    }
    
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Logout
app.post('/logout', authenticate, async (req, res) => {
    const decoded = jwt.decode(req.headers.authorization.split(' ')[1]);
    const exp = decoded.exp;
    const ttl = exp - Math.floor(Date.now() / 1000);
    
    if (ttl > 0) {
        await redisClient.setEx(
            `blacklist:${req.headers.authorization.split(' ')[1]}`,
            ttl,
            'revoked'
        );
    }
    
    res.json({ success: true });
});
```

## Заключение

JWT — удобный способ передачи данных, но требует внимания к безопасности: короткое время жизни, безопасное хранение, проверка issuer/audience.