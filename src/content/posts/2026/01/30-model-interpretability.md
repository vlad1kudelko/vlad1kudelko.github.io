---
title: "Интерпретируемость моделей"
description: "SHAP, LIME — методы объяснения предсказаний ML моделей"
heroImage: "../../../../assets/imgs/2026/01/30-model-interpretability.webp"
pubDate: "2026-01-30"
---

Интерпретируемость помогает понять решения модели.

```python
import shap

explainer = shap.TreeExplainer(model)
shap_values = explainer.shap_values(X)

shap.summary_plot(shap_values, X, feature_names=feature_names)
```