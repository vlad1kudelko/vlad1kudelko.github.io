---
title: "Безопасность API"
description: "Rate limiting, CORS, CSRF protection, input validation"
heroImage: "../../../../assets/imgs/2026/02/09-api-security.webp"
pubDate: "2026-02-09"
---

Безопасность API критически важна.

```javascript
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// CORS
app.use(cors({
  origin: ['https://example.com'],
  credentials: true
}));

// Input validation
const Joi = require('joi');
const schema = Joi.object({
  email: Joi.string().email(),
  password: Joi.string().min(8)
});
```