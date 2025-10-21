+++
lang = "ru"
title = "Python Testing: Покрытие кода и метрики качества"
description = "Подробное руководство по измерению покрытия кода в Python: coverage.py, pytest-cov, интерпретация результатов, интеграция с CI/CD и метрики качества тестов."
template = "posts"
thumb = "/imgs/2025/07/python-testing-coverage-metrics.webp"
publication_date = "2025-07-21"
+++

# Python Testing: Покрытие кода и метрики качества

Покрытие кода (code coverage) — это метрика, которая показывает, какая часть исходного кода выполняется во время тестов. Это важный инструмент для оценки качества тестирования, но важно понимать, что высокое покрытие не гарантирует отсутствие ошибок.

## 1. Введение в покрытие кода

### Типы покрытия:

- **Покрытие строк (line coverage)** — показывает, какие строки кода были выполнены
- **Покрытие веток (branch coverage)** — показывает, какие ветки условных операторов были пройдены
- **Покрытие функций (function coverage)** — показывает, какие функции были вызваны
- **Покрытие операторов (statement coverage)** — показывает, какие операторы были выполнены

### Важность покрытия кода:

- **Обнаружение непокрытого кода** — помогает найти код, который не тестируется
- **Мотивация к тестированию** — поощряет написание тестов для всех частей кода
- **Качество кода** — непокрытый код часто является "мёртвым" или устаревшим
- **Рефакторинг** — помогает безопасно изменять код, зная что он протестирован

### Ограничения покрытия:

- **Не гарантирует качество** — код может быть покрыт тестами, но тесты могут быть плохими
- **Не показывает сложность** — простой код может иметь высокое покрытие, но быть сложным для понимания
- **Не учитывает бизнес-логику** — покрытие не показывает, правильно ли работает код с точки зрения требований

## 2. Coverage.py

`coverage.py` — это стандартная библиотека для измерения покрытия кода в Python.

### 2.1. Установка

```bash
pip install coverage
```

### 2.2. Базовое использование

```python
# run_tests_with_coverage.py
import coverage
import unittest

# Начинаем измерение покрытия
cov = coverage.Coverage()
cov.start()

# Запускаем тесты
loader = unittest.TestLoader()
suite = loader.discover('tests')
runner = unittest.TextTestRunner()
runner.run(suite)

# Останавливаем измерение и генерируем отчёт
cov.stop()
cov.save()
cov.report()
cov.html_report(directory='htmlcov')
```

**Объяснение команд coverage:**

- **`cov.start()`** — начинает отслеживание выполнения кода
- **`cov.stop()`** — останавливает отслеживание
- **`cov.save()`** — сохраняет данные о покрытии в файл
- **`cov.report()`** — выводит текстовый отчёт в консоль
- **`cov.html_report()`** — генерирует HTML отчёт для просмотра в браузере

**Пример вывода отчёта:**
```
Name                    Stmts   Miss  Cover
-------------------------------------------
myapp/calculator.py        15      2    87%
myapp/database.py          25      5    80%
myapp/utils.py             10      0   100%
-------------------------------------------
TOTAL                      50      7    86%
```

**HTML отчёт содержит:**
- Общую статистику покрытия
- Детальную информацию по каждому файлу
- Подсветку покрытых и непокрытых строк
- Навигацию между файлами
- Фильтры для анализа покрытия

### 2.3. Конфигурация coverage.py

```ini
# .coveragerc
[run]
source = myapp
omit = 
    */tests/*
    */venv/*
    */migrations/*
    setup.py

[report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise AssertionError
    raise NotImplementedError
    if __name__ == .__main__.:
    class .*\bProtocol\):
    @(abc\.)?abstractmethod

[html]
directory = htmlcov
title = Coverage Report
```

**Объяснение секций конфигурации:**

- **[run]** — настройки для запуска измерения покрытия
- **[report]** — настройки для генерации отчётов
- **[html]** — настройки для HTML отчётов

### 2.4. Программное управление покрытием

```python
import coverage

# Создание объекта покрытия с настройками
cov = coverage.Coverage(
    source=['myapp'],
    omit=['*/tests/*', '*/venv/*'],
    branch=True,  # включить покрытие веток
    data_file='.coverage'
)

# Начало измерения
cov.start()

# Ваш код здесь
import myapp
result = myapp.some_function()

# Остановка измерения
cov.stop()

# Сохранение данных
cov.save()

# Генерация отчётов
cov.report()
cov.html_report(directory='htmlcov')
cov.xml_report(outfile='coverage.xml')
```

## 3. pytest-cov

`pytest-cov` — это плагин для pytest, который интегрирует coverage.py с pytest.

### 3.1. Установка

```bash
pip install pytest-cov
```

### 3.2. Базовое использование

```bash
# Запуск с измерением покрытия
pytest --cov=myapp tests/

# Запуск с HTML отчётом
pytest --cov=myapp --cov-report=html tests/

# Запуск с показом непокрытых строк
pytest --cov=myapp --cov-report=term-missing tests/

# Запуск с XML отчётом для CI/CD
pytest --cov=myapp --cov-report=xml tests/

# Запуск с проверкой минимального покрытия
pytest --cov=myapp --cov-fail-under=80 tests/
```

**Объяснение флагов pytest-cov:**

- **`--cov=myapp`** — указывает модуль для измерения покрытия
- **`--cov-report=html`** — генерирует HTML отчёт
- **`--cov-report=term-missing`** — показывает непокрытые строки в консоли
- **`--cov-report=xml`** — генерирует XML отчёт для интеграции с CI/CD
- **`--cov-fail-under=80`** — тесты падают, если покрытие меньше указанного процента

### 3.3. Конфигурация в pytest.ini

```ini
[tool:pytest]
addopts = --cov=myapp --cov-report=html --cov-report=term-missing
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
```

### 3.4. Интеграция с CI/CD

```yaml
# .github/workflows/tests.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: 3.9
    
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install pytest pytest-cov
    
    - name: Run tests with coverage
      run: |
        pytest --cov=myapp --cov-report=xml --cov-fail-under=80
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v1
      with:
        file: ./coverage.xml
        flags: unittests
        name: codecov-umbrella
```

## 4. Интерпретация результатов покрытия

### 4.1. Понимание метрик

**Процент покрытия:**
- **0-50%** — критически низкое покрытие, требует немедленного внимания
- **50-70%** — низкое покрытие, нужно добавить тесты
- **70-85%** — приемлемое покрытие для большинства проектов
- **85-95%** — хорошее покрытие
- **95-100%** — отличное покрытие, но может быть избыточным

**Анализ непокрытого кода:**
```python
# Пример кода с низким покрытием
def process_user_data(user_data):
    if user_data is None:
        return None  # Эта строка может быть непокрыта
    
    if user_data.get('age') < 18:
        raise ValueError("User too young")  # Эта ветка может быть непокрыта
    
    return user_data['name'].upper()  # Эта строка может быть непокрыта
```

### 4.2. Типы непокрытого кода

**1. Мёртвый код:**
```python
def old_function():
    # Этот код больше не используется
    return "old result"

def new_function():
    return "new result"
```

**2. Обработка ошибок:**
```python
def divide(a, b):
    try:
        return a / b
    except ZeroDivisionError:
        return None  # Эта строка может быть непокрыта
```

**3. Граничные случаи:**
```python
def validate_age(age):
    if age < 0:
        raise ValueError("Age cannot be negative")  # Может быть непокрыто
    elif age > 150:
        raise ValueError("Age too high")  # Может быть непокрыто
    return True
```

### 4.3. Стратегии улучшения покрытия

**1. Добавление тестов для граничных случаев:**
```python
def test_validate_age_boundaries():
    """Тест граничных случаев валидации возраста"""
    # Тест отрицательного возраста
    with pytest.raises(ValueError, match="Age cannot be negative"):
        validate_age(-1)
    
    # Тест слишком высокого возраста
    with pytest.raises(ValueError, match="Age too high"):
        validate_age(151)
    
    # Тест валидных значений
    assert validate_age(0) is True
    assert validate_age(150) is True
```

**2. Тестирование обработки ошибок:**
```python
def test_divide_by_zero():
    """Тест деления на ноль"""
    result = divide(10, 0)
    assert result is None

def test_api_error_handling():
    """Тест обработки ошибок API"""
    with patch('requests.get') as mock_get:
        mock_get.side_effect = requests.RequestException("Network error")
        
        result = fetch_data_from_api("https://api.example.com/data")
        assert result is None
```

## 5. Продвинутые техники покрытия

### 5.1. Покрытие веток

```bash
# Включение покрытия веток
pytest --cov=myapp --cov-branch tests/
```

**Пример кода с ветками:**
```python
def process_data(data, threshold=10):
    if data is None:
        return None
    elif len(data) == 0:
        return []
    elif len(data) > threshold:
        return data[:threshold]
    else:
        return data
```

**Тесты для покрытия всех веток:**
```python
def test_process_data_all_branches():
    """Тест всех веток функции process_data"""
    # Ветка: data is None
    assert process_data(None) is None
    
    # Ветка: len(data) == 0
    assert process_data([]) == []
    
    # Ветка: len(data) > threshold
    assert process_data([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) == [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    
    # Ветка: else
    assert process_data([1, 2, 3]) == [1, 2, 3]
```

### 5.2. Исключение кода из покрытия

```python
# Исключение отдельных строк
def some_function():
    if debug_mode:  # pragma: no cover
        print("Debug info")
    
    # Исключение блока кода
    if __name__ == "__main__":  # pragma: no cover
        main()

# Исключение функций
def __repr__(self):  # pragma: no cover
    return f"<{self.__class__.__name__}>"

# Исключение классов
class ProtocolClass:  # pragma: no cover
    """Протокольный класс, не требует тестирования"""
    pass
```

### 5.3. Покрытие асинхронного кода

```python
import pytest
import asyncio

@pytest.mark.asyncio
async def test_async_function():
    """Тест асинхронной функции"""
    result = await async_function()
    assert result == "expected"

# conftest.py
@pytest.fixture(scope="session")
def event_loop():
    """Создание event loop для асинхронных тестов"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()
```

## 6. Метрики качества тестов

### 6.1. Помимо покрытия кода

**1. Покрытие требований:**
- Каждое требование должно быть покрыто тестами
- Тесты должны проверять как позитивные, так и негативные сценарии

**2. Покрытие путей выполнения:**
- Все возможные пути выполнения кода должны быть протестированы
- Особое внимание граничным случаям

**3. Покрытие данных:**
- Тесты должны использовать различные наборы данных
- Параметризованные тесты для покрытия разных сценариев

### 6.2. Качество тестов

**1. Читаемость тестов:**
```python
# Хорошо - читаемый тест
def test_user_creation_with_valid_data():
    """Тест создания пользователя с валидными данными"""
    user_data = {
        "name": "John Doe",
        "email": "john@example.com",
        "age": 25
    }
    
    user = create_user(user_data)
    
    assert user.name == "John Doe"
    assert user.email == "john@example.com"
    assert user.age == 25

# Плохо - нечитаемый тест
def test_user():
    u = create_user({"n": "John", "e": "john@example.com", "a": 25})
    assert u.name == "John"
```

**2. Изоляция тестов:**
```python
# Хорошо - изолированный тест
def test_user_creation_isolated(mocker):
    """Изолированный тест создания пользователя"""
    mock_db = mocker.patch('database.connection')
    mock_db.return_value.insert.return_value = 1
    
    user_id = create_user({"name": "John"})
    
    assert user_id == 1
    mock_db.assert_called_once()

# Плохо - зависимый тест
def test_user_creation_dependent():
    """Тест, зависящий от других тестов"""
    # Зависит от предыдущих тестов
    user = get_user_by_id(1)  # может не существовать
    assert user.name == "John"
```

**3. Поддержка тестов:**
```python
# Хорошо - поддерживаемый тест
@pytest.fixture
def sample_user_data():
    """Фикстура с тестовыми данными пользователя"""
    return {
        "name": "Test User",
        "email": "test@example.com",
        "age": 30
    }

def test_user_creation_with_fixture(sample_user_data):
    """Тест с использованием фикстуры"""
    user = create_user(sample_user_data)
    assert user.name == sample_user_data["name"]

# Плохо - хардкод в тесте
def test_user_creation_hardcoded():
    """Тест с хардкодом данных"""
    user = create_user({"name": "John", "email": "john@example.com"})
    assert user.name == "John"
```

### 6.3. Метрики производительности тестов

**1. Время выполнения:**
```bash
# Измерение времени выполнения тестов
pytest --durations=10 tests/  # показать 10 самых медленных тестов

# Параллельное выполнение
pytest -n auto tests/  # автоматическое определение количества процессов
```

**2. Использование памяти:**
```python
import psutil
import os

def test_memory_usage():
    """Тест использования памяти"""
    process = psutil.Process(os.getpid())
    initial_memory = process.memory_info().rss
    
    # Выполнение операции
    result = memory_intensive_operation()
    
    final_memory = process.memory_info().rss
    memory_increase = final_memory - initial_memory
    
    # Проверяем, что увеличение памяти не превышает лимит
    assert memory_increase < 10 * 1024 * 1024  # 10 MB
```

## 7. Интеграция с инструментами

### 7.1. Codecov

[Codecov](https://codecov.io/) — популярный сервис для отслеживания покрытия кода.

**Настройка в .github/workflows/tests.yml:**
```yaml
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v1
  with:
    file: ./coverage.xml
    flags: unittests
    name: codecov-umbrella
    fail_ci_if_error: true
```

**Конфигурация в .codecov.yml:**
```yaml
coverage:
  status:
    project:
      default:
        target: 80%
        threshold: 5%
    patch:
      default:
        target: 80%
        threshold: 5%

comment:
  layout: "reach, diff, flags, files"
  behavior: default
  require_changes: false
```

### 7.2. SonarQube

[SonarQube](https://www.sonarqube.org/) — платформа для анализа качества кода.

**Настройка в .github/workflows/sonar.yml:**
```yaml
- name: SonarQube Scan
  uses: sonarqube-quality-gate-action@master
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
  with:
    scannerHomePath: /opt/sonar-scanner
    args: >
      -Dsonar.projectKey=my-project
      -Dsonar.sources=src
      -Dsonar.tests=tests
      -Dsonar.python.coverage.reportPaths=coverage.xml
```

### 7.3. Локальные инструменты

**pre-commit hooks:**
```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.4.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files

  - repo: https://github.com/pycqa/isort
    rev: 5.12.0
    hooks:
      - id: isort

  - repo: https://github.com/psf/black
    rev: 23.3.0
    hooks:
      - id: black

  - repo: local
    hooks:
      - id: pytest
        name: pytest
        entry: pytest
        language: system
        pass_filenames: false
        always_run: true
        args: [--cov=myapp, --cov-fail-under=80]
```

## 8. Лучшие практики

### 8.1. Целевые показатели покрытия

**Рекомендуемые уровни покрытия:**
- **Критически важный код** — 95%+
- **Бизнес-логика** — 85-95%
- **Утилиты и хелперы** — 80-90%
- **Интеграционные тесты** — 70-85%

**Не гонитесь за 100% покрытием:**
```python
# Код, который не нужно тестировать
def __repr__(self):  # pragma: no cover
    return f"<{self.__class__.__name__}>"

if __name__ == "__main__":  # pragma: no cover
    main()
```

### 8.2. Стратегия улучшения покрытия

**1. Приоритизация:**
- Начните с критически важного кода
- Фокусируйтесь на бизнес-логике
- Не тратьте время на тестирование boilerplate кода

**2. Постепенное улучшение:**
- Устанавливайте реалистичные цели
- Улучшайте покрытие с каждым релизом
- Используйте покрытие как инструмент, а не как цель

**3. Автоматизация:**
- Интегрируйте проверку покрытия в CI/CD
- Устанавливайте минимальные пороги покрытия
- Автоматически генерируйте отчёты

### 8.3. Мониторинг и отчётность

**Регулярные отчёты:**
```bash
# Еженедельный отчёт о покрытии
pytest --cov=myapp --cov-report=html --cov-report=term-missing tests/
```

**Тренды покрытия:**
- Отслеживайте изменения покрытия во времени
- Анализируйте причины снижения покрытия
- Празднуйте улучшения

## 9. Заключение

Покрытие кода — это важный инструмент для оценки качества тестирования, но не единственный. Важно помнить:

**Ключевые принципы:**
- Покрытие кода — это метрика, а не цель
- Качество тестов важнее количества
- Фокусируйтесь на критически важном коде
- Используйте покрытие как инструмент для улучшения

**Рекомендации:**
- Устанавливайте реалистичные цели покрытия
- Интегрируйте проверку покрытия в процесс разработки
- Регулярно анализируйте отчёты о покрытии
- Не жертвуйте качеством ради количества

**Следующие шаги:**
- Настройте автоматическую проверку покрытия в CI/CD
- Интегрируйтесь с внешними сервисами (Codecov, SonarQube)
- Регулярно анализируйте и улучшайте качество тестов
- Используйте покрытие как часть общей стратегии качества

**Дополнительные ресурсы:**
- [Документация coverage.py](https://coverage.readthedocs.io/)
- [Документация pytest-cov](https://pytest-cov.readthedocs.io/)
- [SonarQube](https://www.sonarqube.org/)
- [Python Testing: Основы тестирования и unittest](/posts/2025/07/python-testing-basics-unittest)
- [Python Testing: pytest - современный подход](/posts/2025/07/python-testing-pytest-modern-approach)
- [Python Testing: Моки и изоляция тестов](/posts/2025/07/python-testing-mocks-isolation) 