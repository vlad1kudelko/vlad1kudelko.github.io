---
title: "LlamaIndex: работа с документами — Indexes, query"
description: "Обрабатывайте документы с LlamaIndex: Indexes, query engines, routers. Создавайте QA-системы по вашим данным."
pubDate: "2026-01-12"
heroImage: "../../../../assets/imgs/2026/01/12-llamanode-index.webp"
---

# LlamaIndex: работа с документами

Обработка документов в системах ИИ — это не просто чтение текста. Каждая организация накапливает тонны разнородных данных: PDF-отчеты, транскрипты встреч, техническая документация, базы знаний. Прямое использование этих данных в LLM приводит к "забыванию" контекста, галлюцинациям и неэффективным ответам. LlamaIndex решает эту проблему, предоставляя структурированный подход к индексации и запросам документов.

## Индексы: Основа работы с документами

LlamaIndex строит индексы поверх ваших документов, создавая семантическую структуру, которую LLM может эффективно использовать. Индексы — это не просто векторы, а многослойные системы, включающие узлы, отношения и метаданные.

### Типы индексов и их применение

**VectorStoreIndex** — базовый тип, представляющий документы как векторы в многомерном пространстве. Каждый документ (или его фрагмент) преобразуется в эмбеддинг с помощью моделей вроде OpenAI ADA или BERT.

```python
from llama_index import VectorStoreIndex, SimpleDirectoryReader

# Загрузка документов
documents = SimpleDirectoryReader("./data").load_data()

# Создание индекса
index = VectorStoreIndex.from_documents(documents)

# Сохранение индекса для последующего использования
index.storage_context.persist("./storage")
```

**TreeIndex** строит иерархическую структуру документа, рекурсивно объединяя узлы. Идеален для длинных документов, где важно сохранить контекстуальную целостность.

```python
from llama_index import TreeIndex

# Создание древовидного индекса
tree_index = TreeIndex.from_documents(documents)

# Построение дерева с настраиваемыми параметрами
tree_index = TreeIndex.from_documents(
    documents,
    child_branch_factor=3,  # Сколько дочерних узлов у каждого родителя
    levels=3,  # Глубина дерева
)
```

**ListIndex** — простая структура, где каждый документ или фрагмент представлен отдельным узлом без иерархии. Подходит для независимых фрагментов текста.

**KeywordTableIndex** использует ключевые слова вместо семантики. Полезен, когда важны точные совпадения терминов.

```python
from llama_index import KeywordTableIndex

# Индекс на основе ключевых слов
keyword_index = KeywordTableIndex.from_documents(documents)
```

### Оптимизация индексов

Производительность зависит от качества индексов. Ключевые параметры:

- **Разделение документов (Chunking)**: Оптимальный размер фрагмента — 256-1024 токенов. Слишком мелкие фрагменты теряют контекст, слишком крупные — включают шум.
- **Выбор модели эмбеддинга**: OpenAI ADA быстр, но платный; BERT медленнее, но бесплатен; местные модели типа `sentence-transformers` обеспечивают приватность, но требуют GPU.
- **Метаданные**: Добавление метаданных (источник, дата, автор) улучшает фильтрацию.

```python
from llama_index import ServiceContext
from llama_index.node_parser import SentenceSplitter

# Настройка контекста индексирования
service_context = ServiceContext.from_defaults(
    # Модель эмбеддинга
    embed_model="local:BAAI/bge-small-en-v1.5",
    # Парсер текста
    node_parser=SentenceSplitter(
        chunk_size=512,  # токенов
        chunk_overlap=50,  # перекрытие между фрагментами
        separator=" ",  # разделитель
    ),
    # Лимит на запросы к LLM
    llm_predictor="gpt-3.5-turbo",
)

index = VectorStoreIndex.from_documents(
    documents,
    service_context=service_context,
)
```

## Query Engines: Извлечение знаний из индексов

Индексы бесполезны без механизмов запросов. Query Engines в LlamaIndex — это абстракция, которая определяет, как извлекать и формулировать ответы на основе индексированных данных.

### Типы запросов

**RetrievalQueryEngine** — базовый механизм, который:
1. Находит релевантные узлы из индекса
2. Формулирует контекстный промпт
3. Передает промпт в LLM
4. Возвращает ответ

```python
from llama_index import VectorStoreIndex

# Создание индекса
index = VectorStoreIndex.from_documents(documents)

# Создание query engine
query_engine = index.as_query_engine(
    response_mode="tree_summarize",  # режим ответа
    similarity_top_k=3,  # количество релевантных узлов
    verbose=True,  # вывод промежуточных шагов
)

# Запрос
response = query_engine.query("Каковы основные риски проекта X?")
print(response)
```

**RouterQueryEngine** направляет запросы в разные query engines на основе анализа вопроса. Полезен, когда в системе есть разные типы данных.

```python
from llama_index import RouterQueryEngine, QueryEngineTool
from llama_index.query_engine import RetrieverQueryEngine
from llama_index.retrievers import VectorIndexRetriever

# Создаем разные query engines
vector_engine = VectorStoreIndex.from_documents(documents).as_query_engine()

# Создаем инструменты для роутера
tools = [
    QueryEngineTool.from_defaults(
        vector_engine,
        description="Используй для вопросов о рисках и проектах"
    ),
    QueryEngineTool.from_defaults(
        another_engine,
        description="Используй для технических вопросов о реализации"
    )
]

# Создаем роутер
router_query_engine = RouterQueryEngine.from_defaults(
    tools,
    select_multi=False,  # выбирать только один инструмент
    verbose=True,
)

# Запрос
response = router_query_engine.query("Опиши архитектуру системы")
```

### Оптимизация запросов

**Режимы ответа**:
- `default`: базовый режим с ретривом и LLM
- `tree_summarize`: рекурсивная агрегация результатов
- `compact`: компактная формулировка промпта
- `refine`: итеративное уточнение ответа

**Параметры ретрива**:
- `similarity_top_k`: количество релевантных узлов
- `similarity_cutoff`: порог релевантности
- `verbose`: вывод отладочной информации

```python
# Настройка query engine
query_engine = index.as_query_engine(
    response_mode="tree_summarize",
    similarity_top_k=5,
    verbose=True,
    node_postprocessors=[
        # Фильтрация по метаданным
        MetadataNodePostFilter(
            key="date",
            value="2023",
            operation="gt",  # больше чем
        ),
        # Фильтрация по релевантности
        SimilarityPostprocessor(similarity_cutoff=0.7),
    ],
)
```

## Routers: Многоиндексная архитектура

В реальных системах данные редко бывают однородными. Routers позволяют работать с несколькими индексами, выбирая наиболее подходящий для каждого запроса.

### Типы роутеров

**IndexRouterQueryEngine** выбирает индекс на основе запроса:

```python
from llama_index.indices.query import IndexRouterQueryEngine
from llama_index.indices.query.schema import QueryBundle
from llama_index.query_engine.retriever_query_engine import RetrieverQueryEngine

# Создаем разные индексы
doc_index = VectorStoreIndex.from_documents(documents)
metadata_index = KeywordTableIndex.from_documents(documents)

# Создаем query engines
doc_engine = doc_index.as_query_engine()
metadata_engine = metadata_index.as_query_engine()

# Определяем функцию выбора индекса
def route_query(query: QueryBundle):
    if "дата" in query.query_str or "время" in query.query_str:
        return metadata_engine
    else:
        return doc_engine

# Создаем роутер
router_query_engine = IndexRouterQueryEngine(
    selector=route_query,
    query_engine_tools=[
        QueryEngineQueryTool(
            query_engine=doc_engine,
            metadata={"name": "document", "description": "Документы"}
        ),
        QueryEngineQueryTool(
            query_engine=metadata_engine,
            metadata={"name": "metadata", "description": "Поиск по метаданным"}
        ),
    ],
)
```

**PQR (Parent-Query-Router)** — более сложный механизм, который сначала выполняет запрос к родительскому индексу, а затем к дочерним:

```python
from llama_index.query_engine.pqr import PQRQueryEngine

# Создаем иерархию индексов
parent_index = VectorStoreIndex.from_documents(parent_documents)
child_index = VectorStoreIndex.from_documents(child_documents)

pqr_query_engine = PQRQueryEngine(
    parent_index=parent_index,
    child_indices=[child_index],
    verbose=True,
)
```

### Оптимизация роутеров

Ключевые параметры:
- `selector_threshold`: порог уверенности в выборе индекса
- `fallback_mode`: что делать при неуверенности (использовать первый индекс, задать уточняющий вопрос)
- `verbose`: вывод информации о выборе индекса

```python
router_query_engine = RouterQueryEngine.from_defaults(
    tools=tools,
    select_multi=True,  # выбирать несколько инструментов
    selector_default=0,  # индекс по умолчанию
    selector_threshold=0.5,  # порог уверенности
    fallback_mode="default",  # режим при низкой уверенности
    verbose=True,
)
```

## Сборка QA-системы

Полноценная QA-система на основе LlamaIndex включает несколько компонентов:

1. **Загрузка и индексация данных**
2. **Настройка query engines**
3. **Добавление памяти контекста**
4. **Постобработка ответов**

```python
from llama_index import StorageContext, load_index_from_storage
from llama_index.memory import ConversationBufferMemory
from llama_index.query_engine import RetrieverQueryEngine
from llama_index.postprocessor import SimilarityPostprocessor

# Загрузка или создание индекса
try:
    storage_context = StorageContext.from_defaults(persist_dir="./storage")
    index = load_index_from_storage(storage_context)
except:
    documents = SimpleDirectoryReader("./data").load_data()
    index = VectorStoreIndex.from_documents(documents)
    index.storage_context.persist("./storage")

# Настройка памяти
memory = ConversationBufferMemory()
memory.save_user_message("Привет, я изучаю систему")
memory.save_assistant_message("Здравствуйте! Я могу помочь вам понять систему.")

# Создание query engine
query_engine = RetrieverQueryEngine(
    retriever=index.as_retriever(similarity_top_k=3),
    memory=memory,
    node_postprocessors=[
        SimilarityPostprocessor(similarity_cutoff=0.7),
    ],
    verbose=True,
)

# Оптимизация через кастомные промпты
from llama_index import PromptTemplate

qa_prompt = PromptTemplate(
    "Ниже приведен контекст и вопрос. \n\n"
    "Контекст: {context_str}\n\n"
    "Вопрос: {query_str}\n\n"
    "Дай подробный ответ, используя только контекст. "
    "Если в контексте нет информации, скажи, что не знаю."
)

query_engine.update_prompts(
    {"response_synthesis": qa_prompt}
)

# Использование
response = query_engine.query("Каковы основные функции системы?")
print(response)
```

## Узкие места и компромиссы

При работе с LlamaIndex важно учитывать ограничения:

1. **Затраты на индексацию**:
   - Эмбеддинги больших документов требуют значительных вычислительных ресурсов
   - Хранение векторов увеличивает объем данных в 10-20 раз
   - Компромисс: кэширование, инкрементальное обновление индексов

2. **Качество ретрива**:
   - Семантический поиск может упускать важные термины
   - Короткие документы теряют контекст
   - Компромисс: комбинация векторного и ключевого поиска

3. **Ограничения LLM**:
   - Контекстное окно ограничено (обычно 4096-8192 токенов)
   - Стоимость запросов может быть высокой
   - Компромисс: локальные модели, компрессия контекста

4. **Сложность системы**:
   - Многоуровневые индексы увеличивают сложность отладки
   - Отсутствие стандартов для оценки качества
   - Компромисс: постепенная наращивание функционала

## Заключение: Когда использовать LlamaIndex

LlamaIndex идеален для:
- QA-систем над корпоративными документами
- Анализа длинных отчетов и транскриптов
- Систем рекомендаций на основе документов
- Усиления LLM собственными данными

Не стоит использовать LlamaIndex, когда:
- Документы очень короткие и структурированные (лучше использовать SQL)
- Требуется мгновенный ответ с низким latency
- Данные постоянно меняются (индексы требуют пересчета)
- Бюджет на вычислительные ресурсы ограничен

В реальных проектах LlamaIndex часто комбинируют с другими инструментами: LangChain для orchestration, FAISS для векторного поиска, Elasticsearch для полнотекстового поиска. Ключ — понять сильные и слабые стороны каждого компонента и выбрать оптимальную архитектуру для вашей задачи.