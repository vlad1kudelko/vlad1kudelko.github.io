---
title: "DNS и Load Balancing"
description: "DNS архитектура, CoreDNS, load balancing стратегии"
heroImage: "../../../../assets/imgs/2026/03/07-dns-load-balancing.webp"
pubDate: "2026-03-07"
---

DNS и балансировка нагрузки.

```yaml
# CoreDNS Corefile
.:53 {
    forward . 8.8.8.8
    log
    errors
    cache 30
}

example.com:53 {
    forward . 10.0.0.1
    hosts {
        10.0.0.10 app.example.com
    }
}
```

## Load Balancing Strategies

- Round Robin
- Least Connections
- IP Hash
- Weighted
- Geolocation-based