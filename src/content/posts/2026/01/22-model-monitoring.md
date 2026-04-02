---
title: "Model Monitoring — дрифт данных, деградация"
description: "Настройте Model Monitoring: отслеживайте дрифт данных и деградацию моделей. Контролируйте качество ML в продакшене."
pubDate: "2026-01-22"
heroImage: "../../../../assets/imgs/2026/01/22-model-monitoring.webp"
---

# Model Monitoring: дрифт данных, деградация

Model Monitoring — это не просто набор метрик на дашборде, а система раннего предупреждения, которая позволяет обнаруживать дрифт данных и деградацию моделей до того, как они ударят по бизнес-показателям. Большинство команд внедряют мониторинг как формальность, фокусируясь на accuracy и precision, но игнорируя коренные изменения в данных. В итоге модель может показывать стабильные технические метрики, а бизнес-показатели падают. Прямо как у той финтех-компании, которая потеряла $2M за неделю из-за сезонного сдвига в потребительском поведении, при стабильной accuracy в 95%.

## Архитектура мониторинга: что скрывается за красивыми графиками

Система мониторинга — это не просто "собираем метрики и рисуем графики". Это сложная архитектура из нескольких слоев:

1. **Сбор данных**: батчи входных данных, предсказаний, ground truth (который часто приходит с задержкой)
2. **Обработка**: вычисление статистик, тестов на дрифт, анализ ошибок
3. **Хранение**: time-series базы для метрик, data lake для сырых данных
4. **Обнаружение аномалий**: статистические тесты и модели
5. **Реагирование**: автоматические регрессионные тесты, уведомления, процессы переобучения

Ключевая ошибка — фокусировать мониторинг только на моделях. Настоящая система должна отслеживать весь пайплайн: от сбора данных до предсказаний.

## Глубокий разбор: дрифт данных и методы детектирования

Дрифт данных (data drift) — это статистические изменения в распределении входных данных. Но не все дрифты одинаково опасны. Выделяем три типа:

1. **Дрифт признаков (Feature drift)**: изменение распределения отдельных признаков
2. **Дрифт взаимосвязей (Covariate shift)**: изменение корреляций между признаками
3. **Концептуальный дрифт (Concept drift)**: изменение связи между признаками и целевой переменной

Самый коварный — концептуальный дрифт. Представьте модель рекомендаций: поведение пользователей меняется не потому, что их "профиль" изменился статистически, а потому, что сами критерии выбора изменились.

### Методы детектирования дрифта

Для непрерывных признаков основой служат статистические тесты:

```python
import numpy as np
from scipy import stats
from typing import Dict, Tuple

def detect_feature_drift(reference_data: np.ndarray, 
                        current_data: np.ndarray,
                        significance_level: float = 0.05) -> Dict[str, float]:
    """
    Детектирование дрифта для непрерывного признака
    
    Args:
        reference_data: Справочные данные (обучающая выборка)
        current_data: Текущие данные (продакшн)
        significance_level: Уровень значимости
        
    Returns:
        Словарь с результатами тестов
    """
    # Тест Колмогорова-Смирнова на схожесть распределений
    ks_stat, ks_pvalue = stats.ks_2samp(reference_data, current_data)
    
    # Тест Стьюдента на равенство средних
    t_stat, t_pvalue = stats.ttest_ind(reference_data, current_data, equal_var=False)
    
    # Расхождение средних в процентах
    mean_ref = np.mean(reference_data)
    mean_current = np.mean(current_data)
    mean_diff = abs(mean_current - mean_ref) / mean_ref * 100
    
    return {
        'ks_statistic': ks_stat,
        'ks_pvalue': ks_pvalue,
        't_statistic': t_stat,
        't_pvalue': t_pvalue,
        'mean_diff_pct': mean_diff,
        'is_drift': ks_pvalue < significance_level or t_pvalue < significance_level
    }
```

Для категориальных признаков используем Хи-квадрат тест:

```python
def detect_categorical_drift(reference_dist: Dict[str, float],
                           current_dist: Dict[str, float],
                           min_freq: float = 0.01) -> Dict[str, float]:
    """
    Детектирование дрифта для категориального признака
    
    Args:
        reference_dist: Справочное распределение (словарь {категория: частота})
        current_dist: Текущее распределение
        min_freq: Минимальная частота для учета категории
        
    Returns:
        Результаты теста
    """
    # Объединяем все категории и фильтруем редкие
    all_categories = set(reference_dist.keys()).union(set(current_dist.keys()))
    filtered_categories = [
        cat for cat in all_categories 
        if reference_dist.get(cat, 0) > min_freq or current_dist.get(cat, 0) > min_freq
    ]
    
    if len(filtered_categories) < 2:
        return {'is_drift': False, 'message': 'Not enough categories after filtering'}
    
    # Подготавливаем данные для теста
    observed = []
    expected = []
    total_ref = sum(reference_dist.values())
    total_current = sum(current_dist.values())
    
    for cat in filtered_categories:
        ref_count = reference_dist.get(cat, 0) * total_ref
        current_count = current_dist.get(cat, 0) * total_current
        observed.extend([ref_count, current_count])
        expected.extend([(ref_count + current_count) / 2, 
                        (ref_count + current_count) / 2])
    
    # Проводим тест
    chi2_stat, chi2_pvalue = stats.chisquare(f_obs=observed, f_exp=expected)
    
    # Вычисляем JS-дивергенцию для дополнительной метрики
    js_div = jensen_shannon_divergence(reference_dist, current_dist)
    
    return {
        'chi2_statistic': chi2_stat,
        'chi2_pvalue': chi2_pvalue,
        'js_divergence': js_div,
        'is_drift': chi2_pvalue < 0.05 or js_div > 0.1
    }
```

### Мониторинг деградации модели

Деградация модели — это не всегда следствие дрифта данных. Иногда модель просто устаревает. Для мониторинга деградации нужны labeled данные, которые часто приходят с задержкой:

```python
from sklearn.metrics import accuracy_score, precision_score, recall_score
from collections import deque

class ModelDegradationDetector:
    def __init__(self, 
                 window_size: int = 1000,
                 degradation_threshold: float = 0.05,
                 min_samples: int = 500):
        """
        Детектор деградации модели
        
        Args:
            window_size: Размер окна для скользящего среднего
            degradation_threshold: Порог для определения деградации
            min_samples: Минимальное количество образцов для начала проверки
        """
        self.window_size = window_size
        self.degradation_threshold = degradation_threshold
        self.min_samples = min_samples
        
        # История метрик
        self.metrics_history = deque(maxlen=window_size * 2)
        self.baseline_metrics = None
    
    def update(self, y_true: list, y_pred: list) -> Dict:
        """
        Обновление детектора новыми предсказаниями
        
        Args:
            y_true: Истинные метки
            y_pred: Предсказания модели
            
        Returns:
            Результат проверки на деградацию
        """
        # Вычисляем текущие метрики
        current_metrics = {
            'accuracy': accuracy_score(y_true, y_pred),
            'precision': precision_score(y_true, y_pred, zero_division=0),
            'recall': recall_score(y_true, y_pred, zero_division=0)
        }
        
        # Добавляем в историю
        self.metrics_history.append(current_metrics)
        
        # Проверяем, есть ли достаточно данных для анализа
        if len(self.metrics_history) < self.min_samples:
            return {
                'is_degradation': False,
                'message': f'Not enough samples: {len(self.metrics_history)}/{self.min_samples}'
            }
        
        # Если это первая проверка, устанавливаем baseline
        if self.baseline_metrics is None:
            self.baseline_metrics = {
                'accuracy': np.mean([m['accuracy'] for m in list(self.metrics_history)[:self.window_size]]),
                'precision': np.mean([m['precision'] for m in list(self.metrics_history)[:self.window_size]]),
                'recall': np.mean([m['recall'] for m in list(self.metrics_history)[:self.window_size]])
            }
        
        # Вычисляем текущее среднее по окну
        window_metrics = list(self.metrics_history)[-self.window_size:]
        current_window = {
            'accuracy': np.mean([m['accuracy'] for m in window_metrics]),
            'precision': np.mean([m['precision'] for m in window_metrics]),
            'recall': np.mean([m['recall'] for m in window_metrics])
        }
        
        # Проверяем на деградацию по каждой метрике
        degradation_results = {}
        for metric in ['accuracy', 'precision', 'recall']:
            degradation = (self.baseline_metrics[metric] - current_window[metric]) / self.baseline_metrics[metric]
            is_degraded = degradation > self.degradation_threshold
            degradation_results[metric] = {
                'degradation_pct': degradation * 100,
                'is_degraded': is_degraded
            }
        
        # Общий результат
        any_degradation = any(results['is_degraded'] for results in degradation_results.values())
        
        return {
            'is_degradation': any_degradation,
            'baseline_metrics': self.baseline_metrics,
            'current_metrics': current_window,
            'degradation_details': degradation_results,
            'message': 'Degradation detected!' if any_degradation else 'No significant degradation'
        }
```

## Узкие места, которые не обсуждают в документации

1. **Вычислительная сложность**
   - Статистические тесты на больших датасетах могут быть медленными
   - Решение: используйте сэмплирование и предвычисляйте статические характеристики справочных данных

2. **Сезонность и цикличность**
   - Бизнес-метрики часто имеют естественную сезонность (ритейл в праздники)
   - Решение: стройте сезонно-адаптированные контрольные диапазоны

3. **Задержка в labeled данных**
   - В реальных задачах ground truth часто приходит с задержкой
   - Решение: используйте semi-supervised методы и анализ распределения ошибок без меток

4. **False Positives**
   - Чрезмерно чувствительные детекторы вызывают "alarm fatigue"
   - Решение: мультиуровневые системы оповещений с адаптивными порогами

5. **Концептуальный дрифт**
   - Самый сложный для детектирования тип дрифта
   - Решение: комбинируйте статистические методы с анализом бизнес-логики

## Когда мониторинг — это трата денег

Система мониторинга не нужна в следующих случаях:

1. **Модели с коротким жизненным циклом**
   - Используются только для одного кампания или события

2. **Низкостейковые решения**
   - Где ошибки модели не приводят к серьезным последствиям

3. **Автоматически обновляемые модели**
   - Где переобучение происходит по расписанию

4. **Экспериментальные модели**
   - На ранних этапах исследования мониторинг может быть избыточным

## Заключение

Model Monitoring — это не опция, а необходимость для любого серьезного ML-продукта. Начните с простого: отслеживайте дрифт ключевых признаков и метрик производительности, постепенно усложняя систему. Помните, что лучшая модель — не та, которая показывает 99% accuracy на тестовой выборке, а та, которая стабильно работает в реальных условиях.

Не ждите, пока пользователи заметят, что что-то сломалось. Создайте систему раннего предупреждения, которая будет работать на вас. В конце концов, мы строим не идеальные системы, а устойчивые системы, которые могут адаптироваться к изменениям.