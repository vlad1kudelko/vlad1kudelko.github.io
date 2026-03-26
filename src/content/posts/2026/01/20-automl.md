---
title: "AutoML: автоматическое машинное обучение"
description: "AutoML фреймворки: Auto-sklearn, H2O, AutoGluon"
heroImage: "../../../../assets/imgs/2026/01/20-automl.webp"
pubDate: "2026-01-20"
---

AutoML автоматизирует выбор модели и гиперпараметров.

```python
import autogluon.tabular as TabularDataset
from autogluon.tabular import TabularPredictor

train_data = TabularDataset('train.csv')
predictor = TabularPredictor(label='target').fit(train_data)

predictions = predictor.predict(test_data)
```