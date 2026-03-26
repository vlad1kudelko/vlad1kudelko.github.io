---
title: "Понижение размерности"
description: "PCA, t-SNE, UMAP — техники уменьшения размерности данных"
heroImage: "../../../../assets/imgs/2026/01/29-dimensionality-reduction.webp"
pubDate: "2026-01-29"
---

Dimensionality reduction упрощает данные.

```python
from sklearn.decomposition import PCA
from umap import UMAP

pca = PCA(n_components=2)
X_pca = pca.fit_transform(X)

umap = UMAP(n_components=2)
X_umap = umap.fit_transform(X)
```