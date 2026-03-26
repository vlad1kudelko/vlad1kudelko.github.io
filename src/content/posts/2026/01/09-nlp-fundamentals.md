---
title: "NLP: основы обработки текста"
description: "Токенизация, эмбеддинги и базовые задачи NLP"
heroImage: "../../../../assets/imgs/2026/01/09-nlp-fundamentals.webp"
pubDate: "2026-01-09"
---

NLP — обработка естественного языка компьютерами.

```python
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("bert-base-uncased")

# Токенизация
text = "Hello, world!"
tokens = tokenizer(text, return_tensors="pt")
# {input_ids: tensor([[ 101, 7592, 1010, 2088,  999,  102]])}
```