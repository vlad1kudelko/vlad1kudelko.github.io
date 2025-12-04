---
title: "title alembic"
description: "description alembic"
pubDate: "2025-12-04"
order: 0
official: "https://alembic.sqlalchemy.org/en/latest/tutorial.html"
---

# Учебное пособие

Alembic обеспечивает создание, управление и вызов скриптов управления изменениями в реляционной базе данных, используя SQLAlchemy в качестве базовой платформы. В этом руководстве представлено полное введение в теорию и применение этого инструмента.

Для начала убедитесь, что Alembic установлен; распространённый способ установки в локальной виртуальной среде описан в разделе «Установка». Как показано в этой главе, полезно установить Alembic в том же пути к Python модулям, что и целевой проект, обычно используя виртуальную среду Python. Это позволит при запуске команды `alembic` скрипту Python, вызываемому `alembic`, а именно скрипту `env.py` вашего проекта, получить доступ к моделям вашего приложения. Это не является обязательным, но обычно рекомендуется.

В руководстве ниже предполагается, что утилита командной строки `alembic` присутствует в локальном каталоге и при вызове будет иметь доступ к той же среде модулей Python, что и целевой проект.

## Среда миграций

Использование Alembic начинается с создания **среды миграции**. Это каталог скриптов, специфичный для конкретного приложения. Среда миграции создаётся один раз и затем поддерживается вместе с исходным кодом приложения. Среда создаётся с помощью команды `init` и затем настраивается в соответствии с конкретными потребностями приложения.

Структура этой среды, включая некоторые сгенерированные скрипты миграции, выглядит следующим образом:

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

Среда включает в себя следующие каталоги/файлы:

- `alembic.ini` — это основной файл конфигурации Alembic, который генерируется всеми шаблонами.

- `pyproject.toml` — в большинстве современных проектов Python есть файл `pyproject.toml`. Alembic также может хранить в этом файле конфигурацию проекта.

- `yourproject` — это корень исходного кода вашего приложения или некоторый каталог внутри него.

- `alembic` — этот каталог находится в дереве исходного кода вашего приложения и является домом для среды миграции. Его можно назвать как угодно, а проект, использующий несколько баз данных, может иметь даже несколько.

- `env.py` — это скрипт Python, который запускается при каждом вызове инструмента миграции alembic. Он содержит инструкции по настройке и созданию движка SQLAlchemy, получению соединения от этого движка вместе с транзакцией, а затем вызову движка миграции, используя это соединение в качестве источника подключения к базе данных.

Скрипт `env.py` является частью сгенерированной среды, что позволяет полностью настраивать способ выполнения миграций. Скрипт можно модифицировать для работы с несколькими движками, передачи в среду миграции пользовательских аргументов, загрузки и предоставления доступа к библиотекам и моделям, специфичным для приложения.

Alembic включает набор шаблонов инициализации, которые содержат различные варианты `env.py` для разных вариантов использования.

- `README` - включен в различные шаблоны окружения, должен содержать что-то информативное.

- `script.py.mako` — это файл шаблона Mako, используемый для генерации новых скриптов миграции. Всё, что находится здесь, используется для генерации новых файлов в каталоге `versions/`. Это можно сделать с помощью скриптов, что позволяет управлять структурой каждого файла миграции, включая стандартный импорт в каждом файле, а также изменять структуру функций `upgrade()` и `downgrade()`. Например, среда `multidb` позволяет генерировать несколько функций, используя схему именования `upgrade_engine1()`, `upgrade_engine2()`.

- `versions/` — в этом каталоге хранятся отдельные скрипты версий. Пользователи других инструментов миграции могут заметить, что в файлах здесь используются не возрастающие целые числа, а частичный подход с использованием GUID. В Alembic порядок скриптов версий определяется директивами внутри самих скриптов, и теоретически возможно «склеивать» файлы версий между собой, позволяя объединять последовательности миграции из разных веток, хотя и с осторожностью, вручную.

## Создание среды

Понимая, что представляет собой миграционная среда, создадим её с помощью `alembic init`. Эта команда создаст окружение, используя шаблон «generic»:

```
$ cd /path/to/yourproject
$ source /path/to/yourproject/.venv/bin/activate   # предполагается локальное виртуальное окружение
$ alembic init alembic
```

Выше была вызвана команда `init` для создания каталога миграций с именем `alembic`:

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

Представленный выше макет создан с использованием шаблона макета, называемого `generic`. Alembic также включает другие шаблоны окружения. Их можно просмотреть с помощью команды `list_templates`:

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

## Редактирование файла .ini

Alembic поместил файл `alembic.ini` в текущий каталог. Alembic ищет этот файл в текущем каталоге при выполнении любых других команд; для указания альтернативного расположения можно использовать параметр `--config` или задать переменную окружения `ALEMBIC_CONFIG`.

> Файл, созданный с помощью шаблона конфигурации generic, содержит все директивы как для конфигурации исходного кода, так и для конфигурации базы данных. При использовании шаблона pyproject элементы конфигурации исходного кода будут находиться в отдельном файле pyproject.toml.

Ниже представлен универсальный .ini-файл, созданный `Generic`:

```
# A generic, single database configuration.

[alembic]
# path to migration scripts.
# this is typically a path given in POSIX (e.g. forward slashes)
# format, relative to the token %(here)s which refers to the location of this
# ini file
script_location = %(here)s/alembic

# template used to generate migration file names; The default value is %%(rev)s_%%(slug)s
# Uncomment the line below if you want the files to be prepended with date and time
# file_template = %%(year)d_%%(month).2d_%%(day).2d_%%(hour).2d%%(minute).2d-%%(rev)s_%%(slug)s

# sys.path path, will be prepended to sys.path if present.
# defaults to the current working directory.
prepend_sys_path = .

# timezone to use when rendering the date within the migration file
# as well as the filename.
# If specified, requires the python>=3.9 or backports.zoneinfo library and tzdata library.
# Any required deps can installed by adding `alembic[tz]` to the pip requirements
# string value is passed to ZoneInfo()
# leave blank for localtime
# timezone =

# max length of characters to apply to the
# "slug" field
# truncate_slug_length = 40

# set to 'true' to run the environment during
# the 'revision' command, regardless of autogenerate
# revision_environment = false

# set to 'true' to allow .pyc and .pyo files without
# a source .py file to be detected as revisions in the
# versions/ directory
# sourceless = false

# version location specification; This defaults
# to <script_location>/versions.  When using multiple version
# directories, initial revisions must be specified with --version-path.
# the special token `%(here)s` is available which indicates the absolute path
# to this configuration file.
#
# The path separator used here should be the separator specified by "version_path_separator" below.
# version_locations = %(here)s/bar:%(here)s/bat:%(here)s/alembic/versions

# path_separator (New in Alembic 1.16.0, supersedes version_path_separator);
# This indicates what character is used to
# split lists of file paths, including version_locations and prepend_sys_path
# within configparser files such as alembic.ini.
#
# The default rendered in new alembic.ini files is "os", which uses os.pathsep
# to provide os-dependent path splitting.
#
# Note that in order to support legacy alembic.ini files, this default does NOT
# take place if path_separator is not present in alembic.ini.  If this
# option is omitted entirely, fallback logic is as follows:
#
# 1. Parsing of the version_locations option falls back to using the legacy
#    "version_path_separator" key, which if absent then falls back to the legacy
#    behavior of splitting on spaces and/or commas.
# 2. Parsing of the prepend_sys_path option falls back to the legacy
#    behavior of splitting on spaces, commas, or colons.
#
# Valid values for path_separator are:
#
# path_separator = :
# path_separator = ;
# path_separator = space
# path_separator = newline
#
# Use os.pathsep. Default configuration used for new projects.
path_separator = os

# set to 'true' to search source files recursively
# in each "version_locations" directory
# new in Alembic version 1.10
# recursive_version_locations = false

# the output encoding used when revision files
# are written from script.py.mako
# output_encoding = utf-8

# database URL.  This is consumed by the user-maintained env.py script only.
# other means of configuring database URLs may be customized within the env.py
# file.
# See notes in "escaping characters in ini files" for guidelines on
# passwords
sqlalchemy.url = driver://user:pass@localhost/dbname

# [post_write_hooks]
# This section defines scripts or Python functions that are run
# on newly generated revision scripts.  See the documentation for further
# detail and examples

# format using "black" - use the console_scripts runner,
# against the "black" entrypoint
# hooks = black
# black.type = console_scripts
# black.entrypoint = black
# black.options = -l 79 REVISION_SCRIPT_FILENAME

# lint with attempts to fix using "ruff" - use the module runner, against the "ruff" module
# hooks = ruff
# ruff.type = module
# ruff.module = ruff
# ruff.options = check --fix REVISION_SCRIPT_FILENAME

# Alternatively, use the exec runner to execute a binary found on your PATH
# hooks = ruff
# ruff.type = exec
# ruff.executable = ruff
# ruff.options = check --fix REVISION_SCRIPT_FILENAME

# Logging configuration.  This is also consumed by the user-maintained
# env.py script only.
[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARNING
handlers = console
qualname =

[logger_sqlalchemy]
level = WARNING
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

Файл `alembic.ini` используется Alembic с помощью библиотеки Python `configparser.ConfigParser`. Переменная `%(here)s` предоставляется в качестве подстановки и содержит абсолютный путь к файлу `alembic.ini`. Это можно использовать для формирования правильных путей к каталогам и файлам относительно расположения файла конфигурации.

> Знаки процента в переменных конфигурации `alembic.ini`, не являющиеся частью интерполяционного токена, например `%(here)s`, включая знаки процента, входящие в URL-адрес базы данных SQLAlchemy в соответствии с её требованиями к экранированию URL-адресов, сами должны быть экранированы.

Этот файл содержит следующие функции:

- `[alembic]` — это раздел, который Alembic считывает для определения конфигурации. Базовая реализация Alembic не считывает напрямую никакие другие области файла, за исключением дополнительных директив, которые могут быть использованы из настраиваемого пользователем файла `env.py`. Имя «alembic» (только для конфигурации configparser, но не для `pyproject.toml`) можно изменить с помощью флага командной строки `--name`; простой пример см. в разделе «Запуск нескольких сред Alembic из одного INI-файла».

> Файл `env.py` по умолчанию, включенный в шаблоны среды Alembic, также будет считывать данные из разделов журналирования `[logging]`, `[handlers]` и т. д. Если используемый файл конфигурации не содержит директив журналирования, удалите директиву `fileConfig()` в сгенерированном файле `env.py`, чтобы предотвратить попытки настроить журналирование.

- `script_location` — это расположение среды Alembic. Обычно оно указывается как расположение в файловой системе относительно токена `%(here)s`, который указывает, где расположен сам файл конфигурации. Расположение может быть также задано как относительный путь, интерпретируемый как относительный к текущему каталогу, или как абсолютный путь. Это единственный ключ, который требуется Alembic во всех случаях. При создании INI-файла командой `alembic init alembic` имя каталога `alembic` автоматически помещается сюда. Также можно использовать специальную переменную `%(here)s`, например, `%(here)s/alembic`. Для поддержки приложений, упаковывающих себя в файлы .egg, значение также можно указать как ресурс пакета, в этом случае для поиска файла используется функция `resource_filename()` (новое в версии 0.2.2). Любой неабсолютный URI, содержащий двоеточия, интерпретируется здесь как имя ресурса, а не как прямое имя файла.

- `file_template` — это схема именования, используемая для создания новых файлов миграции. Раскомментируйте представленное значение, если хотите, чтобы файлы миграции были дополнены датой и временем, чтобы они были перечислены в хронологическом порядке. Значение по умолчанию: `%%(rev)s_%%(slug)s`. Доступные токены:

    - `%%(rev)s` - идентификатор ревизии
    - `%%(slug)s` — усеченная строка, полученная из сообщения об изменении
    - `%%(epoch)s` — временная метка эпохи, основанная на дате создания; здесь используется метод Python datetime.timestamp() для получения значения эпохи.
    - `%%(год)d`, `%%(месяц).2d`, `%%(день).2d`, `%%(час).2d`, `%%(минута).2d`, `%%(секунда).2d` — компоненты даты создания, по умолчанию `datetime.datetime.now()`, если не используется также опция конфигурации часового пояса.

- `timezone` — необязательное имя часового пояса (например, `UTC`, `EST5EDT` и т. д.), которое будет применено к временной метке, отображаемой как в комментарии файла миграции, так и в имени файла. Для этого требуется Python версии 3.9 или установленные библиотеки `backports.zoneinfo` и `tzdata`. Если указан `timezone`, объект даты создания больше не наследуется от `datetime.datetime.now()` и генерируется следующим образом:

```
datetime.datetime.utcnow().replace(
  tzinfo=datetime.timezone.utc
).astimezone(ZoneInfo(<часовой пояс>))
```

> Изменено в версии 1.13.0: Стандартная библиотека Python zoneinfo теперь используется для рендеринга часового пояса в миграциях; ранее использовалась python-dateutil.

- `truncate_slug_length` — по умолчанию 40, максимальное количество символов для включения в поле «slug».

- `sqlalchemy.url` — URL-адрес для подключения к базе данных через SQLAlchemy. Это значение конфигурации используется только в том случае, если оно вызвано файлом `env.py`; в «универсальном» шаблоне этот ключ используется при вызове `config.get_main_option("sqlalchemy.url")` в функции `run_migrations_offline()` и вызове `engine_from_config(prefix="sqlalchemy.")` в функции `run_migrations_online()`. Если URL-адрес SQLAlchemy должен быть получен из другого источника, например, из переменных окружения или глобального реестра, или если среда миграции использует несколько URL-адресов баз данных, разработчику рекомендуется изменить файл `env.py`, чтобы использовать любые подходящие методы для получения URL-адреса или URL-адресов базы данных.

- `revision_environment` — это флаг, значение которого «true» будет указывать на то, что скрипт среды миграции `env.py` должен запускаться безусловно при создании новых файлов ревизий, а также при запуске команды `alembic history`.

- `sourceless` — при значении «true» файлы ревизий, существующие только в виде файлов .pyc или .pyo в каталоге версий, будут использоваться в качестве версий, что позволяет создавать папки версий без исходного кода. При значении по умолчанию «false» в качестве файлов версий будут использоваться только файлы .py.

- `version_locations` — необязательный список расположений файлов ревизий, позволяющий ревизиям существовать в нескольких каталогах одновременно.

- `path_separator` — символ-разделитель для списков путей `version_locations` и `prepend_sys_path`. Применяется только к конфигурации configparser и не требуется при использовании конфигурации `pyproject.toml`.

- `recursive_version_locations` — если установлено значение «true», файлы ревизий ищутся рекурсивно в каждом каталоге «version_locations».

Добавлено в версии 1.10.

- `output_encoding` — кодировка, используемая Alembic при записи файла `script.py.mako` в новый файл миграции. По умолчанию — `utf-8`.

- `[loggers]`, `[handlers]`, `[formatters]`, `[logger_*]`, `[handler_*]`, `[formatter_*]` — эти разделы являются частью стандартной конфигурации журналирования Python, механика которой описана в разделе «Формат файла конфигурации». Как и в случае с подключением к базе данных, эти директивы используются напрямую в результате вызова `logging.config.fileConfig()` в скрипте `env.py`, который вы можете изменять.

Для запуска только одной базы данных и общей конфигурации достаточно настроить URL-адрес SQLAlchemy:

```
sqlalchemy.url = postgresql://scott:tiger@localhost/test
```
