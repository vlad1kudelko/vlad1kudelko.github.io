---
title: "API Integration"
description: "Интеграция с API: TanStack Query, SWR"
heroImage: "../../../../assets/imgs/2025/12/19-api-int.webp"
pubDate: "2025-12-19"
---

TanStack Query для fetch данных.

```typescript
import { useQuery } from '@tanstack/react-query';

function UserList() {
  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(res => res.json()),
  });
}
```
