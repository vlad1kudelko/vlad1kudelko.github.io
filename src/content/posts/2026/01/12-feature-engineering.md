---
title: "Feature Engineering"
description: "Создание и преобразование признаков для ML моделей"
heroImage: "../../../../assets/imgs/2026/01/12-feature-engineering.webp"
pubDate: "2026-01-12"
---

Feature engineering — создание информативных признаков.

```python
import pandas as pd
from sklearn.preprocessing import StandardScaler, OneHotEncoder

# Scaling
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Encoding
encoder = OneHotEncoder(sparse=False)
X_encoded = encoder.fit_transform(df[['category']])

# Feature creation
df['date'] = pd.to_datetime(df['date'])
df['year'] = df['date'].dt.year
df['month'] = df['date'].dt.month
df['day_of_week'] = df['date'].dt.dayofweek
```