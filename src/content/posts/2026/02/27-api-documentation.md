---
title: "Документация API"
description: "OpenAPI/Swagger: генерация, документация, интерактивные инструменты"
heroImage: "../../../../assets/imgs/2026/02/27-api-documentation.webp"
pubDate: "2026-02-27"
---

OpenAPI для документирования API.

```yaml
openapi: 3.0.0
info:
  title: My API
  version: 1.0.0
paths:
  /users:
    get:
      summary: Get all users
      responses:
        '200':
          description: List of users
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
```