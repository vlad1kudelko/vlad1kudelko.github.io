---
title: "Authentication Frontend"
description: "Аутентификация на frontend: JWT, session management"
heroImage: "../../../../assets/imgs/2025/12/27-auth-fe.webp"
pubDate: "2025-12-27"
---

Аутентификация в SPA.

```typescript
// Protected route
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return children;
}
```
