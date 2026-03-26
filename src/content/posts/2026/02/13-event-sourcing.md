---
title: "Event Sourcing"
description: "Хранение состояния как последовательности событий: CQRS паттерн"
heroImage: "../../../../assets/imgs/2026/02/13-event-sourcing.webp"
pubDate: "2026-02-13"
---

Event sourcing хранит все изменения как события.

```javascript
// Aggregate
class Account {
  constructor() {
    this.events = [];
    this.balance = 0;
  }
  
  apply(event) {
    switch (event.type) {
      case 'DEPOSIT':
        this.balance += event.amount;
        break;
      case 'WITHDRAW':
        this.balance -= event.amount;
        break;
    }
  }
  
  deposit(amount) {
    this.events.push({ type: 'DEPOSIT', amount });
    this.apply({ type: 'DEPOSIT', amount });
  }
}
```