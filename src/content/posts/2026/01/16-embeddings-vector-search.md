---
title: "Embeddings и векторный поиск"
description: "Создание эмбеддингов и семантический поиск с FAISS, Pinecone"
heroImage: "../../../../assets/imgs/2026/01/16-embeddings-vector-search.webp"
pubDate: "2026-01-16"
---

Векторные представления — основа семантического поиска.

```python
from sentence_transformers import SentenceTransformer
import faiss

model = SentenceTransformer('all-MiniLM-L6-v2')
embeddings = model.encode(sentences)

index = faiss.IndexFlatL2(embeddings.shape[1])
index.add(embeddings)

query = model.encode(["search query"])
distances, indices = index.search(query, k=5)
```