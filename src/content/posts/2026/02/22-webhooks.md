---
title: "Webhooks"
description: "Webhook обработка: подпись, retry, security"
heroImage: "../../../../assets/imgs/2026/02/22-webhooks.webp"
pubDate: "2026-02-22"
---

Webhooks для интеграций между сервисами.

```javascript
const crypto = require('crypto');

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const expected = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  if (`sha256=${expected}` !== signature) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process webhook
  console.log('Webhook received:', req.body);
  
  res.status(200).send('OK');
});
```