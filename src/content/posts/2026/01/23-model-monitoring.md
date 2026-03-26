---
title: "ML Model Monitoring"
description: "Мониторинг моделей в production: drift detection, performance tracking"
heroImage: "../../../../assets/imgs/2026/01/23-model-monitoring.webp"
pubDate: "2026-01-23"
---

Мониторинг ML моделей в production.

```python
from prometheus_client import Counter, Histogram, generate_latest

predictions = Counter('ml_predictions_total', 'Total predictions', ['model'])
latency = Histogram('ml_prediction_latency', 'Prediction latency')

def predict(data):
    with latency.time():
        return model.predict(data)
```