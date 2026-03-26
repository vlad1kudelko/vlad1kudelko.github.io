---
title: "PWA Advanced"
description: "PWA: Service Workers, Web App Manifest"
heroImage: "../../../../assets/imgs/2025/12/22-pwa.webp"
pubDate: "2025-12-22"
---

Progressive Web Apps.

```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```
