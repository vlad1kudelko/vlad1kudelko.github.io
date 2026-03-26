---
title: "Background Jobs: Bull, Celery"
description: "Очереди задач: background processing, workers, scheduling"
heroImage: "../../../../assets/imgs/2026/02/28-background-jobs.webp"
pubDate: "2026-02-28"
---

Background jobs для асинхронной обработки.

```javascript
const Queue = require('bull');
const emailQueue = new Queue('emails', 'redis://localhost:6379');

emailQueue.add({
  to: 'user@example.com',
  subject: 'Welcome',
  template: 'welcome'
});

emailQueue.process(async (job) => {
  await sendEmail(job.data);
});

emailQueue.on('failed', (job, err) => {
  console.error('Job failed:', err);
});
```