---
title: "TypeScript Advanced"
description: "Продвинутый TypeScript: generics, decorators, types"
heroImage: "../../../../assets/imgs/2025/12/15-typescript-adv.webp"
pubDate: "2025-12-15"
---

Generics в TypeScript позволяют создавать переиспользуемый код.

```typescript
function identity<T>(arg: T): T {
  return arg;
}

const result = identity<string>("hello");
```
