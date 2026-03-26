---
title: "OAuth 2.0 и OpenID Connect — протоколы авторизации"
description: "Изучите OAuth 2.0 и OIDC: потоки авторизации, токены, интеграция. Реализуйте безопасную аутентификацию в вашем приложении."
heroImage: "../../../../assets/imgs/2025/12/09-oauth-oidc.webp"
pubDate: "2025-12-09"
---

# OAuth 2.0 и OpenID Connect: авторизация и аутентификация

OAuth 2.0 — стандарт авторизации, OpenID Connect (OIDC) — уровень аутентификации поверх него. Эти протоколы позволяют пользователям входить в приложения через провайдеров вроде Google или GitHub, не передавая пароли третьим сторонам.

## OAuth 2.0 Flows

### Authorization Code Flow

```
+--------+                               +---------------+
|        |--(A)- Authorization Request ->|   Resource    |
|        |                               |     Owner     |
|        |<-(B)-- Authorization Grant ---|               |
|        |                               +---------------+
|        |
|        |                               +---------------+
|        |--(C)-- Authorization Grant -->| Authorization |
| Client |                               |     Server    |
|        |<-(D)----- Access Token -------|               |
|        |                               +---------------+
|        |
|        |                               +---------------+
|        |--(E)----- Access Token ------>|    Resource   |
|        |                               |     Server    |
|        |<-(F)--- Protected Resource ---|               |
+--------+                               +---------------+
```

### Регистрация приложения

```
Client ID: my-client-id
Client Secret: my-client-secret
Redirect URIs: https://myapp.com/callback
Grant Types: authorization_code
Scopes: read:profile, read:email
```

### Реализация

```javascript
const clientId = 'my-client-id';
const clientSecret = 'my-client-secret';
const redirectUri = 'https://myapp.com/callback';
const authUrl = 'https://auth.example.com/authorize';
const tokenUrl = 'https://auth.example.com/token';

// 1. Перенаправление на авторизацию
app.get('/login', (req, res) => {
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid profile email',
        state: generateRandomState()
    });
    res.redirect(`${authUrl}?${params}`);
});

// 2. Callback с кодом
app.get('/callback', async (req, res) => {
    const { code, state } = req.query;
    
    // Проверка state
    if (state !== req.session.state) {
        return res.status(400).send('Invalid state');
    }
    
    // Обмен кода на токен
    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri
        })
    });
    
    const tokens = await response.json();
    // { access_token, refresh_token, id_token, expires_in }
    
    req.session.tokens = tokens;
    res.redirect('/profile');
});
```

### PKCE (Proof Key for Code Exchange)

```javascript
// 1. Генерация code verifier и challenge
const crypto = require('crypto');

function generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
    return crypto.createHash('sha256')
        .update(verifier)
        .digest('base64url');
}

// 2. Authorization Request с PKCE
app.get('/login', (req, res) => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    
    req.session.codeVerifier = codeVerifier;
    
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid profile email',
        state: generateRandomState(),
        code_challenge: codeChallenge,
        code_challenge_method: 'S256'
    });
    
    res.redirect(`${authUrl}?${params}`);
});

// 3. Обмен кода на токен с verifier
app.get('/callback', async (req, res) => {
    const { code } = req.query;
    const codeVerifier = req.session.codeVerifier;
    
    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
            client_id: clientId,
            code_verifier: codeVerifier
        })
    });
    
    const tokens = await response.json();
    // ...
});
```

## OpenID Connect

### ID Token

```javascript
// JWT декодирование
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const client = jwksClient({
    jwksUri: 'https://auth.example.com/.well-known/jwks.json'
});

function getKey(header, callback) {
    client.getSigningKey(header.kid, (err, key) => {
        callback(null, key.getPublicKey());
    });
}

app.get('/callback', async (req, res) => {
    const { id_token } = tokens;
    
    // Верификация ID token
    const decoded = await new Promise((resolve, reject) => {
        jwt.verify(id_token, getKey, {
            issuer: 'https://auth.example.com',
            audience: clientId
        }, (err, decoded) => {
            if (err) reject(err);
            else resolve(decoded);
        });
    });
    
    // Данные пользователя из ID token
    console.log(decoded);
    // {
    //   sub: 'user123',
    //   email: 'user@example.com',
    //   name: 'John Doe',
    //   picture: 'https://...',
    //   iat: 1234567890,
    //   exp: 1234571490
    // }
});
```

### UserInfo Endpoint

```javascript
// Получение дополнительных данных
const userInfoResponse = await fetch('https://auth.example.com/userinfo', {
    headers: { 'Authorization': `Bearer ${access_token}` }
});

const userInfo = await userInfoResponse.json();
// { sub, email, name, picture }
```

## Refresh Token

```javascript
// Обновление токена
app.post('/refresh', async (req, res) => {
    const { refresh_token } = req.session.tokens;
    
    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token,
            client_id: clientId
        })
    });
    
    const tokens = await response.json();
    req.session.tokens = tokens;
    res.json({ success: true });
});
```

## Client Credentials Flow

```javascript
// Machine-to-machine
app.get('/api/data', async (req, res) => {
    const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
            scope: 'read:data'
        })
    });
    
    const { access_token } = await response.json();
    
    const dataResponse = await fetch('https://api.example.com/data', {
        headers: { 'Authorization': `Bearer ${access_token}` }
    });
    
    const data = await dataResponse.json();
    res.json(data);
});
```

## Scopes

```javascript
// Стандартные scopes
const scopes = {
    openid:   'Аутентификация OIDC',
    profile:  'Имя, фото',
    email:    'Email',
    phone:    'Телефон',
    address:  'Адрес',
    offline_access: 'Refresh token'
};

// Кастомные scopes
// В Auth сервере
// scope: read:profile write:profile
```

## Провайдеры

### Google

```javascript
const googleAuth = new GoogleAuth({
    clientId,
    clientSecret,
    redirectUri
});

// URL авторизации
const url = googleAuth.generateAuthUrl({
    access_type: 'offline',
    scope: ['profile', 'email']
});

// Обмен кода на токен
const { tokens } = await googleAuth.getToken(code);
```

### Auth0

```javascript
// URL авторизации
const authUrl = `https://${domain}/authorize?` + new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email',
    audience: 'https://api.example.com'
});
```

## Best Practices

1. **PKCE** — всегда используйте для публичных клиентов
2. **State** — проверяйте для предотвращения CSRF
3. **HTTPS** — только безопасные redirect URIs
4. **Short-lived tokens** — минимальное время жизни
5. **Refresh token rotation** — ротация при обновлении
6. **Scope least privilege** — минимальные права

## Заключение

OAuth 2.0 и OIDC — стандарты для авторизации и аутентификации. Понимание потоков и правильная реализация обеспечивают безопасность приложений.