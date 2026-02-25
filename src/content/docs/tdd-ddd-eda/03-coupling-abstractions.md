---
title: "Связанность и абстракции: как снизить зависимости в коде"
description: "Узнайте, как уменьшить связанность (coupling) через абстракции. Разберите на примере синхронизации файлов, как отделить бизнес-логику от операций ввода-вывода и сделать код тестируемым."
pubDate: "2026-02-23"
order: 3
---

# 3. О связанности и абстракциях (стр. 74-89)

## Введение: зачем нужны абстракции?

В предыдущих главах мы создали модель предметной области и паттерн «Репозиторий». Но что делает абстракцию **хорошей**? Как абстракции связаны с тестируемостью кода?

**Ключевая идея этой главы**: мы можем использовать простые абстракции, чтобы скрывать беспорядочные детали реализации. Когда мы пишем код в небольшом проекте, мы можем свободно экспериментировать и делать рефакторинг. Но в большой системе мы становимся заложниками решений, принятых в других частях кода.

Когда мы не можем изменить компонент А из-за боязни нарушить компонент Б, мы говорим, что компоненты **связаны** (coupled).

## Что такое связанность (coupling)?

**Связанность** — это степень зависимости между модулями кода.

### Локально связанность — это хорошо

В локальном плане связанность — признак того, что код работает взаимосвязано, каждый компонент поддерживает другие, все они подходят друг к другу, как шестеренки часов. На жаргоне мы говорим, что код работает, когда существует **высокое сцепление** (cohesion) между связанными элементами.

### Глобально связанность — это плохо

В глобальном плане связанность увеличивает риск и «стоимость» изменения кода, иногда до такой степени, что мы чувствуем себя неспособными внести какие-либо изменения.

**Антипаттерн «большой комок грязи»** (Big Ball of Mud) — это когда по мере роста приложения мы не предотвращаем связанность между элементами, которые не имеют сцепления. Эта связанность увеличивается сверхлинейно до тех пор, пока мы больше не можем эффективно вносить изменения в систему.

### Как уменьшить связанность?

Мы можем уменьшить степень связанности внутри системы, **абстрагируясь от деталей**:

```
┌─────────────┐                    ┌─────────────┐
│  Система A  │───────────────────▶│  Система Б  │
└─────────────┘    Высокая         └─────────────┘
                   связанность


┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  Система A  │────────▶│  Абстракция  │────────▶│  Система Б  │
└─────────────┘         └──────────────┘         └─────────────┘
                   Меньше связанности
```

Абстракция защищает нас от изменений, скрывая сложные детали работы системы. Мы можем изменить реализацию справа, не меняя интерфейс слева.

## Практический пример: синхронизация файлов

Рассмотрим пример, который покажет, как абстракции улучшают тестируемость.

**Задача**: написать код для синхронизации двух файловых каталогов — источника (source) и места назначения (destination).

**Требования**:
1. Если файл существует в источнике, но отсутствует в месте назначения — скопировать его
2. Если файл существует в источнике, но имеет другое имя в месте назначения — переименовать файл назначения
3. Если файл существует в месте назначения, но не существует в источнике — удалить его

### Первый подход: всё в одной функции

Начнём с простой реализации — напишем код, который решает задачу «в лоб»:

```python
# sync.py
import hashlib
import os
import shutil
from pathlib import Path

BLOCKSIZE = 65536

def hash_file(path):
    """Вычислить SHA-1 хеш файла"""
    hasher = hashlib.sha1()
    with path.open("rb") as file:
        buf = file.read(BLOCKSIZE)
        while buf:
            hasher.update(buf)
            buf = file.read(BLOCKSIZE)
    return hasher.hexdigest()

def sync(source, dest):
    # Обойти исходную папку и создать словарь имен и их хешей
    source_hashes = {}
    for folder, _, files in os.walk(source):
        for fn in files:
            source_hashes[hash_file(Path(folder) / fn)] = fn

    seen = set()  # отслеживать файлы, найденные в целевой папке

    # Обойти целевую папку и получить имена файлов и хеши
    for folder, _, files in os.walk(dest):
        for fn in files:
            dest_path = Path(folder) / fn
            dest_hash = hash_file(dest_path)
            seen.add(dest_hash)

            # если в целевой папке есть файл, которого нет в источнике — удалить
            if dest_hash not in source_hashes:
                dest_path.remove()
            # если файл переименован в источнике — переместить
            elif dest_hash in source_hashes and fn != source_hashes[dest_hash]:
                shutil.move(dest_path, Path(folder) / source_hashes[dest_hash])

    # каждый файл из источника, которого нет в назначении — скопировать
    for src_hash, fn in source_hashes.items():
        if src_hash not in seen:
            shutil.copy(Path(source) / fn, Path(dest) / fn)
```

### Проблема: как это тестировать?

Код выглядит нормально, но как его протестировать? Напишем тесты:

```python
# test_sync.py
import tempfile
import shutil
from pathlib import Path

def test_when_a_file_exists_in_the_source_but_not_the_destination():
    try:
        source = tempfile.mkdtemp()
        dest = tempfile.mkdtemp()
        content = "Я — очень полезный файл"
        (Path(source) / 'my-file').write_text(content)

        sync(source, dest)

        expected_path = Path(dest) / 'my-file'
        assert expected_path.exists()
        assert expected_path.read_text() == content
    finally:
        shutil.rmtree(source)
        shutil.rmtree(dest)

def test_when_a_file_has_been_renamed_in_the_source():
    try:
        source = tempfile.mkdtemp()
        dest = tempfile.mkdtemp()
        content = "Я — файл, который переименовали"
        source_path = Path(source) / 'source-filename'
        old_dest_path = Path(dest) / 'dest-filename'
        expected_dest_path = Path(dest) / 'source-filename'

        source_path.write_text(content)
        old_dest_path.write_text(content)

        sync(source, dest)

        assert old_dest_path.exists() is False
        assert expected_dest_path.read_text() == content
    finally:
        shutil.rmtree(source)
        shutil.rmtree(dest)
```

**Вот это да!** Много кода настройки для двух простых случаев!

### В чём проблема?

**Предметная логика** («выяснить разницу между двумя каталогами») **тесно связана** с кодом ввода-вывода. Мы не можем запустить алгоритм без вызова модулей `pathlib`, `shutil` и `hashlib`.

Проблемы такого подхода:
1. **Тесты громоздкие** — много кода настройки и очистки
2. **Тесты медленные** — операции с файловой системой выполняются долго
3. **Тесты хрупкие** — зависят от временных файлов, прав доступа и т.д.
4. **Код сложно расширять** — представьте, что нужно добавить флаг `--dry-run` (показать, что будет сделано, но не делать) или синхронизацию с облачным хранилищем

**Вывод**: высокоуровневый код связан с низкоуровневыми деталями, что усложняет жизнь.

## Выбор правильных абстракций

Как переписать код, чтобы сделать его более тестируемым?

Подумаем о том, что нужно коду от файловой системы. Внимательно просмотрев код, можно увидеть **три отдельные обязанности** (responsibilities):

1. **Опрос файловой системы** — с помощью `os.walk` определяем хеши для серии путей (одинаково для источника и назначения)
2. **Определение действий** — выясняем, является ли файл новым, переименованным или лишним
3. **Выполнение действий** — копируем, перемещаем или удаляем файлы

### Абстрагируем состояние файловой системы

Для шагов 1 и 2 можно использовать абстракцию — **словарь хешей для путей**:

```python
source_files = {'hash1': 'path1', 'hash2': 'path2'}
dest_files = {'hash1': 'path1', 'hash2': 'pathX'}
```

### Абстрагируем действия

Для шага 3 отделим **то, что хотим сделать**, от **того, как это сделать**. Программа будет выводить список команд:

```python
("COPY", "sourcepath", "destpath"),
("MOVE", "old", "new"),
("DELETE", "path"),
```

Теперь тесты будут работать с простыми структурами данных:

> Вместо: «Если у нас есть эта реальная файловая система, то, когда мы выполняем функцию, проверяем произошедшие действия»

> Говорим: «Если у нас есть эта **абстракция** файловой системы, то какая **абстракция действий** произойдёт?»

```python
# test_sync.py — упрощённые тесты

def test_when_a_file_exists_in_the_source_but_not_the_destination():
    src_hashes = {'hash1': 'fn1'}
    dst_hashes = {}
    expected_actions = [('COPY', '/src/fn1', '/dst/fn1')]
    # ... вызываем функцию, проверяем actions

def test_when_a_file_has_been_renamed_in_the_source():
    src_hashes = {'hash1': 'fn1'}
    dst_hashes = {'hash1': 'fn2'}
    expected_actions = [('MOVE', '/dst/fn2', '/dst/fn1')]
    # ... вызываем функцию, проверяем actions
```

## Реализация выбранных абстракций

### Разделяем код на три части

Создадим **«функциональное ядро»** — код, который не зависит от внешнего состояния, и **«императивную оболочку»**, которая работает с реальным миром.

Этот подход описан Гэри Бернхардтом как **«Functional Core, Imperative Shell»** (FCIS).

```python
# sync.py

def sync(source, dest):
    # Шаг 1 (императивный): собрать входные данные
    source_hashes = read_paths_and_hashes(source)
    dest_hashes = read_paths_and_hashes(dest)

    # Шаг 2 (функциональное ядро): бизнес-логика
    actions = determine_actions(source_hashes, dest_hashes, source, dest)

    # Шаг 3 (императивный): применить операции ввода-вывода
    for action, *paths in actions:
        if action == 'copy':
            shutil.copyfile(*paths)
        if action == 'move':
            shutil.move(*paths)
        if action == 'delete':
            os.remove(paths[0])


def read_paths_and_hashes(root):
    """Собрать хеши всех файлов в папке"""
    hashes = {}
    for folder, _, files in os.walk(root):
        for fn in files:
            hashes[hash_file(Path(folder) / fn)] = fn
    return hashes


def determine_actions(src_hashes, dst_hashes, src_folder, dst_folder):
    """
    Функциональное ядро: определить, какие действия нужно выполнить.
    Принимает простые структуры данных, возвращает простые структуры данных.
    """
    for sha, filename in src_hashes.items():
        if sha not in dst_hashes:
            # Файл есть в источнике, но нет в назначении — копируем
            sourcepath = Path(src_folder) / filename
            destpath = Path(dst_folder) / filename
            yield 'copy', sourcepath, destpath
        elif dst_hashes[sha] != filename:
            # Файл переименован — перемещаем
            olddestpath = Path(dst_folder) / dst_hashes[sha]
            newdestpath = Path(dst_folder) / filename
            yield 'move', olddestpath, newdestpath

    for sha, filename in dst_hashes.items():
        if sha not in src_hashes:
            # Файл есть в назначении, но нет в источнике — удаляем
            yield 'delete', Path(dst_folder) / filename
```

### Тесты становятся проще

Теперь тесты действуют непосредственно на функцию `determine_actions()`:

```python
# test_sync.py

def test_when_a_file_exists_in_the_source_but_not_the_destination():
    src_hashes = {'hash1': 'fn1'}
    dst_hashes = {}
    actions = determine_actions(src_hashes, dst_hashes, Path('/src'), Path('/dst'))
    assert list(actions) == [('copy', Path('/src/fn1'), Path('/dst/fn1'))]

def test_when_a_file_has_been_renamed_in_the_source():
    src_hashes = {'hash1': 'fn1'}
    dst_hashes = {'hash1': 'fn2'}
    actions = determine_actions(src_hashes, dst_hashes, Path('/src'), Path('/dst'))
    assert list(actions) == [('move', Path('/dst/fn2'), Path('/dst/fn1'))]

def test_when_a_file_exists_in_the_destination_but_not_the_source():
    src_hashes = {}
    dst_hashes = {'hash1': 'fn1'}
    actions = determine_actions(src_hashes, dst_hashes, Path('/src'), Path('/dst'))
    assert list(actions) == [('delete', Path('/dst/fn1'))]
```

**Преимущества**:
- Тесты работают с простыми словарями, без файловой системы
- Тесты быстрые и надёжные
- Легко добавлять новые тесты для крайних случаев
- Бизнес-логика изолирована от деталей ввода-вывода

## Edge-to-edge тестирование с внедрением зависимостей

Можно пойти дальше и протестировать функцию `sync()` **от края до края** (edge-to-edge), подделав операции ввода-вывода.

### Делаем зависимости явными

Перепишем `sync()` так, чтобы зависимости были явными:

```python
# sync.py

def sync(reader, filesystem, source_root, dest_root):
    """
    reader — функция, которая читает хеши файлов из папки
    filesystem — объект с методами copy(), move(), delete()
    """
    source_hashes = reader(source_root)
    dest_hashes = reader(dest_root)

    for sha, filename in source_hashes.items():
        if sha not in dest_hashes:
            sourcepath = source_root / filename
            destpath = dest_root / filename
            filesystem.copy(sourcepath, destpath)
        elif dest_hashes[sha] != filename:
            olddestpath = dest_root / dest_hashes[sha]
            newdestpath = dest_root / filename
            filesystem.move(olddestpath, newdestpath)

    for sha, filename in dest_hashes.items():
        if sha not in source_hashes:
            filesystem.delete(dest_root / filename)
```

### Создаём поддельные зависимости

```python
# test_sync.py

class FakeFileSystem(list):
    """Поддельная файловая система — записывает все вызовы в список"""

    def copy(self, src, dest):
        self.append(('COPY', src, dest))

    def move(self, src, dest):
        self.append(('MOVE', src, dest))

    def delete(self, dest):
        self.append(('DELETE', dest))


def test_when_a_file_exists_in_the_source_but_not_the_destination():
    source = {"sha1": "my-file"}
    dest = {}

    filesystem = FakeFileSystem()
    reader = {"/source": source, "/dest": dest}.get  # используем dict.get как функцию

    sync(reader, filesystem, "/source", "/dest")

    assert filesystem == [("COPY", "/source/my-file", "/dest/my-file")]


def test_when_a_file_has_been_renamed_in_the_source():
    source = {"sha1": "renamed-file"}
    dest = {"sha1": "original-file"}

    filesystem = FakeFileSystem()
    reader = {"/source": source, "/dest": dest}.get

    sync(reader, filesystem, "/source", "/dest")

    assert filesystem == [("MOVE", "/dest/original-file", "/dest/renamed-file")]
```

**Преимущество**: тесты работают с той же функцией, что и продакшен-код.

**Недостаток**: нужно сделать компоненты с внутренним состоянием явными и передавать их.

## Почему мы не используем `mock.patch`?

В этот момент вы можете подумать: «Почему бы просто не использовать `mock.patch` и не избавиться от лишней работы?»

В этой книге (и в продакшене) мы **избегаем** использования `mock.patch`. Вот три причины:

### 1. Mock.patch не улучшает дизайн

Наложение заплаток на зависимости позволяет проводить юнит-тестирование, но не заставляет задуматься об архитектуре.

Использование `mock.patch` не поможет, если нужно добавить флаг `--dry-run` или работать с FTP-сервером. Для этого всё равно придётся вводить абстракции.

### 2. Тесты с имитациями хрупкие

Тесты с `mock` проверяют **взаимодействие** между элементами кода: «правильные ли аргументы мы использовали при вызове `shutil.copy`?».

Такая связанность между кодом и тестом делает тесты ненадёжными: изменили реализацию — сломались тесты, хотя поведение не изменилось.

### 3. Чрезмерное использование имитаций усложняет тесты

Тесты с множеством `mock` становятся трудными для чтения и не объясняют, что делает код.

## Mock vs Fake: классическая vs лондонская школа TDD

### Краткие определения

**Mock (имитация)** — проверка **как** что-то используется. Пример: `assert_called_once_with()`.

**Fake (подделка)** — рабочая реализация для тестов. Пример: репозиторий в памяти.

**Mock** связан с **лондонской школой TDD** — тестирование через проверку взаимодействия.

**Fake** связан с **классической школой TDD** — тестирование через проверку состояния.

### Наша позиция

Мы занимаем позицию **«классиков»**:
- Создаём тесты на основе **состояния** (setup и assertions)
- Работаем на максимально возможном уровне абстракции
- Не проверяем поведение промежуточных участников

**TDD — это в первую очередь практика проектирования, и только во вторую — практика тестирования.**

Тесты помогают зафиксировать наш выбор дизайна и дать объяснение системе, когда мы возвращаемся к коду после долгого отсутствия.

## Итоги главы

### Что мы сделали?

1. Начали с кода, где бизнес-логика перемешана с операциями ввода-вывода
2. Выделили **три обязанности**: чтение, определение действий, выполнение
3. Создали **абстракции** для состояния (словари хешей) и действий (кортежи команд)
4. Разделили код на **функциональное ядро** и **императивную оболочку**
5. Показали **edge-to-edge тестирование** с явным внедрением зависимостей

### Ключевые принципы

**Абстрагирование состояния** — скрыть сложное состояние за простыми структурами данных.

**Разделение обязанностей** — отделить бизнес-логику от операций ввода-вывода.

**Функциональное ядро** — логика без побочных эффектов, работает с простыми данными.

**Императивная оболочка** — код, который взаимодействует с внешним миром.

**Внедрение зависимостей** — делать зависимости явными для тестируемости.

## Выводы главы 3

1. **Абстракции упрощают тестирование** — скрывают сложное состояние за простыми интерфейсами
2. **Низкая связанность — цель хорошей архитектуры** — уменьшает риск изменений
3. **Зависите от абстракций, а не от реализаций** — используйте инверсию зависимостей
4. **Разделяйте обязанности** — бизнес-логика отдельно, ввод-вывод отдельно
5. **Функциональное ядро + императивная оболочка** — мощный паттерн для тестируемости
6. **Предпочитайте Fake вместо Mock** — тестируйте состояние, а не взаимодействие

### Эвристики для поиска абстракций

Задайте себе вопросы:
- Могу ли я использовать знакомую структуру данных Python для представления состояния запутанной системы?
- Где провести границу между системами, чтобы вставить абстракцию?
- Какие неявные концепции можно сделать явными?
- Что является зависимостью, а что — ключевой бизнес-логикой?

## Вопросы для самопроверки

1. Что такое связанность (coupling)? Почему высокая связанность — это плохо?
2. В чём разница между **сцеплением** (cohesion) и **связанностью** (coupling)?
3. Зачем создавать абстракции вместо работы с реальными объектами (файлы, БД)?
4. Что такое **побочный эффект** и почему он усложняет тестирование?
5. Объясните паттерн **«функциональное ядро — императивная оболочка»**.
6. В чём разница между **Mock** и **Fake**?
7. Что такое **edge-to-edge тестирование**?
8. Почему мы избегаем использования `mock.patch`?
9. Какие три обязанности можно выделить в задаче синхронизации файлов?
10. Как внедрение зависимостей улучшает тестируемость кода?

## Дополнительные ресурсы

- **Гэри Бернхардт**, «Functional Core, Imperative Shell» — https://www.destroyallsoftware.com/talks/functional-core-imperative-shell
- **Мартин Фаулер**, «Mocks Aren't Stubs» — https://martinfowler.com/articles/mocksArentStubs.html
- **Стив Фримен**, «Test-Driven Development» (выступление)
- **Эд Юнг**, «Mocking and Patching Pitfalls» (PyCon)
- **Брэндон Родс**, «Hoisting Your I/O» (выступление о вводе-выводе)
