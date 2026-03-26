---
title: "Аутентификация в backend"
description: "JWT, сессии, OAuth 2.0, bcrypt — безопасная аутентификация"
heroImage: "../../../../assets/imgs/2026/02/08-authentication-backend.webp"
pubDate: "2026-02-08"
---

Безопасная аутентификация в приложениях.

```javascript
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Хеширование пароля
async function hashPassword(password) {
  return await bcrypt.hash(password, 12);
}

// Проверка пароля
async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// JWT токен
function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}
```