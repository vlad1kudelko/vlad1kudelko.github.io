---
title: "Этика ИИ и безопасность"
description: "Этические вопросы ИИ: bias, fairness, AI safety, regulations"
heroImage: "../../../../assets/imgs/2026/01/31-ai-ethics.webp"
pubDate: "2026-01-31"
---

Этика ИИ становится всё важнее.

```python
# Bias detection
from fairness import BinaryLabelDataset

dataset = BinaryLabelDataset(df=df, 
                              label_names=['label'],
                              protected_attribute_names=['gender'])

from fairness.metrics import disparate_impact_ratio
print(disparate_impact_ratio(dataset))
```