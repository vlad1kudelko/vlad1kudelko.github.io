---
title: "ORM: SQLAlchemy, Prisma, TypeORM"
description: "Object-Relational Mapping: паттерны, запросы, миграции"
heroImage: "../../../../assets/imgs/2026/02/11-orm-patterns.webp"
pubDate: "2026-02-11"
---

ORM упрощает работу с базами данных.

```python
# SQLAlchemy
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    name = Column(String)
    email = Column(String, unique=True)
    
    posts = relationship("Post", back_populates="author")

# Query
user = session.query(User).filter_by(email='test@test.com').first()
posts = user.posts
```