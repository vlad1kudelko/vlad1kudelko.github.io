---
title: "Testing Frontend"
description: "Тестирование frontend: Jest, React Testing Library, Cypress"
heroImage: "../../../../assets/imgs/2025/12/16-testing-frontend.webp"
pubDate: "2025-12-16"
---

Тестирование React компонентов.

```typescript
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  expect(screen.getByText(/learn/i)).toBeInTheDocument();
});
```
