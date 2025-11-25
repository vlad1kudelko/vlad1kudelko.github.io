---
title: "PostgreSQL: полный справочник по типам данных, DDL, запросам и оптимизации"
description: "Погружаемся в детали PostgreSQL: типы данных, создание и изменение таблиц, ключи, связи, запросы, подзапросы, функции, индексы, транзакции, ACID, MVCC, партиционирование, pg_hba.conf и оптимизация."
heroImage: "../../../../assets/imgs/2025/11/15-postgresql.webp"
pubDate: "2025-11-15"
tags: "manual"
---

# PostgreSQL: Полный справочник

PostgreSQL — это мощная объектно-реляционная система управления базами данных с открытым исходным кодом. В этой статье рассмотрены основные концепции, типы данных, операции с данными и возможности PostgreSQL.

## Типы данных

PostgreSQL поддерживает широкий спектр типов данных для различных задач. Выбор правильного типа данных важен для производительности и целостности данных.

### Базовые типы

#### Целочисленные числа

- **smallint** (2 байта) — диапазон от -32,768 до 32,767 (±3 × 10³). Используется для небольших значений, где важна экономия памяти.
- **integer** (4 байта) — диапазон от -2,147,483,648 до 2,147,483,647 (±2 × 10⁹). Наиболее часто используемый тип для целых чисел.
- **bigint** (8 байтов) — диапазон от -9,223,372,036,854,775,808 до 9,223,372,036,854,775,807 (±9 × 10¹⁸). Используется для очень больших чисел.

#### Целочисленные числа с автоинкрементом

Эти типы автоматически генерируют последовательные значения:

- **smallserial** (2 байта) — диапазон от 1 до 32,767. Создаёт последовательность автоматически.
- **serial** (4 байта) — наиболее распространённый тип для первичных ключей.
- **bigserial** (8 байтов) — для больших таблиц, где может потребоваться более 2 миллиардов записей.

#### Вещественные числа

- **decimal / numeric** (переменный размер) — точные числа с фиксированной точностью. **Рекомендуется для финансовых расчётов**, где важна точность.
- **real / float4** (4 байта) — числа с плавающей точкой, примерно 6 знаков после запятой. Подходит для научных вычислений.
- **double precision / float8 / float** (8 байтов) — числа с плавающей точкой, примерно 15 знаков после запятой. Более высокая точность, чем у `real`.
- Также можно использовать специальные значения: `infinity` и `NaN` (Not a Number).

#### Монетарные типы

- **money** — специальный тип для хранения денежных сумм. Форматируется в соответствии с локалью базы данных.

#### Символьные типы

- **char(N)** (переменный размер) — строка фиксированной длины N. Если значение короче, дополняется пробелами справа. Если длиннее — возникает ошибка.
- **varchar(N)** (переменный размер) — строка переменной длины до N символов. Не дополняется пробелами. Если длиннее — возникает ошибка.
- **text** (переменный размер) — строка неограниченной длины (до 2 ГБ). Наиболее гибкий вариант для текстовых данных.

#### Бинарные данные

- **bytea** — массив байтов для хранения бинарных данных (изображения, файлы и т.д.).

#### Логические типы

- **boolean / bool** (1 байт) — принимает значения `TRUE`, `FALSE` или `NULL`.

#### Временные типы

- **date** (4 байта) — дата от 4713 года до н.э. до 294276 года н.э.
- **time** (8 байтов) — время суток от 00:00:00 до 24:00:00.
- **timestamp** (8 байтов) — комбинация даты и времени без учёта часового пояса.
- **interval** (16 байтов) — интервал времени (например, "2 days 3 hours").
- **timestamptz** (8 байтов) — комбинация даты, времени и часового пояса. **Рекомендуется использовать вместо `timestamp`** для работы с разными часовыми поясами.

#### Дополнительные типы

- **ARRAYS** — массивы любых типов данных.
- **JSON / JSONB** — хранение данных в формате JSON (JSONB более эффективен для запросов).
- **XML** — хранение XML-документов.
- **Геометрические типы** — точки, линии, многоугольники и другие геометрические объекты.
- **Custom типы** — пользовательские типы данных.
- **NULL** — специальное значение, означающее отсутствие данных.

### Составные типы

Составной тип представляет собой структуру с внутренними полями, похожую на структуру в языках программирования. При создании таблицы автоматически создаётся одноимённый составной тип с такими же именами и типами полей. Это позволяет работать с записями таблицы как с единым объектом.

```sql
CREATE TYPE complex AS (
	r double precision,
	i double precision
);
```

```sql
CREATE TYPE employee_item AS (
	name text,
	employee_id integer,
	salary numeric
);

DO $$
DECLARE
	emp employee_item;
BEGIN
	emp.name = 'Ivan';
	emp.employee_id = 255;
	emp.salary = 1000;
	RAISE NOTICE '%',emp;
END;
$$ LANGUAGE plpgsql;
```

### Домены

Домен по сути представляет собой тип данных с дополнительными условиями, ограничивающими допустимый набор значений. Это позволяет создавать переиспользуемые типы с встроенными проверками, что упрощает поддержку целостности данных на уровне базы.

```sql
CREATE DOMAIN salary AS numeric (10, 2)
	DEFAULT 10000.00
	CHECK (VALUE BETWEEN 10000.00 AND 2000000.00)
	CONSTRAINT sal_not_null CHECK (VALUE IS NOT NULL);
```

### Псевдотипы

Внутренние системные типы, которые нельзя использовать для колонок, но можно в качестве аргументов или возвращаемых значений, имеют собирательное название — **псевдотипы**. Их можно использовать в объявлениях аргументов и возвращаемых значений функций.

Например, тип `void` означает, что функция не возвращает значения. Другие примеры псевдотипов: `internal`, `language_handler`, `record`, `trigger`.

### Полиморфные типы

Полиморфные типы — это типы, которые могут хранить значения других типов, что позволяет создавать универсальные функции. К ним относятся следующие типы: `anyelement`, `anyarray`, `anynonarray`, `anyenum` и `anyrange`.

```sql
CREATE FUNCTION make_array(anyelement, anyelement) RETURNS anyarray AS $$
	SELECT ARRAY[$1, $2];
$$ LANGUAGE SQL;
```

## Создание таблиц

Таблицы в PostgreSQL создаются с помощью команды `CREATE TABLE`. При создании таблицы можно указать колонки, их типы данных, ограничения и связи с другими таблицами.

```sql
CREATE TABLE publisher
(
	publisher_id integer PRIMARY KEY,
	org_name varchar(128) NOT NULL,
	address text NOT NULL
);

CREATE TABLE book
(
	book_id integer PRIMARY KEY,
	title text NOT NULL,
	isbn varchar(32) NOT NULL,
 	-- добавили позже
	fk_publisher_id integer REFERENCES publisher(publisher_id) NOT NULL
);

DROP TABLE publisher;
DROP TABLE book;
```

## Первичные ключи и связи между таблицами

Первичный ключ (PRIMARY KEY) уникально идентифицирует каждую строку в таблице. Внешний ключ (FOREIGN KEY) создаёт связь между таблицами, обеспечивая ссылочную целостность данных.

```sql
CREATE TABLE book
(
	book_id int,
	title text NOT NULL,
	isbn varchar(32) NOT NULL,
	publisher_id int,
	
	CONSTRAINT PK_book_book_id PRIMARY KEY (book_id),
	CONSTRAINT FK_book_publisher FOREIGN KEY (publisher_id) REFERENCES publisher(publisher_id),
);
```

## Вставка данных

Команда `INSERT INTO` позволяет добавлять новые строки в таблицу. Можно вставлять одну или несколько строк за раз.

```sql
INSERT INTO publisher
VALUES
(1, 'hello world', 'NY'),
(2, 'hello world', 'NY');

INSERT INTO book
VALUES
(1, 'hello world', '19045124876'),
(2, 'hello world', '19045124876');
```

## Изменение таблицы

Команда `ALTER TABLE` позволяет изменять структуру существующей таблицы: добавлять или удалять колонки, переименовывать их, изменять типы данных и добавлять ограничения.

```sql
ALTER TABLE book
ADD COLUMN fk_publisher_id integer;

ALTER TABLE book
ADD CONSTRAINT fk_book_publisher
FOREIGN KEY(fk_publisher_id) REFERENCES publisher(publisher_id)
```

## Связь один-к-одному (1:1)

Для гарантирования связи один-к-одному можно добавить ограничение `UNIQUE` к внешнему ключу. Это гарантирует, что каждая запись в одной таблице может быть связана только с одной записью в другой таблице.

```sql
-- Чтобы гарантировать связь 1:1, можно добавить UNIQUE
fk_passport_person integer UNIQUE REFERENCES person(person_id)
```

## Связь "многие ко многим" (M:N)

Связь "многие ко многим" реализуется через промежуточную таблицу (junction table), которая содержит внешние ключи на обе связанные таблицы. Составной первичный ключ обычно состоит из обоих внешних ключей.

```sql
DROP TABLE IF EXISTS book_author;

CREATE TABLE book_author
(
	book_id integer REFERENCES book(book_id),
	author_id integer REFERENCES author(author_id),
	CONSTRAINT book_author_pkey PRIMARY KEY (book_id, author_id) -- composite key
)
```

## Удаление дубликатов

Ключевое слово `DISTINCT` удаляет повторяющиеся строки из результата запроса.

```sql
SELECT DISTINCT Country FROM Customers;
```

## Фильтрация после группировки

Ключевое слово `HAVING` используется для фильтрации результатов после группировки (в отличие от `WHERE`, которое фильтрует до группировки). `HAVING` может использовать агрегатные функции.

```sql
SELECT category_id, SUM(unit_price)
FROM products
GROUP BY category_id
HAVING SUM(unit_price) > 5000
ORDER BY SUM(unit_price)
```

## Объединение, пересечение и исключение

Эти операции работают с результатами двух или более запросов, объединяя их по принципам теории множеств.

### UNION — объединение

Объединяет результаты двух запросов с удалением дубликатов (работает как `DISTINCT`).

```sql
SELECT country FROM customers
UNION
SELECT country FROM employees
```

### UNION ALL — объединение без удаления дубликатов

Объединяет результаты без удаления повторяющихся строк. Работает быстрее, чем `UNION`, так как не требует сортировки и удаления дубликатов.

```sql
SELECT country FROM customers
UNION ALL
SELECT country FROM employees
```

### INTERSECT — пересечение

Возвращает только те записи, которые присутствуют в обоих подзапросах.

```sql
SELECT country FROM customers
INTERSECT
SELECT country FROM employees
```

### EXCEPT — исключение

Возвращает записи, которые есть в первом подзапросе, но отсутствуют во втором.

**Пояснение:** Для понимания различия между `EXCEPT` и `EXCEPT ALL` можно представить, что `EXCEPT` сначала через `DISTINCT` уникализирует оба подзапроса, затем вычитает один список из другого, получая результат как при работе со множествами.

```sql
SELECT country FROM customers
EXCEPT
SELECT country FROM employees
```

### EXCEPT ALL — исключение по количеству

Выбираются те записи, которые в первом подзапросе встречаются чаще, чем во втором.

**Пояснение:** В отличие от `EXCEPT`, здесь не выполняется `DISTINCT`. Оба подзапроса могут содержать дубликаты. Если в первом подзапросе дубликатов больше, чем во втором, в результате будут все эти дубли. Например, если было 10 и 4 записей соответственно, в результате получим 6 дублей.

```sql
SELECT country FROM customers
EXCEPT ALL
SELECT country FROM employees
```

## Соединения таблиц (JOIN)

Соединения позволяют объединять данные из нескольких таблиц на основе связей между ними.

- **INNER JOIN** — возвращает только те строки, для которых есть совпадение в обеих таблицах.
- **LEFT JOIN / RIGHT JOIN** — возвращает все строки из левой (или правой) таблицы и соответствующие строки из другой таблицы. Если совпадения нет, возвращается `NULL`.
- **FULL JOIN** — возвращает все строки из обеих таблиц, заполняя `NULL` там, где нет совпадений.
- **CROSS JOIN** — декартово произведение: каждая строка первой таблицы соединяется с каждой строкой второй таблицы.
- **SELF JOIN** — соединение таблицы с самой собой (полезно для иерархических структур).

## Рекурсивная связь

Рекурсивная связь — это связь таблицы с самой собой через внешний ключ. Часто используется для представления иерархических структур (например, сотрудники и их менеджеры).

```sql
CREATE TABLE employee (
	employee_id integer PRIMARY KEY,
	first_name varchar(255) NOT NULL,
	last_name varchar(255) NOT NULL,
	manager_id integer,
	FOREIGN KEY (manager_id) REFERENCES employee (employee_id)
);
```

## Синтаксический сахар для JOIN

PostgreSQL предоставляет несколько способов записи соединений, которые упрощают синтаксис:

```sql
-- Стандартный способ
SELECT *
FROM orders
JOIN products ON orders.order_id = products.order_id

-- Упрощённый способ с USING (когда имена колонок совпадают)
SELECT *
FROM orders
JOIN products USING(order_id)

-- NATURAL JOIN (автоматически находит общие колонки)
-- Можно писать, но очень не рекомендуется из-за непредсказуемости
SELECT *
FROM orders
NATURAL JOIN products
```

## Подзапросы

Подзапросы — это запросы, вложенные в другие запросы. Можно думать о них как о вложенном цикле: для каждой записи из внешнего запроса проверяется условие во внутреннем подзапросе.

Подзапросы связаны с внешним запросом через условия в секции `WHERE`. Также можно использовать `NOT EXISTS` для проверки отсутствия записей.

```sql
SELECT company_name, contact_name
FROM customers
WHERE EXISTS (
	SELECT customer_id
	FROM orders
	WHERE customer_id = customers.customer_id
	AND freight BETWEEN 50 and 100
)
```

Ниже приведены равнозначные запросы: один использует `JOIN`, второй — подзапросы. Оба подхода имеют свои преимущества в зависимости от ситуации.

```sql
-- Вариант с JOIN
SELECT DISTINCT company_name
FROM customers
JOIN orders USING(customer_id)
JOIN order_details USING(order_id)
WHERE quantity > 40
```

```sql
-- Вариант с подзапросом
SELECT DISTINCT company_name
FROM customers
WHERE customer_id = ANY(
	SELECT customer_id
	FROM orders
	JOIN order_details USING(order_id)
	WHERE quantity > 40
)
```

### Подзапрос со скалярным значением

Подзапрос может возвращать одно значение (скаляр), которое используется в условии сравнения.

```sql
SELECT DISTINCT product_name, quantity
FROM products
JOIN order_details USING(product_id)
WHERE quantity > (
	SELECT AVG(quantity)
	FROM order_details
)
ORDER BY quantity DESC
```

### Подзапрос с квантификатором ALL

Квантификатор `ALL` проверяет, что условие выполняется для всех значений, возвращаемых подзапросом.

```sql
SELECT DISTINCT product_name, quantity
FROM products
JOIN order_details USING(product_id)
WHERE quantity > ALL (
	SELECT AVG(quantity)
	FROM order_details
	GROUP BY product_id
)
ORDER BY quantity DESC
```

## DDL (Data Definition Language)

DDL — язык определения данных, используемый для создания и изменения структуры базы данных.

```sql
CREATE TABLE [table_name]
ALTER TABLE [table_name]
	ADD COLUMN [column_name] [data_type]
	RENAME TO [new_table_name]
	RENAME [old_column_name] TO [new_column_name]
	ALTER COLUMN [column_name] SET DATA TYPE [data_type]
DROP TABLE [table_name]
TRUNCATE TABLE [table_name]
DROP COLUMN [column_name]
```

### Ограничения (Constraints)

Ограничения позволяют задавать правила для данных в таблице, обеспечивая целостность данных.

```sql
ALTER TABLE book
ADD COLUMN price decimal CONSTRAINT CHK_book_price CHECK (price >= 0);
```

```sql
CREATE TABLE customer
(
	customer_id serial,
	full_name text,
	status char DEFAULT 'r'
	
	CONSTRAINT PK_customer_customer_id PRIMARY KEY(customer_id),
	CONSTRAINT CHK_customer_status CHECK (status = 'r' OR status = 'p')
);
```

## Последовательности (Sequences)

Последовательности генерируют уникальные числовые значения, часто используемые для первичных ключей. PostgreSQL предоставляет функции для работы с последовательностями.

```sql
CREATE SEQUENCE seq1;

SELECT nextval('seq1');  -- Получить следующее значение
SELECT currval('seq1');  -- Получить текущее значение последовательности
SELECT lastval();        -- Получить последнее значение, полученное в текущей сессии

SELECT setval('seq1', 16, true);  -- Установить значение последовательности
```

### Новый синтаксис PostgreSQL 10+ (рекомендуется)

Начиная с PostgreSQL 10, рекомендуется использовать синтаксис `GENERATED ALWAYS AS IDENTITY`, который устанавливает запрет на ручное добавление ключа (только через автоинкремент). Это более безопасный и явный способ создания автоинкрементных полей.

```sql
CREATE TABLE book
(
	book_id int GENERATED ALWAYS AS IDENTITY NOT NULL,
	title text NOT NULL,
	
	CONSTRAINT PK_book_book_id PRIMARY KEY (book_id)
);
-- полный синтаксис
-- book_id int GENERATED ALWAYS AS IDENTITY (START WITH 10 INCREMENT BY 2) NOT NULL,
```

## Обновление данных

### UPDATE

Команда `UPDATE` изменяет существующие записи в таблице.

```sql
UPDATE author
SET full_name = 'Elias', rating = 5
WHERE author_id = 1
```

### DELETE

Команда `DELETE` удаляет записи из таблицы. Можно использовать условие `WHERE` для выборочного удаления.

```sql
DELETE FROM author
WHERE rating < 4.5
```

### TRUNCATE vs DELETE

Команды `DELETE` и `TRUNCATE` похожи, но `TRUNCATE` удаляет все данные без использования журналов транзакций (WAL), что делает её быстрее, но менее безопасной. `TRUNCATE` также сбрасывает счётчики автоинкремента.

```sql
-- Удаляет все записи с логированием
DELETE FROM author

-- Удаляет все записи без логирования (быстрее)
TRUNCATE TABLE author
```

### INSERT с RETURNING

Клауза `RETURNING` позволяет получить значения вставленных или обновлённых записей, что полезно для получения сгенерированных ID или других значений.

```sql
INSERT INTO book (title, isbn, publisher_id)  -- Если вставляем все поля, можно не указывать список
VALUES ('title', 'isbn', 3)
RETURNING book_id;  -- Команда по желанию, чтобы получить какое-то поле (можно использовать)
```

## Представления (Views)

Представления — это виртуальные таблицы, основанные на результате SQL-запроса. Они не хранят данные физически, а вычисляют их при каждом обращении.

### Типы представлений

- **Временные** — существуют только в рамках текущей сессии.
- **Рекурсивные** — используют рекурсивные запросы (WITH RECURSIVE).
- **Обновляемые** — позволяют изменять данные через представление.
- **Материализуемые** — хранят данные физически и требуют периодического обновления.

```sql
CREATE VIEW view_name AS
SELECT ...

-- Создать или заменить существующее представление
CREATE OR REPLACE VIEW view_name AS
SELECT ...
```

### Ограничения на REPLACE

При использовании `CREATE OR REPLACE VIEW` действуют следующие ограничения:

- Можно только добавить новые столбцы в конец.
- Нельзя удалить существующие столбцы.
- Нельзя изменить имена столбцов.
- Нельзя изменить порядок следования столбцов.

Но можно переименовывать само представление:

```sql
ALTER VIEW old_view_name RENAME TO new_view_name

DROP VIEW [IF EXISTS] view_name
```

### Обновляемые представления

Данные в представлении можно изменять, но только если соблюдаются следующие условия:

- Только одна таблица в `FROM`.
- Нет `DISTINCT`, `GROUP BY`, `HAVING`, `UNION`, `INTERSECT`, `EXCEPT`, `LIMIT`.
- Нет оконных функций, `MIN`, `MAX`, `SUM`, `COUNT`, `AVG`.
- `WHERE` не под запретом.

### CHECK OPTION

Представление может иметь фильтры. Если создать запись через представление, которая не проходит его фильтры, она создастся, но в представлении видна не будет.

Чтобы добавить проверку на попадание в представление при добавлении записей, используйте конструкцию при создании представления:

```sql
CREATE VIEW ...
WITH LOCAL CHECK OPTION;
-- или так
WITH CASCADE CHECK OPTION;
```

**Разница между командами:** Представление может быть построено на основе других представлений. `CASCADE CHECK OPTION` проверяет все вложенные представления рекурсивно, а `LOCAL CHECK OPTION` — только текущее представление.

## Логические операторы и условные выражения

### CASE

Конструкция `CASE` позволяет выполнять условную логику в SQL-запросах, аналогично оператору `if-else` в языках программирования.

```sql
CASE
	WHEN condition_1 THEN result_1
	WHEN condition_2 THEN result_2
	[WHEN ..]
	[ELSE result_n]
END
```

Пример использования:

```sql
SELECT product_name, unit_price, units_in_stock,
	CASE
		WHEN units_in_stock >= 100 THEN 'lots of'
		WHEN units_in_stock >= 50 AND units_in_stock < 100 THEN 'average'
		WHEN units_in_stock < 50 THEN 'low number'
		ELSE 'unknown'
	END AS amount
FROM products;
```

### Работа с NULL

PostgreSQL предоставляет несколько функций для работы с `NULL` значениями:

```sql
-- COALESCE возвращает первый аргумент, который не NULL
COALESCE(arg1, arg2, ...)

-- NULLIF возвращает NULL, если аргументы равны, иначе возвращает первый аргумент
NULLIF(arg1, arg2)

-- Пример комбинированного использования
COALESCE(NULLIF(city, ''), 'unknown')
```

## Функции

Функции в PostgreSQL позволяют инкапсулировать логику работы с данными и переиспользовать её.

### Характеристики функций

- Состоят из набора утверждений, возвращая результат последнего.
- Могут содержать `SELECT`, `INSERT`, `UPDATE`, `DELETE` (CRUD операции).
- Не могут содержать `COMMIT`, `SAVEPOINT` (TCL команды), `VACUUM` (утилиты).

### Типы функций

Функции делятся на несколько категорий:

- **SQL функции** — простые функции, написанные на SQL.
- **Процедурные функции (PL/pgSQL)** — основной диалект для написания функций с развитой логикой.
- **Серверные функции** — встроенные функции, написанные на C.
- **Собственные C функции** — пользовательские функции, написанные на C.

```sql
CREATE FUNCTION func_name([arg1, arg2]) RETURNS data_type AS $$
-- logic
$$ LANGUAGE lang

-- или так
CREATE OR REPLACE FUNCTION func_name...
```

### Пример функции без возвращаемого значения

```sql
CREATE OR REPLACE FUNCTION fix_customer_region() RETURNS void AS $$
	UPDATE tmp_customers
	SET region = 'unknown'
	WHERE region IS NULL
$$ LANGUAGE SQL
```

Вызов функции:

```sql
SELECT fix_customer_region();
```

### Пример скалярной функции

Скалярная функция возвращает одно значение указанного типа.

```sql
CREATE OR REPLACE FUNCTION get_total_number_of_goods() RETURNS bigint AS $$
	SELECT SUM(units_in_stock)
	FROM products
$$ LANGUAGE SQL;

SELECT get_total_number_of_goods() AS total_goods;
```

### Пример функции с аргументами

Функция может принимать параметры для более гибкой работы.

```sql
CREATE OR REPLACE FUNCTION get_product_price_by_name(prod_name varchar) RETURNS real AS $$
	SELECT unit_price
	FROM products
	WHERE product_name = prod_name
$$ LANGUAGE SQL;
```

### Типы аргументов функций

Аргументы функций могут быть следующих типов:

- **IN** — входящие аргументы (по умолчанию, если не указывать явно).
- **OUT** — исходящие аргументы (используются для возврата значений).
- **INOUT** — и входящий, и исходящий аргумент.
- **VARIADIC** — массив входящих параметров (позволяет передавать переменное количество аргументов).
- **DEFAULT value** — значение по умолчанию для аргумента.

### Возврат множества строк

Для возврата нескольких строк используются следующие варианты:

- **RETURNS SETOF data_type** — возврат множества значений указанного типа.
- **RETURNS SETOF table** — если нужно вернуть все столбцы из таблицы или пользовательского типа.
- **RETURNS SETOF record** — только когда типы колонок в результирующем наборе заранее неизвестны.
- **RETURNS TABLE (column_name data_type, ...)** — то же, что и `SETOF table`, но с возможностью явно указать возвращаемые столбцы.
- **Возврат через OUT параметры** — использование параметров `OUT` для возврата структурированных данных.

### Пример: возврат множества скалярных значений

```sql
CREATE OR REPLACE FUNCTION get_average() RETURNS SETOF double precision AS $$
	SELECT AVG(unit_price)
	FROM products
	GROUP BY category_id
$$ LANGUAGE SQL;
```

### Пример: возврат множества записей через OUT параметры

```sql
CREATE OR REPLACE FUNCTION get_average(OUT sum_price real, OUT avg_price float8)
RETURNS SETOF RECORD AS $$
	SELECT SUM(unit_price), AVG(unit_price)
	FROM products
	GROUP BY category_id
$$ LANGUAGE SQL;
```

## Функции PL/pgSQL

PL/pgSQL — это процедурный язык для PostgreSQL, который расширяет возможности SQL, добавляя переменные, циклы, условия и обработку ошибок.

### Структура функции PL/pgSQL

```sql
CREATE FUNCTION func_name([arg1, arg2, ...]) RETURNS data_type AS $$
BEGIN
-- logic
END
$$ LANGUAGE plpgsql;
```

### Особенности PL/pgSQL

- **BEGIN/END** — блоки кода (не имеют отношения к транзакциям, это просто синтаксические блоки).
- **Создание переменных** — можно объявлять локальные переменные.
- **Циклы и развитая логика** — поддержка условных операторов и циклов.
- **Возврат значений** — через `RETURN` (вместо `SELECT`) или `RETURN QUERY` (в дополнение к `SELECT`).

```sql
CREATE FUNCTION get_total() RETURNS bigint AS $$
BEGIN
	RETURN (SELECT sum(units_in_stock) FROM products);
END
$$ LANGUAGE plpgsql;
```

### Присвоение переменных

Присвоение переменных выполняется через оператор `:=` или через конструкцию `SELECT ... INTO`.

```sql
BEGIN
	-- Можно присваивать по отдельности (неэффективно)
	-- max_price := MAX(unit_price) FROM products;
	-- min_price := MIN(unit_price) FROM products;
	
	-- Более оптимальная форма (одним запросом)
	SELECT MAX(unit_price), MIN(unit_price)
	INTO max_price, min_price
	FROM products
END
```

### RETURN QUERY

`RETURN QUERY` позволяет возвращать результаты запроса построчно.

```sql
CREATE FUNCTION get_customers_by_country(customer_country varchar) RETURNS SETOF customers AS $$
BEGIN
	RETURN QUERY
	SELECT *
	FROM customers
	WHERE country = customer_country
END
$$ LANGUAGE plpgsql;
```

### Объявление переменных

Переменные объявляются в секции `DECLARE` перед блоком `BEGIN`.

```sql
DECLARE
	-- variable type;
	perimeter real;
	j int = 0;
	product record;  -- record может хранить строку таблицы
BEGIN
	-- logic
END;
```

### Условные операторы

PL/pgSQL поддерживает полный набор условных операторов.

```sql
IF expression THEN
	logic
ELSIF expression THEN
	logic
ELSEIF expression THEN  -- можно и так писать
	logic
ELSE
	logic
END IF;
```

### Циклы

PL/pgSQL поддерживает несколько типов циклов:

**WHILE цикл:**

```sql
WHILE expression
LOOP
	logic
END LOOP;
```

**LOOP с EXIT:**

```sql
LOOP
	EXIT WHEN expression
	logic
END LOOP;
```

**FOR цикл:**

```sql
FOR counter IN a..b [BY x]
LOOP
	logic
END LOOP;
```

**CONTINUE:**

```sql
CONTINUE WHEN expression  -- Пропустить текущую итерацию
```

### Анонимные блоки кода

Для выполнения кода без создания функции используется конструкция `DO`:

```sql
DO $$
BEGIN
	logic
END$$;
```

### Вывод сообщений

Аналог `print` в других языках:

```sql
RAISE NOTICE 'message'
```

### Построчная обработка (аналог yield)

`RETURN NEXT` позволяет возвращать значения построчно, накапливая их в результирующем наборе.

```sql
RETURN NEXT expression;
```

Пример использования `RETURN NEXT`:

```sql
DECLARE
	product record;
BEGIN
	FOR product IN SELECT * FROM products
	LOOP
		IF product.unit_price < 10 THEN
			product.unit_price = 0;
		END IF;
		RETURN NEXT product;
	END LOOP;
END;
```

### Создание таблицы из запроса

Можно создать таблицу на основе результата запроса:

```sql
CREATE TABLE backup_tbl AS
SELECT * FROM customers;
```

## Обработка исключений

PostgreSQL позволяет генерировать и обрабатывать исключения в функциях PL/pgSQL.

### Генерация исключений

```sql
RAISE [level] 'message: (%)', arg_name;
-- пример
RAISE EXCEPTION 'You passed: (%)', month USING HINT='Allowed from 1 to 12', ERRCODE=12882;
```

### Уровни сообщений (level)

- **DEBUG** — отладочная информация.
- **LOG** — логирование.
- **INFO** — информационное сообщение.
- **NOTICE** — уведомление.
- **WARNING** — предупреждение.
- **EXCEPTION** — исключение, которое прерывает транзакцию.

### Обработка исключений

Чтобы поймать исключение, используется конструкция `EXCEPTION`:

```sql
EXCEPTION WHEN condition [others] THEN handling_logic
-- пример
EXCEPTION WHEN SQLSTATE '12882' THEN
	RAISE INFO 'problem';
	RETURN NULL;
```

## Индексы

Индексы ускоряют поиск данных в таблицах, создавая дополнительные структуры данных для быстрого доступа к строкам.

### Получение информации об индексах

```sql
SELECT amname FROM pg_am;
```

### Виды индексов

#### B-tree (сбалансированное дерево)

Наиболее распространённый тип индекса, используемый по умолчанию.

- Создание: `CREATE INDEX index_name ON table_name (column_name)`
- Поддерживает операции: `<`, `>`, `<=`, `>=`, `=`
- Поддерживает `LIKE 'abc%'` (но не `'%abc'`)
- Индексирует `NULL` значения
- Сложность поиска: O(logN)

#### Hash

Хеш-индекс для точного совпадения.

- Создание: `CREATE INDEX index_name ON table_name USING HASH (column_name)`
- Поддерживает только операцию `=`
- Не отображается в журнале предзаписи (WAL) — это недостаток
- В целом не рекомендуется (но есть исключения)
- Сложность поиска: O(1)

#### GiST (обобщённое дерево поиска)

Для геометрических типов данных и полнотекстового поиска.

#### GIN (обобщённый обратный индекс)

- Для индексации массивов или наборов значений
- Можно использовать для сложного текстового поиска

#### SP-GiST (GiST с двоичным разбиением пространства)

Для наборов данных, которые естественно упорядочены (пример: номера телефонов, где есть города, страны, операторы).

#### BRIN (блочно-диапазонный индекс)

Для больших данных с естественной упорядоченностью (например, почтовые индексы, временные ряды).

### Методы сканирования

PostgreSQL использует различные методы сканирования для выполнения запросов:

- **Индексное сканирование (index scan)** — использование индекса для поиска строк.
- **Исключительно индексное сканирование (index only scan)** — получение данных только из индекса без обращения к таблице.
- **Сканирование по битовой карте (bitmap scan)** — построение битовой карты строк перед обращением к таблице.
- **Последовательное сканирование (sequential scan)** — полное сканирование таблицы (используется, когда индексы не эффективны).

### Анализ производительности

Для анализа производительности запросов используются следующие команды:

```sql
-- Теоретический прогон (показывает план выполнения без выполнения)
EXPLAIN query

-- Фактический прогон с анализом (выполняет запрос и показывает статистику)
EXPLAIN ANALYZE query

-- Собираем статистику по таблице (сохраняется в таблицу pg_statistic)
ANALYZE [table_name [(column1, column2, ...)]]
```

### Пример создания и использования индексов

Ниже приведён пример создания тестовой таблицы и различных типов индексов:

```sql
-- Создаём тестовую таблицу с большим количеством данных
INSERT INTO perf_test(id, reason, annotation)
SELECT s.id, md5(random()::text), null
FROM generate_series(1, 1000000000) AS s(id)
ORDER BY random();

-- Чтобы поля были разные (обновляем annotation)
UPDATE perf_test
SET annotation = UPPER(md5(random()::text));

-- Создаём обычные B-tree индексы
CREATE INDEX idx_perf_test_id ON perf_test(id);
CREATE INDEX idx_perf_test_reason_annotation ON perf_test(reason, annotation);
CREATE INDEX idx_perf_test_annotation_lower ON perf_test(LOWER(annotation));

-- Создаём GIN индекс для текстового поиска
-- Сначала нужно установить расширение для триграмм
CREATE EXTENSION pg_trgm;
CREATE INDEX trgm_idx_perf_test_reason ON perf_test USING gin (reason gin_trgm_ops);

-- Для сложного поиска в тексте лучше использовать GIN индекс,
-- но его использование не гарантируется (если выбираемых элементов слишком много)
SELECT * FROM perf_test WHERE reason LIKE '%dfe%'
```

## Транзакции

Транзакция — это атомарная единица работы, состоящая из одной или нескольких операций. Все операции в транзакции выполняются как единое целое.

```sql
BEGIN;
	-- logic
	-- ROLLBACK;  -- откат изменений
COMMIT;  -- подтверждение изменений
```

## ACID

ACID — это набор свойств, которые гарантируют надёжность транзакций в базе данных:

- **Atomicity (атомарность)** — транзакция выполняется полностью или не выполняется вообще.
- **Consistency (согласованность)** — база данных остаётся в согласованном состоянии до и после транзакции.
- **Isolation (изолированность)** — транзакции изолированы друг от друга.
- **Durability (долговечность)** — зафиксированные изменения сохраняются даже при сбоях системы.

### Достижение ACID

Эти свойства достигаются за счёт:

- **Журналирования** — запись всех изменений в журнал транзакций (WAL).
- **MVCC** — многоверсионное управление конкурентным доступом.
- **Транзакции** — механизм группировки операций.

## MVCC (Multiversion Concurrency Control)

MVCC — модель управления транзакциями, которая позволяет им не блокировать чтение и запись данных. В процессе работы создаются копии строк (версии), что позволяет нескольким транзакциям работать с данными одновременно без блокировок.

## VACUUM

Команда `VACUUM` сканирует таблицы на наличие устаревших кортежей (строк), помечает их как повторно используемые или удаляет полностью. Это важно для освобождения места и поддержания производительности базы данных.

## Уровни изоляции транзакций

PostgreSQL поддерживает стандартные уровни изоляции транзакций:

- **READ UNCOMMITTED** — самый низкий уровень изоляции (в PostgreSQL фактически работает как READ COMMITTED).
- **READ COMMITTED (по умолчанию)** — видны только закоммиченные изменения. Каждый запрос (даже в пределах одной транзакции) может получать разные данные, так как в соседней транзакции эти данные могут изменяться.
- **REPEATABLE READ** — решает предыдущую проблему: данные отдаются одни и те же в рамках транзакции, но могут возникать дублирования строк (serialization anomalies).
- **SERIALIZABLE** — самый высокий уровень изоляции, гарантирует полную изоляцию транзакций.

## Партиционирование

Партиционирование — способ разбить таблицу на части по какому-то признаку (по `id`, `name` или другому полю). PostgreSQL автоматически управляет партициями, что особенно полезно для больших таблиц (например, логов), где можно удалять старые партиции целиком.

## pg_hba.conf

Файл `pg_hba.conf` используется для управления тем, кто и каким образом аутентифицируется в базе данных. В нём настраиваются правила доступа для различных хостов, пользователей и методов аутентификации.