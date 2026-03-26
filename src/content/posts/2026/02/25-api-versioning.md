---
title: "API Versioning"
description: "Версионирование API: URL path, header, query params"
heroImage: "../../../../assets/imgs/2026/02/25-api-versioning.webp"
pubDate: "2026-02-25"
---

Версионирование для обратной совместимости.

```javascript
// URL path versioning (рекомендуется)
app.use('/api/v1', apiV1Router);
app.use('/api/v2', apiV2Router);

// Header versioning
app.get('/users', (req, res) => {
  const version = req.headers['accept-version'] || '1';
  if (version === '2') {
    return res.json(v2Controller.getUsers(req));
  }
  return res.json(v1Controller.getUsers(req));
});
```