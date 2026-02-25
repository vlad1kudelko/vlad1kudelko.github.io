---
title: "Связанность и абстракции: как снизить зависимости в коде"
description: "Узнайте, как уменьшить связанность через абстракции на примере синхронизации файлов."
pubDate: "2026-02-23"
order: 3
---

# 3. О связанности и абстракциях (стр. 74-89)

## Что такое связанность?

**Связанность (coupling)** — степень зависимости между модулями кода.

**Локально** связанность — это хорошо (код работает взаимосвязано, как шестерёнки).

**Глобально** связанность — плохо: нельзя изменить компонент А, не сломав компонент Б.

**Антипаттерн «большой комок грязи»** — когда связанность растёт сверхлинейно, и мы больше не можем вносить изменения.

**Решение**: абстрагироваться от деталей.

```
Высокая связанность:
Система A ─────────────▶ Система Б

Меньше связанности:
Система A ──▶ Абстракция ──▶ Система Б
```

## Пример: синхронизация файлов

**Задача**: синхронизировать два каталога.
- Если файл есть в источнике, но нет в назначении — скопировать
- Если файл переименован — переместить
- Если файл есть в назначении, но нет в источнике — удалить

### Плохой подход: всё в одной функции

```python
def sync(source, dest):
    source_hashes = {}
    for folder, _, files in os.walk(source):
        for fn in files:
            source_hashes[hash_file(Path(folder) / fn)] = fn
    
    for folder, _, files in os.walk(dest):
        for fn in files:
            dest_path = Path(folder) / fn
            dest_hash = hash_file(dest_path)
            if dest_hash not in source_hashes:
                dest_path.remove()
            elif dest_hash in source_hashes and fn != source_hashes[dest_hash]:
                shutil.move(dest_path, ...)
    
    for src_hash, fn in source_hashes.items():
        if src_hash not in seen:
            shutil.copy(Path(source) / fn, Path(dest) / fn)
```

**Проблема**: как это тестировать?

```python
def test_when_a_file_exists_in_source_but_not_destination():
    source = tempfile.mkdtemp()
    dest = tempfile.mkdtemp()
    try:
        (Path(source) / 'file').write_text('content')
        sync(source, dest)
        assert (Path(dest) / 'file').exists()
    finally:
        shutil.rmtree(source)
        shutil.rmtree(dest)
```

Много кода настройки для одного теста! Тесты медленные (файловая система) и хрупкие.

### Хороший подход: выделить обязанности

Три обязанности:
1. **Опрос ФС** — получить хеши файлов
2. **Определение действий** — что копировать/перемещать/удалять
3. **Выполнение действий** — копировать/перемещать/удалять

Абстрагируем состояние:

```python
source_files = {'hash1': 'path1', 'hash2': 'path2'}
dest_files = {'hash1': 'path1', 'hash2': 'pathX'}
```

Абстрагируем действия:

```python
('COPY', 'src/path', 'dst/path')
('MOVE', 'old/path', 'new/path')
('DELETE', 'path')
```

### Функциональное ядро и императивная оболочка

```python
def sync(source, dest):
    # Императивная оболочка: собрать данные
    source_hashes = read_paths_and_hashes(source)
    dest_hashes = read_paths_and_hashes(dest)
    
    # Функциональное ядро: бизнес-логика
    actions = determine_actions(source_hashes, dest_hashes, source, dest)
    
    # Императивная оболочка: применить действия
    for action, *paths in actions:
        if action == 'copy':
            shutil.copyfile(*paths)
        elif action == 'move':
            shutil.move(*paths)
        elif action == 'delete':
            os.remove(paths[0])


def determine_actions(src_hashes, dst_hashes, src_folder, dst_folder):
    """Функциональное ядро — без побочных эффектов"""
    for sha, filename in src_hashes.items():
        if sha not in dst_hashes:
            yield 'copy', Path(src_folder) / filename, Path(dst_folder) / filename
        elif dst_hashes[sha] != filename:
            yield 'move', Path(dst_folder) / dst_hashes[sha], Path(dst_folder) / filename
    
    for sha, filename in dst_hashes.items():
        if sha not in src_hashes:
            yield 'delete', Path(dst_folder) / filename
```

### Тесты становятся проще

```python
def test_when_a_file_exists_in_source_but_not_destination():
    src_hashes = {'hash1': 'fn1'}
    dst_hashes = {}
    actions = determine_actions(src_hashes, dst_hashes, Path('/src'), Path('/dst'))
    assert list(actions) == [('copy', Path('/src/fn1'), Path('/dst/fn1'))]

def test_when_a_file_has_been_renamed():
    src_hashes = {'hash1': 'fn1'}
    dst_hashes = {'hash1': 'fn2'}
    actions = determine_actions(src_hashes, dst_hashes, Path('/src'), Path('/dst'))
    assert list(actions) == [('move', Path('/dst/fn2'), Path('/dst/fn1'))]
```

Тесты работают со словарями, без файловой системы. Быстрые и надёжные.

## Edge-to-edge тестирование

Можно протестировать `sync()` целиком, подделав зависимости:

```python
def sync(reader, filesystem, source_root, dest_root):
    source_hashes = reader(source_root)
    dest_hashes = reader(dest_root)
    for sha, filename in source_hashes.items():
        if sha not in dest_hashes:
            filesystem.copy(source_root / filename, dest_root / filename)
        elif dest_hashes[sha] != filename:
            filesystem.move(dest_root / dest_hashes[sha], dest_root / filename)
    for sha, filename in dest_hashes.items():
        if sha not in source_hashes:
            filesystem.delete(dest_root / filename)


class FakeFileSystem(list):
    def copy(self, src, dest):
        self.append(('COPY', src, dest))
    def move(self, src, dest):
        self.append(('MOVE', src, dest))
    def delete(self, dest):
        self.append(('DELETE', dest))


def test_sync():
    source = {"sha1": "file"}
    dest = {}
    filesystem = FakeFileSystem()
    reader = {"/src": source, "/dst": dest}.get
    
    sync(reader, filesystem, "/src", "/dst")
    assert filesystem == [("COPY", "/src/file", "/dst/file")]
```

## Почему не `mock.patch`?

Мы избегаем `mock.patch` по трём причинам:

1. **Не улучшает дизайн** — заплатки не заставляют думать об архитектуре
2. **Тесты хрупкие** — проверка взаимодействия ломается при рефакторинге
3. **Тесты сложные** — много `mock` трудно читать

## Mock vs Fake

**Mock (имитация)** — проверка **как** что-то используется. Пример: `assert_called_once_with()`. Связан с лондонской школой TDD.

**Fake (подделка)** — рабочая реализация для тестов. Пример: репозиторий в памяти. Связан с классической школой TDD.

Мы предпочитаем **Fake**.

## Выводы

1. **Абстракции упрощают тестирование** — скрывают сложные детали
2. **Низкая связанность** — цель архитектуры
3. **Функциональное ядро + императивная оболочка** — логика отдельно, ввод-вывод отдельно
4. **Предпочитайте Fake вместо Mock** — тестируйте состояние, не взаимодействие

## Вопросы

1. Что такое связанность и почему это плохо?
2. Зачем абстрагировать состояние файловой системы словарями?
3. Что такое функциональное ядро и императивная оболочка?
4. В чём разница между Mock и Fake?
5. Почему мы избегаем `mock.patch`?
