---
title: "Микросервисы: межсервисная коммуникация"
description: "HTTP, gRPC, message queues — способы коммуникации микросервисов"
heroImage: "../../../../assets/imgs/2026/02/12-microservices-communication.webp"
pubDate: "2026-02-12"
---

Коммуникация между сервисами.

```javascript
// Service discovery
const service = await consul.service.get('user-service');

// HTTP клиент
const response = await axios.get('http://user-service/users/1');

// Circuit breaker
const circuit = new CircuitBreaker(userServiceCall, {
  timeout: 3000,
  errorThresholdPercentage: 50
});
```