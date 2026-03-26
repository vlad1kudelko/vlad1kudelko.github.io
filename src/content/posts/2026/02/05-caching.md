---
title: "Кэширование в backend"
description: "Redis, Memcached: стратегии кэширования, cache invalidation"
heroImage: "../../../../assets/imgs/2026/02/05-caching.webp"
pubDate: "2026-02-05"
---

Кэширование ускоряет приложения.

```javascript
const redis = require('redis');
const client = redis.createClient();

async function getUser(id) {
  const cacheKey = `user:${id}`;
  
  // Check cache
  const cached = await client.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Fetch from DB
  const user = await db.users.findById(id);
  
  // Save to cache
  await client.setex(cacheKey, 3600, JSON.stringify(user));
  
  return user;
}
```