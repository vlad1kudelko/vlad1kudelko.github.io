---
title: "Метрики машинного обучения"
description: "Accuracy, precision, recall, F1, AUC — метрики для оценки ML моделей"
heroImage: "../../../../assets/imgs/2026/01/11-ml-metrics.webp"
pubDate: "2026-01-11"
---

Метрики помогают оценить качество ML моделей.

```python
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

y_true = [0, 1, 1, 0, 1]
y_pred = [0, 1, 0, 0, 1]
y_prob = [0.1, 0.9, 0.4, 0.2, 0.8]

print(f"Accuracy: {accuracy_score(y_true, y_pred)}")
print(f"Precision: {precision_score(y_true, y_pred)}")
print(f"Recall: {recall_score(y_true, y_pred)}")
print(f"F1: {f1_score(y_true, y_pred)}")
print(f"AUC: {roc_auc_score(y_true, y_prob)}")
```