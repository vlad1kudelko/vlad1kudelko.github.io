---
title: "Message Queues: RabbitMQ, Kafka"
description: "Очереди сообщений: pub/sub, очереди задач, гарантия доставки"
heroImage: "../../../../assets/imgs/2026/02/06-message-queues.webp"
pubDate: "2026-02-06"
---

Message queues обеспечивают асинхронную коммуникацию.

```javascript
// RabbitMQ
const amqp = require('amqplib');

async function publish(queue, message) {
  const conn = await amqp.connect('amqp://localhost');
  const ch = await conn.createChannel();
  await ch.assertQueue(queue);
  ch.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
}

// Consumer
async function consume(queue, handler) {
  const conn = await amqp.connect('amqp://localhost');
  const ch = await conn.createChannel();
  await ch.assertQueue(queue);
  ch.consume(queue, async (msg) => {
    await handler(JSON.parse(msg.content));
    ch.ack(msg);
  });
}
```