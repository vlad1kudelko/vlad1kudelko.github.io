---
title: "Error Boundaries"
description: "Error Boundaries: обработка ошибок в React"
heroImage: "../../../../assets/imgs/2025/12/31-err-bound.webp"
pubDate: "2025-12-31"
---

Error Boundaries для обработки ошибок.

```typescript
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  
  render() {
    if (this.state.hasError) {
      return <div>Something went wrong</div>;
    }
    return this.props.children;
  }
}
```
