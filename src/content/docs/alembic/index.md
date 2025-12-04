---
title: "Настройка Alembic с нуля: alembic.ini, pyproject.toml, sqlalchemy.url и шаблоны"
description: "Самый полный русскоязычный гайд по настройке Alembic: разбор всех параметров alembic.ini и pyproject.toml, правильное экранирование %% и паролей с @/% в sqlalchemy.url, настройка нескольких баз, file_template, version_paths, env.py, автогенерация миграций и переход с ini на toml-формат."
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

- `[alembic]` — это раздел, который Alembic считывает для определения конфигурации. Базовая реализация Alembic не считывает напрямую никакие другие области файла, за исключением дополнительных директив, которые могут быть использованы из настраиваемого пользователем файла `env.py`. Имя «alembic» (только для конфигурации configparser, но не для `pyproject.toml`) можно изменить с помощью флага командной строки `--name`.

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

### Экранирование символов в ini-файлах

Как упоминалось ранее, формат .ini файлов Alembic обрабатывается с помощью встроенного в Python модуля `ConfigParser`. В процессе парсинга файла активирована функция интерполяции `ConfigParser`, что позволяет использовать токен `%(here)s`. Кроме того, поддерживаются любые другие токены, которые пользователь может настроить, передав их через параметр `Config.config_args` при создании собственного объекта `Config`.

Это означает, что любая строка, содержащая знак процента, не являющийся частью интерполированной переменной, должна быть экранирована путём его удвоения. То есть, для такого значения конфигурации в скрипте Python:

```
my_configuration_value = "some % string"
```

Для анализа файла .ini его необходимо поместить следующим образом:

```
[alembic]

my_configuration_value = some %% string
```

Такое экранирование можно увидеть в образце файла `alembic.ini`, проиллюстрированном такими значениями, как `file_template`:

```
# template used to generate migration file names; The default value is %%(rev)s_%%(slug)s
file_template = %%(year)d_%%(month).2d_%%(day).2d_%%(hour).2d%%(minute).2d-%%(rev)s_%%(slug)s
```

В приведенном выше примере фактический `file_template`, отправляемый в систему генерации файлов Alembic, будет иметь вид `%(year)d_%(month).2d_%(day).2d_%(hour).2d%(minute).2d-%(rev)s_%(slug)s`.

> Alembic также использует интерполяцию знака процента при извлечении значений из файла `pyproject.toml`. Поэтому те же шаги по удвоению процента необходимо применять к значениям, анализируемым Alembic, для таких полей, как `file_template`.

В URL-адресе SQLAlchemy знаки процента используются для экранирования синтаксически значимых символов, таких как символ `@`, а также самого символа процента. Для пароля типа `P@ssw%rd`:

```
>>> my_actual_password = "P@ssw%rd"
```

Как указано в документации SQLAlchemy, знак `@` и знак процента при размещении в URL-адресе следует экранировать с помощью `urllib.parse.quote_plus`:

```
>>> import urllib.parse
>>> sqlalchemy_quoted_password = urllib.parse.quote_plus(my_actual_password)
>>> sqlalchemy_quoted_password
'P%40ssw%25rd'
```

Такое цитирование URL-адресов можно также увидеть в собственной строковой классификации URL-адресов SQLAlchemy:

```
>>> from sqlalchemy import URL
>>> URL.create(
...   "some_db", username="scott", password=my_actual_password, host="host"
... ).render_as_string(hide_password=False)
'some_db://scott:P%40ssw%25rd@host'
```

Чтобы поместить указанную выше экранированную строку пароля `P%40ssw%rd` в файл `ConfigParser`, включающий интерполяцию знаков процента, символы `%` удваиваются:

```
>>> sqlalchemy_quoted_password.replace("%", "%%")
'P%%40ssw%%25rd'
```

Вот полная программа, которая составит URL и покажет правильную форму configparser для заданного набора данных подключения к базе данных, а также проиллюстрирует, как проверить правильность этих форм:

```python
from sqlalchemy import URL, make_url

database_driver = input("database driver? ")
username = input("username? ")
password = input("password? ")
host = input("host? ")
port = input("port? ")
database = input("database? ")

sqlalchemy_url = URL.create(
    drivername=database_driver,
    username=username,
    password=password,
    host=host,
    port=int(port),
    database=database,
)

stringified_sqlalchemy_url = sqlalchemy_url.render_as_string(
    hide_password=False
)

# assert make_url round trip
assert make_url(stringified_sqlalchemy_url) == sqlalchemy_url

print(
    f"The correctly escaped string that can be passed "
    f"to SQLAlchemy make_url() and create_engine() is:"
    f"\n\n     {stringified_sqlalchemy_url!r}\n"
)

percent_replaced_url = stringified_sqlalchemy_url.replace("%", "%%")

# assert percent-interpolated plus make_url round trip
assert make_url(percent_replaced_url % {}) == sqlalchemy_url

print(
    f"The SQLAlchemy URL that can be placed in a ConfigParser "
    f"file such as alembic.ini is:\n\n      "
    f"sqlalchemy.url = {percent_replaced_url}\n"
)
```

Приведенная выше программа должна устранить любую неоднозначность при размещении URL-адреса SQLAlchemy в файле configparser:

```
$ python alembic_pw_script.py
database driver? postgresql+psycopg2
username? scott
password? P@ssw%rd
host? localhost
port? 5432
database? testdb
The correctly escaped string that can be passed to SQLAlchemy make_url() and create_engine() is:

    'postgresql+psycopg2://scott:P%40ssw%25rd@localhost:5432/testdb'

The SQLAlchemy URL that can be placed in a ConfigParser file such as alembic.ini is:

      sqlalchemy.url = postgresql+psycopg2://scott:P%%40ssw%%25rd@localhost:5432/testdb
```

## Использование pyproject.toml для настройки

Поскольку файл `alembic.ini` включает в себя подмножество параметров, специфичных для организации и создания кода Python в локальной среде, эти конкретные параметры в качестве альтернативы можно поместить в файл `pyproject.toml` приложения, чтобы обеспечить конфигурацию, совместимую с PEP 621.

Использование `pyproject.toml` не исключает наличия файла `alembic.ini`, поскольку `alembic.ini` по-прежнему является местом по умолчанию для хранения данных о развертывании, таких как URL-адреса баз данных, параметры подключения и ведение журнала. Однако, поскольку подключение и ведение журнала используются только пользовательским кодом в файле `env.py`, вполне возможно создать среду, которая вообще не требует наличия самого файла `alembic.ini`, если эти элементы конфигурации используются из других мест приложения. Alembic будет успешно работать, даже если присутствует только файл `pyproject.toml` и файл `alembic.ini` не найден.

Чтобы начать настройку pyproject, самый простой подход — использовать шаблон `pyproject`:

```
alembic init --template pyproject alembic
```

В выводе указано, что существующий файл pyproject дополняется дополнительными директивами:

```
Creating directory /path/to/yourproject/alembic...done
Creating directory /path/to/yourproject/alembic/versions...done
Appending to /path/to/yourproject/pyproject.toml...done
Generating /path/to/yourproject/alembic.ini...done
Generating /path/to/yourproject/alembic/env.py...done
Generating /path/to/yourproject/alembic/README...done
Generating /path/to/yourproject/alembic/script.py.mako...done
Please edit configuration/connection/logging settings in
'/path/to/yourproject/pyproject.toml' and
'/path/to/yourproject/alembic.ini' before proceeding.
```

Шаблонизатор Alembic сгенерирует новый файл `pyproject.toml`, если его нет, или добавит директивы в существующий файл `pyproject.toml`, который еще не содержит директив alembic.

В файле `pyproject.toml` сгенерированный раздел по умолчанию в основном похож на файл `alembic.ini`, за приятным исключением того, что списки значений поддерживаются напрямую; это означает, что значения `prepend_sys_path` и `version_locations` указываются в виде списков. Токен `%(here)s` также остаётся доступным в качестве абсолютного пути к файлу `pyproject.toml`:

```
[tool.alembic]
# path to migration scripts
script_location = "%(here)s/alembic"

# template used to generate migration file names; The default value is %%(rev)s_%%(slug)s
# Uncomment the line below if you want the files to be prepended with date and time
# file_template = %%(year)d_%%(month).2d_%%(day).2d_%%(hour).2d%%(minute).2d-%%(rev)s_%%(slug)s

# additional paths to be prepended to sys.path. defaults to the current working directory.
prepend_sys_path = [
    "."
]

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
# version_locations = [
#    "%(here)s/alembic/versions",
#    "%(here)s/foo/bar"
# ]

# set to 'true' to search source files recursively
# in each "version_locations" directory
# new in Alembic version 1.10
# recursive_version_locations = false

# the output encoding used when revision files
# are written from script.py.mako
# output_encoding = "utf-8"


# This section defines scripts or Python functions that are run
# on newly generated revision scripts.  See the documentation for further
# detail and examples
# [[tool.alembic.post_write_hooks]]
# format using "black" - use the console_scripts runner,
# against the "black" entrypoint
# name = "black"
# type = "console_scripts"
# entrypoint = "black"
# options = "-l 79 REVISION_SCRIPT_FILENAME"
#
# [[tool.alembic.post_write_hooks]]
# lint with attempts to fix using "ruff" - use the exec runner,
# execute a binary
# name = "ruff"
# type = "exec"
# executable = "%(here)s/.venv/bin/ruff"
# options = "check --fix REVISION_SCRIPT_FILENAME"
```

> Поскольку Alembic добавляет поддержку интерполяционных токенов, таких как `%(here)s`, при обработке значений `pyproject.toml`, те же шаги по экранированию знака процента, которые применяются к переменным конфигурации `alembic.ini`, также применяются к `pyproject.toml`, несмотря на то, что URL-адреса баз данных не настроены в этом файле. Такое экранирование можно увидеть в примере значения `file_template` выше.

Файл `alembic.ini` для этого шаблона усечен и содержит только конфигурацию базы данных и конфигурацию ведения журнала:

```
[alembic]

# database URL.  This is consumed by the user-maintained env.py script only.
# other means of configuring database URLs may be customized within the env.py
# file.
sqlalchemy.url = driver://user:pass@localhost/dbname

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

Если `env.py` настроен на получение конфигурации подключения к базе данных и ведения журнала из мест, отличных от `alembic.ini`, этот файл можно вообще пропустить.

## Создать сценарий миграции

При наличии соответствующей среды мы можем создать новую ревизию, используя `alembic revision`:

```
$ alembic revision -m "create account table"
Generating /path/to/yourproject/alembic/versions/1975ea83b712_create_accoun
t_table.py...done
```

Создаётся новый файл `1975ea83b712_create_account_table.py`. Смотрим содержимое файла:

```python
"""create account table

Revision ID: 1975ea83b712
Revises:
Create Date: 2011-11-08 11:40:27.089406

"""

# revision identifiers, used by Alembic.
revision = '1975ea83b712'
down_revision = None
branch_labels = None

from alembic import op
import sqlalchemy as sa

def upgrade():
    pass

def downgrade():
    pass
```

Файл ревизии содержит заголовочную информацию, идентификаторы текущей ревизии (revision) и ревизии для "отката" (down_revision), импорт основных директив Alembic, а также пустые функции `upgrade()` и `downgrade()`. Наша задача — заполнить функции `upgrade()` и `downgrade()` директивами, которые будут применять определенный набор изменений к нашей базе данных. `upgrade()`: Эта функция, как правило, обязательна. Она содержит код, который применяет изменения к базе данных. `downgrade()`: Эта функция требуется только в том случае, если вы хотите иметь возможность откатывать изменения, примененные функцией `upgrade()`. Хотя ее наличие не всегда строго обязательно, настоятельно рекомендуется включать ее для обеспечения возможности "отката" ревизий.

Ещё один важный момент — переменная `down_revision`. Именно она определяет правильный порядок применения миграций для Alembic. При создании следующей ревизии идентификатор `down_revision` нового файла будет указывать на неё:

```
# revision identifiers, used by Alembic.
revision = 'ae1027a6acf'
down_revision = '1975ea83b712'
```

Каждый раз, когда Alembic выполняет операцию с каталогом `versions/`, он считывает все файлы и составляет список на основе того, как связаны идентификаторы `down_revision`, где `down_revision`, равный `None`, соответствует первому файлу. Теоретически, если в среде миграции тысячи миграций, это может привести к некоторой задержке запуска, но на практике проекту, вероятно, в любом случае следует удалять старые миграции.

Затем мы можем добавить некоторые директивы в наш скрипт, предположим, добавив новую таблицу `account`:

```python
def upgrade():
    op.create_table(
        'account',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('name', sa.String(50), nullable=False),
        sa.Column('description', sa.Unicode(200)),
    )

def downgrade():
    op.drop_table('account')
```

`create_table()` и `drop_table()` — директивы Alembic. Alembic обеспечивает все основные операции по миграции базы данных с помощью этих директив, которые разработаны с целью максимальной простоты и минимализма; большинство этих директив не зависят от существующих метаданных таблиц. Они используют глобальный «контекст», который указывает, как получить соединение с базой данных (если таковое имеется; миграции также могут выгружать директивы SQL/DDL в файлы) для вызова команды. Этот глобальный контекст настраивается, как и всё остальное, в скрипте `env.py`.

## Проводим нашу первую миграцию

Теперь нам нужно запустить миграцию. Предположим, что наша база данных полностью чистая и пока не имеет версии. Команда `alembic upgrade` выполнит обновление, начиная с текущей версии базы данных (в данном примере — `None`) до заданной целевой версии. Мы можем указать `1975ea83b712` в качестве ревизии, на которую хотим выполнить обновление, но в большинстве случаев проще указать «самую последнюю», в данном случае — `head`:

```
$ alembic upgrade head
INFO  [alembic.context] Context class PostgresqlContext.
INFO  [alembic.context] Will assume transactional DDL.
INFO  [alembic.context] Running upgrade None -> 1975ea83b712
```

Ого, это круто! Обратите внимание, что информация, которую мы видим на экране, — это результат настройки логирования в файле `alembic.ini`, которая выводит поток `alembic` на консоль (в частности, стандартную ошибку).

Процесс, который здесь происходил, включал в себя следующее: Alembic сначала проверял, есть ли в базе данных таблица `alembic_version`, и если нет, создавал её. Alembic искал в этой таблице текущую версию, если таковая имелась, а затем вычислял путь от этой версии до запрошенной версии, в данном случае `head`, которая, как известно, имеет номер `1975ea83b712`. Затем Alembic вызывал метод `upgrade()` в каждом файле, чтобы добраться до целевой версии.

## Проводим вторую миграцию

Давайте сделаем ещё один, чтобы было с чем поиграться. Снова создадим файл ревизий:

```
$ alembic revision -m "Add a column"
Generating /path/to/yourapp/alembic/versions/ae1027a6acf_add_a_column.py...
done
```

Давайте отредактируем этот файл и добавим новый столбец в таблицу `account`:

```python
"""Add a column

Revision ID: ae1027a6acf
Revises: 1975ea83b712
Create Date: 2011-11-08 12:37:36.714947

"""

# revision identifiers, used by Alembic.
revision = 'ae1027a6acf'
down_revision = '1975ea83b712'

from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('account', sa.Column('last_transaction_date', sa.DateTime))

def downgrade():
    op.drop_column('account', 'last_transaction_date')
```

Запустите снова `head`:

```
$ alembic upgrade head
INFO  [alembic.context] Context class PostgresqlContext.
INFO  [alembic.context] Will assume transactional DDL.
INFO  [alembic.context] Running upgrade 1975ea83b712 -> ae1027a6acf
```

Теперь мы добавили столбец `last_transaction_date` в базу данных.

## Частичные идентификаторы ревизий

Если нам нужно явно указать номер версии, мы можем использовать его часть. Если этот номер однозначно идентифицирует версию, его можно использовать в любой команде в любом месте, где принимаются номера версий:

```
$ alembic upgrade ae1
```

Выше мы использовали `ae1` для обозначения ревизии `ae1027a6acf`. Alembic остановится и сообщит вам, если несколько версий начинаются с этого префикса.

## Относительные идентификаторы миграции

Также поддерживаются относительные повышения/понижения. Чтобы перейти на две версии от текущей, можно указать десятичное значение «+N»:

```
$ alembic upgrade +2
```

Для понижения рейтинга принимаются отрицательные значения:

```
$ alembic downgrade -1
```

Относительные идентификаторы также могут указывать на конкретную версию. Например, для обновления до версии `ae1027a6acf` необходимо выполнить два дополнительных шага:

```
$ alembic upgrade ae10+2
```

## Получение информации

Внося несколько изменений, мы можем получить некоторую информацию о положении дел.

Сначала посмотрим текущую версию:

```
$ alembic current
INFO  [alembic.context] Context class PostgresqlContext.
INFO  [alembic.context] Will assume transactional DDL.
Current revision for postgresql://scott:XXXXX@localhost/test: 1975ea83b712 -> ae1027a6acf (head), Add a column
```

`head` отображается только в том случае, если идентификатор ревизии для этой базы данных совпадает с ревизией заголовка.

Мы также можем просмотреть историю с помощью `alembic history`; опция `--verbose` (принимается несколькими командами, включая `history`, `current`, `heads` и `branchs`) покажет нам полную информацию о каждой ревизии:

```
$ alembic history --verbose

Rev: ae1027a6acf (head)
Parent: 1975ea83b712
Path: /path/to/yourproject/alembic/versions/ae1027a6acf_add_a_column.py

    add a column

    Revision ID: ae1027a6acf
    Revises: 1975ea83b712
    Create Date: 2014-11-20 13:02:54.849677

Rev: 1975ea83b712
Parent: <base>
Path: /path/to/yourproject/alembic/versions/1975ea83b712_add_account_table.py

    create account table

    Revision ID: 1975ea83b712
    Revises:
    Create Date: 2014-11-20 13:02:46.257104
```

### Просмотр диапазонов истории

Используя опцию `-r` в `alembic history`, мы также можем просматривать различные фрагменты истории. Аргумент `-r` принимает аргумент `[start]:[end]`, где может быть номер ревизии, символы, такие как `head`, `head` или `base`, `current` для указания текущей(их) ревизии(й), а также отрицательные относительные диапазоны для `[start]` и положительные относительные диапазоны для `[end]`:

```
$ alembic history -r1975ea:ae1027
```

Относительный диапазон, начинающийся с трех предыдущих версий и заканчивающийся текущей миграцией, который вызовет среду миграции для базы данных, чтобы получить текущую миграцию:

```
$ alembic history -r-3:current
```

Как показано выше, чтобы использовать диапазоны, начинающиеся с отрицательного числа (т. е. тире), из-за ошибки в argparse необходимо использовать синтаксис `-r-<base>:<head>` без пробела, как указано выше:

```
$ alembic history -r-3:current
```

или при использовании `--rev-range` необходимо использовать знак равенства:

```
$ alembic history --rev-range=-3:current
```

Использование кавычек или экранированных символов не будет работать, если после имени аргумента есть пробел.

Просмотреть все изменения с 1975 года по главу:

```
$ alembic history -r1975ea:
```

## Понижение

Мы можем проиллюстрировать понижение обратно к нулю, вызвав `alembic downgrade` обратно к началу, которое в алембике называется `base`:

```
$ alembic downgrade base
INFO  [alembic.context] Context class PostgresqlContext.
INFO  [alembic.context] Will assume transactional DDL.
INFO  [alembic.context] Running downgrade ae1027a6acf -> 1975ea83b712
INFO  [alembic.context] Running downgrade 1975ea83b712 -> None
```

Назад в никуда — и снова вверх:

```
$ alembic upgrade head
INFO  [alembic.context] Context class PostgresqlContext.
INFO  [alembic.context] Will assume transactional DDL.
INFO  [alembic.context] Running upgrade None -> 1975ea83b712
INFO  [alembic.context] Running upgrade 1975ea83b712 -> ae1027a6acf
```
