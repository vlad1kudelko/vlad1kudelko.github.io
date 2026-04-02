---
title: "MLOps: пайплайны обучения — DVC, MLflow, Kubeflow"
description: "Настройте MLOps: пайплайны обучения, DVC, MLflow, Kubeflow. Автоматизируйте жизненный цикл ML-моделей."
pubDate: "2026-01-20"
heroImage: "../../../../assets/imgs/2026/01/20-mlops.webp"
---

# MLOps: пайплайны обучения — от хаоса к воспроизводимости

Переход от Jupyter-ноутбуков с хардкодированными путями к данным к продакшн-развертыванию моделей — это не просто рефакторинг кода. Это фундаментальная смена парадигмы управления артефактами данных, экспериментов и зависимостей. Без системного подхода пайплайны обучения быстро превращаются в запутанный клубок версий данных, несовместимых зависимостей и экспериментов, результаты которых невозможно воспроизвести. MLOps-инструменты призваны решить эту проблему, но их выбор и интеграция требуют понимания компромиссов между гибкостью, сложностью и стоимостью поддержки.

## Суть вызова: Управление хаосом ML-разработки

Классические CI/CD пайплайны отлично справляются с управлением кодом, но бессильны перед основными проблемами машинного обучения:
1. **Версионирование данных**: Как откатиться к конкретному срезу данных для повторения эксперимента 6 месяцев назад?
2. **Репroducibility**: Как гарантировать, что `pip install -r requirements.txt` установит именно те версии пакетов, которые использовались в эксперименте?
3. **Отслеживание экспериментов**: Как сопоставить метрики модели, гиперпараметры, версию кода и версию данных, которые дали этот результат?
4. **Оркестрация**: Как автоматизировать не только обучение, но и предобработку данных, валидацию и деплой в согласованном порядке?

DVC, MLflow и Kubeflow предлагают разные грани решения этой проблемы, часто работая в связке.

## DVC: Git для данных и ML-пайплайнов

**Механика работы**: DVC расширяет Git, добавляя управление данными и пайплайнами. Вместо того хранить файлы данных в репозитории (что быстро убивает Git), DVC создает текстовые дескрипторы (`dvc.yaml`, `.dvc` файлы), указывая хранилище (локальное, S3, GCS и др.). При этом:
- Данные кэшируются локально с контрольными суммами
- Пайплайны описываются в декларативном `dvc.yaml`
- Зависимости (данные, код, параметры) отслеживаются как в Git
- Выполнение пайплайна (`dvc repro`) проверяет актуальность зависимостей и выполняет только изменившиеся шаги

**Trade-offs**: 
- ✅ Полная интеграция с Git-рабочим процессом
- ❌ Накладные расходы на поддержание `.dvc` файлов и кэша
- ❌ Сложность с монорепозиториями и очень большими файлами (>10GB)

```yaml
# dvc.yaml - декларативный пайплайн
stages:
  prepare:
    cmd: python src/prepare.py data/raw.csv data/processed.csv
    deps:
      - data/raw.csv
      - src/prepare.py
    outs:
      - data/processed.csv
    metrics:
      - metrics/prepare.json:
          cache: false

  train:
    cmd: python src/train.py data/processed.csv models/model.pkl
    deps:
      - data/processed.py
      - src/train.py
    params:
      - params.yaml:
          stage: train
    outs:
      - models/model.pkl
    metrics:
      - metrics/train.json:
          cache: false
    # MLflow интеграция внутри команды
    run:
      cmd: mlflow run --experiment-name my_exp --run-name train_step
```

## MLflow: Централизованное управление экспериментами

**Механика работы**: MLflow решает проблему фрагментации экспериментов. Он работает как отдельный сервис (или локально) и предоставляет:
- **Трекинг**: Логирование параметров, метрик, артефактов (модели, графики, данные) в центральном хранилище (SQL DB, файловая система)
- **Регистрация моделей**: Управление версиями моделей с метаданными (метрики, теги, описание)
- **Пакетирование**: Создание переносимых пакетов моделей с зависимостями (`mlflow pyfunc`)
- **Deploy**: Интеграции с Kubernetes, Sagemaker, Azure ML для деплоя

**Trade-offs**:
- ✅ Единая точка истины для всех экспериментов
- ❌ Риск "засорения" базы данных экспериментами
- ❌ Слабая интеграция с Git (требует ручного связывания с коммитами)

```python
# Пример логирования в MLflow внутри DVC-стадии
import mlflow
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

mlflow.set_tracking_uri("http://mlflow-server:5000") # URL сервера
mlflow.set_experiment("fraud_detection")

with mlflow.start_run(run_name="rf_tuning"):
    # Логируем параметры
    n_estimators = 100
    max_depth = 10
    mlflow.log_param("n_estimators", n_estimators)
    mlflow.log_param("max_depth", max_depth)
    
    # Загружаем данные (DVC управляет путями)
    data = pd.read_csv("data/processed.csv")
    
    # Обучение
    model = RandomForestClassifier(n_estimators=n_estimators, max_depth=max_depth)
    model.fit(data.drop("target", axis=1), data["target"])
    
    # Логируем метрики
    accuracy = model.score(data.drop("target", axis=1), data["target"])
    mlflow.log_metric("accuracy", accuracy)
    
    # Логируем модель и артефакты
    mlflow.sklearn.log_model(model, "model")
    mlflow.log_artifact("data/processed.csv") # Сохраняем версию данных
    
    # Связываем с Git-коммитом (критично для воспроизводимости)
    mlflow.log_param("git_commit", subprocess.check_output(["git", "rev-parse", "HEAD"]).decode().strip())
```

## Kubeflow: Оркестрация ML-пайплайнов на Kubernetes

**Механика работы**: Kubeflow — это не инструмент, а экосистема для создания end-to-end MLOps-платформ на Kubernetes. Его ключевой компонент для пайплайнов — **Kubeflow Pipelines (KFP)**:
- **Определение пайплайна**: Python DSL или YAML для описания DAG (Directed Acyclic Graph) задач
- **Компоненты**: Переносимые контейнеры с кодом для каждого шага (preprocessing, training, validation)
- **Оркестратор**: Kubernetes API для запуска, мониторинга и масштабирования подов с задачами
- **UI**: Визуализация пайплайнов, отслеживание выполнения, управление экспериментами

**Trade-offs**:
- ✅ Масштабируемость, изоляция, автоматическое масштабирование
- ❌ **Глубокая привязка к Kubernetes** (сложно внедрить без K8s)
- ❌ Высокая сложность настройки и поддержки
- ❌ Переусложнение для небольших команд/проектов

```python
# Пример определения пайплайна в KFP Python DSL
from kfp import dsl
from kfp.components import func_to_container_op
import subprocess

# Определяем компоненты как функции-обертки над Docker образами
@func_to_container_op
def prepare_data_op(raw_data_path: str):
    # Внутри контейнера: запуск DVC-стадии или скрипта
    subprocess.run(["dvc", "repro", "prepare", "--deps", raw_data_path], check=True)
    return "data/processed.dvc" # Возвращаем путь к артефакту

@func_to_container_op
def train_model_op(processed_data_path: str, n_estimators: int, max_depth: int):
    # Запуск MLflow-эксперимента внутри контейнера
    subprocess.run([
        "mlflow", "run",
        "--experiment-name", "kubeflow_exp",
        "--run-name", "auto_train",
        "-P", f"n_estimators={n_estimators}",
        "-P", f"max_depth={max_depth}",
        "--backend", "local"
    ])
    return "mlflow:/0/1/model" # Путь к зарегистрированной модели

@dsl.pipeline(
    name="Fraud Detection Pipeline",
    description="End-to-end ML pipeline with DVC and MLflow"
)
def fraud_detection_pipeline(raw_data="gs://my-bucket/raw/data.csv"):
    # Этап 1: Подготовка данных
    prepared_data = prepare_data_op(raw_data)
    
    # Этап 2: Обучение с разными гиперпараметрами
    # Использование цикла для запуска параллельных экспериментов
    withdsl.ParallelFor([{"n_estimators": 100, "max_depth": 10}, 
                         {"n_estimators": 200, "max_depth": 15}]) as params:
        train_model_op(prepared_data, params.n_estimators, params.max_depth)
```

## Узкие места в продакшене

1. **DVC**:
   - **Кэш данных**: Неконтролируемый рост локального кэша требует стратегий очистки (TTL, LRU).
   - **Монорепозитории**: Сложность при работе с сотнями `.dvc` файлов в больших проектах.
   - **Большие файлы**: Оптимизация для файлов >10GB требует внешнего кэширующего слоя (Git LFS, S3).

2. **MLflow**:
   - **Производительность БД**: SQLite не подходит для команд >10 человек. Необходим PostgreSQL/MySQL.
   - **Утечка артефактов**: Неуправляемое логирование больших файлов (например, raw data) в MLflow.
   - **Версионирование моделей**: Риск коллизий имен без строгой схемы именования (`{model_name}_{version}_{hash}`).

3. **Kubeflow**:
   - **Kubernetes-сложность**: Требует экспертов по K8s для настройки сетевых политик, мониторинга (Prometheus/Grafana), управления ресурсами.
   - **Stateful компоненты**: MLflow UI, MinIO (для артефактов) требуют PersistentVolumes.
   - **Безопасность**: Сложная настройка RBAC для изоляции экспериментов и данных.

## Когда что выбирать?

- **DVC + MLflow**: Идеально для стартапов и средних команд. Позволяет быстро внедрить версионирование данных и отслеживание экспериментов без Kubernetes. Подходит для проектов с умеренными требованиями к масштабируемости.
- **DVC + MLflow + Kubeflow**: Выбор для enterprise-сред и проектов с требованиями к масштабируемости, безопасности и изоляции. Только если у вас есть dedicated команда по Kubernetes и потребность в запуске сотен экспериментов одновременно.
- **Альтернативы**: Для небольших проектов рассмотрите Weights & Biases (W&B) как альтернативу MLflow + NeptuneML. Для serverless-сред — AWS SageMaker Pipelines.

Личный опыт внедрения показывает, что начинающие с Kubeflow команды часто переоценивают свои силы. **Стартуйте с DVC и MLflow**. Когда вы упретесь в пределы их возможностей (например, необходимость параллельного запуска 100+ экспериментов в изолированных средах) — тогда добавляйте Kubeflow. MLOps — это марафон, а не спринт. Каждый инструмент решает конкретную проблему, но их связка требует тщательного проектирования пайплайнов и понимания компромиссов.
