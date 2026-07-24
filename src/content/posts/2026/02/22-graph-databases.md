---
title: "Graph базы данных, Neo4j, Cypher queries"
description: "Изучите Graph базы данных: Neo4j для хранения графов, Cypher queries. Моделируйте сложные связи между данными эффективно."
pubDate: "2026-02-22"
---

# Graph БД: Neo4j, Cypher queries

Neo4j подходит для задач, где ключевая информация хранится в связях: рекомендательные системы, обнаружение мошенничества, граф зависимостей, социальные сети. Обход графа на 3-6 уровней в Neo4j занимает миллисекунды -- тот же запрос в PostgreSQL через JOIN не масштабируется.

Социальные сети, системы рекомендаций, граф зависимостей, маршрутизация -- у всего этого общая черта: ключевая информация хранится в связях между сущностями, а не в самих сущностях. Реляционные базы данных умеют делать JOIN, но рекурсивные обходы графа глубиной 5-6 уровней превращаются в кошмар производительности.

> **Key Takeaways**
> - Cypher запрос `MATCH (a)-[:FOLLOWS*1..3]->(b)` находит связи до 3 уровней глубины -- в SQL это 6+ JOIN'ов
> - Рекомендательная система "что купили похожие пользователи" -- 1 Cypher запрос против 4 JOIN'ов в SQL
> - Neo4j GDS (Graph Data Science) содержит готовые алгоритмы: PageRank, community detection, shortest path
> - Apache AGE -- расширение PostgreSQL с поддержкой Cypher; подходит когда нужна базовая граф-функциональность без отдельного сервера
> - Граф-БД проигрывает реляционным на высоких write throughput и аналитике без граф-обходов

## Когда реляционная модель ломается

Классический пример, запрос "найди всех друзей друзей пользователя до 3 уровней":

```sql
-- SQL: боль уже на 3 уровне
SELECT DISTINCT u3.*
FROM users u1
JOIN friendships f1 ON u1.id = f1.user_id
JOIN users u2 ON f1.friend_id = u2.id
JOIN friendships f2 ON u2.id = f2.user_id
JOIN users u3 ON f2.friend_id = u3.id
JOIN friendships f3 ON u3.id = f3.user_id
WHERE u1.id = 42;
```

На 6 уровнях этот запрос превращается в 12 JOIN'ов и перестаёт работать. Neo4j делает то же самое одной строкой.

## Neo4j: основные концепции

Граф состоит из:
- **Узлов (Nodes)**, сущности: `(:User)`, `(:Product)`, `(:City)`
- **Рёбер (Relationships)**, связи: `-[:FOLLOWS]->`, `-[:PURCHASED]->`
- **Свойств (Properties)**, атрибуты узлов и рёбер: `{name: "Alice", age: 30}`
- **Меток (Labels)**, типы узлов: `User`, `Admin`, `Product`

## Cypher, язык запросов

Cypher визуально отражает структуру графа. ASCII-паттерны в запросах описывают то, что нужно найти.

### Создание данных

```cypher
// Создание пользователей
CREATE (alice:User {id: 1, name: 'Alice', age: 30})
CREATE (bob:User {id: 2, name: 'Bob', age: 25})
CREATE (carol:User {id: 3, name: 'Carol', age: 35})

// Создание продуктов
CREATE (p1:Product {id: 101, name: 'Ноутбук', price: 80000})
CREATE (p2:Product {id: 102, name: 'Мышь', price: 2000})

// Создание связей
MATCH (a:User {name: 'Alice'}), (b:User {name: 'Bob'})
CREATE (a)-[:FOLLOWS {since: date('2024-01-15')}]->(b)

MATCH (u:User {name: 'Alice'}), (p:Product {name: 'Ноутбук'})
CREATE (u)-[:PURCHASED {date: date('2024-02-01'), quantity: 1}]->(p)
```

### Поиск по графу

```cypher
// Все подписчики Alice
MATCH (alice:User {name: 'Alice'})<-[:FOLLOWS]-(follower:User)
RETURN follower.name, follower.age

// Друзья друзей до 3 уровней, вот оно!
MATCH (alice:User {name: 'Alice'})-[:FOLLOWS*1..3]->(connection:User)
WHERE connection <> alice
RETURN DISTINCT connection.name, connection.age

// Shortest path между пользователями
MATCH path = shortestPath(
 (alice:User {name: 'Alice'})-[:FOLLOWS*]-(carol:User {name: 'Carol'})
)
RETURN [node IN nodes(path) | node.name] AS path_names,
 length(path) AS hops
```

### Рекомендательная система

Классический граф-запрос: "что купили люди, которые купили то же, что и ты":

```cypher
MATCH (me:User {id: 1})-[:PURCHASED]->(product:Product)
 <-[:PURCHASED]-(similar:User)-[:PURCHASED]->(recommendation:Product)
WHERE NOT (me)-[:PURCHASED]->(recommendation)
 AND me <> similar
RETURN recommendation.name,
 COUNT(DISTINCT similar) AS common_buyers,
 AVG(recommendation.price) AS avg_price
ORDER BY common_buyers DESC
LIMIT 10
```

Этот запрос в Neo4j выполняется за миллисекунды на графе с миллионами узлов. В SQL он потребовал бы нескольких JOIN'ов и работал бы значительно медленнее.

### Работа с весами рёбер

```cypher
// Граф дорог между городами с расстояниями
CREATE (msk:City {name: 'Москва'})
CREATE (spb:City {name: 'Санкт-Петербург'})
CREATE (nvg:City {name: 'Нижний Новгород'})

MATCH (m:City {name: 'Москва'}), (s:City {name: 'Санкт-Петербург'})
CREATE (m)-[:ROAD {distance_km: 710, highway: 'M10'}]->(s)

MATCH (m:City {name: 'Москва'}), (n:City {name: 'Нижний Новгород'})
CREATE (m)-[:ROAD {distance_km: 411, highway: 'M7'}]->(n)

// Shortest weighted path (Dijkstra)
MATCH (start:City {name: 'Санкт-Петербург'}), (end:City {name: 'Нижний Новгород'})
CALL apoc.algo.dijkstra(start, end, 'ROAD', 'distance_km')
YIELD path, weight
RETURN [n IN nodes(path) | n.name] AS route, weight AS total_km
```

## Python и Neo4j

```python
from neo4j import GraphDatabase

driver = GraphDatabase.driver(
 "bolt://localhost:7687",
 auth=("neo4j", "password")
)

def get_recommendations(user_id: int, limit: int = 10):
 query = """
 MATCH (me:User {id: $user_id})-[:PURCHASED]->(product:Product)
 <-[:PURCHASED]-(similar:User)-[:PURCHASED]->(rec:Product)
 WHERE NOT (me)-[:PURCHASED]->(rec) AND me <> similar
 RETURN rec.name AS name,
 rec.price AS price,
 COUNT(DISTINCT similar) AS score
 ORDER BY score DESC
 LIMIT $limit
 """
 with driver.session() as session:
 result = session.run(query, user_id=user_id, limit=limit)
 return [dict(record) for record in result]

recommendations = get_recommendations(user_id=1)
for rec in recommendations:
 print(f"{rec['name']}, {rec['price']} руб. (score: {rec['score']})")
```

## Где графовая БД проигрывает

Граф, не универсальное решение. Если основная нагрузка, это запись тысяч транзакций в секунду без сложных связей, Neo4j только добавит накладные расходы. Аналитика на плоских данных (агрегации по миллиардам строк), территория ClickHouse, не Neo4j. Полнотекстовый поиск, Elasticsearch.

Графовая БД выигрывает конкретно тогда, когда запросы traversal-характера: "найди всё, что связано с X через N шагов". Рекомендации, обнаружение мошенничества через цепочки транзакций, анализ зависимостей в монорепозитории, knowledge graph, здесь реляционная модель физически не может конкурировать.

## Альтернативы Neo4j

**Apache AGE**, расширение PostgreSQL с поддержкой Cypher. Если уже есть Postgres и нужна базовая графовая функциональность без отдельного сервера, AGE позволяет писать Cypher-запросы прямо через psql.

**Amazon Neptune**, managed graph database в AWS, поддерживает Gremlin и SPARQL. Разумный выбор, если инфраструктура уже в AWS и нет желания заниматься операционкой Neo4j.

**ArangoDB**, мультимодельная БД (документы + граф + ключ-значение). Полезна когда нужны оба режима в одном сервисе, хотя граф-часть уступает Neo4j по зрелости.

## Итог

Neo4j -- специализированный инструмент для конкретного класса задач: traversal-запросы, рекомендации, цепочки связей. Если ядро продукта -- это связи между сущностями, граф-БД незаменима. Для остальных задач -- PostgreSQL и ClickHouse по-прежнему лучший выбор.

Следующая тема -- [Column-oriented БД ClickHouse для аналитики](/posts/2026/02/23-column-oriented-databases/).
