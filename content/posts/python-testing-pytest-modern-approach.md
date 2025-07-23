+++
lang = "ru"
title = "Python Testing: pytest - современный подход"
description = "Подробное руководство по pytest: установка, фикстуры, параметризация, маркировка тестов и современные практики тестирования."
template = "posts"
thumb = "/imgs/python-testing-pytest-modern-approach.png"
publication_date = "2025-07-19"
+++

# Python Testing: pytest - современный подход

> **Читайте также:**
> - [Python Testing: Основы тестирования и unittest](/posts/python-testing-basics-unittest)
> - [Python Testing: Моки и изоляция тестов](/posts/python-testing-mocks-isolation)
> - [Python Testing: Покрытие кода и метрики качества](/posts/python-testing-coverage-metrics)

`pytest` — это популярная сторонняя библиотека для тестирования, которая предлагает более простой и мощный синтаксис по сравнению с `unittest`. Она была создана как альтернатива встроенному модулю и быстро завоевала популярность благодаря своей гибкости, богатой экосистеме плагинов и удобству использования.

## 1. Введение в pytest

### Преимущества pytest:

- **Простота синтаксиса** — обычные функции вместо классов, простые assert вместо специальных методов
- **Мощные фикстуры** — гибкая система для подготовки данных и ресурсов
- **Параметризация** — простое создание параметризованных тестов
- **Богатая экосистема** — множество плагинов для различных задач
- **Отличные отчёты** — красивые и информативные отчёты о результатах тестов
- **Автообнаружение** — автоматически находит и запускает тесты
- **Маркировка** — гибкая система маркеров для категоризации тестов

### Недостатки pytest:

- **Дополнительная зависимость** — нужно устанавливать отдельно
- **Кривая обучения** — более сложный для изучения, чем unittest
- **Избыточность** — может быть избыточным для простых проектов

## 2. Установка и базовый пример

### 2.1. Установка

```bash
# Установка pytest
pip install pytest

# Установка с дополнительными плагинами
pip install pytest pytest-cov pytest-mock pytest-html

# Установка для разработки
pip install -e .
```

### 2.2. Первый тест

```python
# test_math.py
def add(a, b):
    return a + b

def test_add_positive_numbers():
    """Тест сложения положительных чисел"""
    assert add(2, 3) == 5

def test_add_negative_numbers():
    """Тест сложения отрицательных чисел"""
    assert add(-1, -2) == -3

def test_add_zero():
    """Тест сложения с нулём"""
    assert add(5, 0) == 5
```

**Запуск тестов:**
```bash
pytest test_math.py
pytest test_math.py -v  # подробный вывод
pytest test_math.py -s  # показать print()
pytest test_math.py -x  # остановиться при первой ошибке
pytest test_math.py --tb=short  # короткий traceback
pytest test_math.py -k "test_add"  # запустить только тесты с "test_add" в имени
```

**Объяснение флагов командной строки:**

- **`-v` (verbose)** — показывает подробную информацию о каждом тесте
- **`-s`** — отключает захват вывода, позволяя видеть print() и другие сообщения
- **`-x`** — останавливает выполнение при первой ошибке или неудаче
- **`--tb=short`** — показывает сокращённый traceback для ошибок
- **`-k "pattern"`** — запускает только тесты, имена которых содержат указанный паттерн
- **`--collect-only`** — показывает, какие тесты будут запущены, без их выполнения
- **`--lf`** — запускает только тесты, которые упали в последний раз

**Результат выполнения:**
```
test_math.py::test_add_positive_numbers PASSED
test_math.py::test_add_negative_numbers PASSED
test_math.py::test_add_zero PASSED

============================== 3 passed in 0.02s ==============================
```

## 3. Фикстуры в pytest

Фикстуры — это одна из самых мощных возможностей pytest. Они позволяют создавать переиспользуемые объекты для тестов и являются более гибкой альтернативой методам `setUp` и `tearDown` из unittest. Фикстуры могут быть простыми функциями, которые возвращают данные, или сложными объектами с настройкой и очисткой.

**Преимущества фикстур:**
- **Переиспользование** — одна фикстура может использоваться в множестве тестов
- **Зависимости** — фикстуры могут зависеть друг от друга
- **Области видимости** — можно контролировать, как часто создаётся объект
- **Автоматическое управление ресурсами** — автоматическая очистка после использования
- **Читаемость** — явное указание зависимостей в параметрах функции

### 3.1. Простые фикстуры

```python
import pytest

@pytest.fixture
def sample_data():
    """Фикстура, возвращающая тестовые данные"""
    return [1, 2, 3, 4, 5]

@pytest.fixture
def empty_list():
    """Фикстура для пустого списка"""
    return []

def test_data_length(sample_data):
    """Тест использует фикстуру sample_data"""
    assert len(sample_data) == 5

def test_data_sum(sample_data):
    """Другой тест с той же фикстурой"""
    assert sum(sample_data) == 15

def test_empty_list(empty_list):
    """Тест с другой фикстурой"""
    assert len(empty_list) == 0

def test_data_operations(sample_data):
    """Тест различных операций с данными"""
    # Проверяем, что данные не пустые
    assert len(sample_data) > 0
    
    # Проверяем, что все элементы положительные
    assert all(x > 0 for x in sample_data)
    
    # Проверяем, что сумма больше максимального элемента
    assert sum(sample_data) > max(sample_data)
```

**Объяснение работы фикстур:**

1. **Создание фикстуры**: Функция помечается декоратором `@pytest.fixture`
2. **Использование в тесте**: Имя фикстуры указывается как параметр тестовой функции
3. **Автоматическое выполнение**: pytest автоматически вызывает фикстуру перед тестом
4. **Передача результата**: Возвращаемое значение фикстуры передаётся в тест как аргумент

### 3.2. Фикстуры с настройкой и очисткой

```python
@pytest.fixture
def database_connection():
    """Фикстура с настройкой и очисткой"""
    # Настройка (setup)
    connection = create_database_connection()
    connection.connect()
    
    # Передача объекта тесту
    yield connection
    
    # Очистка (teardown) - выполняется после теста
    connection.close()
    connection.delete()

def test_database_operations(database_connection):
    """Тест использует фикстуру с автоматической очисткой"""
    result = database_connection.query("SELECT * FROM users")
    assert len(result) >= 0
```

### 3.3. Области видимости фикстур

Одной из мощных возможностей pytest является контроль над тем, как часто создаются фикстуры. Это позволяет оптимизировать производительность тестов, создавая дорогостоящие объекты только когда это необходимо.

**Области видимости (scopes):**

- **`function`** (по умолчанию) — фикстура создаётся для каждого теста
- **`class`** — фикстура создаётся один раз для класса тестов
- **`module`** — фикстура создаётся один раз для модуля (файла)
- **`session`** — фикстура создаётся один раз для всей тестовой сессии

```python
import pytest

@pytest.fixture(scope="function")
def function_scope():
    """Выполняется для каждого теста (по умолчанию)"""
    print("Function scope setup")
    yield "function_data"
    print("Function scope teardown")

@pytest.fixture(scope="class")
def class_scope():
    """Выполняется один раз для класса"""
    print("Class scope setup")
    yield "class_data"
    print("Class scope teardown")

@pytest.fixture(scope="module")
def module_scope():
    """Выполняется один раз для модуля"""
    print("Module scope setup")
    yield "module_data"
    print("Module scope teardown")

@pytest.fixture(scope="session")
def session_scope():
    """Выполняется один раз для всей тестовой сессии"""
    print("Session scope setup")
    yield "session_data"
    print("Session scope teardown")
```

**Когда использовать разные области видимости:**

- **`function`** — для изолированных данных, которые должны быть свежими для каждого теста
- **`class`** — для данных, которые можно переиспользовать в рамках одного класса тестов
- **`module`** — для дорогостоящих операций, которые можно выполнить один раз для файла (например, создание тестовой базы данных)
- **`session`** — для глобальных ресурсов, которые можно переиспользовать во всех тестах (например, конфигурация, соединения с внешними сервисами)

**Пример практического использования:**
```python
@pytest.fixture(scope="session")
def test_database():
    """Создаём тестовую базу данных один раз для всей сессии"""
    db = create_test_database()
    db.setup()
    yield db
    db.cleanup()

@pytest.fixture(scope="function")
def clean_table(test_database):
    """Очищаем таблицу перед каждым тестом"""
    test_database.clear_table("users")
    yield test_database
    # Дополнительная очистка не нужна, так как таблица будет очищена перед следующим тестом

def test_user_creation(clean_table):
    """Тест создания пользователя"""
    user = User(name="Test", email="test@example.com")
    clean_table.insert(user)
    assert clean_table.count("users") == 1
```

## 4. Параметризованные тесты

Параметризованные тесты позволяют запускать один и тот же тест с разными наборами данных. Это очень удобно для проверки функции с различными входными параметрами без дублирования кода. В pytest параметризация реализована очень элегантно и просто.

**Преимущества параметризованных тестов:**
- **Уменьшение дублирования кода** — один тест для множества случаев
- **Полнота покрытия** — легко добавить новые тестовые случаи
- **Читаемость** — все тестовые случаи видны в одном месте
- **Поддержка** — легко изменить логику теста, не затрагивая все случаи

### 4.1. Базовые параметризованные тесты

```python
import pytest

@pytest.mark.parametrize("a, b, expected", [
    (1, 2, 3),
    (0, 0, 0),
    (-1, 1, 0),
    (10, 20, 30),
])
def test_add_parametrized(a, b, expected):
    """Параметризованный тест сложения"""
    assert add(a, b) == expected

@pytest.mark.parametrize("input_data, expected_length", [
    ([], 0),
    ([1], 1),
    ([1, 2, 3], 3),
    ("hello", 5),
])
def test_length_parametrized(input_data, expected_length):
    """Параметризованный тест длины"""
    assert len(input_data) == expected_length
```

**Объяснение синтаксиса:**

- **`@pytest.mark.parametrize`** — декоратор для создания параметризованного теста
- **Первый аргумент** — строка с именами параметров, разделёнными запятыми
- **Второй аргумент** — список кортежей с тестовыми данными
- **Параметры функции** — должны соответствовать именам в декораторе

**Результат выполнения:**
```
test_add_parametrized[1-2-3] PASSED
test_add_parametrized[0-0-0] PASSED
test_add_parametrized[-1-1-0] PASSED
test_add_parametrized[10-20-30] PASSED
test_length_parametrized[[]-0] PASSED
test_length_parametrized[[1]-1] PASSED
test_length_parametrized[[1, 2, 3]-3] PASSED
test_length_parametrized[hello-5] PASSED
```

### 4.2. Параметризация с ID

```python
@pytest.mark.parametrize("test_input,expected", [
    ("3+5", 8),
    ("2+4", 6),
    ("6*9", 54),
], ids=["addition_1", "addition_2", "multiplication"])
def test_eval(test_input, expected):
    """Тест с пользовательскими ID"""
    assert eval(test_input) == expected
```

### 4.3. Сложные примеры параметризации

```python
@pytest.mark.parametrize("user_data, expected_valid", [
    ({"name": "John", "email": "john@example.com"}, True),
    ({"name": "", "email": "john@example.com"}, False),  # пустое имя
    ({"name": "John", "email": "invalid-email"}, False),  # неверный email
    ({"name": "John"}, False),  # отсутствует email
])
def test_user_validation(user_data, expected_valid):
    """Тест валидации пользователя с разными данными"""
    is_valid = validate_user(user_data)
    assert is_valid == expected_valid
```

### 4.4. Комбинирование параметризации с фикстурами

```python
@pytest.fixture
def calculator():
    return Calculator()

@pytest.mark.parametrize("operation, a, b, expected", [
    ("add", 2, 3, 5),
    ("subtract", 5, 3, 2),
    ("multiply", 4, 3, 12),
    ("divide", 10, 2, 5),
])
def test_calculator_operations(calculator, operation, a, b, expected):
    """Тест различных операций калькулятора"""
    result = getattr(calculator, operation)(a, b)
    assert result == expected
```

## 5. Маркировка тестов

Маркировка тестов позволяет категоризировать и фильтровать тесты. Это особенно полезно в больших проектах, где нужно запускать разные наборы тестов в разных ситуациях.

### 5.1. Встроенные маркеры

```python
import pytest

@pytest.mark.slow
def test_slow_operation():
    """Медленный тест"""
    import time
    time.sleep(2)
    assert True

@pytest.mark.skip(reason="Тест временно отключен")
def test_disabled():
    """Пропущенный тест"""
    assert False

@pytest.mark.xfail(reason="Известная проблема")
def test_known_bug():
    """Тест с известной ошибкой"""
    assert False

@pytest.mark.skipif(sys.version_info < (3, 8), reason="Требуется Python 3.8+")
def test_python_version():
    """Тест только для Python 3.8+"""
    assert True
```

### 5.2. Пользовательские маркеры

**Регистрация маркеров в pytest.ini:**
```ini
[tool:pytest]
markers =
    slow: marks tests as slow (deselect with '-m "not slow"')
    integration: marks tests as integration tests
    unit: marks tests as unit tests
    e2e: marks tests as end-to-end tests
    database: marks tests that require database
    api: marks tests that make API calls
    performance: marks tests as performance tests
```

**Использование маркеров:**
```python
@pytest.mark.slow
@pytest.mark.database
def test_complex_database_query():
    """Медленный тест с базой данных"""
    pass

@pytest.mark.api
@pytest.mark.integration
def test_external_api_integration():
    """Интеграционный тест с внешним API"""
    pass

@pytest.mark.unit
def test_fast_unit_test():
    """Быстрый модульный тест"""
    pass
```

**Фильтрация тестов:**
```bash
# Запуск только быстрых тестов
pytest -m "not slow"

# Запуск только модульных тестов
pytest -m unit

# Запуск тестов, которые не требуют базу данных
pytest -m "not database"

# Комбинирование маркеров
pytest -m "unit and not slow"
pytest -m "integration or e2e"
```

## 6. Конфигурация pytest

### 6.1. Файл pytest.ini

```ini
[tool:pytest]
# Пути для поиска тестов
testpaths = tests

# Паттерны файлов с тестами
python_files = test_*.py *_test.py

# Паттерны классов с тестами
python_classes = Test*

# Паттерны функций с тестами
python_functions = test_*

# Дополнительные опции по умолчанию
addopts = 
    -v
    --tb=short
    --strict-markers
    --disable-warnings

# Маркеры
markers =
    slow: marks tests as slow
    integration: marks tests as integration tests
    unit: marks tests as unit tests
    e2e: marks tests as end-to-end tests

# Минимальная версия Python
minversion = 6.0

# Фильтры предупреждений
filterwarnings =
    ignore::DeprecationWarning
    ignore::PendingDeprecationWarning
```

### 6.2. Файл conftest.py

Файл `conftest.py` используется для общих фикстур и конфигурации, которые доступны во всех тестах проекта.

```python
# tests/conftest.py
import pytest
import tempfile
import os

@pytest.fixture(scope="session")
def temp_dir():
    """Временная директория для тестов"""
    with tempfile.TemporaryDirectory() as tmp_dir:
        yield tmp_dir

@pytest.fixture
def sample_config(temp_dir):
    """Конфигурация для тестов"""
    config_file = os.path.join(temp_dir, "config.ini")
    with open(config_file, 'w') as f:
        f.write("[DEFAULT]\n")
        f.write("debug = true\n")
    return config_file

@pytest.fixture(scope="session")
def test_database():
    """Создаём тестовую базу данных для всей сессии"""
    db = create_test_database()
    db.setup()
    yield db
    db.cleanup()

@pytest.fixture
def sample_users(test_database):
    """Создаём тестовых пользователей"""
    users = [
        {"id": 1, "name": "Alice", "email": "alice@example.com"},
        {"id": 2, "name": "Bob", "email": "bob@example.com"},
        {"id": 3, "name": "Charlie", "email": "charlie@example.com"},
    ]
    for user in users:
        test_database.insert_user(user)
    yield users
    # Очистка происходит автоматически благодаря области видимости

@pytest.fixture
def mock_external_api(mocker):
    """Мок для внешнего API"""
    mock_api = mocker.patch('external_api.client')
    mock_api.get_data.return_value = {"status": "success", "data": []}
    mock_api.post_data.return_value = {"status": "success", "id": 123}
    return mock_api
```

**Преимущества conftest.py:**

- **Централизация** — все общие фикстуры в одном месте
- **Автоматическое обнаружение** — pytest автоматически находит фикстуры в conftest.py
- **Переиспользование** — фикстуры доступны во всех тестах проекта
- **Организация** — можно создавать conftest.py в подпапках для локальных фикстур

**Иерархия conftest.py:**
```
tests/
├── conftest.py          # глобальные фикстуры
├── unit/
│   ├── conftest.py      # фикстуры для модульных тестов
│   └── test_calculator.py
├── integration/
│   ├── conftest.py      # фикстуры для интеграционных тестов
│   └── test_database.py
└── e2e/
    ├── conftest.py      # фикстуры для end-to-end тестов
    └── test_workflow.py
```

## 7. Плагины pytest

### 7.1. Популярные плагины

```bash
# Покрытие кода
pip install pytest-cov

# Моки
pip install pytest-mock

# HTML отчёты
pip install pytest-html

# Параллельное выполнение
pip install pytest-xdist

# Повторение неудачных тестов
pip install pytest-rerunfailures

# Генерация отчётов
pip install pytest-json-report

# Тестирование асинхронного кода
pip install pytest-asyncio
```

### 7.2. Использование плагинов

```bash
# Покрытие кода
pytest --cov=myapp tests/

# Параллельное выполнение
pytest -n auto tests/

# Повторение неудачных тестов
pytest --reruns 3 tests/

# HTML отчёт
pytest --html=report.html tests/
```

## 8. Лучшие практики pytest

### 8.1. Структура тестов

```
myproject/
├── src/
│   └── myapp/
│       ├── __init__.py
│       ├── calculator.py
│       └── database.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── unit/
│   │   ├── test_calculator.py
│   │   └── test_utils.py
│   ├── integration/
│   │   ├── test_database.py
│   │   └── test_api.py
│   └── e2e/
│       └── test_workflow.py
├── requirements.txt
└── pytest.ini
```

### 8.2. Именование и организация

```python
# test_calculator.py
class TestCalculator:
    """Тесты для класса Calculator"""
    
    def test_add_positive_numbers(self):
        """Тест сложения положительных чисел"""
        pass
    
    def test_add_negative_numbers(self):
        """Тест сложения отрицательных чисел"""
        pass
    
    def test_divide_by_zero_raises_error(self):
        """Тест деления на ноль должно вызывать исключение"""
        pass

# test_integration.py
class TestIntegration:
    """Интеграционные тесты"""
    
    def test_full_workflow(self):
        """Тест полного рабочего процесса"""
        pass

# test_performance.py
class TestPerformance:
    """Тесты производительности"""
    
    def test_calculation_speed(self):
        """Тест скорости вычислений"""
        pass
    
    def test_memory_usage(self):
        """Тест использования памяти"""
        pass
```

### 8.3. Принципы именования

- **Описательные имена** — имена тестов должны объяснять, что они проверяют
- **Единообразие** — используйте одинаковые паттерны именования во всём проекте
- **Группировка** — группируйте связанные тесты в классы или модули
- **Префиксы** — используйте префиксы для категоризации тестов

**Примеры хороших имён тестов:**
```python
def test_add_positive_numbers():
def test_add_negative_numbers():
def test_add_zero():
def test_add_float_numbers():
def test_add_overflow():
def test_add_invalid_input_raises_error():
def test_user_creation_with_valid_data():
def test_user_creation_with_invalid_email():
def test_user_creation_with_duplicate_email():
def test_database_connection_success():
def test_database_connection_failure():
def test_api_response_format():
def test_api_error_handling():
```

## 9. Сравнение с unittest

| Характеристика | unittest | pytest |
|----------------|----------|--------|
| **Синтаксис** | Объектно-ориентированный | Функциональный |
| **Фикстуры** | setUp/tearDown | @pytest.fixture |
| **Параметризация** | Сложная | Простая с @pytest.mark.parametrize |
| **Маркировка** | Ограниченная | Гибкая система маркеров |
| **Отчёты** | Базовые | Богатые и настраиваемые |
| **Плагины** | Минимум | Большая экосистема |
| **Покрытие** | Требует coverage | Встроенная поддержка |
| **Установка** | Встроен в Python | Требует установки |
| **Кривая обучения** | Простая | Средняя |
| **Производительность** | Хорошая | Отличная |
| **Интеграция с IDE** | Отличная | Отличная |

## 10. Заключение

Pytest — это мощный и гибкий инструмент для тестирования в Python, который предлагает множество возможностей для создания качественных тестов. Его основные преимущества:

- **Простота использования** — простой синтаксис и автоматическое обнаружение тестов
- **Мощные фикстуры** — гибкая система для подготовки данных и ресурсов
- **Параметризация** — простое создание параметризованных тестов
- **Богатая экосистема** — множество плагинов для различных задач
- **Отличные отчёты** — информативные отчёты о результатах тестов

**Когда использовать pytest:**

- **Современные проекты** — более гибкий и мощный инструмент
- **Сложные тесты** — когда нужны параметризация, маркировка, плагины
- **Команды, ценящие производительность** — быстрые тесты и богатые отчёты
- **CI/CD** — лучшая интеграция с системами непрерывной интеграции
- **Большие проекты** — лучше масштабируется для больших кодовых баз

**Следующие шаги:**

В следующих статьях мы рассмотрим:
- [Моки и изоляция тестов](/posts/python-testing-mocks-isolation) — работа с внешними зависимостями
- [Покрытие кода и метрики качества](/posts/python-testing-coverage-metrics) — измерение качества тестов

**Дополнительные ресурсы:**
- [Документация pytest](https://docs.pytest.org/)
- [Python Testing: Основы тестирования и unittest](/posts/python-testing-basics-unittest)
- [Python Testing: Моки и изоляция тестов](/posts/python-testing-mocks-isolation) 