---
title: "Next.js 15: новые возможности — обзор обновлений"
description: "Изучите нововведения Next.js 15: роутинг, кэширование, производительность. Обновите проект и улучшите developer experience."
heroImage: "../../../../assets/imgs/2025/12/15-nextjs-15.webp"
pubDate: "2025-12-15"
---

# Next.js 15: обзор ключевых изменений

Next.js 15 приносит значительные улучшения в производительность и developer experience. Рассмотрим ключевые изменения.

## Установка

```bash
npx create-next-app@latest my-app
# или
npm install next@15
```

## Кэширование

### fetch кэширование

```tsx
// По умолчанию static — кэшируется навсегда
const res = await fetch('https://api.example.com/data', {
    cache: 'force-cache' // по умолчанию
});

// Динамический fetch
const res = await fetch('https://api.example.com/data', {
    cache: 'no-store' // не кэшировать
});

// Переопределение на уровне сегмента
export const dynamic = 'force-dynamic';
```

### Роутер кэширование

```tsx
// app/page.tsx
import { revalidatePath } from 'next/cache';

export default async function Page() {
    const data = await fetchData();
    return <div>{data}</div>;
}

// API route для ревалидации
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
    revalidatePath('/');
    return Response.json({ revalidated: true });
}
```

## Server Actions

### Базовое использование

```tsx
// app/actions.ts
'use server';

export async function createItem(formData: FormData) {
    const name = formData.get('name');
    
    await db.items.create({ name });
    revalidatePath('/');
}

// app/page.tsx
import { createItem } from './actions';

export default function Page() {
    return (
        <form action={createItem}>
            <input name="name" />
            <button type="submit">Create</button>
        </form>
    );
}
```

### Валидация с Zod

```tsx
// app/actions.ts
'use server';

import { z } from 'zod';

const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
});

export async function register(prevState: any, formData: FormData) {
    const validated = schema.safeParse({
        email: formData.get('email'),
        password: formData.get('password')
    });
    
    if (!validated.success) {
        return { errors: validated.error.flatten().fieldErrors };
    }
    
    // Логика регистрации
    return { success: true };
}
```

## Partial Prerendering

```tsx
// app/page.tsx
import { Suspense } from 'react';

export default function Page() {
    return (
        <div>
            <header>Static Header</header>
            
            <Suspense fallback={<Loading />}>
                <DynamicContent />
            </Suspense>
            
            <footer>Static Footer</footer>
        </div>
    );
}

async function DynamicContent() {
    const data = await fetchData();
    return <div>{data}</div>;
}
```

## Улучшенный error handling

```tsx
// app/error.tsx
'use client';

export default function Error({
    error,
    reset
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <div>
            <h2>Something went wrong!</h2>
            <p>{error.message}</p>
            <button onClick={reset}>Try again</button>
        </div>
    );
}

// app/global-error.tsx
'use client';

export default function GlobalError({
    error,
    reset
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <h2>Critical Error</h2>
                <button onClick={reset}>Reload</button>
            </body>
        </html>
    );
}
```

## Server Components

```tsx
// app/page.tsx - Server Component
import { db } from '@/lib/db';
import ClientComponent from './ClientComponent';

export default async function Page() {
    const data = await db.query();
    
    return (
        <div>
            <p>Server: {data.serverTime}</p>
            <ClientComponent data={data} />
        </div>
    );
}
```

### Async Components

```tsx
// app/posts/page.tsx
import { Suspense } from 'react';

interface Post {
    id: number;
    title: string;
}

async function getPosts(): Promise<Post[]> {
    const res = await fetch('https://jsonplaceholder.typicode.com/posts');
    return res.json();
}

export default async function PostsPage() {
    const posts = await getPosts();
    
    return (
        <ul>
            {posts.map(post => (
                <li key={post.id}>{post.title}</li>
            ))}
        </ul>
    );
}
```

## Route Handlers

```tsx
// app/api/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    
    return NextResponse.json({ query });
}

export async function POST(request: NextRequest) {
    const body = await request.json();
    
    return NextResponse.json({ received: body });
}
```

## Middleware

```tsx
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Проверка auth
    const token = request.cookies.get('token');
    
    if (!token && !request.nextUrl.pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
    
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};
```

## Image Optimization

```tsx
import Image from 'next/image';

export default function Page() {
    return (
        <Image
            src="/photo.jpg"
            alt="Photo"
            width={800}
            height={600}
            priority
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,..."
        />
    );
}
```

## Fonts

```tsx
// app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
const mono = JetBrains_Mono({ subsets: ['latin'] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={inter.className}>
            <body>{children}</body>
        </html>
    );
}
```

## Metadata API

```tsx
// app/page.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'My App',
    description: 'Description of my app',
    openGraph: {
        title: 'My App',
        description: 'Description',
        images: ['/og-image.jpg']
    },
    twitter: {
        card: 'summary_large_image'
    }
};

// Динамическая metadata
export async function generateMetadata({ params }: { params: { id: string } }) {
    const post = await getPost(params.id);
    
    return {
        title: post.title,
        description: post.excerpt
    };
}
```

## Suspense

```tsx
import { Suspense } from 'react';

function UserProfile({ userId }: { userId: string }) {
    // ...
}

function UserSkeleton() {
    return <div className="skeleton">Loading...</div>;
}

export default function Page({ params }: { params: { userId: string } }) {
    return (
        <Suspense fallback={<UserSkeleton />}>
            <UserProfile userId={params.userId} />
        </Suspense>
    );
}
```

## Заключение

Next.js 15 предоставляет мощные инструменты для создания современных веб-приложений с отличной производительностью.