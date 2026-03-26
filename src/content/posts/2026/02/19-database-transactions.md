---
title: "Транзакции в базах данных"
description: "ACID транзакции, уровни изоляции, deadlock handling"
heroImage: "../../../../assets/imgs/2026/02/19-database-transactions.webp"
pubDate: "2026-02-19"
---

Транзакции обеспечивают целостность данных.

```sql
BEGIN TRANSACTION;

UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;

-- Проверка и коммит
IF @@ERROR = 0
    COMMIT;
ELSE
    ROLLBACK;

-- Уровни изоляции
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
```