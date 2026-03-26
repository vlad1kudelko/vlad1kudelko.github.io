---
title: "Graph Databases: Neo4j"
description: "Графовые базы данных: Neo4j, Cypher, relationships"
heroImage: "../../../../assets/imgs/2026/02/24-graph-databases.webp"
pubDate: "2026-02-24"
---

Графовые БД для связанных данных.

```cypher
// Cypher queries
CREATE (john:Person {name: 'John'})-[:KNOWS]->(jane:Person {name: 'Jane'})

MATCH (p:Person)-[:KNOWS]->(friend)
WHERE p.name = 'John'
RETURN friend

MATCH (user:Person {name: 'John'})-[:FOLLOWS*1..3]->(suggested)
WHERE NOT (user)-[:FOLLOWS]->(suggested)
RETURN suggested
```