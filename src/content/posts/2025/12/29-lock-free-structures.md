---
title: "Lock-free структуры данных"
description: "Атомарные операции, CAS и lock-free структуры данных для высокопроизводительных систем"
heroImage: "../../../../assets/imgs/2025/12/29-lock-free-structures.webp"
pubDate: "2025-12-29"
---

Lock-free структуры данных обеспечивают высокую производительность в многопоточных приложениях.

## Атомарные операции

### Compare-And-Swap (CAS)

```c
// Псевдокод CAS
bool CAS(int* ptr, int old_val, int new_val) {
    if (*ptr == old_val) {
        *ptr = new_val;
        return true;
    }
    return false;
}
```

### Атомарные типы в C++

```cpp
#include <atomic>

std::atomic<int> counter{0};

// Атомарные операции
counter.fetch_add(1);        // Атомарное +=
counter.fetch_sub(1);        // Атомарное -=
counter.compare_exchange(expected, desired);  // CAS
bool was = counter.is_lock_free();
```

## Lock-free стек

```cpp
#include <atomic>

template<typename T>
class LockFreeStack {
private:
    struct Node {
        T data;
        Node* next;
    };
    
    std::atomic<Node*> head;
    
public:
    void push(T value) {
        Node* newNode = new Node();
        newNode->data = value;
        newNode->next = head.load();
        
        // CAS до тех пор, пока head не изменится
        while (!head.compare_exchange_weak(newNode->next, newNode)) {
            // newNode->next обновлён другим потоком
        }
    }
    
    bool pop(T& result) {
        Node* oldHead = head.load();
        
        while (oldHead != nullptr) {
            Node* next = oldHead->next;
            if (head.compare_exchange_weak(oldHead, next)) {
                result = oldHead->data;
                delete oldHead;
                return true;
            }
        }
        return false;
    }
};
```

## Lock-free очередь

```cpp
#include <atomic>

template<typename T>
class LockFreeQueue {
private:
    struct Node {
        T data;
        std::atomic<Node*> next;
    };
    
    std::atomic<Node*> head;
    std::atomic<Node*> tail;
    
public:
    LockFreeQueue() {
        Node* dummy = new Node();
        dummy->next = nullptr;
        head = tail = dummy;
    }
    
    void enqueue(T value) {
        Node* newNode = new Node();
        newNode->data = value;
        newNode->next = nullptr;
        
        Node* oldTail = tail.load();
        while (!tail.compare_exchange_weak(oldTail, newNode)) {
            // tail изменился, пробуем снова
        }
        oldTail->next.store(newNode);
    }
    
    bool dequeue(T& result) {
        Node* oldHead = head.load();
        
        while (oldHead != nullptr) {
            Node* next = oldHead->next.load();
            
            if (next == nullptr) {
                return false;  // Очередь пуста
            }
            
            if (head.compare_exchange_weak(oldHead, next)) {
                result = next->data;
                delete oldHead;
                return true;
            }
        }
        return false;
    }
};
```

## ABA problem

```cpp
// Проблема: поток A видит значение X
// поток B меняет X на Y, потом обратно на X
// поток A думает, что X не изменилось

// Решение: использовать двойной CAS или теги
struct TaggedPointer {
    void* ptr;
    uint64_t tag;
};

std::atomic<TaggedPointer> ptr;

bool compare_exchange(TaggedPointer& expected, TaggedPointer desired) {
    TaggedPointer current = ptr.load();
    if (current.ptr == expected.ptr && current.tag == expected.tag) {
        ptr.store(desired);
        return true;
    }
    expected = current;
    return false;
}
```

## Атомарные операции в Go

```go
import "sync/atomic"

var counter int64

// Атомарное сложение
atomic.AddInt64(&counter, 1)

// Атомарная загрузка
value := atomic.LoadInt64(&counter)

// CAS
for {
    old := atomic.LoadInt64(&counter)
    if atomic.CompareAndSwapInt64(&counter, old, old+1) {
        break
    }
}
```

## Атомарные операции в Java

```java
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;

AtomicInteger counter = new AtomicInteger(0);

// Атомарные операции
counter.incrementAndGet();
counter.getAndIncrement();
counter.compareAndSet(5, 10);
```

## Memory ordering

```cpp
#include <atomic>

std::atomic<int> x{0};
int y;

// Sequential consistency (по умолчанию)
x.store(1, std::memory_order_seq_cst);
y = x.load(std::memory_order_seq_cst);

// Relaxed - нет гарантий порядка
x.store(1, std::memory_order_relaxed);

// Acquire-release
// writer
x.store(1, std::memory_order_release);
// reader
y = x.load(std::memory_order_acquire);
```

## Применение

- Высокопроизводительные очереди сообщений
- Non-blocking алгоритмы
- Реализация spinlocks
- Структуры данных с высокой конкуренцией

## Заключение

Lock-free структуры — инструмент для экстремальной производительности, требует глубокого понимания многопоточности.