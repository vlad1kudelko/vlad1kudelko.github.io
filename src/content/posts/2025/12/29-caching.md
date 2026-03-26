---
title: "Caching Strategies"
description: "Стратегии кэширования: SWR, React Query, HTTP cache"
heroImage: "../../../../assets/imgs/2025/12/29-caching.webp"
pubDate: "2025-12-29"
---

SWR для кэширования данных.

```typescript
import useSWR from 'swr';

function Profile() {
  const { data, error } = useSWR('/api/user', fetcher);
}
```
