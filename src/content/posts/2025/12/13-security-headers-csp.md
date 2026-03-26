---
title: "Security Headers и CSP — защита веб-приложений"
description: "Настройте HTTP security headers и Content Security Policy. Защитите приложение от XSS, clickjacking и других атак через браузер."
heroImage: "../../../../assets/imgs/2025/12/13-security-headers-csp.webp"
pubDate: "2025-12-13"
---

# Security Headers и Content Security Policy

Security headers — HTTP заголовки, которые сообщают браузеру о политиках безопасности. Правильная настройка критически важна.

## Essential Headers

### Helmet в Express

```javascript
const helmet = require('helmet');

app.use(helmet());

// Или с кастомными настройками
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    hsts: {
        maxAge: 63072000,
        includeSubDomains: true,
        preload: true
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permissionsPolicy: {
        geolocation: [],
        microphone: [],
        camera: []
    }
}));
```

### Отдельные заголовки

```javascript
app.use((req, res, next) => {
    // HSTS
    res.setHeader('Strict-Transport-Security', 
        'max-age=63072000; includeSubDomains; preload');
    
    // X-Frame-Options
    res.setHeader('X-Frame-Options', 'DENY');
    
    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // X-XSS-Protection (устарел, но для совместимости)
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer-Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions-Policy
    res.setHeader('Permissions-Policy', 
        'geolocation=(), microphone=(), camera=(), payment=()');
    
    // Content-Security-Policy
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    
    next();
});
```

## Content Security Policy

### Basic CSP

```
Content-Security-Policy: 
    default-src 'self';
    script-src 'self';
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    font-src 'self';
    connect-src 'self' https://api.example.com;
    frame-ancestors 'none';
    base-uri 'self';
    form-action 'self';
```

### Директивы CSP

- **default-src** — Фоллбек для других. Пример: `default-src 'self'`
- **script-src** — JavaScript. Пример: `script-src 'self' 'unsafe-inline'`
- **style-src** — CSS. Пример: `style-src 'self' 'unsafe-inline'`
- **img-src** — Изображения. Пример: `img-src 'self' data: https:`
- **font-src** — Шрифты. Пример: `font-src 'self' https://fonts.gstatic.com`
- **connect-src** — Fetch/XHR/WebSocket. Пример: `connect-src 'self' https://api`
- **frame-ancestors** — Фреймы. Пример: `frame-ancestors 'none'`
- **base-uri** — `<base>` tag. Пример: `base-uri 'self'`
- **form-action** — Формы. Пример: `form-action 'self'`

### CSP с nonce

```javascript
// Server-side
const crypto = require('crypto');
const nonce = crypto.randomBytes(16).toString('base64');

res.setHeader('Content-Security-Policy', 
    `script-src 'self' 'nonce-${nonce}';`);

// HTML
// <script nonce="${nonce}">...</script>
```

```javascript
// CSP middleware с nonce
app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('base64');
    
    res.setHeader('Content-Security-Policy', 
        `script-src 'self' 'nonce-${res.locals.nonce}';`);
    
    next();
});
```

```html
<!-- Template -->
<script nonce="<%= nonce %>">
    console.log('Secure script');
</script>
```

### CSP с hash

```javascript
// Вычисление hash
const crypto = require('crypto');
const hash = crypto.createHash('sha256')
    .update('console.log("inline script")')
    .digest('base64');

res.setHeader('Content-Security-Policy', 
    `script-src 'self' 'sha256-${hash}'`);
```

## X-Frame-Options

```
X-Frame-Options: DENY              # Запретить во всех фреймах
X-Frame-Options: SAMEORIGIN        # Только на том же-origin
X-Frame-Options: ALLOW-FROM https://example.com  # Устарел
```

```javascript
app.use(helmet.frameguard({ action: 'deny' }));
```

## X-Content-Type-Options

```
X-Content-Type-Options: nosniff
```

Предотвращает MIME-sniffing браузером.

## Referrer-Policy

Параметры политики referrer:

- **no-referrer** — Не отправлять referrer
- **no-referrer-when-downgrade** — По умолчанию
- **origin** — Только origin
- **strict-origin** — Origin, только HTTPS
- **strict-origin-when-cross-origin** — Полный для same-origin, origin для cross
- **same-origin** — Для same-origin
- **origin-when-cross-origin** — Полный для cross-origin

```javascript
app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }));
```

## Permissions-Policy

```http
Permissions-Policy: 
    geolocation=(),
    microphone=(),
    camera=(),
    payment=(),
    usb=(),
    vr=()
```

```javascript
app.use(helmet.permissionsPolicy({
    geolocation: [],
    microphone: [],
    camera: [],
    payment: [],
    usb: []
}));
```

## CORS

```javascript
const cors = require('cors');

app.use(cors({
    origin: ['https://example.com', 'https://app.example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-Total-Count'],
    credentials: true,
    maxAge: 86400
}));
```

## COOP и COEP

### Cross-Origin-Opener-Policy

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Opener-Policy: same-origin-allow-popups
Cross-Origin-Opener-Policy: unsafe-none
```

### Cross-Origin-Embedder-Policy

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Embedder-Policy: credentialless
```

```javascript
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});
```

## Reporting

### CSP Report-Only

```javascript
// Тестирование CSP без блокировки
app.use(helmet.contentSecurityPolicy({
    directives: {
        defaultSrc: ["'self'"],
        reportUri: '/csp-report'
    },
    reportOnly: true
}));
```

```javascript
// Endpoint для отчётов
app.post('/csp-report', express.json(), (req, res) => {
    console.log('CSP Violation:', req.body['csp-report']);
    // Отправить в систему мониторинга
    saveToMonitoring(req.body);
    res.status(204).end();
});
```

### Report-To

```javascript
res.setHeader('Report-To', JSON.stringify({
    group: 'csp-endpoint',
    max_age: 86400,
    endpoints: [{ url: '/reports' }]
}));
```

## Nginx конфигурация

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

## Тестирование

```bash
# Проверка заголовков
curl -I https://example.com

# CSP анализатор
npx csp-evaluator https://example.com

# Mozilla Observatory
curl -s "https://http-observatory.security.mozilla.org/api/v1/analyze?host=example.com"
```

## Заключение

Security headers — первая линия защиты. Правильная конфигурация CSP, HSTS и других заголовков критически важна для безопасности веб-приложений.