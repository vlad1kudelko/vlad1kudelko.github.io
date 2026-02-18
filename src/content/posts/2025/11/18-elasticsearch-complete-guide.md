---
title: "Elasticsearch: полное руководство по полнотекстовому поиску и аналитике"
description: "Исчерпывающий гид по Elasticsearch: индексы, анализаторы, query DSL, агрегации, кластеризация и лучшие практики для продакшена."
heroImage: "../../../../assets/imgs/2025/11/18-elasticsearch-complete-guide.webp"
pubDate: "2025-11-18"
---

# Elasticsearch: полное руководство для разработчика

**Elasticsearch** — это распределённая поисковая система и аналитический движок с открытым исходным кодом, построенный на Apache Lucene. Он обеспечивает быстрый полнотекстовый поиск, структурированный поиск и аналитику в реальном времени.

В этой статье мы разберём индексы, анализаторы, Query DSL, агрегации, кластеризацию и лучшие практики использования Elasticsearch в продакшене.

## Установка и запуск

```bash
# Установка через apt (Debian/Ubuntu)
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | sudo apt-key add -
echo "deb https://artifacts.elastic.co/packages/8.x/apt stable main" | sudo tee /etc/apt/sources.list.d/elastic-8.x.list
sudo apt update && sudo apt install elasticsearch

# Установка через Homebrew (macOS)
brew install elasticsearch

# Запуск через Docker
docker run -d --name elasticsearch \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  elasticsearch:8.11.0

# Проверка работы
curl http://localhost:9200
# {
#   "name": "node-1",
#   "cluster_name": "docker-cluster",
#   "version": { "number": "8.11.0" }
# }
```

**Kibana** — веб-интерфейс для работы с Elasticsearch:

```bash
docker run -d --name kibana \
  -p 5601:5601 \
  -e "ELASTICSEARCH_HOSTS=http://elasticsearch:9200" \
  kibana:8.11.0
```

## Основные понятия

**Индекс** — коллекция документов с похожей структурой. Аналог таблицы в реляционных БД.

**Документ** — основная единица хранения в формате JSON. Аналог строки.

```json
{
  "_index": "products",
  "_id": "123",
  "_source": {
    "name": "iPhone 15 Pro",
    "price": 999,
    "category": "smartphones",
    "description": "Latest Apple flagship phone"
  }
}
```

**Тип документа** — в ES 7+ упразднён, один тип на индекс.

**Шард** — часть индекса, распределённая по узлам кластера.

**Реплика** — копия шарда для отказоустойчивости.

## Работа с индексами

### Создание индекса

```bash
# Базовое создание
PUT /products
{
  "settings": {
    "number_of_shards": 3,
    "number_of_replicas": 1
  },
  "mappings": {
    "properties": {
      "name": { "type": "text" },
      "price": { "type": "integer" },
      "category": { "type": "keyword" },
      "created_at": { "type": "date" }
    }
  }
}
```

**Получение информации:**

```bash
# Информация об индексе
GET /products

# Настройки индекса
GET /products/_settings

# Маппинг (схема)
GET /products/_mapping

# Статистика
GET /products/_stats
```

**Удаление:**

```bash
# Удалить индекс
DELETE /products

# Удалить несколько по паттерну
DELETE /products-*

# Проверка существования
HEAD /products
# 200 OK или 404 Not Found
```

### Alias (Псевдонимы)

```bash
# Создание алиаса
POST /products/_alias/products_active

# Создание с фильтром
POST /orders/_alias/orders_active
{
  "filter": {
    "term": { "status": "active" }
  }
}

# Атомарное переключение алиасов
POST /_aliases
{
  "actions": [
    { "remove": { "index": "products_v1", "alias": "products_current" }},
    { "add": { "index": "products_v2", "alias": "products_current" }}
  ]
}
```

## Типы данных

### Text vs Keyword

**text** — анализируемое поле для полнотекстового поиска:

```json
"name": {
  "type": "text",
  "analyzer": "standard"
}
```

**keyword** — неанализируемое поле для точных совпадений:

```json
"category": {
  "type": "keyword"
}
```

**Multi-field** — оба типа для одного поля:

```json
"name": {
  "type": "text",
  "fields": {
    "keyword": { "type": "keyword" }
  }
}
```

### Другие типы

```json
{
  "properties": {
    "integer": { "type": "integer" },
    "long": { "type": "long" },
    "float": { "type": "float" },
    "double": { "type": "double" },
    "boolean": { "type": "boolean" },
    "date": { "type": "date" },
    "date_range": { "type": "date_range" },
    "ip": { "type": "ip" },
    "geo_point": { "type": "geo_point" },
    "nested": { "type": "nested" },
    "object": { "type": "object" },
    "completion": { "type": "completion" }
  }
}
```

## Анализаторы

Анализаторы преобразуют текст в токены для поиска.

### Встроенные анализаторы

```bash
# Проверка работы анализатора
POST /_analyze
{
  "analyzer": "standard",
  "text": "The Quick Brown Fox"
}
# Tokens: ["the", "quick", "brown", "fox"]

# Simple analyzer (только буквы, нижний регистр)
POST /_analyze
{
  "analyzer": "simple",
  "text": "Hello World! 123"
}
# Tokens: ["hello", "world"]

# Keyword analyzer (без изменений)
POST /_analyze
{
  "analyzer": "keyword",
  "text": "Hello World"
}
# Tokens: ["Hello World"]
```

### Кастомный анализатор

```json
PUT /articles
{
  "settings": {
    "analysis": {
      "analyzer": {
        "my_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "stop", "my_stopwords"]
        }
      },
      "filter": {
        "my_stopwords": {
          "type": "stop",
          "stopwords": ["foo", "bar"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "my_analyzer"
      }
    }
  }
}
```

### Token фильтры

```json
{
  "filter": [
    "lowercase",      // В нижний регистр
    "stop",           // Удаление стоп-слов
    "stemmer",        // Стемминг
    "synonym",        // Синонимы
    "ngram",          // N-граммы
    "edge_ngram",     // Edge n-граммы (для autocomplete)
    "unique",         // Уникальные токены
    "length",         // Фильтр по длине
    "word_delimiter"  // Разделение слов
  ]
}
```

**Autocomplete с edge_ngram:**

```json
PUT /autocomplete_index
{
  "settings": {
    "analysis": {
      "analyzer": {
        "autocomplete": {
          "type": "custom",
          "tokenizer": "autocomplete_tokenizer"
        },
        "autocomplete_search": {
          "type": "standard"
        }
      },
      "tokenizer": {
        "autocomplete_tokenizer": {
          "type": "edge_ngram",
          "min_gram": 1,
          "max_gram": 20,
          "token_chars": ["letter", "digit"]
        }
      }
    }
  },
  "mappings": {
    "properties": {
      "suggest": {
        "type": "text",
        "analyzer": "autocomplete",
        "search_analyzer": "autocomplete_search"
      }
    }
  }
}
```

## CRUD операции

### Create (Создание)

```bash
# С автогенерацией ID
POST /products/_doc
{
  "name": "iPhone 15",
  "price": 999,
  "category": "smartphones"
}

# С явным ID
PUT /products/_doc/123
{
  "name": "Samsung Galaxy S24",
  "price": 899,
  "category": "smartphones"
}

# Массовая вставка (Bulk API)
POST /_bulk
{"index": {"_index": "products", "_id": "1"}}
{"name": "Product 1", "price": 100}
{"index": {"_index": "products", "_id": "2"}}
{"name": "Product 2", "price": 200}
{"index": {"_index": "products", "_id": "3"}}
{"name": "Product 3", "price": 300}
```

### Read (Чтение)

```bash
# Получить документ по ID
GET /products/_doc/123

# Получить несколько документов
GET /_mget
{
  "docs": [
    { "_index": "products", "_id": "1" },
    { "_index": "products", "_id": "2" }
  ]
}

# Проверка существования
HEAD /products/_doc/123
```

### Update (Обновление)

```bash
# Полное обновление (замена)
PUT /products/_doc/123
{
  "name": "Updated Name",
  "price": 1099
}

# Частичное обновление
POST /products/_update/123
{
  "doc": {
    "price": 1099
  }
}

# Обновление со скриптом
POST /products/_update/123
{
  "script": {
    "source": "ctx._source.price += params.increment",
    "params": {
      "increment": 100
    }
  }
}

# Upsert (обновление или вставка)
POST /products/_update/123
{
  "doc": {
    "price": 999
  },
  "doc_as_upsert": true
}
```

### Delete (Удаление)

```bash
# Удалить документ
DELETE /products/_doc/123

# Удалить по query
POST /products/_delete_by_query
{
  "query": {
    "term": { "category": "smartphones" }
  }
}
```

## Query DSL

### Term-level queries (для keyword, integer, date)

```bash
# Точное совпадение
GET /products/_search
{
  "query": {
    "term": {
      "category": { "value": "smartphones" }
    }
  }
}

# Несколько значений
GET /products/_search
{
  "query": {
    "terms": {
      "category": ["smartphones", "laptops"]
    }
  }
}

# Диапазон
GET /products/_search
{
  "query": {
    "range": {
      "price": {
        "gte": 500,
        "lte": 1000
      }
    }
  }
}

# Существует ли поле
GET /products/_search
{
  "query": {
    "exists": {
      "field": "discount"
    }
  }
}

# Wildcard (с подстановочными знаками)
GET /products/_search
{
  "query": {
    "wildcard": {
      "name": { "value": "iphone*" }
    }
  }
}

# Regular expression
GET /products/_search
{
  "query": {
    "regexp": {
      "name": "i[ph].+"
    }
  }
}

# Prefix
GET /products/_search
{
  "query": {
    "prefix": {
      "name": { "value": "sam" }
    }
  }
}
```

### Full-text queries (для text)

```bash
# Match (базовый поиск)
GET /products/_search
{
  "query": {
    "match": {
      "name": "iphone pro"
    }
  }
}

# Match с оператором AND
GET /products/_search
{
  "query": {
    "match": {
      "name": {
        "query": "iphone pro",
        "operator": "and"
      }
    }
  }
}

# Match phrase (точная фраза)
GET /products/_search
{
  "query": {
    "match_phrase": {
      "description": "latest apple"
    }
  }
}

# Match phrase с proximity
GET /products/_search
{
  "query": {
    "match_phrase": {
      "description": {
        "query": "latest apple",
        "slop": 3  // Допустимое расстояние между словами
      }
    }
  }
}

# Multi-match (по нескольким полям)
GET /products/_search
{
  "query": {
    "multi_match": {
      "query": "iphone pro",
      "fields": ["name", "description"],
      "type": "best_fields"
    }
  }
}

# Типы multi_match:
# - best_fields: лучшее совпадение
# - most_fields: сумма совпадений
# - cross_fields: как одно поле
# - phrase: точная фраза
# - phrase_prefix: фраза с префиксом

# Query string (синтаксис как в поисковиках)
GET /products/_search
{
  "query": {
    "query_string": {
      "query": "name:(iphone OR samsung) AND price:>500",
      "default_field": "name"
    }
  }
}

# Simple query string (безопаснее)
GET /products/_search
{
  "query": {
    "simple_query_string": {
      "query": "iphone pro +max",
      "fields": ["name", "description"]
    }
  }
}
```

### Compound queries

```bash
# Bool query (комбинация условий)
GET /products/_search
{
  "query": {
    "bool": {
      "must": [
        { "match": { "category": "smartphones" }}
      ],
      "filter": [
        { "range": { "price": { "gte": 500, "lte": 1000 } }}
      ],
      "should": [
        { "match": { "name": "pro" }}
      ],
      "must_not": [
        { "term": { "status": "discontinued" }}
      ]
    }
  }
}
```

**Параметры bool:**
- `must` — обязательное совпадение, влияет на score
- `filter` — обязательное совпадение, не влияет на score (кэшируется)
- `should` — желательное совпадение, влияет на score
- `must_not` — исключение

```bash
# Constant score (фиксированный score для фильтра)
GET /products/_search
{
  "query": {
    "constant_score": {
      "filter": {
        "term": { "category": "smartphones" }
      },
      "boost": 1.5
    }
  }
}

# Disjunction max (лучший из запросов)
GET /products/_search
{
  "query": {
    "dis_max": {
      "queries": [
        { "match": { "name": "iphone" }},
        { "match": { "description": "iphone" }}
      ],
      "tie_breaker": 0.3
    }
  }
}
```

### Special queries

```bash
# Match all (все документы)
GET /products/_search
{
  "query": {
    "match_all": {}
  }
}

# Match none (ни одного)
GET /products/_search
{
  "query": {
    "match_none": {}
  }
}

# More like this (похожие документы)
GET /products/_search
{
  "query": {
    "more_like_this": {
      "fields": ["name", "description"],
      "like": [{ "_index": "products", "_id": "123" }],
      "min_term_freq": 1,
      "max_query_terms": 12
    }
  }
}

# Geo-запросы
GET /places/_search
{
  "query": {
    "geo_distance": {
      "distance": "5km",
      "location": {
        "lat": 55.7558,
        "lon": 37.6176
      }
    }
  }
}

# Geo bounding box
GET /places/_search
{
  "query": {
    "geo_bounding_box": {
      "location": {
        "top_left": { "lat": 56, "lon": 37 },
        "bottom_right": { "lat": 55, "lon": 38 }
      }
    }
  }
}
```

## Sorting и Pagination

```bash
# Сортировка
GET /products/_search
{
  "sort": [
    { "price": { "order": "asc" }},
    { "name": { "order": "desc" }},
    "_score"  // По релевантности
  ]
}

# Пагинация (from/size)
GET /products/_search
{
  "from": 0,
  "size": 20
}

# Deep pagination problem (медленно при больших from)
GET /products/_search
{
  "from": 10000,
  "size": 20
}

# Search After (для глубокой пагинации)
GET /products/_search
{
  "size": 20,
  "sort": [{ "price": "asc" }, { "_id": "asc" }],
  "search_after": [999, "prod_123"]
}

# Scroll (для экспорта всех данных)
GET /products/_search?scroll=1m
{
  "size": 1000,
  "query": { "match_all": {} }
}

# Затем:
GET /_search/scroll
{
  "scroll_id": "DXF1ZXJ5QW5kRmV0Y2g...",
  "scroll": "1m"
}

# Point in time (альтернатива scroll)
POST /products/_pit?keep_alive=1m

# Затем использовать pit.id в запросах
```

## Агрегации

Агрегации позволяют выполнять аналитику по данным.

### Metrics aggregations

```bash
# Статистика по числовому полю
GET /products/_search
{
  "size": 0,
  "aggs": {
    "price_stats": {
      "stats": { "field": "price" }
    }
  }
}
# Возвращает: count, min, max, avg, sum

# Отдельные метрики
GET /products/_search
{
  "size": 0,
  "aggs": {
    "avg_price": { "avg": { "field": "price" }},
    "min_price": { "min": { "field": "price" }},
    "max_price": { "max": { "field": "price" }},
    "sum_price": { "sum": { "field": "price" }},
    "cardinality": { "cardinality": { "field": "category" }}
  }
}

# Percentiles
GET /products/_search
{
  "size": 0,
  "aggs": {
    "price_percentiles": {
      "percentiles": {
        "field": "price",
        "percents": [50, 90, 95, 99]
      }
    }
  }
}
```

### Bucket aggregations

```bash
# Terms aggregation (группировка)
GET /products/_search
{
  "size": 0,
  "aggs": {
    "categories": {
      "terms": {
        "field": "category",
        "size": 10
      }
    }
  }
}

# Range aggregation
GET /products/_search
{
  "size": 0,
  "aggs": {
    "price_ranges": {
      "range": {
        "field": "price",
        "ranges": [
          { "to": 100 },
          { "from": 100, "to": 500 },
          { "from": 500 }
        ]
      }
    }
  }
}

# Date histogram (временные серии)
GET /orders/_search
{
  "size": 0,
  "aggs": {
    "orders_over_time": {
      "date_histogram": {
        "field": "created_at",
        "calendar_interval": "month"
      },
      "aggs": {
        "revenue": {
          "sum": { "field": "total_amount" }
        }
      }
    }
  }
}

# Histogram (числовой)
GET /products/_search
{
  "size": 0,
  "aggs": {
    "price_histogram": {
      "histogram": {
        "field": "price",
        "interval": 100
      }
    }
  }
}

# Filters aggregation
GET /products/_search
{
  "size": 0,
  "aggs": {
    "status_buckets": {
      "filters": {
        "filters": {
          "in_stock": { "term": { "status": "in_stock" }},
          "low_stock": { "range": { "stock": { "lt": 10 }}},
          "out_of_stock": { "term": { "status": "out_of_stock" }}
        }
      }
    }
  }
}
```

### Nested aggregations

```bash
# Агрегация внутри агрегации
GET /products/_search
{
  "size": 0,
  "aggs": {
    "categories": {
      "terms": { "field": "category" },
      "aggs": {
        "price_stats": {
          "stats": { "field": "price" }
        },
        "brands": {
          "terms": { "field": "brand" }
        }
      }
    }
  }
}
```

### Pipeline aggregations

```bash
# Агрегация по результатам другой агрегации
GET /products/_search
{
  "size": 0,
  "aggs": {
    "monthly_sales": {
      "date_histogram": {
        "field": "date",
        "calendar_interval": "month"
      },
      "aggs": {
        "total": { "sum": { "field": "amount" }}
      }
    },
    "moving_avg": {
      "moving_fn": {
        "buckets_path": "monthly_sales>total",
        "script": "values.sum() / values.length"
      }
    }
  }
}
```

## Python с Elasticsearch

```python
from elasticsearch import Elasticsearch

# Подключение
es = Elasticsearch(
    ["http://localhost:9200"],
    basic_auth=("elastic", "password")
)

# Индексация документа
doc = {
    "name": "iPhone 15 Pro",
    "price": 999,
    "category": "smartphones"
}
response = es.index(index="products", id=1, document=doc)

# Поиск
response = es.search(
    index="products",
    query={
        "match": {
            "name": "iphone"
        }
    },
    size=10
)

for hit in response["hits"]["hits"]:
    print(hit["_source"])

# Агрегации
response = es.search(
    index="products",
    size=0,
    aggs={
        "categories": {
            "terms": {"field": "category"}
        }
    }
)

for bucket in response["aggregations"]["categories"]["buckets"]:
    print(f"{bucket['key']}: {bucket['doc_count']}")

# Bulk indexing
from elasticsearch.helpers import bulk

actions = [
    {
        "_index": "products",
        "_id": i,
        "_source": {"name": f"Product {i}", "price": i * 100}
    }
    for i in range(1, 1001)
]

bulk(es, actions)
```

## Кластеризация

### Узлы кластера

**Master node** — управляет кластером (создание индексов, распределение шардов).

**Data node** — хранит данные, выполняет CRUD и агрегации.

**Coordinating node** — только маршрутизация запросов.

**Ingest node** — обработка данных перед индексацией.

### Настройка кластера

```yaml
# elasticsearch.yml
cluster.name: production-cluster
node.name: node-1
node.roles: [master, data]

network.host: 0.0.0.0

discovery.seed_hosts: ["host1", "host2", "host3"]
cluster.initial_master_nodes: ["node-1", "node-2", "node-3"]
```

### Health status

```bash
# Статус кластера
GET /_cluster/health
# green - все шарды назначены
# yellow - все primary назначены, но не все replica
# red - есть неназначенные primary

# Детальная информация
GET /_cluster/health?pretty

# Статистика по узлам
GET /_nodes/stats

# Шарды
GET /_cat/shards?v
GET /_cat/nodes?v
GET /_cat/indices?v
```

### Shard allocation

```bash
# Перераспределение шардов
POST /_cluster/reroute

# Исключение узла
PUT /_cluster/settings
{
  "transient": {
    "cluster.routing.allocation.exclude._name": "node-to-exclude"
  }
}
```

## Best Practices

### Индексация

```bash
# Используйте Bulk API для массовой вставки
POST /_bulk
{"index": {"_index": "logs", "_id": "1"}}
{"message": "log 1"}
{"index": {"_index": "logs", "_id": "2"}}
{"message": "log 2"}

# Refresh interval для быстрой индексации
PUT /logs/_settings
{
  "refresh_interval": "30s"
}

# После индексации верните
PUT /logs/_settings
{
  "refresh_interval": "1s"
}
```

### Query optimization

```bash
# Используйте filter context для бинарных условий
GET /products/_search
{
  "query": {
    "bool": {
      "filter": [
        { "range": { "price": { "gte": 100 }}},
        { "term": { "status": "active" }}
      ],
      "must": [
        { "match": { "name": "iphone" }}
      ]
    }
  }
}

# Избегайте wildcard в начале паттерна
# ❌ Плохо: *phone
# ✅ Хорошо: phone*

# Используйте source filtering
GET /products/_search
{
  "_source": ["name", "price"],
  "query": { "match_all": {} }
}
```

### Mapping best practices

```json
{
  "mappings": {
    "properties": {
      "name": {
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword" }
        }
      },
      "category": { "type": "keyword" },
      "price": { "type": "integer" },
      "created_at": { "type": "date" },
      "description": {
        "type": "text",
        "analyzer": "standard",
        "search_analyzer": "standard"
      }
    }
  }
}
```

### Index lifecycle management (ILM)

```bash
# Создание политики
PUT /_ilm/policy/logs_policy
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_size": "50gb",
            "max_age": "7d"
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": { "number_of_shards": 1 },
          "forcemerge": { "max_num_segments": 1 }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "freeze": {}
        }
      },
      "delete": {
        "min_age": "90d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}

# Применение политики к индексу
PUT /logs
{
  "settings": {
    "index.lifecycle.name": "logs_policy",
    "index.lifecycle.rollover_alias": "logs_write"
  }
}
```

### Monitoring

```bash
# Slow logs
PUT /_cluster/settings
{
  "transient": {
    "index.search.slowlog.threshold.query.warn": "10s",
    "index.search.slowlog.threshold.fetch.warn": "1s",
    "index.indexing.slowlog.threshold.index.warn": "10s"
  }
}

# Stats monitoring
GET /_nodes/stats/jvm
GET /_nodes/stats/fs
GET /_nodes/stats/os
```

## Заключение

Elasticsearch — это мощный инструмент для полнотекстового поиска и аналитики:

- **Гибкая схема** — динамический маппинг и различные типы данных
- **Мощный Query DSL** — сложные запросы любой комбинации
- **Агрегации** — аналитика в реальном времени
- **Масштабируемость** — автоматическое распределение данных
- **Экосистема** — Kibana, Logstash, Beats для полной observability

Используйте Elasticsearch для поиска, логирования, мониторинга и аналитики в реальном времени.
