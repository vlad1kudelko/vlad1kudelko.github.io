---
title: "Безопасность CI/CD"
description: "Securing CI/CD pipelines: secrets management, supply chain security"
heroImage: "../../../../assets/imgs/2026/03/09-cicd-security.webp"
pubDate: "2026-03-09"
---

Безопасность CI/CD пайплайнов.

```yaml
# GitHub Actions с защитой secrets
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        
      - name: Use secrets
        env:
          API_KEY: ${{ secrets.API_KEY }}
        run: echo "Using encrypted secret"
```