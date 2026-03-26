---
title: "Server Components"
description: "Server Components в React: границы компонентов"
heroImage: "../../../../assets/imgs/2025/12/28-srv-comps.webp"
pubDate: "2025-12-28"
---

React Server Components.

```tsx
// Server Component
async function UserList() {
  const users = await db.users.findMany();
  return (
    <ul>
      {users.map(u => <li key={u.id}>{u.name}</li>)}
    </ul>
  );
}
```
