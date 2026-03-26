---
title: "LLM APIs: OpenAI, Anthropic, Local"
description: "Использование LLM через API: OpenAI, Claude, локальные модели"
heroImage: "../../../../assets/imgs/2026/01/18-llm-apis.webp"
pubDate: "2026-01-18"
---

Современные LLM доступны через простые API.

```python
from openai import OpenAI

client = OpenAI(api_key="sk-...")

response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain quantum computing"}
    ],
    temperature=0.7,
    max_tokens=1000
)

print(response.choices[0].message.content)
```