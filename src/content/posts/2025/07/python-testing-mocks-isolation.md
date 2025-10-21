+++
lang = "ru"
title = "Python Testing: Моки и изоляция тестов"
description = "Подробное руководство по мокам в Python: unittest.mock, pytest-mock, патчинг, изоляция тестов и лучшие практики работы с внешними зависимостями."
template = "posts"
thumb = "/imgs/2025/07/python-testing-mocks-isolation.webp"
publication_date = "2025-07-20"
+++

# Python Testing: Моки и изоляция тестов

Для изоляции тестов часто необходимо заменять внешние зависимости моками. Моки (mock objects) — это объекты, которые имитируют поведение реальных объектов, но в контролируемой среде. Это позволяет тестировать код независимо от внешних систем, таких как базы данных, веб-сервисы или файловая система.

## 1. Зачем нужны моки?

### Основные причины использования моков:

- **Изоляция тестов** — тесты не зависят от внешних систем
- **Скорость** — моки работают быстрее, чем реальные системы
- **Надёжность** — тесты не падают из-за проблем с внешними сервисами
- **Контроль** — можно симулировать различные сценарии (ошибки, медленные ответы)
- **Повторяемость** — тесты дают одинаковые результаты при каждом запуске

### Типы моков:

- **Mock** — простой объект, который может имитировать любой атрибут или метод
- **MagicMock** — расширенная версия Mock с предустановленными магическими методами
- **patch** — декоратор для временной замены объектов в модуле
- **Mock** с **spec** — мок, который проверяет соответствие интерфейсу реального объекта

## 2. unittest.mock

Модуль `unittest.mock` входит в стандартную библиотеку Python и предоставляет мощные инструменты для создания моков.

### 2.1. Базовые моки

```python
from unittest.mock import Mock, patch, MagicMock
import unittest

class TestWithMocks(unittest.TestCase):
    def test_mock_basic(self):
        """Базовый пример мока"""
        mock_obj = Mock()
        mock_obj.some_method.return_value = "mocked result"
        
        result = mock_obj.some_method()
        self.assertEqual(result, "mocked result")
        mock_obj.some_method.assert_called_once()
    
    def test_mock_with_arguments(self):
        """Мок с аргументами"""
        mock_func = Mock()
        mock_func.return_value = 42
        
        result = mock_func("arg1", "arg2", kwarg="value")
        
        self.assertEqual(result, 42)
        mock_func.assert_called_once_with("arg1", "arg2", kwarg="value")
    
    def test_mock_side_effect(self):
        """Мок с побочными эффектами"""
        mock_func = Mock()
        mock_func.side_effect = [1, 2, 3]  # возвращает разные значения
        
        self.assertEqual(mock_func(), 1)
        self.assertEqual(mock_func(), 2)
        self.assertEqual(mock_func(), 3)
        
        # После третьего вызова возвращает StopIteration
        with self.assertRaises(StopIteration):
            mock_func()
```

### 2.2. Патчинг функций и классов

```python
    @patch('builtins.open')
    def test_file_operations(self, mock_open):
        """Тест с патчингом встроенной функции"""
        mock_open.return_value.__enter__.return_value.read.return_value = "file content"
        
        with open('test.txt') as f:
            content = f.read()
        
        self.assertEqual(content, "file content")
        mock_open.assert_called_once_with('test.txt')
    
    @patch('requests.get')
    def test_api_call(self, mock_get):
        """Тест API вызова с моком"""
        # Настраиваем мок для имитации успешного ответа
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "success", "data": [1, 2, 3]}
        mock_get.return_value = mock_response
        
        # Вызываем функцию, которая делает API запрос
        result = fetch_data_from_api("https://api.example.com/data")
        
        # Проверяем результат
        self.assertEqual(result["status"], "success")
        self.assertEqual(len(result["data"]), 3)
        
        # Проверяем, что API был вызван с правильными параметрами
        mock_get.assert_called_once_with("https://api.example.com/data")
```

### 2.3. Моки с spec

```python
    def test_mock_with_spec(self):
        """Тест с моком, который проверяет соответствие интерфейсу"""
        # Создаём мок, который должен соответствовать интерфейсу User
        mock_user = Mock(spec=['name', 'email', 'get_info'])
        mock_user.name = "Test User"
        mock_user.email = "test@example.com"
        mock_user.get_info.return_value = "Test User (test@example.com)"
        
        # Тестируем код, который работает с пользователем
        result = process_user_info(mock_user)
        self.assertEqual(result, "Test User (test@example.com)")
        mock_user.get_info.assert_called_once()
    
    def test_mock_with_spec_error(self):
        """Тест ошибки при обращении к несуществующему атрибуту"""
        mock_user = Mock(spec=['name', 'email'])
        
        # Это работает
        mock_user.name = "Test"
        
        # Это вызовет AttributeError
        with self.assertRaises(AttributeError):
            mock_user.age = 25
```

### 2.4. Дополнительные возможности моков

```python
    def test_mock_advanced_features(self):
        """Продвинутые возможности моков"""
        mock = Mock()
        
        # Настройка возвращаемых значений
        mock.method.return_value = "result"
        
        # Настройка побочных эффектов
        mock.side_effect_func.side_effect = Exception("Database error")
        
        # Настройка атрибутов
        mock.attribute = "value"
        
        # Проверка вызовов
        mock.method()
        mock.method.assert_called()
        mock.method.assert_called_once()
        mock.method.assert_called_with()
        
        # Проверка количества вызовов
        mock.method()
        self.assertEqual(mock.method.call_count, 2)
        
        # Проверка аргументов вызова
        mock.method_with_args("arg1", kwarg="value")
        mock.method_with_args.assert_called_with("arg1", kwarg="value")
        
        # Проверка, что метод не был вызван
        mock.uncalled_method.assert_not_called()
```

## 3. pytest-mock

`pytest-mock` — это плагин для pytest, который предоставляет более удобный интерфейс для работы с моками.

### 3.1. Установка и базовое использование

```bash
pip install pytest-mock
```

```python
import pytest

def test_with_pytest_mock(mocker):
    """Тест с использованием pytest-mock"""
    # Мок для requests.get
    mock_get = mocker.patch('requests.get')
    mock_get.return_value.json.return_value = {"status": "success"}
    
    # Ваш код, который использует requests.get
    import requests
    response = requests.get('https://api.example.com/data')
    data = response.json()
    
    assert data["status"] == "success"
    mock_get.assert_called_once_with('https://api.example.com/data')

def test_api_error_handling(mocker):
    """Тест обработки ошибок API"""
    # Мокаем requests.get для имитации ошибки сети
    mock_get = mocker.patch('requests.get')
    mock_get.side_effect = requests.RequestException("Network error")
    
    # Тестируем функцию, которая должна обрабатывать ошибки
    result = safe_api_call("https://api.example.com/data")
    
    assert result is None  # функция должна вернуть None при ошибке
```

### 3.2. Фикстуры с моками

```python
@pytest.fixture
def mock_database(mocker):
    """Фикстура для мока базы данных"""
    mock_db = mocker.patch('database.connection')
    mock_db.query.return_value.filter.return_value.first.return_value = {
        'id': 1, 'name': 'Test User'
    }
    return mock_db

def test_user_lookup(mock_database):
    """Тест с использованием фикстуры-мока"""
    # Ваш код, который работает с базой данных
    user = mock_database.query().filter().first()
    
    assert user['name'] == 'Test User'

@pytest.fixture
def mock_file_system(mocker):
    """Фикстура для мока файловой системы"""
    mock_os = mocker.patch('os.path.exists')
    mock_os.return_value = True
    
    mock_open = mocker.patch('builtins.open', mocker.mock_open(read_data="file content"))
    
    return {
        'exists': mock_os,
        'open': mock_open
    }

def test_file_processing(mock_file_system):
    """Тест обработки файла с моком файловой системы"""
    result = process_file("test.txt")
    
    assert result == "file content"
    mock_file_system['exists'].assert_called_once_with("test.txt")
    mock_file_system['open'].assert_called_once_with("test.txt", "r")
```

### 3.3. Контекстные менеджеры

```python
def test_context_manager_mocking(mocker):
    """Тест с использованием контекстных менеджеров"""
    with mocker.patch('requests.get') as mock_get:
        mock_get.return_value.json.return_value = {"data": "test"}
        
        response = requests.get('https://api.example.com/data')
        data = response.json()
        
        assert data["data"] == "test"
        mock_get.assert_called_once()

def test_multiple_patches(mocker):
    """Тест с несколькими патчами"""
    with mocker.patch('requests.get') as mock_get, \
         mocker.patch('time.sleep') as mock_sleep:
        
        mock_get.return_value.json.return_value = {"status": "ok"}
        
        result = fetch_data_with_retry("https://api.example.com/data")
        
        assert result["status"] == "ok"
        mock_get.assert_called_once()
        mock_sleep.assert_called_once()
```

## 4. Практические примеры

### 4.1. Моки для базы данных

```python
import pytest
from unittest.mock import Mock

class TestDatabaseOperations:
    def test_user_creation(self, mocker):
        """Тест создания пользователя с моком БД"""
        # Мокаем соединение с базой данных
        mock_connection = mocker.patch('database.get_connection')
        mock_cursor = Mock()
        mock_connection.return_value.cursor.return_value = mock_cursor
        
        # Настраиваем мок для вставки
        mock_cursor.execute.return_value = None
        mock_cursor.fetchone.return_value = (1,)  # ID созданного пользователя
        
        # Вызываем функцию создания пользователя
        user_id = create_user("John", "john@example.com")
        
        # Проверяем результат
        assert user_id == 1
        
        # Проверяем, что SQL был вызван с правильными параметрами
        mock_cursor.execute.assert_called_once()
        call_args = mock_cursor.execute.call_args
        assert "INSERT INTO users" in call_args[0][0]
        assert call_args[0][1] == ("John", "john@example.com")
    
    def test_database_error_handling(self, mocker):
        """Тест обработки ошибок базы данных"""
        mock_connection = mocker.patch('database.get_connection')
        mock_cursor = Mock()
        mock_connection.return_value.cursor.return_value = mock_cursor
        
        # Симулируем ошибку базы данных
        mock_cursor.execute.side_effect = Exception("Database connection failed")
        
        # Проверяем, что функция правильно обрабатывает ошибку
        with pytest.raises(DatabaseError):
            create_user("John", "john@example.com")
```

### 4.2. Моки для внешних API

```python
class TestExternalAPI:
    def test_api_success(self, mocker):
        """Тест успешного API вызова"""
        mock_requests = mocker.patch('requests.get')
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "id": 123,
            "name": "Test User",
            "email": "test@example.com"
        }
        mock_requests.return_value = mock_response
        
        result = fetch_user_from_api(123)
        
        assert result["name"] == "Test User"
        assert result["email"] == "test@example.com"
        mock_requests.assert_called_once_with("https://api.example.com/users/123")
    
    def test_api_timeout(self, mocker):
        """Тест таймаута API"""
        mock_requests = mocker.patch('requests.get')
        mock_requests.side_effect = requests.Timeout("Request timeout")
        
        result = fetch_user_from_api(123)
        
        assert result is None
        mock_requests.assert_called_once()
    
    def test_api_rate_limiting(self, mocker):
        """Тест ограничения скорости API"""
        mock_requests = mocker.patch('requests.get')
        mock_response = Mock()
        mock_response.status_code = 429  # Too Many Requests
        mock_response.json.return_value = {"error": "Rate limit exceeded"}
        mock_requests.return_value = mock_response
        
        with pytest.raises(RateLimitError):
            fetch_user_from_api(123)
```

### 4.3. Моки для файловой системы

```python
class TestFileOperations:
    def test_file_reading(self, mocker):
        """Тест чтения файла"""
        mock_open = mocker.patch('builtins.open', mocker.mock_open(read_data="file content"))
        mock_os = mocker.patch('os.path.exists')
        mock_os.return_value = True
        
        content = read_file("test.txt")
        
        assert content == "file content"
        mock_open.assert_called_once_with("test.txt", "r")
    
    def test_file_not_found(self, mocker):
        """Тест обработки отсутствующего файла"""
        mock_os = mocker.patch('os.path.exists')
        mock_os.return_value = False
        
        with pytest.raises(FileNotFoundError):
            read_file("nonexistent.txt")
    
    def test_file_writing(self, mocker):
        """Тест записи в файл"""
        mock_open = mocker.mock_open()
        mocker.patch('builtins.open', mock_open)
        
        write_file("test.txt", "new content")
        
        mock_open.assert_called_once_with("test.txt", "w")
        mock_open().write.assert_called_once_with("new content")
```

### 4.4. Моки для времени и дат

```python
from datetime import datetime
import time

class TestTimeOperations:
    def test_current_time(self, mocker):
        """Тест работы с текущим временем"""
        # Мокаем datetime.now
        mock_datetime = mocker.patch('datetime.datetime')
        mock_datetime.now.return_value = datetime(2023, 1, 1, 12, 0, 0)
        
        current_time = get_current_time()
        
        assert current_time == "2023-01-01 12:00:00"
    
    def test_sleep_operation(self, mocker):
        """Тест операции ожидания"""
        mock_sleep = mocker.patch('time.sleep')
        
        wait_for_seconds(5)
        
        mock_sleep.assert_called_once_with(5)
    
    def test_timed_operation(self, mocker):
        """Тест измерения времени выполнения"""
        mock_time = mocker.patch('time.time')
        mock_time.side_effect = [100.0, 105.0]  # начало и конец
        
        duration = measure_execution_time(some_function)
        
        assert duration == 5.0
```

## 5. Лучшие практики работы с моками

### 5.1. Принципы мокирования

**1. Мокайте на правильном уровне:**
```python
# Хорошо - мокаем интерфейс
mocker.patch('database.connection')

# Плохо - мокаем реализацию
mocker.patch('database.connection._internal_method')
```

**2. Используйте spec для проверки интерфейса:**
```python
# Хорошо - проверяем соответствие интерфейсу
mock_user = Mock(spec=['name', 'email', 'get_info'])

# Плохо - неограниченный мок
mock_user = Mock()
```

**3. Проверяйте вызовы моков:**
```python
def test_api_call(mocker):
    mock_get = mocker.patch('requests.get')
    mock_get.return_value.json.return_value = {"status": "ok"}
    
    result = fetch_data("https://api.example.com/data")
    
    # Проверяем не только результат, но и вызов
    assert result["status"] == "ok"
    mock_get.assert_called_once_with("https://api.example.com/data")
```

**4. Избегайте избыточного мокирования:**
```python
# Хорошо - мокаем только внешние зависимости
def test_user_creation(mocker):
    mock_db = mocker.patch('database.connection')
    # НЕ мокаем внутренние функции
    result = create_user("John", "john@example.com")
    assert result.name == "John"

# Плохо - избыточное мокирование
def test_user_creation_bad(mocker):
    mock_db = mocker.patch('database.connection')
    mock_validate = mocker.patch('utils.validate_email')  # избыточно
    mock_hash = mocker.patch('utils.hash_password')       # избыточно
```

### 5.2. Организация моков

```python
# conftest.py - общие моки
@pytest.fixture
def mock_external_api(mocker):
    """Общий мок для внешнего API"""
    mock_api = mocker.patch('external_api.client')
    mock_api.get_data.return_value = {"status": "success", "data": []}
    mock_api.post_data.return_value = {"status": "success", "id": 123}
    return mock_api

# test_specific.py - специфичные моки
def test_specific_api_call(mock_external_api, mocker):
    """Тест с дополнительными моками"""
    # Переопределяем общий мок для конкретного теста
    mock_external_api.get_data.return_value = {"status": "error"}
    
    result = handle_api_response()
    assert result is None
```

### 5.3. Отладка моков

```python
def test_debug_mocks(mocker):
    """Тест с отладочной информацией"""
    mock_func = mocker.patch('some_module.function')
    mock_func.return_value = "mocked"
    
    # Включаем отладку
    mock_func.side_effect = lambda *args, **kwargs: print(f"Called with {args}, {kwargs}")
    
    result = some_module.function("test", kwarg="value")
    
    # Проверяем историю вызовов
    print(f"Call history: {mock_func.call_args_list}")
    print(f"Call count: {mock_func.call_count}")
```

## 6. Антипаттерны и ошибки

### 6.1. Распространённые ошибки

**1. Мокирование того, что тестируете:**
```python
# Плохо - мокаем саму тестируемую функцию
def test_bad_mocking(mocker):
    mock_calc = mocker.patch('calculator.add')  # мокаем то, что тестируем
    mock_calc.return_value = 5
    
    result = calculator.add(2, 3)  # бессмысленный тест
    assert result == 5
```

**2. Непроверка вызовов моков:**
```python
# Плохо - не проверяем, что мок был вызван
def test_no_assertion(mocker):
    mock_api = mocker.patch('api.call')
    mock_api.return_value = {"status": "ok"}
    
    result = process_data()
    assert result["status"] == "ok"
    # НЕ проверяем, что API был вызван
```

**3. Слишком сложные моки:**
```python
# Плохо - слишком сложная настройка мока
def test_overcomplicated_mock(mocker):
    mock_db = mocker.patch('database.connection')
    mock_cursor = Mock()
    mock_db.return_value.cursor.return_value = mock_cursor
    mock_cursor.execute.return_value = None
    mock_cursor.fetchall.return_value = [{"id": 1}, {"id": 2}]
    mock_cursor.fetchone.return_value = {"id": 1}
    # ... ещё 10 строк настройки
```

### 6.2. Правильные альтернативы

**1. Тестируйте реальную логику:**
```python
# Хорошо - тестируем реальную логику
def test_good_mocking(mocker):
    mock_db = mocker.patch('database.connection')
    mock_db.return_value.query.return_value.filter.return_value.first.return_value = {"id": 1}
    
    result = get_user_by_id(1)
    assert result["id"] == 1
    mock_db.assert_called_once()
```

**2. Используйте фикстуры для сложных моков:**
```python
@pytest.fixture
def mock_database_complex(mocker):
    """Сложный мок базы данных в фикстуре"""
    mock_db = mocker.patch('database.connection')
    mock_cursor = Mock()
    mock_db.return_value.cursor.return_value = mock_cursor
    mock_cursor.execute.return_value = None
    mock_cursor.fetchall.return_value = [{"id": 1}, {"id": 2}]
    return mock_db

def test_with_complex_mock(mock_database_complex):
    """Тест с использованием сложного мока"""
    result = get_all_users()
    assert len(result) == 2
```

## 7. Заключение

Моки — это мощный инструмент для изоляции тестов, но их нужно использовать правильно. Основные принципы:

**Ключевые принципы:**
- Мокайте интерфейсы, а не реализации
- Используйте spec для проверки соответствия интерфейсу
- Проверяйте не только результаты, но и вызовы моков
- Избегайте избыточного мокирования
- Организуйте моки в фикстуры для переиспользования

**Когда использовать моки:**
- Для изоляции от внешних систем (БД, API, файловая система)
- Для симуляции ошибок и исключительных ситуаций
- Для ускорения тестов
- Для тестирования асинхронного кода

**Когда НЕ использовать моки:**
- Для тестирования простой логики
- Для мокирования того, что вы тестируете
- Когда интеграционные тесты более подходят

**Следующие шаги:**
В следующей статье мы рассмотрим [покрытие кода и метрики качества](/posts/2025/07/python-testing-coverage-metrics) — как измерять эффективность тестов.

**Дополнительные ресурсы:**
- [Документация unittest.mock](https://docs.python.org/3/library/unittest.mock.html)
- [Документация pytest-mock](https://pytest-mock.readthedocs.io/)
- [Python Testing: Основы тестирования и unittest](/posts/2025/07/python-testing-basics-unittest)
- [Python Testing: pytest - современный подход](/posts/2025/07/python-testing-pytest-modern-approach) 