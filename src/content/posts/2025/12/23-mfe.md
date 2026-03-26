---
title: "Micro Frontends"
description: "Микро-фронтенды: Module Federation, qiankun"
heroImage: "../../../../assets/imgs/2025/12/23-mfe.webp"
pubDate: "2025-12-23"
---

Micro Frontends — декомпозиция frontend.

```javascript
// Webpack Module Federation
new ModuleFederationPlugin({
  name: 'app1',
  exposes: {
    './Button': './src/Button',
  },
  remotes: {
    app2: 'app2@http://localhost:3002/remoteEntry.js',
  },
});
```
