---
title: "Руководство по Pytest для начинающих: параметризация и фикстуры с нуля"
description: "Узнайте, как писать эффективные тесты на Python с помощью Pytest. Разбираем основы, параметризацию с обработкой ошибок и работу с фикстурами."
heroImage: "../../../../assets/imgs/2025/11/08-pytest-fixture.webp"
pubDate: "2025-11-08"
tags: "manual"
---

# Погружение в Pytest: От первого теста до продвинутых фикстур

Если вы только начинаете писать тесты на Python, стандартная библиотека `unittest` может показаться излишне громоздкой из-за обилия классов. **Pytest** предлагает другой путь: использование простых функций и мощный механизм «магии» под капотом.

В этой статье мы разберем, как пройти путь от простого `assert` до профессиональной работы с данными и окружением.

## 1. Основы: Простота — залог успеха

В pytest не нужно наследовать классы. Достаточно создать файл, название которого начинается с `test_`, и написать функцию с таким же префиксом.

```python
def add(a, b):
    return a + b

def test_add():
    assert add(2, 3) == 5
```

Pytest использует обычный `assert`. Если проверка не пройдет, фреймворк покажет подробный отчет о том, какие именно значения привели к ошибке.

## 2. Параметризация: Один тест — много данных

Представьте, что вам нужно протестировать функцию деления с десятками разных пар чисел. Писать для каждой пары отдельный тест — плохая затея. Здесь на помощь приходит декоратор `@pytest.mark.parametrize`.

### Обработка ошибок через `nullcontext` и `pytest.raises`

Часто нам нужно проверить не только успешные сценарии, но и ожидаемые ошибки (например, деление на ноль). Чтобы не писать два разных теста, мы можем использовать «трюк» с контекстными менеджерами.

```python
import pytest
from contextlib import nullcontext

def divide(a, b):
    return a / b

@pytest.mark.parametrize(
    "a, b, expected_result, expectation",
    [
        (10, 2, 5.0,  nullcontext()),
        (9,  3, 3.0,  nullcontext()),
        (10, 0, None, pytest.raises(ZeroDivisionError)),
    ]
)
def test_divide(a, b, expected_result, expectation):
    with expectation:
        result = divide(a, b)
        if expected_result is not None:
            assert result == expected_result
```

**Как это работает:**

* `nullcontext()` — это «пустышка». Он ничего не делает и позволяет коду внутри блока `with` просто выполниться.
* `pytest.raises(Error)` — перехватывает исключение. Если ошибка возникла, тест считается пройденным.

## 3. Фикстуры: Подготовка среды

Фикстуры — это сердце pytest. Они позволяют вынести код инициализации (setup) и очистки (teardown) за пределы самого теста.

### Тип 1: Фикстуры для подготовки данных

Такие фикстуры просто возвращают объект, который нужен тесту. Это может быть набор тестовых данных, конфиг или мок-объект.

```python
@pytest.fixture
def sample_user_data():
    return {
        "username": "test_user",
        "email": "test@example.com",
        "role": "admin"
    }

def test_user_email(sample_user_data):
    assert "email" in sample_user_data
    assert sample_user_data["email"] == "test@example.com"
```

### Тип 2: Фикстуры для изменения состояния (Setup/Teardown)

Иногда нам нужно что-то изменить перед тестом (например, создать файл или подключиться к БД) и откатить изменения после.

```python
import os

@pytest.fixture
def temp_config_file():
    # Setup: Создаем файл перед тестом
    file_path = "config.tmp"
    with open(file_path, "w") as f:
        f.write("setting=enabled")

    yield file_path  # Здесь управление передается тесту

    # Teardown: Удаляем файл после завершения теста
    if os.path.exists(file_path):
        os.remove(file_path)

def test_config_reading(temp_config_file):
    with open(temp_config_file, "r") as f:
        content = f.read()
    assert content == "setting=enabled"
```

**Ключевой момент:** Все, что идет до оператора `yield` — это подготовка. Все, что после — очистка. Даже если тест упадет с ошибкой, код после `yield` все равно выполнится.
