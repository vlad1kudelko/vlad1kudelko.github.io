---
title: "Логирование в backend"
description: "Structured logging, log levels, ELK stack, centralized logging"
heroImage: "../../../../assets/imgs/2026/02/15-logging.webp"
pubDate: "2026-02-15"
---

Structured logging для production.

```javascript
const pino = require('pino');

const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});

logger.info({ userId: 123, action: 'login' }, 'User logged in');
logger.error({ err: error }, 'Request failed');
```