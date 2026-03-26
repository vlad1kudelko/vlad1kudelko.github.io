---
title: "Тестирование backend"
description: "Unit, integration, e2e тесты: Jest, Supertest, TestContainers"
heroImage: "../../../../assets/imgs/2026/02/14-testing-backend.webp"
pubDate: "2026-02-14"
---

Тестирование backend приложений.

```javascript
const request = require('supertest');
const app = require('../app');

describe('API Tests', () => {
  it('GET /users should return 200', async () => {
    const res = await request(app).get('/users');
    expect(res.status).toBe(200);
    expect(res.body).toBeInstanceOf(Array);
  });
  
  it('POST /users should create user', async () => {
    const res = await request(app)
      .post('/users')
      .send({ name: 'John', email: 'john@test.com' });
    expect(res.status).toBe(201);
  });
});
```