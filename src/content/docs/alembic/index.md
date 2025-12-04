---
title: "title alembic"
description: "description alembic"
pubDate: "2025-12-04"
order: 0
official: "https://alembic.sqlalchemy.org/en/latest/tutorial.html"
---

# Учебник (Tutorial)

Alembic предоставляет средства для создания, управления и выполнения **скриптов управления изменениями** (change management) для реляционной базы данных, используя SQLAlchemy как базовый движок. Этот учебник даёт полное введение в теорию и использование данного инструмента.

Для начала убедитесь, что Alembic установлен. Один из распространённых способов установки в локальное виртуальное окружение описан в разделе `installation`. Как указано в этом разделе, полезно устанавливать Alembic **в тот же модуль / Python path, что и целевой проект**, обычно с использованием `Python virtual environment <https://docs.python.org/3/tutorial/venv.html>`_, чтобы когда запускается команда `alembic`, Python-скрипт, вызываемый `alembic` — то есть `env.py` вашего проекта — имел доступ к моделям вашего приложения. Это не строго обязательно, но обычно предпочтительно.

Далее в учебнике предполагается, что утилита командной строки `alembic` доступна в локальном PATH и при запуске имеет доступ к тому же модульному окружению Python, что и целевой проект.

## Среда миграций (The Migration Environment)

Использование Alembic начинается с создания **среды миграций**. Это каталог со скриптами, специфичный для конкретного приложения. Среда миграций создаётся один раз, а затем сопровождается вместе с исходным кодом приложения. Она создаётся с помощью команды `init` Alembic и затем может быть настроена под нужды проекта.

Структура этой среды (включая автоматически сгенерированные скрипты миграций) выглядит так::

```
yourproject/
    alembic.ini
    pyproject.toml
    alembic/
        env.py
        README
        script.py.mako
        versions/
            3512b954651e_add_account.py
            2b1ae634e5cd_add_order_id.py
            3adcc9a56557_rename_username_field.py
```

Каталог содержит следующие файлы и директории:

* `alembic.ini` — основной конфигурационный файл Alembic, генерируемый всеми шаблонами. Подробный разбор этого файла приведён в разделе :ref:`tutorial_alembic_ini`.
* `pyproject.toml` — большинство современных Python-проектов имеют этот файл. Alembic также может опционально помещать часть конфигурации туда. Подробнее см. раздел :ref:`using_pep_621`.
* `yourproject` — корневая директория исходного кода вашего приложения (или одна из директорий проекта).
* `alembic` — каталог, который располагается внутри дерева исходного кода приложения и является «домом» среды миграций. Его имя можно менять, и проект, работающий с несколькими БД, может иметь несколько таких директорий.
* `env.py` — Python-скрипт, который запускается каждый раз при вызове инструмента миграций Alembic.
  Минимальный набор его функций:

  * конфигурация и создание SQLAlchemy engine,
  * получение соединения и транзакции,
  * запуск движка миграций, используя это соединение.

  Скрипт `env.py` генерируется вместе со средой, чтобы сделать процесс миграций полностью настраиваемым — в нём описываются способы подключения к БД, правила вызова миграций, возможность работы с несколькими engine, передача пользовательских аргументов, загрузка моделей приложения и т. д.

  Alembic включает набор шаблонов инициализации, в которых представлены разные варианты `env.py` для различных случаев.
* **`README`** — файл, который присутствует в разных шаблонах среды и содержит справочную информацию.
* **`script.py.mako`** — шаблон `Mako <http://www.makotemplates.org>`_, используемый при генерации новых миграционных файлов.
  Используется для создания файлов внутри `versions/`. Шаблон можно менять:

  * управлять структурой создаваемых файлов,
  * добавлять стандартные импорты,
  * менять форму функций `upgrade()` и `downgrade()`.
    Например, шаблон `multidb` создаёт функции вида `upgrade_engine1()`, `upgrade_engine2()`.
* **`versions/`** — каталог с отдельными версиями миграций.
  Пользователи других инструментов миграций могут заметить, что здесь не используются возрастающие целые числа, а применяется метод частичных GUID.
  Порядок выполнения миграций определяется не именами файлов, а их внутренними ссылками (`down_revision`). Это позволяет «вклинивать» новые миграции между другими, сливать ветки миграций и т. д., хотя это требует осторожности.

---

# **Создание среды (Creating an Environment)**

Понимая, что представляет собой миграционная среда, создадим её с помощью `alembic init`. Эта команда создаст окружение, используя шаблон «generic»::

```
$ cd /path/to/yourproject
$ source /path/to/yourproject/.venv/bin/activate   # предполагается локальное виртуальное окружение
$ alembic init alembic
```

Команда `init` создаёт миграционную директорию `alembic`::

```
Creating directory /path/to/yourproject/alembic...done
Creating directory /path/to/yourproject/alembic/versions...done
Generating /path/to/yourproject/alembic.ini...done
Generating /path/to/yourproject/alembic/env.py...done
Generating /path/to/yourproject/alembic/README...done
Generating /path/to/yourproject/alembic/script.py.mako...done
Please edit configuration/connection/logging settings in
'/path/to/yourproject/alembic.ini' before proceeding.
```

Эта структура создана с использованием шаблона под названием `generic`.
Alembic также предоставляет другие шаблоны среды. Их можно посмотреть командой::

```
$ alembic list_templates
Available templates:

generic - Generic single-database configuration.
pyproject - pep-621 compliant configuration that includes pyproject.toml
async - Generic single-database configuration with an async dbapi.
multidb - Rudimentary multi-database configuration.

Templates are used via the 'init' command, e.g.:

  alembic init --template generic ./scripts
```

.. versionchanged:: 1.16.0 — добавлен новый шаблон `pyproject`. См. раздел :ref:`using_pep_621`.

---

Следующая часть — **раздел “Editing the .ini File”** — будет в следующем сообщении.

