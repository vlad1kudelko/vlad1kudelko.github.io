---
title: "Hyperparameter Tuning"
description: "Настройка гиперпараметров: Grid Search, Random Search, Bayesian Optimization"
heroImage: "../../../../assets/imgs/2026/01/24-hyperparameter-tuning.webp"
pubDate: "2026-01-24"
---

Оптимизация гиперпараметров модели.

```python
from sklearn.model_selection import GridSearchCV
import optuna

def objective(trial):
    params = {
        'n_estimators': trial.suggest_int('n_estimators', 100, 1000),
        'max_depth': trial.suggest_int('max_depth', 3, 10),
        'learning_rate': trial.suggest_float('learning_rate', 0.01, 0.3)
    }
    model = RandomForestClassifier(**params)
    return cross_val_score(model, X, y).mean()

study = optuna.create_study(direction='maximize')
study.optimize(objective, n_trials=100)
```