---
title: "Form Handling"
description: "Управление формами: React Hook Form, Zod валидация"
heroImage: "../../../../assets/imgs/2025/12/26-forms.webp"
pubDate: "2025-12-26"
---

React Hook Form — эффективная работа с формами.

```typescript
import { useForm } from 'react-hook-form';

function Form() {
  const { register, handleSubmit } = useForm();
  
  const onSubmit = (data) => console.log(data);
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("name")} />
      <button type="submit">Submit</button>
    </form>
  );
}
```
