---
title: "Svelte + TypeScript: практическое руководство"
description: "Как добавить и эффективно использовать TypeScript в Svelte и SvelteKit: настройка, типизация пропсов, событий, сторах, загрузчиков и действий, лучшие практики."
heroImage: "../../../../assets/imgs/2025/08/svelte-typescript-guide.webp"
pubDate: "2025-08-16"
---

# Svelte + TypeScript: практическое руководство

TypeScript отлично сочетается со Svelte и SvelteKit: вы получаете автодополнение, проверку типов, более надёжные рефакторинги и раннее обнаружение ошибок. Ниже — краткое, практико‑ориентированное руководство: минимум необходимого кода и больше пояснений о том, почему это работает и как применять в повседневной разработке.

## 1. Установка и включение TypeScript

- Новый проект: официальный шаблон предлагает включить TS при создании. Выберите вариант с TypeScript и строгим режимом.
- Существующий проект: используйте готовые пресеты (например, `svelte-add`) или вручную добавьте `tsconfig.json`, установите `typescript` и типы для инструментов. IDE (VS Code) поймёт типы через `svelte-language-server`.

Ключевая идея: компилятор Svelte понимает `<script lang="ts">` в компонентах. Декларации типов и интерфейсы работают как в обычном TS‑коде.

## 2. Типизация пропсов в компонентах

В Svelte пропсы описываются через `export let`. С TypeScript добавьте аннотации — это даёт проверку и автодополнение при использовании компонента.

```svelte
<script lang="ts">
  export let count: number = 0;
  export let onChange?: (value: number) => void;

  function increment() {
    const next = count + 1;
    onChange?.(next);
  }
</script>

<button on:click={increment}>
  +1 (текущее: {count})
</button>
```

Пояснение:
- `export let` с типом делает пропсы явными. Если пропс обязателен — не задавайте значение по умолчанию.
- Функциональные пропсы удобно аннотировать сигнатурой. Это документирует контракт между компонентами.

## 3. Типизация событий через `createEventDispatcher`

Svelte поддерживает собственные события компонентов. С TS их можно строго типизировать.

```svelte
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  type Events = { change: number };
  const dispatch = createEventDispatcher<Events>();

  function notify(value: number) {
    dispatch('change', value);
  }
</script>
```

Пояснение:
- Дженерик у `createEventDispatcher` описывает имена событий и полезную нагрузку. IDE подсказывает только корректные события и тип данных.

## 4. Типизация Svelte stores

Stores — idiomatic Svelte‑способ управлять состоянием. С TS они становятся предсказуемыми.

```ts
// src/lib/stores/user.ts
import { writable, derived } from 'svelte/store';

export type User = { id: string; email: string };
export const currentUser = writable<User | null>(null);

export const isLoggedIn = derived(currentUser, (u) => Boolean(u));
```

Пояснение:
- Явно задавайте тип состояния в `writable`. Это предотвращает «случайные» значения и упрощает рефакторинг.
- Для составных сторах создавайте небольшие типы/алиасы вместо `any`.

## 5. Типобезопасность в SvelteKit: `load`, `actions`, `$types`

SvelteKit генерирует вспомогательные типы в файлах `./$types`. Подключайте их, чтобы гарантировать соответствие контрактам страниц и серверной логики.

```ts
// src/routes/+page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const res = await fetch('/api/articles');
  return { articles: await res.json() as Array<{ id: number; title: string }> };
};
```

```ts
// src/routes/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  return { user: locals.user as { id: string; email: string } | null };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const form = await request.formData();
    const email = String(form.get('email') ?? '');
    if (!email) return fail(400, { error: 'Email обязателен' });
    throw redirect(303, '/');
  }
};
```

Пояснение:
- Используйте `PageLoad`/`PageServerLoad`/`Actions` из `./$types`, чтобы сигнатуры менялись автоматически при изменении схем данных.
- Тип `locals` задаётся в серверном хуке — его тоже можно аннотировать.

## 6. Валидация данных: Zod/valibot и сужение типов

Для форм и API используйте валидаторы с выводом TS‑типов. Это даёт единый источник правды для валидации и типов.

```ts
// пример с Zod
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});
export type LoginInput = z.infer<typeof loginSchema>;
```

Пояснение:
- Схема валидирует входные данные, а тип автоматически синхронизирован через `z.infer`. Меняете схему — меняется и тип.

## 7. Паттерны: `as const`, литеральные типы и словари

- Фиксируйте неизменяемые коллекции через `as const`, чтобы получить литеральные типы — полезно для ключей и маппинга.
- Для внешних «словарей» (например, статусов) объявляйте `enum` или `const`‑объект и производные типы через `keyof`.

```ts
export const STATUS = {
  draft: 'draft',
  published: 'published'
} as const;
export type Status = keyof typeof STATUS; // 'draft' | 'published'
```

## 8. Архитектура типов: где хранить типы

- Общие доменные типы: `src/lib/types/*.ts`.
- Типы сторах: рядом со сторами в `src/lib/stores`.
- Типы API‑ответов: рядом с клиентом API или в отдельном модуле `src/lib/api/types.ts`.
- Избегайте «большого файла с типами» — лучше небольшие, близкие к месту использования.

## 9. Инструменты и качество кода

- Включите строгий TS (`strict: true`) — так ошибки всплывают раньше.
- ESLint + Prettier для единообразного стиля и правил.
- Слежение за неиспользуемыми импортами и переменными — проще рефакторить компоненты.

## 10. Частые ошибки и как их избежать

- Не используйте `any` из удобства — почти всегда можно вывести тип.
- Не оставляйте пропсы без типов: IDE не подскажет корректные значения при использовании компонента.
- Для событий обязательно типизируйте `createEventDispatcher`, иначе полезная нагрузка легко «поплывёт».
- В SvelteKit всегда подключайте типы из `./$types` для `load` и `actions`.

## Итоги

TypeScript во Svelte даёт ощутимую пользу за минимальную цену: более прозрачные контракты между компонентами, типобезопасные события и стора, строгая серверная логика в SvelteKit и уверенность при рефакторинге. Начните с включения TS, типизируйте пропсы/события/сторы и подключайте типы `./$types` — и вы быстро почувствуете, как снижается количество скрытых ошибок и ускоряется разработка.
