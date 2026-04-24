---
title: "Full-text search: сравнение — PostgreSQL vs Elasticsearch"
description: "Сравните Full-text search: встроенный поиск PostgreSQL vs Elasticsearch. Выберите оптимальный поиск для вашего проекта."
pubDate: "2026-02-19"
heroImage: "../../../../assets/imgs/2026/02/19-fulltext-search.webp"
---

# Full-text search: PostgreSQL vs Elasticsearch

Full-text search: PostgreSQL vs Elasticsearch

Когда речь заходит о полнотекстовом поиске, у разработчиков сразу возникает дилемма: встроенный поиск PostgreSQL или специализированная поисковая система Elasticsearch? Выбор здесь неочевиден, и многие проекты переплачивают или теряют в производительности из-за неверной оценки требований. Давайте разберемся, где, как и почему каждая из технологий проявляет себя лучше.

## Архитектурное противостояние: База данных против Поискового движка

PostgreSQL предлагает встроенный full-text search, который работает на том же сервере, хранит данные в том же месте и использует общую транзакционную модель. Elasticsearch — распределенная поисковая система, построенная на Apache Lucene, с собственным хранилищем, API и архитектурой.

```sql
-- Пример full-text поиска в PostgreSQL
SELECT 
    title,
    ts_headline(content, websearch_to_tsquery('jaguar car'), 'StartSel=<, StopSel=>') AS highlight
FROM 
    articles
WHERE 
    to_tsvector('russian', content) @@ to_tsquery('russian', &apos;jaguar & car&apos;)
ORDER BY 
    ts_rank(to_tsvector(&apos;russian&apos;, content), to_tsquery(&apos;russian&apos;, &apos;jaguar & car&apos;)) DESC
LIMIT 10;
```

```json
// Пример поиска в Elasticsearch
GET /articles/_search
{
  "query": {
    "match": {
      "content": {
        "query": "jaguar car",
        "operator": "and"
      }
    }
  },
  "highlight": {
    "fields": {
      "content": {
        "pre_tags": ["<"],
        "post_tags": [">"]
      }
    }
  },
  "sort": [
    {
      "_score": {
        "order": "desc"
      }
    }
  ]
}
```

## Как это работает под капотом

### PostgreSQL Full-Text Search

Встроенный поиск PostgreSQL использует стандартный подход на основе векторов терминов. Процесс включает:

1. **Токенизация**: Текст разбивается на токены (слова)
2. **Нормализация**: Токены приводятся к начальной форме (лемматизация)
3. **Фильтрация стоп-слов**: Удаление общеупотребительных слов
4. **Векторизация**: Создание tsvector из токенов
5. **Ранжирование**: Вычисление релевантности на основе частоты и позиции

Для русского языка это особенно важно из-за морфологии. PostgreSQL использует словари для обработки словоформ.

```sql
-- Настройка русского словаря
ALTER TEXT SEARCH CONFIGURATION russian ALTER MAPPING FOR asciiword, hword_asciipart, hword, hword_part, word WITH unaccent, russian_stem;
```

### Elasticsearch

Elasticsearch строит инвертированный индекс, где ключами являются термины, а значениями — документы, содержащие эти термины:

1. **Анализ**: Токенизация, нормализация, фильтрация
2. **Инвертированный индекс**: Построение структуры "термин -> документы"
3. **Векторизация TF-IDF**: Вычисление весов терминов
4. **BM25**: Алгоритм ранжирования по умолчанию

```json
// Конфигурация анализатора для русского
PUT /articles/_settings
{
  "analysis": {
    "analyzer": {
      "russian": {
        "tokenizer": "standard",
        "filter": [
          "lowercase",
          "russian_stop",
          "russian_stemmer"
        ]
      }
    },
    "filter": {
      "russian_stop": {
        "type": "stop",
        "stopwords": "_russian_"
      },
      "russian_stemmer": {
        "type": "stemmer",
        "name": "russian"
      }
    }
  }
}
```

## Производительность и масштабируемость

PostgreSQL отлично справляется с поиском в пределах одной таблицы (до миллионов записей), но при росте объема данных производительность падает. Инвертированные индексы в PostgreSQL хранятся на диске, что замедляет запросы.

Elasticengine изначально создан для распределенных систем. Шардирование, репликация и горизонтальное масштабирование — его сильные стороны. Однако это требует больше ресурсов и сложнее в настройке.

```sql
-- Оптимизация в PostgreSQL
CREATE INDEX articles_content_idx ON articles USING gin(to_tsvector('russian', content));

-- Партиционирование больших таблиц
CREATE TABLE articles_2023 PARTITION OF articles
    FOR VALUES FROM (&apos;2023-01-01&apos;) TO (&apos;2024-01-01&apos;);
```

```json
// Шардирование в Elasticsearch
PUT /articles/_settings
{
  "number_of_shards": 5,
  "number_of_replicas": 1
}
```

## Узкие места, которые нужно учесть

### PostgreSQL

- **Ограниченность функциональности**: Нет advanced features типа fuzzy search, synonym search
- **Производительность на больших объемах**: Сложно конкурировать с специализированными системами
- **Ресурсы**: Поиск в PostgreSQL увеличивает нагрузку на основной БД
- **Транзакционная безопасность**: В отличие от Elasticsearch, работает в рамках транзакций

### Elasticsearch

- **Сложность**: Требует отдельного инфраструктурного слоя
- **Ресурсы**: Потребляет больше памяти и CPU
- **Консистентность**: Eventual consistency по умолчанию
- **Обновление документов**: Не транзакционный подход
- **Стоимость лицензия**: В коммерческих версиях может быть дорого

## Когда что выбирать

Выбирайте PostgreSQL, если:
- У вас небольшая или средняя база данных (до 10M документов)
- Требуется ACID-совместимость
- Поиск — не основная функция приложения
- Нельзя поддерживать отдельный сервис поиска
- Бюджет и ресурсы ограничены

Выбирайте Elasticsearch, если:
- Требуется advanced search (fuzzy, synonyms, geo)
- Данных много (10M+ документов)
- Нужна высокая скорость поиска и масштабируемость
- Поиск — ключевой функционал
- Есть ресурсы для поддержки отдельного сервиса

Мой личный опыт подсказывает, что многие проекты переплачивают за Elasticsearch, когда могли бы обойтись PostgreSQL. В то же время, для сложных сценариев поиска попытка встроить это в реляционную БД приведет к катастрофе. Тщательно оцените ваши требования к поиску перед выбором.