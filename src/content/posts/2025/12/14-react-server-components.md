---
title: "React Server Components — серверный рендеринг"
description: "Изучите React Server Components: архитектура, streaming, границы компонентов. Уменьшите bundle size и ускорьте загрузку приложения."
heroImage: "../../../../assets/imgs/2025/12/14-react-server-components.webp"
pubDate: "2025-12-14"
---

# React Server Components: архитектура и применение

React Server Components (RSC) — парадигма, позволяющая рендерить компоненты на сервере, снижая bundle size и улучшая производительность. RSC позволяют обращаться к базе данных напрямую из компонента, не создавая API endpoints для каждого запроса.

## Основы

React Server Components работают по принципу разделения компонентов на серверные и клиентские. Это разделение позволяет оптимизировать производительность приложения.

### Server vs Client Components

В Next.js 15 все компоненты в app directory по умолчанию являются серверными. Для интерактивности нужно явно указывать клиентские компоненты.

```tsx
// Server Component (по умолчанию в app directory)
// - Рендерится на сервере
// - Может обращаться к БД, файловой системе
// - Не включает интерактивность
// - Не имеет доступа к hooks (useState, useEffect)

async function PostList() {
    const posts = await db.posts.findMany();
    
    return (
        <ul>
            {posts.map(post => (
                <li key={post.id}>{post.title}</li>
            ))}
        </ul>
    );
}

// Client Component
// - Рендерится на клиенте (или сервере для SSR)
// - Может использовать hooks
// - Интерактивный

'use client';

import { useState } from 'react';

function LikeButton({ postId }) {
    const [likes, setLikes] = useState(0);
    
    return (
        <button onClick={() => setLikes(l => l + 1)}>
            Like ({likes})
        </button>
    );
}
```

## Использование

RSC позволяют создавать гибридные приложения, где тяжёлые компоненты рендерятся на сервере, а интерактивные — на клиенте.

### App Directory (Next.js 13+)

Структура проекта в Next.js 15 использует app directory для определения серверных и клиентских компонентов:

```
app/
├── page.tsx           # Server Component
├── layout.tsx         # Server Component
├── loading.tsx        # Server Component
├── error.tsx          # Server Component
└── components/
    ├── Client.tsx     # 'use client'
    └── Server.tsx     # Server Component
```

```tsx
// app/page.tsx - Server Component
import { db } from '@/lib/db';
import LikeButton from '@/components/LikeButton';

export default async function Page() {
    const posts = await db.posts.findMany();
    
    return (
        <main>
            <h1>Posts</h1>
            {posts.map(post => (
                <article key={post.id}>
                    <h2>{post.title}</h2>
                    <LikeButton postId={post.id} />
                </article>
            ))}
        </main>
    );
}
```

### Server Actions

```tsx
// app/actions.ts
'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
    const title = formData.get('title') as string;
    
    await db.posts.create({ title });
    
    revalidatePath('/');
    return { success: true };
}

// app/page.tsx
import { createPost } from './actions';

export default function Page() {
    return (
        <form action={createPost}>
            <input name="title" />
            <button type="submit">Create</button>
        </form>
    );
}
```

### Server Functions

```tsx
// lib/actions.ts
'use server';

export async function getData() {
    const data = await fetchExpensiveData();
    return data;
}

// app/page.tsx
import { getData } from '@/lib/actions';

export default async function Page() {
    const data = await getData();
    return <div>{data}</div>;
}
```

## Streaming

### Suspense

```tsx
import { Suspense } from 'react';
import { db } from '@/lib/db';

function Posts() {
    return (
        <ul>
            {(await db.posts.findMany()).map(post => (
                <li key={post.id}>{post.title}</li>
            ))}
        </ul>
    );
}

function PostsSkeleton() {
    return <div>Loading...</div>;
}

export default function Page() {
    return (
        <Suspense fallback={<PostsSkeleton />}>
            <Posts />
        </Suspense>
    );
}
```

### Streaming SSR

```tsx
// next.config.js
module.exports = {
    experimental: {
        serverActions: {
            bodyParser: true,
        },
    },
};
```

### parallel routes с Suspense

```tsx
// app/@modal/(.)photo/[id]/page.tsx
import { Dialog } from '@/components/Dialog';

export default function PhotoModal({ params }) {
    return (
        <Dialog>
            <img src={`/photos/${params.id}`} />
        </Dialog>
    );
}
```

## Паттерны

### Композиция Server и Client

```tsx
// Server Component
import ClientWrapper from './ClientWrapper';

export default function Page() {
    return (
        <ClientWrapper>
            {/* Server Component может рендерить Client Components */}
            <ServerChild />
        </ClientWrapper>
    );
}

// Client Component
'use client';

import { useState } from 'react';

export default function ClientWrapper({ children }) {
    const [count, setCount] = useState(0);
    
    return (
        <div onClick={() => setCount(c => c + 1)}>
            {children}
            <p>Clicks: {count}</p>
        </div>
    );
}
```

### Passing Server Data to Client

```tsx
// Server Component
import ClientChart from './ClientChart';

export default async function Page() {
    const data = await fetchData(); // Server-side fetch
    
    return <ClientChart initialData={data} />;
}

// Client Component
'use client';

import { useState } from 'react';

export default function ClientChart({ initialData }) {
    const [data] = useState(initialData);
    
    return <div>{/* Render chart */}</div>;
}
```

### Data Fetching Patterns

```tsx
// Direct DB access в Server Component
async function PostPage({ params }) {
    const post = await db.post.findUnique({
        where: { id: params.id }
    });
    
    return <article>{post.content}</article>;
}

// Caching
export const revalidate = 60; // Пересоздавать каждые 60 секунд

export async function generateStaticParams() {
    const posts = await db.post.findMany();
    return posts.map(post => ({ id: post.id }));
}
```

## Оптимизация

### Передача больших данных

```tsx
// Используйте промежуточные компоненты для больших данных
// Вместо передачи всего через props

// Хорошо
async function PostList() {
    const posts = await db.posts.findMany();
    return (
        <ul>
            {posts.map(post => (
                <PostItem key={post.id} post={post} />
            ))}
        </ul>
    );
}

async function PostItem({ post }) {
    // Дополнительная логика
    return <li>{post.title}</li>;
}
```

### Client Components только там, где нужно

```tsx
// Минимизируйте использование 'use client'
// Выносите интерактивность в отдельные компоненты

// Плохо
'use client';

export default function Post({ post }) {
    return (
        <article>
            <h1>{post.title}</h1>
            <LikeButton postId={post.id} />
        </article>
    );
}

// Лучше
// Post - Server Component
// LikeButton - Client Component с 'use client'
```

## Gotchas

### Ограничения

- Нельзя использовать hooks в Server Components
- Нельзя использовать browser APIs
- Props должны быть сериализуемы
- Один root Client Component = entire subtree клиентский

### Когда использовать Server Components

- Data fetching
- Accessing backend resources
- Large dependencies (reduce bundle)
- Sensitive information (keys, tokens)

### Когда использовать Client Components

- Interactivity (onClick, onChange)
- State and lifecycle (useState, useEffect)
- Browser-only APIs
- Custom hooks

## Заключение

RSC меняют подход к React-разработке. Правильное разделение на Server и Client компоненты значительно улучшает производительность.