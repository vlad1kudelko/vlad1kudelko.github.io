---
title: "Performance Optimization"
description: "Профилирование, оптимизация CPU и memory, проактивная оптимизация"
heroImage: "../../../../assets/imgs/2026/02/17-performance-optimization.webp"
pubDate: "2026-02-17"
---

Оптимизация производительности приложений.

```javascript
// Node.js profiler
node --prof app.js

// 0x for flame graphs
npx 0x app.js

// Chrome DevTools
// 1. --inspect flag
node --inspect app.js

// Memory leaks
const heapUsed = process.memoryUsage().heapUsed;
console.log(`Memory: ${Math.round(heapUsed / 1024 / 1024)}MB`);
```