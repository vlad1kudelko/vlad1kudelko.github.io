---
title: "Model Deployment: production ready"
description: "Деплой ML моделей: Docker, Kubernetes, FastAPI, Triton"
heroImage: "../../../../assets/imgs/2026/01/22-model-deployment.webp"
pubDate: "2026-01-22"
---

Деплой ML моделей в production.

```python
from fastapi import FastAPI
import joblib

app = FastAPI()
model = joblib.load("model.pkl")

@app.post("/predict")
def predict(data: InputData):
    prediction = model.predict([data.features])
    return {"prediction": prediction.tolist()}

# Dockerfile
# FROM python:3.11
# COPY . /app
# RUN pip install -r requirements.txt
# CMD ["uvicorn", "main:app", "--host", "0.0.0.0"]
```