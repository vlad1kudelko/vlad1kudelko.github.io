---
title: "SvelteKit: полноценное приложение"
description: "Практическое руководство по созданию полноценного веб‑приложения на SvelteKit: структура, маршруты, загрузка данных, формы и действия, API‑эндпоинты, аутентификация, развертывание и лучшие практики."
heroImage: "../../../../assets/imgs/2025/08/sveltekit-polnotsennoe-prilozhenie.webp"
pubDate: "2025-08-15"
---

# SvelteKit: полноценное приложение

SvelteKit — современный мета‑фреймворк для Svelte, который объединяет маршрутизацию, серверный рендеринг, загрузку данных, обработку форм, API‑эндпоинты и сборку в единый, последовательный опыт. Он помогает быстро создавать производительные приложения с отличным DX и минимальным оверхедом.

В этой статье мы соберём «скелет» полноценного приложения: разберём структуру проекта, навигацию, загрузку данных и действия форм, работу с стором, простую аутентификацию и варианты деплоя. Мы будем держать количество кода умеренным и давать больше пояснений — чтобы лучше понять принципы.

## 1. Старт проекта и структура

Создать проект проще всего через официальный шаблон:

```bash
npm create svelte@latest my-app
cd my-app
npm install
npm run dev
```

Ключевые директории и файлы:
- `src/routes` — файловая маршрутизация (страницы, layout’ы, серверные эндпоинты).
- `src/lib` — общие модули, компоненты, утилиты.
- `src/routes/+layout.svelte` и `+layout.ts` — общий каркас и загрузчики для всего приложения или ветки маршрутов.
- `src/routes/+page.svelte` и `+page.ts` — страница и её загрузчик данных.
- `src/routes/+page.server.ts` — серверная логика: secure‑загрузка, формы/действия, доступ к базе/секретам.

Идея проста: SvelteKit строит приложение из файлов, что снижает количество настроек «вручную».

## 2. Маршруты и макеты (layouts)

Файловая маршрутизация отражает дерево директорий. Общие элементы (шапка, футер, контейнеры, провайдеры) размещают в layout.

Минимальный общий layout:

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  export let data;
</script>

<nav class="container">
  <a href="/">Главная</a>
  <a href="/dashboard">Дашборд</a>
  <a href="/account">Аккаунт</a>
</nav>

<slot />
```

- `+layout.svelte` отображает каркас и `<slot />` для дочерних страниц.
- Вложенные директории могут иметь свои layout’ы с локальным каркасом.

## 3. Загрузка данных: `load` на клиенте и сервере

SvelteKit различает два типа загрузчиков:
- `+page.ts` (`load`) — универсальный загрузчик (может выполняться на сервере и/или клиенте), подходит для публичных данных.
- `+page.server.ts` (`load`) — только на сервере, подходит для секретов, приватных API и защищённых страниц.

Пример универсальной загрузки публичных данных:

```ts
// src/routes/+page.ts
export async function load({ fetch }) {
  const res = await fetch('/api/articles');
  return { articles: await res.json() };
}
```

- Такой `load` может реиспользоваться клиентом (без повторного запроса к вашему бекенду, если есть кэш) и сервером.
- Для приватных разделов (например, «Аккаунт») используйте серверный `load`.

Пример защищённой загрузки на сервере:

```ts
// src/routes/account/+page.server.ts
import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
  if (!locals.user) throw redirect(302, '/login');
  return { user: locals.user };
}
```

- Здесь `locals.user` предполагает, что вы добавите аутентификацию на уровне хуков (см. раздел про auth).

## 4. Формы и действия (`actions`)

Формы в SvelteKit работают без ручного JS: вы описываете действие на сервере, а прогрессивное улучшение добавляет UX‑сахара (валидация, обновление без перезагрузки).

```svelte
<!-- src/routes/login/+page.svelte -->
<form method="POST">
  <input name="email" type="email" required />
  <input name="password" type="password" required />
  <button type="submit">Войти</button>
</form>

{#if form?.error}
  <p class="error">{form.error}</p>
{/if}
```

```ts
// src/routes/login/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';

export const actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData();
    const email = String(data.get('email') || '');
    const password = String(data.get('password') || '');

    const ok = await locals.auth.login(email, password);
    if (!ok) return fail(400, { error: 'Неверные учетные данные' });

    throw redirect(303, '/account');
  }
};
```

- `fail` возвращает код и данные формы без редиректа.
- `redirect` переводит пользователя после успешного действия.
- В шаблоне доступен объект `form` с результатом последнего действия.

## 5. API‑эндпоинты в `routes`

SvelteKit позволяет создавать серверные endpoints рядом со страницами. Это удобно для внутренних API, SSR и интеграций.

```ts
// src/routes/api/articles/+server.ts
export async function GET() {
  const articles = [{ id: 1, title: 'Hello SvelteKit' }];
  return new Response(JSON.stringify(articles), {
    headers: { 'content-type': 'application/json' }
  });
}
```

- Поддерживаются `GET/POST/PATCH/PUT/DELETE`.
- Вы можете использовать куки, заголовки, сессии через `event` (см. хуки ниже).

## 6. Состояние: Svelte stores

Для клиентского состояния используйте `svelte/store`. Он прост и интегрирован в реактивность Svelte.

```ts
// src/lib/stores/user.ts
import { writable } from 'svelte/store';
export const currentUser = writable(null as null | { id: string; email: string });
```

- Обновляйте `currentUser` после логина/логаута.
- Для деривативных значений используйте `derived`.

Когда использовать store, а когда `load`:
- **Store**: чисто клиентское состояние (UI, локальные фильтры, режимы).
- **load**: данные страницы, которые важны для URL/SSR/SEO (списки, детали, защищённый контент).

## 7. Аутентификация: хук и `locals`

Аутентификацию удобно подключать на уровне серверного хука. Там вы разбираете куки/токен и помещаете пользователя в `event.locals`.

```ts
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const session = event.cookies.get('session');
  event.locals.user = session ? { id: 'u1', email: 'demo@example.com' } : null;
  event.locals.auth = {
    login: async (email: string, password: string) => {
      // Проверьте пользователя и установите cookie
      event.cookies.set('session', 'demo', { path: '/', httpOnly: true });
      return true;
    },
    logout: async () => {
      event.cookies.delete('session', { path: '/' });
    }
  };
  return resolve(event);
};
```

- Теперь `locals.user` доступен в серверных `load`/`actions`.
- Реальную проверку вынесите в отдельный модуль и добавьте БД.

## 8. Ошибки и SEO

- Страница ошибок: используйте `+error.svelte` в корне или в ветке маршрутов — она отобразится при исключениях.
- 404‑страницы: если маршрут не найден, сработает общий обработчик. Создайте дружелюбный экран с навигацией «домой».
- Метаданные и SEO: определяйте `export const prerender`/`ssr` и `load` для нужных страниц, используйте `handle` для аналитики. Для `<head>` применяйте `svelte:head`.

Короткий пример `<head>` на странице:

```svelte
<!-- src/routes/blog/+page.svelte -->
<svelte:head>
  <title>Блог — SvelteKit</title>
  <meta name="description" content="Посты, примеры и заметки по SvelteKit." />
</svelte:head>
```

## 9. Конфигурация, env и адаптеры

- Переменные окружения: используйте `env` из `$env/static/private`, `$env/static/public` и `$env/dynamic/*` в зависимости от сценария. Секреты — только на сервере.
- Адаптеры: по умолчанию `adapter-auto` подбирает окружение. Для Node‑серверов — `@sveltejs/adapter-node`, для статического вывода — `@sveltejs/adapter-static`.

Пример статической сборки (подходит для сайтов без динамики на сервере):

```bash
npm i -D @sveltejs/adapter-static
```

```ts
// svelte.config.js
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({ fallback: '200.html' })
  }
};
```

## 10. Развертывание

Варианты деплоя зависят от адаптера:
- **Node**: любой VPS/PAAS (PM2, Docker), полноценный SSR.
- **Static**: CDN/объектное хранилище, максимальная скорость, но без серверной логики (только client‑side и pre‑render).
- **Serverless/Edge**: Vercel/Netlify/Cloudflare — простая публикация, хорошая масштабируемость.

Минимальный Node‑запуск после сборки:

```bash
npm run build
node build
```

Для Docker используйте стандартный multi‑stage: сначала `npm ci && npm run build`, затем запуск `node build` в slim‑образе.

## 11. Тестирование и качество

- Компоненты: `@testing-library/svelte` для unit/интеграционных тестов.
- Маршруты/формы: e2e через Playwright — удобно проверять `actions` и редиректы.
- Линтинг/форматирование: `eslint`, `prettier`, строгий TypeScript.

## 12. Лучшие практики

- Разделяйте «данные страницы» (через `load`) и чисто клиентское состояние (stores).
- Секреты и приватные запросы — только из серверных модулей (`+page.server.ts`, `+server.ts`).
- Короткие, понятные `actions` с валидацией и явными кодами ошибок.
- Повторно используйте layout’ы: общий каркас, локальные навигации и guards.
- Ясные URL и семантичные теги — лучше для UX и SEO.

## Заключение

SvelteKit даёт цельную архитектуру поверх Svelte: маршруты из файлов, встроенный SSR/пререндер, простой механизм загрузки данных и удобные серверные действия для форм. Этого достаточно, чтобы быстро собрать «боевое» приложение — от публичного сайта до приватного кабинета — и развернуть его в подходящее окружение. Начните с базового каркаса, постепенно добавляйте аутентификацию, API и сторы — и вы получите производительное и поддерживаемое приложение без лишней сложности.
