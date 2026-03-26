---
title: "Write-ahead logging и журналирование — WAL в PostgreSQL"
description: "Изучите WAL: журналирование, redo/undo логи, recovery. Обеспечьте durability и надёжность базы данных при сбоях."
heroImage: "../../../../assets/imgs/2025/12/28-write-ahead-logging.webp"
pubDate: "2025-12-28"
---

# Write-Ahead Logging: надёжность баз данных

Write-Ahead Logging (WAL) — фундаментальная техника в базах данных для обеспечения надёжности.

## Концепция

```
Традиционный подход:
1. Изменить данные на диске
2. Записать в лог

WAL:
1. Записать в лог (WAL)
2. Изменить данные на диске
```

Преимущество: лог записывается последовательно (fast), данные могут записываться в любом порядке.

## Структура WAL

```
┌─────────────────────────────────────┐
│            WAL Segment              │
├─────────────────────────────────────┤
│ Header (checkpoint, segno)          │
├─────────────────────────────────────┤
│ XLOG Record 1:                      │
│   - LSN (Log Sequence Number)       │
│   - prev LSN                        │
│   - Transaction ID                  │
│   - redo/undo                       │
│   - Page data                       │
├─────────────────────────────────────┤
│ XLOG Record 2:                      │
│   ...                               │
└─────────────────────────────────────┘
```

## PostgreSQL WAL

```sql
-- Проверка WAL
SELECT pg_current_wal_lsn();

-- Checkpoint
CHECKPOINT;

-- Настройка
ALTER SYSTEM SET wal_level = 'replica';
ALTER SYSTEM SET max_wal_size = '1GB';
```

### Восстановление

```bash
# Восстановление до точки во времени
pg_restore -h localhost -d mydb backup.dump

# Восстановление из WAL
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2025-01-01 00:00:00'
```

## SQLite WAL

```sql
-- Включить WAL mode
PRAGMA journal_mode = WAL;

-- Synchronous режим
PRAGMA synchronous = NORMAL;  # 0=off, 1=normal, 2=full, 3=extra

-- Checkpoint
PRAGMA wal_checkpoint(TRUNCATE);
```

### Уровни durability

```c
// SQLite sync modes
// NORMAL: fsync() только для commit record
// FULL: fsync() для каждой записи (безопаснее, медленнее)
// EXTRA: ещё один fsync() (самый безопасный)
```

## Реализация в приложении

```javascript
// Простой WAL на Node.js
const fs = require('fs');
const path = require('path');

class WAL {
  constructor(dir) {
    this.dir = dir;
    this.currentFile = 0;
    this.buffer = [];
  }
  
  async append(record) {
    // Добавить в буфер
    this.buffer.push({
      lsn: this.getNextLSN(),
      timestamp: Date.now(),
      data: record
    });
    
    // Флюш в файл при накоплении
    if (this.buffer.length >= 100) {
      await this.flush();
    }
  }
  
  async flush() {
    const filepath = path.join(this.dir, `wal-${this.currentFile}.log`);
    const data = this.buffer.map(b => JSON.stringify(b)).join('\n');
    await fs.promises.appendFile(filepath, data + '\n');
    this.buffer = [];
  }
}
```

## ARIES

Algorithm for Recovery and Isolation Exploiting Semantics — алгоритм WAL в IBM DB2, Oracle, SQL Server.

### Компоненты

1. **Log Sequence Number (LSN)** — уникальный ID записи
2. **Transaction Table** — активные транзакции
3. **Dirty Page Table** — модифицированные страницы

### Фазы восстановления

1. **Analysis** — определить точку восстановления
2. **Redo** — проигрывание лога вперёд
3. **Undo** — откат незакоммиченных транзакций

## Performance considerations

### Batch commits

```javascript
// Вместо записи на каждый запрос
await db.query('BEGIN');
for (const op of operations) {
  await db.query(op);  // не пишет в WAL сразу
}
await db.query('COMMIT');  // один fsync
```

### WAL shipping

```sql
-- PostgreSQL репликация через WAL
-- Master
ALTER SYSTEM SET synchronous_standby_names = 'replica1';

-- Standby
recovery_target_timeline = 'latest'
```

## Заключение

WAL — основа надёжности БД. Понимание принципов помогает правильно настраивать и оптимизировать базы данных.