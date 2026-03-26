---
title: "PWA: прогрессивные веб-приложения — offline и установка"
description: "Создавайте PWA с Service Workers, Web App Manifest, Push. Offline-режим, установка на устройство — сделайте веб-приложение нативным."
heroImage: "../../../../assets/imgs/2025/12/26-pwa.webp"
pubDate: "2025-12-26"
---

# Progressive Web Apps: веб с нативными возможностями

PWA — веб-приложения, которые работают как нативные: offline, push notifications, установка на устройство. PWA сочетают доступность веба с возможностями нативных приложений. Пользователи могут установить приложение на домашний экран без посещения app store.

## Web App Manifest

```json
// manifest.json
{
  "name": "My PWA",
  "short_name": "MyApp",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

```html
<link rel="manifest" href="/manifest.json">
```

## Service Worker

```javascript
// sw.js
const CACHE_NAME = 'my-pwa-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js'
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// Fetch
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
```

## Регистрация Service Worker

```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(registration => {
      console.log('SW registered:', registration);
    })
    .catch(error => {
      console.log('SW registration failed:', error);
    });
}
```

## Workbox

```javascript
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js');

const { precacheAndRoute } = workbox.precaching;
const { registerRoute } = workbox.routing;
const { StaleWhileRevalidate, CacheFirst } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;

precacheAndRoute([
  { url: '/', revision: '1' },
  { url: '/index.html', revision: '1' },
]);

registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60
      })
    ]
  })
);
```

## Push Notifications

```javascript
// Request permission
async function requestPermission() {
  const permission = await Notification.requestPermission();
  if (permission === 'granted') {
    console.log('Notification permission granted');
  }
}

// Subscribe
async function subscribe() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
  });
  // Send to server
}

// Receive
self.addEventListener('push', (event) => {
  const data = event.data.json();
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/icon-192.png'
  });
});
```

## Offline Fallback

```javascript
// Показать offline страницу
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match('/offline.html');
    })
  );
});
```

## Критерии PWA

**Lighthouse требования:**
- HTTPS соединение
- Valid manifest.json
- Service Worker registered
- Offline поддержка
- Responsive дизайн
- Fast load time (LCP < 2.5s)

## Стратегии кэширования

**Cache First:**
```javascript
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache'
  })
);
```

**Network First:**
```javascript
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-cache',
    networkTimeoutSeconds: 3
  })
);
```

**Stale While Revalidate:**
```javascript
registerRoute(
  ({ request }) => request.destination === 'script' ||
                   request.destination === 'style',
  new StaleWhileRevalidate({
    cacheName: 'static-resources'
  })
);
```

## Background Sync

```javascript
// Регистрация синхронизации
async function queueMessage(message) {
  const registration = await navigator.serviceWorker.ready;
  await registration.sync.register('send-message');
  
  // Сохраняем в IndexedDB
  const db = await openDB();
  await db.add('messages', message);
}

// Обработка в SW
self.addEventListener('sync', (event) => {
  if (event.tag === 'send-message') {
    event.waitUntil(sendQueuedMessages());
  }
});
```

## IndexedDB

```javascript
import { openDB } from 'idb';

const dbPromise = openDB('my-pwa', 1, {
  upgrade(db) {
    db.createObjectStore('posts', { keyPath: 'id' });
    db.createObjectStore('users', { keyPath: 'id' });
  }
});

// Запись
async function savePost(post) {
  const db = await dbPromise;
  await db.put('posts', post);
}

// Чтение
async function getPost(id) {
  const db = await dbPromise;
  return await db.get('posts', id);
}

// Все записи
async function getAllPosts() {
  const db = await dbPromise;
  return await db.getAll('posts');
}
```

## Install Prompt

```javascript
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallButton();
});

async function install() {
  if (!deferredPrompt) return;
  
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  
  if (outcome === 'accepted') {
    console.log('User accepted install');
  }
  
  deferredPrompt = null;
}
```

## App Shell Architecture

```
┌─────────────────────────┐
│     App Shell (HTML)    │
│  - Header               │
│  - Navigation           │
│  - Footer               │
└─────────────────────────┘
         │
┌─────────────────────────┐
│    Dynamic Content      │
│  - Загружается через    │
│    API/Service Worker   │
└─────────────────────────┘
```

**Преимущества:**
- Мгновенная загрузка оболочки
- Кэширование UI отдельно от данных
- Offline навигация работает

## Push Notifications

**VAPID ключи:**
```bash
npx web-push generate-vapid-keys
```

**Серверная часть:**
```javascript
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:example@example.com',
  publicKey,
  privateKey
);

// Отправка
webpush.sendNotification(subscription, JSON.stringify({
  title: 'New Message',
  body: 'You have a new message'
}));
```

## Performance оптимизация

**Critical CSS:**
```html
<head>
  <style>
    /* Критичные стили inline */
    body { margin: 0; font-family: system-ui; }
    header { background: #333; }
  </style>
  <link rel="preload" href="/styles.css" as="style">
  <link rel="stylesheet" href="/styles.css">
</head>
```

**Lazy loading:**
```html
<img src="hero.jpg" alt="Hero" loading="eager">
<img src="lazy.jpg" alt="Lazy" loading="lazy">

<script>
  // Динамический импорт
  const module = await import('./heavy-module.js');
</script>
```

## Тестирование PWA

**Lighthouse:**
```bash
npm install -g lighthouse
lighthouse https://example.com --view
```

**Chrome DevTools:**
- Application tab → Manifest
- Application tab → Service Workers
- Network tab → Offline mode

**Workbox CLI:**
```bash
workbox generateSW workbox-config.js
```

## Деплой

**Vercel:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev"
}
```

**Netlify:**
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = "dist"

[[headers]]
  for = "/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000"
```

## Ограничения

- Нет доступа ко всем native API
- Ограниченный доступ к файловой системе
- Push notifications не работают на iOS < 16.4
- Некоторые функции требуют HTTPS

## Когда использовать PWA

**Подходит:**
- Контент-ориентированные приложения
- Нужен offline режим
- Быстрый запуск без установки

**Не подходит:**
- Требуется доступ к hardware
- Сложная графика/игры
- Интенсивная работа с файлами
