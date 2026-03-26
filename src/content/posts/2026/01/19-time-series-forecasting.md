---
title: "Временные ряды: прогнозирование"
description: "Прогнозирование временных рядов: ARIMA, Prophet, LSTM"
heroImage: "../../../../assets/imgs/2026/01/19-time-series-forecasting.webp"
pubDate: "2026-01-19"
---

Time series forecasting — прогнозирование будущих значений.

```python
from prophet import Prophet
import pandas as pd

df = pd.DataFrame({
    'ds': pd.date_range('2024-01-01', periods=365, freq='D'),
    'y': data
})

model = Prophet()
model.fit(df)

future = model.make_future_dataframe(30)
forecast = model.predict(future)
```