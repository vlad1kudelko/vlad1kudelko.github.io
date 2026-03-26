---
title: "RAG: Retrieval-Augmented Generation"
description: "RAG — техника улучшения LLM с помощью внешней базы знаний"
heroImage: "../../../../assets/imgs/2026/01/08-rag.webp"
pubDate: "2026-01-08"
---

RAG позволяет LLM использовать актуальную информацию из внешних источников.

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import OpenAIEmbeddings
from langchain.chains import RetrievalQA

# Split documents
splitter = RecursiveCharacterTextSplitter(chunk_size=1000)
docs = splitter.split_documents(documents)

# Create vector store
embeddings = OpenAIEmbeddings()
vectorstore = FAISS.from_documents(docs, embeddings)

# Create QA chain
qa = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=vectorstore.as_retriever()
)

result = qa.invoke("What is the information about...?")
```