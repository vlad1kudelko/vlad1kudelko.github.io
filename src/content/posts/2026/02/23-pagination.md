---
title: "Пагинация"
description: "Cursor-based и offset-based пагинация: когда использовать"
heroImage: "../../../../assets/imgs/2026/02/23-pagination.webp"
pubDate: "2026-02-23"
---

Пагинация для больших datasets.

```javascript
// Offset-based
async function getUsers(page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const users = await db.users.findMany({
    take: limit,
    skip: offset
  });
  return { users, page, limit };
}

// Cursor-based (для больших datasets)
async function getUsersCursor(cursor, limit = 20) {
  const users = await db.users.findMany({
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0
  });
  
  const hasMore = users.length > limit;
  const data = hasMore ? users.slice(0, -1) : users;
  const nextCursor = hasMore ? data[data.length - 1].id : null;
  
  return { data, nextCursor };
}
```