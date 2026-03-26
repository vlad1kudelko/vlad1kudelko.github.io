---
title: "Rate Limiting и защита от DDoS — алгоритмы и реализация"
description: "Внедрите rate limiting для защиты API: алгоритмы, стратегии, best practices. Обеспечьте стабильность сервиса под нагрузкой."
heroImage: "../../../../assets/imgs/2025/12/12-rate-limiting.webp"
pubDate: "2025-12-12"
---

# Rate Limiting: защита API от перегрузки

Rate limiting — техника ограничения количества запросов для защиты от злоупотреблений и обеспечения fairness. Без rate limiting ваш API уязвим для DDoS-атак, брутфорса и простого перегруза от чрезмерного трафика.

## Алгоритмы

### Fixed Window

```
Время: |----1min----|----1min----|----1min----|
Запросы: |○○○○○|○○○○○|○○○○○○○|
              ^ блокировка если > 5/min
```

```javascript
// Простой fixed window
const requests = new Map();

function rateLimitFixed(key, windowMs, max) {
    const now = Date.now();
    const windowStart = Math.floor(now / windowMs);
    const windowKey = `${key}:${windowStart}`;
    
    const count = requests.get(windowKey) || 0;
    
    if (count >= max) {
        return { allowed: false, remaining: 0, resetAt: (windowStart + 1) * windowMs };
    }
    
    requests.set(windowKey, count + 1);
    return { allowed: true, remaining: max - count - 1, resetAt: (windowStart + 1) * windowMs };
}
```

### Sliding Window

```
Время: |----1min----|----1min----|
Запросы:      *    *   *   *
         \_________/ \_________/
           учитывает 60 секунд назад
```

```javascript
// Sliding window с сортированным списком
const requestLog = new Map();

function rateLimitSliding(key, windowMs, max) {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!requestLog.has(key)) {
        requestLog.set(key, []);
    }
    
    const log = requestLog.get(key);
    
    // Удалить старые записи
    while (log.length > 0 && log[0] <= windowStart) {
        log.shift();
    }
    
    if (log.length >= max) {
        return { allowed: false, remaining: 0, resetAt: log[0] + windowMs };
    }
    
    log.push(now);
    return { allowed: true, remaining: max - log.length, resetAt: now + windowMs };
}
```

### Token Bucket

```
Бакен: [○○○] токенов
Запрос: потребляет 1 токен
Пополнение: 10 токенов в секунду
```

```javascript
class TokenBucket {
    constructor(capacity, refillRate) {
        this.capacity = capacity;
        this.refillRate = refillRate;
        this.buckets = new Map();
    }
    
    consume(key, tokens = 1) {
        const now = Date.now();
        
        if (!this.buckets.has(key)) {
            this.buckets.set(key, {
                tokens: this.capacity,
                lastRefill: now
            });
        }
        
        const bucket = this.buckets.get(key);
        
        // Пополнение токенов
        const elapsed = (now - bucket.lastRefill) / 1000;
        bucket.tokens = Math.min(
            this.capacity,
            bucket.tokens + elapsed * this.refillRate
        );
        bucket.lastRefill = now;
        
        if (bucket.tokens >= tokens) {
            bucket.tokens -= tokens;
            return { allowed: true, remaining: Math.floor(bucket.tokens) };
        }
        
        return { 
            allowed: false, 
            remaining: 0,
            retryAfter: Math.ceil((tokens - bucket.tokens) / this.refillRate)
        };
    }
}
```

## Redis реализация

### Sliding Window с Redis

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function rateLimitSlidingRedis(key, windowSec, max) {
    const now = Date.now();
    const windowStart = now - windowSec * 1000;
    
    const pipeline = redis.pipeline();
    
    // Удалить старые записи
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Добавить текущий запрос
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    
    // Получить количество
    pipeline.zcard(key);
    
    // Установить TTL
    pipeline.expire(key, windowSec);
    
    const results = await pipeline.exec();
    const count = results[2][1];
    
    if (count > max) {
        // Получить oldest request для reset time
        const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
        return { 
            allowed: false, 
            remaining: 0,
            resetAt: Math.ceil((oldest[1] - windowStart) / 1000)
        };
    }
    
    return { allowed: true, remaining: max - count };
}
```

### Fixed Window с Redis INCR

```javascript
async function rateLimitFixedRedis(key, windowSec, max) {
    const currentWindow = Math.floor(Date.now() / 1000 / windowSec);
    const redisKey = `${key}:${currentWindow}`;
    
    const count = await redis.incr(redisKey);
    
    if (count === 1) {
        await redis.expire(redisKey, windowSec);
    }
    
    const ttl = await redis.ttl(redisKey);
    
    if (count > max) {
        return { allowed: false, remaining: 0, resetIn: ttl };
    }
    
    return { allowed: true, remaining: max - count, resetIn: ttl };
}
```

## Express middleware

```javascript
const rateLimit = require('express-rate-limit');
const { rateLimit: rateLimitRedis } = require('rate-limit-redis');
const Redis = require('ioredis');

const redis = new Redis();

// Базовый limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // 100 запросов
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests' }
});

// Строгий для sensitive endpoints
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    skipSuccessfulRequests: true
});

// Для авторизации
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many login attempts' }
});

// С Redis
const redisLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    store: new rateLimitRedis({
        sendCommand: (...args) => redis.call(...args)
    })
});

app.use('/api/', limiter);
app.use('/api/auth/login', loginLimiter);
app.use('/api/payment', strictLimiter);
```

## Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640000000
Retry-After: 30
```

```javascript
// Custom middleware с headers
const rateLimiter = (options = {}) => {
    const { windowMs = 60000, max = 100 } = options;
    const requests = new Map();
    
    return (req, res, next) => {
        const key = req.ip;
        const result = rateLimitSliding(key, windowMs, max);
        
        res.set({
            'X-RateLimit-Limit': max,
            'X-RateLimit-Remaining': result.remaining,
            'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000)
        });
        
        if (!result.allowed) {
            res.set('Retry-After', Math.ceil((result.resetAt - Date.now()) / 1000));
            return res.status(429).json({ error: 'Too many requests' });
        }
        
        next();
    };
};
```

## Стратегии для разных endpoints

```javascript
// Разные лимиты для разных endpoint
const limits = {
    '/api/auth/login': { windowMs: 15*60*1000, max: 5 },
    '/api/auth/register': { windowMs: 60*60*1000, max: 3 },
    '/api/search': { windowMs: 60*1000, max: 30 },
    '/api/data': { windowMs: 60*1000, max: 100 },
    '/api/upload': { windowMs: 60*60*1000, max: 10 }
};

app.use((req, res, next) => {
    const limit = limits[req.path] || { windowMs: 60*1000, max: 100 };
    // применение лимита
});
```

## Client-side handling

```javascript
// Обработка 429 на клиенте
async function apiRequest(url, options = {}) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
        
        console.log(`Rate limited. Waiting ${waitTime}ms`);
        await new Promise(r => setTimeout(r, waitTime));
        
        // Retry
        return apiRequest(url, options);
    }
    
    return response;
}
```

## Best Practices

1. **Different limits** — разные лимиты для разных endpoints
2. **Authentication-aware** — строже для неавторизованных
3. **Graceful degradation** — не блокируйте полностью
4. **Clear feedback** — правильные headers и messages
5. **Redis для distributed** — синхронизация между инстансами

## Заключение

Rate limiting — критически важный компонент безопасности API. Правильная реализация защищает от злоупотреблений и обеспечивает fair usage.