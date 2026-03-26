---
title: "State Management"
description: "Управление состоянием: Redux, Zustand, Jotai"
heroImage: "../../../../assets/imgs/2025/12/17-state-mgt.webp"
pubDate: "2025-12-17"
---

Zustand — простой state management.

```typescript
import { create } from 'zustand';

const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```
