---
title: "Prompt Engineering"
description: "Техники написания промптов для LLM: chain-of-thought, few-shot, role prompting"
heroImage: "../../../../assets/imgs/2026/01/17-prompt-engineering.webp"
pubDate: "2026-01-17"
---

Prompt engineering — искусство формулирования запросов к LLM.

```python
# Chain of Thought
cot_prompt = """
Solve the problem step by step.

Problem: If there are 5 birds on a tree and I shoot one, how many remain?
Step 1: Initially there are 5 birds
Step 2: Shooting one bird scares away all birds
Step 3: 0 birds remain

Answer: 0
"""

# Few-shot
few_shot_prompt = """
Classify sentiment:

Text: "I love this product!" -> Positive
Text: "This is terrible" -> Negative
Text: "It was okay" -> Neutral

Text: "Amazing experience"
"""

# Role prompting
role_prompt = "You are a senior software architect. Explain microservices patterns."
```