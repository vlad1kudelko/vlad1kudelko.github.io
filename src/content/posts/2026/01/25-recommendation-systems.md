---
title: "Рекомендательные системы"
description: "Collaborative filtering, content-based и гибридные рекомендации"
heroImage: "../../../../assets/imgs/2026/01/25-recommendation-systems.webp"
pubDate: "2026-01-25"
---

Рекомендательные системы предсказывают предпочтения пользователей.

```python
from surprise import Dataset, Reader, SVD
from surprise.model_selection import cross_validate

data = Dataset.load_builtin('ml-100k')
algo = SVD()

cross_validate(algo, data, measures=['RMSE', 'MAE'], cv=5)
```