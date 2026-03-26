---
title: "Rate Limiting: реализация"
description: "Алгоритмы rate limiting: token bucket, sliding window, Redis"
heroImage: "../../../../assets/imgs/2026/02/26-rate-limiting-backend.webp"
pubDate: "2026-02-26"
---

Rate limiting для API.

```javascript
class RateLimiter {
  constructor(redis) {
    this.redis = redis;
  }
  
  async isAllowed(key, limit, window) {
    const now = Date.now();
    const windowStart = now - window * 1000;
    
    await this.redis.zremrangebyscore(key, 0, windowStart);
    const count = await redis.zcard(key);
    
    if (count >= limit) return false;
    
    await redis.zadd(key, now, `${now}-${Math.random()}`);
    await redis.expire(key, window);
    
    return true;
  }
}
```