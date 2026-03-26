---
title: "Error Handling в backend"
description: "Централизованная обработка ошибок, custom errors, logging"
heroImage: "../../../../assets/imgs/2026/02/10-error-handling.webp"
pubDate: "2026-02-10"
---

Правильная обработка ошибок важна для надёжности.

```javascript
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack
    });
  } else {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }
};
```