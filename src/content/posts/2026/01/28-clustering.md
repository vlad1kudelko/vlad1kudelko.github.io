---
title: "Кластеризация"
description: "K-means, DBSCAN, иерархическая кластеризация"
heroImage: "../../../../assets/imgs/2026/01/28-clustering.webp"
pubDate: "2026-01-28"
---

Кластеризация — группировка похожих объектов.

```python
from sklearn.cluster import KMeans, DBSCAN
from sklearn.metrics import silhouette_score

kmeans = KMeans(n_clusters=3)
labels = kmeans.fit_predict(X)
print(f"Silhouette: {silhouette_score(X, labels)}")
```