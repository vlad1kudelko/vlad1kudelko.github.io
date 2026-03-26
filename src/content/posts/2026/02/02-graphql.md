---
title: "GraphQL"
description: "GraphQL: гибкий язык запросов, схемы, резолверы"
heroImage: "../../../../assets/imgs/2026/02/02-graphql.webp"
pubDate: "2026-02-02"
---

GraphQL — альтернатива REST с гибкими запросами.

```javascript
const typeDefs = `
  type User {
    id: ID!
    name: String!
    posts: [Post!]!
  }
  
  type Query {
    users: [User!]!
    user(id: ID!): User
  }
  
  type Mutation {
    createUser(name: String!): User!
  }
`;

const resolvers = {
  Query: {
    users: () => db.users.findAll(),
    user: (_, { id }) => db.users.findById(id)
  }
};
```