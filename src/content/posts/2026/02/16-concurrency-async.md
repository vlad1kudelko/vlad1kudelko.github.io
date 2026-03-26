---
title: "Конкурентность и async/await"
description: "Параллельное выполнение: Promise.all, async/await, worker threads"
heroImage: "../../../../assets/imgs/2026/02/16-concurrency-async.webp"
pubDate: "2026-02-16"
---

Асинхронное программирование в Node.js.

```javascript
// Параллельное выполнение
const [users, posts] = await Promise.all([
  fetch('/api/users'),
  fetch('/api/posts')
]);

// Promise.allSettled для обработки ошибок
const results = await Promise.allSettled([
  fetch('/api/users'),
  fetch('/api/posts')
]);

// Sequential execution
for (const url of urls) {
  const data = await fetch(url);
}

// Worker threads
const { Worker } = require('worker_threads');
const worker = new Worker('./heavy-task.js');
```