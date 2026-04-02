---
title: "Feature Stores — Feast, Tecton, хранение признаков"
description: "Внедрите Feature Stores: Feast, Tecton для хранения признаков. Управляйте фичами для ML-моделей централизованно."
pubDate: "2026-01-21"
heroImage: "../../../../assets/imgs/2026/01/21-feature-stores.webp"
---

# Feature Stores: Feast, Tecton

Feature Stores — это не просто еще одна база данных или кэш. Это фундаментальная парадигма в машинном обучении, решающая вечную проблему "фича-дрiftа" и несогласованности между обучением и инференсом. Когда модель обучается на локально рассчитанных фичах, а в продакшене использует те же самые фичи, но рассчитанные уже на сервере — это путь к провалу. Feature Store ставит точку в этой борьбе, предоставляя централизованную систему для хранения, управления и обслуживания признаков на всех этапах жизненного цикла ML.

## Архитектурные основы Feature Stores

Feature Store — это по сути двухслойная система:
1. Онлайн-хранилище для низколатенсного доступа к свежим фичам
2. Офлайн-хранилище для пакетной обработки и исторических данных

Ключевая инвариантность здесь — один источник правды для каждой фичи. Когда ваш data-инженер обновляет логику расчета, Feature Store гарантирует, что и обучающая выборка, и инференс получат одинаковые результаты.

### Feast (Feature Store)

Feast — это open-source решение от Navigine, ставшее de facto стандартом для многих компаний. Его архитектура построена вокруг концепции реестров и хранилищ.

```python
# Пример определения фич в Feast
from feast import FeatureStore, FeatureView, Entity, Field, ValueType
from feast.data_source import BigQuerySource
from feast.types import FloatType

# Определяем сущность (entity) — это ключ, по которому мы будем запрашивать фичи
driver = Entity(name="driver", join_keys=["driver_id"])

# Определяем источник данных
driver_stats_source = BigQuerySource(
    table="feast_demo.driver_stats",
    event_timestamp_column="event_timestamp",
    created_timestamp_column="created_timestamp",
)

# Определяем FeatureView — это логическая группировка фичей
driver_stats_view = FeatureView(
    name="driver_hourly_stats",
    entities=[driver],
    schema=[
        Field(name="conv_rate", dtype=FloatType),
        Field(name="acc_rate", dtype=FloatType),
        Field(name="avg_daily_trips", dtype=FloatType),
    ],
    source=driver_stats_source,
    online=True,  # Включаем онлайн-часть
    tags={"team": "data"},
)

# Создание и применение реестра
store = FeatureStore(repo_path=".")
store.apply([driver_stats_view])

# Вспомогательные функции для расчета фичей
@feast.on_demand_feature_view(
    entities=[driver],
    schema=[
        Field(name="conv_rate_plus_acc_rate", dtype=FloatType),
    ],
    source=[driver_stats_view],
)
def conv_rate_plus_acc_rate(driver_stats_view: pd.DataFrame) -> pd.DataFrame:
    """Пример on-demand фичи, которая рассчитывается на лету"""
    df = pd.DataFrame()
    df["conv_rate_plus_acc_rate"] = (
        driver_stats_view["conv_rate"] + driver_stats_view["acc_rate"]
    )
    return df

# Использование фичей в скрипте для обучения
training_df = store.get_historical_features(
    entity_df=entity_df,
    features=[
        "driver_hourly_stats:conv_rate",
        "driver_hourly_stats:acc_rate",
        "driver_hourly_stats:avg_daily_trips",
        "driver_hourly_stats:conv_rate_plus_acc_rate",
    ],
).to_df()

# Использование фичей для инференса
features = store.get_online_features(
    features=[
        "driver_hourly_stats:conv_rate",
        "driver_hourly_stats:acc_rate",
        "driver_hourly_stats:avg_daily_trips",
    ],
    entity_rows=[{"driver_id": "1001"}, {"driver_id": "1002"}],
).to_dict()
```

Ключевая особенность Feast — это разделение между статическими фичами (хранятся в онлайн-хранилище) и on-demand фичами (рассчитываются на лету). Это мощный механизм, но требует осторожности — on-demand фичи могут стать узким местом, если их логика сложна.

### Tecton

Tecton — это коммерческое решение, позиционирующее себя как "feature engineering platform". Его главная фишка — автоматизированный feature engineering и интеграция с MLOps-платформами.

```python
# Пример определения фич в Tecton
from tecton import FeatureView, FileDataSource, on_demand_feature_view
from tecton.types import Float64
import pandas as pd

# Определяем источник данных
transaction_data = FileDataSource(
    name="transaction_data",
    path="s3://my-bucket/transactions/",
    timestamp_field="timestamp",
)

# Определяем FeatureView с автоматической агрегацией
user_transaction_aggs = FeatureView(
    name="user_transaction_aggs",
    source=transaction_data,
    entities=[user],
    description="Aggregated features from user transactions",
    mode="batch",
    features=[
        AggregateFeature(
            name="transaction_count_1h",
            value=Count(),
            window=Timedelta(hours=1),
            aggregation_frequency=Timedelta(hours=1),
        ),
        AggregateFeature(
            name="transaction_amount_sum_1h",
            value=Sum(transactions.amount),
            window=Timedelta(hours=1),
            aggregation_frequency=Timedelta(hours=1),
        ),
        AggregateFeature(
            name="transaction_amount_mean_1h",
            value=Mean(transactions.amount),
            window=Timedelta(hours=1),
            aggregation_frequency=Timedelta(hours=1),
        ),
    ],
    online=True,
    tags={"team": "fraud_detection"},
)

# On-demand фича с зависимостями
@on_demand_feature_view(
    sources=[user_transaction_aggs],
    mode="python",
    entities=[user],
    features=[
        Float64,
        Float64,
    ],
    owner="data-team@company.com",
)
def user_spending_ratio(user_transaction_aggs):
    """
    Рассчитывает соотношение текущей суммы транзакций к среднему
    """
    return pd.DataFrame({
        "current_to_mean_ratio": (
            user_transaction_aggs["transaction_amount_sum_1h"] / 
            user_transaction_aggs["transaction_amount_mean_1h"]
        )
    })

# Использование в обучении
from tecton import get_feature_vector
training_data = get_feature_vector(
    features=[
        "user_transaction_aggs:transaction_count_1h",
        "user_transaction_aggs:transaction_amount_sum_1h",
        "user_transaction_aggs:transaction_amount_mean_1h",
        "user_spending_ratio:current_to_mean_ratio",
    ],
    entity_spec={"user_id": "user123"},
    serving_key="training",
)
```

Главное преимущество Tecton — декларативный подход к feature engineering. Вы описываете, какие агрегации вам нужны, а система сама заботится о расчете, хранении и поддержке этих фич. Это снижает когнитивную нагрузку на команду, но может привести к "черному ящику", если вы не понимаете, как именно Tectон реализует ваш запрос.

## Узкие места и компромиссы

1. **Сложность внедрения**. Feature Store — это не просто библиотека, это новая архитектурная сущность. Требует изменения процессов в команде ML, пересмотра CI/CD, возможно, даже изменения ролей.

2. **Латентность vs Свежесть данных**. Онлайн-хранилища обычно имеют задержку между расчетом фичи и ее доступностью для инференса. В Feast это настраивается через `serving_refresh_interval`, в Tecton через `aggregation_frequency`.

3. **Стоимость**. Особенно для коммерческих решений. Tecton может быть дорогим для больших объемов данных. Для Feast придется поддерживать инфраструктуру онлайн-хранилища (Redis, DynamoDB и т.д.).

4. **Онлайн vs Офлайн согласованность**. Это вечная боль. Feast полагается на пользователя для обеспечения согласованности, в то время как Tecton пытается автоматизировать этот процесс, но не всегда идеально.

5. **Versioning**. Управление версиями фич критически важно. Feast использует Git для версионирования определений, но не самих данных. Tecton предлагает более продвинутую систему версионирования, но это часть его коммерческого предложения.

## Когда выбирать что?

Выбирайте **Feast**, если:
- У вас есть опытная команда, готовая поддерживать инфраструктуру
- Нужен полный контроль над процессом
- Бюджет ограничен, а гибкость важнее "из коробки" функциональности
- Вы уже используете open-source стек в продакшене

Выбирайте **Tecton**, если:
- У вас есть бюджет на коммерческое решение
- Команда среднего уровня, нужно автоматизировать feature engineering
- Интеграция с MLOps платформами (например, Seldon, KServe) критична
- Важна поддержка и SLA от вендора

Feature Store — это не серебряная пуля, а фундамент, который позволяет строить надежные ML-системы. Без него вы будете постоянно бороться с несогласованностью данных и проблемами воспроизводимости моделей. Выбор между Feast и Tecton — это вопрос компромисса между контролем и удобством, между бюджетом и скоростью внедрения. Но сам факт внедрения Feature Store — это уже значительный шаг зрелости вашей ML-практики.