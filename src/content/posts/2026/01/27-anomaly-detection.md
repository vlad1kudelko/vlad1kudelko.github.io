---
title: "Anomaly Detection"
description: "Обнаружение аномалий: Isolation Forest, One-Class SVM, Autoencoder"
heroImage: "../../../../assets/imgs/2026/01/27-anomaly-detection.webp"
pubDate: "2026-01-27"
---

Anomaly detection — поиск необычных паттернов.

```python
from sklearn.ensemble import IsolationForest

clf = IsolationForest(contamination=0.1)
predictions = clf.fit_predict(X)
anomalies = X[predictions == -1]
```