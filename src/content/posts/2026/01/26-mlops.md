---
title: "MLOps: практики DevOps для ML"
description: "CI/CD для ML: MLflow, Kubeflow, KFServing"
heroImage: "../../../../assets/imgs/2026/01/26-mlops.webp"
pubDate: "2026-01-26"
---

MLOps — применение DevOps практик к ML.

```python
import mlflow

mlflow.set_experiment("my_experiment")

with mlflow.start_run():
    mlflow.log_param("n_estimators", 100)
    mlflow.log_metric("accuracy", 0.95)
    mlflow.sklearn.log_model(model, "model")
```