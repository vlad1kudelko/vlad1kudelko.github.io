---
title: "Zero-copy и mmap в Linux — sendfile и splice"
description: "Освойте zero-copy техники: sendfile, splice, memory-mapped файлы. Максимизируйте производительность I/O операций в Linux."
heroImage: "../../../../assets/imgs/2025/12/31-zero-copy-mmap.webp"
pubDate: "2025-12-31"
---

# Zero-copy и mmap: эффективный I/O в Linux

Zero-copy и mmap — техники минимизации копирования данных для максимальной производительности. В высоконагруженных системах, таких как веб-серверы или базы данных, каждое лишнее копирование данных тратит CPU циклы и память. Zero-copy позволяет передавать данные напрямую между устройствами.

## Проблема традиционного I/O

При обычном чтении файла и отправке в сеть данные копируются несколько раз между user space и kernel space.

```
Традиционный подход:
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│   App   │───│  User   │───│ Kernel  │───│  Disk   │
│ Buffer  │   │ Space   │   │ Buffer  │   │         │
└─────────┘   └─────────┘   └─────────┘   └─────────┘

4 копирования:
1. Disk → Kernel buffer
2. Kernel buffer → User buffer
3. User buffer → (send to network)
4. ...
```

Каждое копирование тратит CPU циклы и память. Для больших файлов это становится узким местом.

## Zero-copy

Zero-copy техники минимизируют копирования, передавая данные напрямую между kernel buffer и сетевой картой.

```
Zero-copy:
┌─────────┐   ┌─────────┐   ┌─────────┐
│   App   │───│ Kernel  │───│ Network │
│         │   │         │   │   Card  │
└─────────┘   └─────────┘   └─────────┘

2 копирования:
1. Disk → Kernel (DMA)
2. Kernel → Network (DMA)
```

DMA (Direct Memory Access) позволяет устройству читать память без участия CPU.

### sendfile() в Linux

```c
#include <sys/sendfile.h>

// Отправить файл в сокет (zero-copy)
int fd = open("file.txt", O_RDONLY);
int sock = socket(AF_INET, SOCK_STREAM, 0);

off_t offset = 0;
size_t count = 1024 * 1024; // 1MB

sendfile(sock, fd, &offset, count);
```

### splice() в Linux

```c
#include <fcntl.h>

// Перемещение данных между файловыми дескрипторами
int pipefd[2];
pipe(pipefd);

splice(fd_in, NULL, pipefd[1], NULL, len, SPLICE_F_MOVE);
splice(pipefd[0], NULL, fd_out, NULL, len, SPLICE_F_MOVE);
```

### Node.js zero-copy

```javascript
const fs = require('fs');
const http = require('http');

http.createServer((req, res) => {
    const stream = fs.createReadStream('file.txt');
    res.writeHead(200);
    stream.pipe(res);  // Zero-copy через splice
});
```

### Go zero-copy

```go
// net.FileReader использует zero-copy
func handler(w http.ResponseWriter, r *http.Request) {
    http.ServeFile(w, r, "file.txt")
}

// или
func handler(w http.ResponseWriter, r *http.Request) {
    file, _ := os.Open("file.txt")
    defer file.Close()
    
    io.Copy(w, file)  // Использует splice если возможно
}
```

## mmap — Memory-mapped files

```c
#include <sys/mman.h>

// Отобразить файл в память
int fd = open("data.bin", O_RDONLY);
void* addr = mmap(NULL, size, PROT_READ, MAP_PRIVATE, fd, 0);

// Теперь можно работать с файлом как с массивом
char* data = (char*)addr;
printf("%c %c %c\n", data[0], data[1], data[2]);

munmap(addr, size);
```

### Преимущества mmap

1. **Доступ как к памяти** — простой API
2. **Kernel page cache** — данные в памяти ядра
3. **Lazy loading** — страницы загружаются по требованию
4. **Shared memory** — несколько процессов могут маппить один файл

### Node.js mmap

```javascript
const mmap = require('mmap');

const fd = fs.openSync('data.bin', 'r');
const buffer = mmap.map(fd, mmap.PROT_READ, mmap.MAP_PRIVATE);

console.log(buffer[0]);  // Читаем как из массива
```

### Применение

- Large file processing
- Database engines (все данные в памяти)
- Image processing
- Configuration files

## I/O strategies

### Direct I/O

```c
// Обход kernel buffer cache
int fd = open("file", O_RDONLY | O_DIRECT);

read(fd, buffer, 4096);  // Читает напрямую с диска
```

### AIO (Async I/O)

```c
#include <aio.h>

struct aiocb cb;
bzero(&cb, sizeof(cb));
cb.aio_fildes = fd;
cb.aio_buf = buffer;
cb.aio_nbytes = size;
cb.aio_offset = offset;

aio_read(&cb);

// Poll for completion
while (aio_error(&cb) == EINPROGRESS);
```

## Практические примеры

### Kafka zero-copy

```
Традиционная отправка:
App → Socket Buffer → NIC → Network
   (2 копирования)

Kafka:
File → NIC (DMA)
   (0 копирований)
```

### Nginx sendfile

```nginx
# nginx.conf
sendfile on;
tcp_nopush on;
tcp_nodelay on;
```

### Redis и mmap

```c
// Redis использует mmap для RDB/AOF
// и для виртуальной памяти
```

## Когда использовать

- sendfile: Отправка файлов по сети
- splice: Перенаправление между FD
- mmap: Случайный доступ к файлам
- Direct IO: Базы данных, кэши
- AIO: Параллельная загрузка

## Benchmark

```c
// Традиционный подход: ~500 MB/s
read(fd, buf, size);
write(sock, buf, size);

// sendfile: ~2 GB/s
sendfile(sock, fd, &offset, size);

// mmap: ~3 GB/s (для sequential access)
mmap(...);
memcpy(buf, addr, size);
```

## Заключение

Zero-copy и mmap — критически важны для high-performance систем. Правильное использование может ускорить I/O в разы.
