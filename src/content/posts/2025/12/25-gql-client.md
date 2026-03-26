---
title: "GraphQL Client"
description: "GraphQL клиент: Apollo, urql"
heroImage: "../../../../assets/imgs/2025/12/25-gql-client.webp"
pubDate: "2025-12-25"
---

Apollo Client для GraphQL.

```typescript
import { useQuery, gql } from '@apollo/client';

const GET_USERS = gql`
  query GetUsers {
    users { id name }
  }
`;

function Users() {
  const { data } = useQuery(GET_USERS);
}
```
