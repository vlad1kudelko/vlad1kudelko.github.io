---
title: "Tailwind CSS: продвинутые техники"
description: "Tailwind CSS — утилитарный CSS фреймворк для быстрой разработки современных интерфейсов"
heroImage: "../../../../assets/imgs/2025/12/18-tailwind-css.webp"
pubDate: "2025-12-18"
---

Tailwind CSS — это utility-first CSS фреймворк, который позволяет создавать интерфейсы без написания custom CSS.

## Установка

```bash
# Vite + Tailwind
npm create vite@latest my-app -- --template react
cd my-app
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Конфигурация

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      }
    },
  },
  plugins: [],
}
```

```css
/* index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Основы

### Утилиты

```html
<!-- Padding -->
<div class="p-4">padding 1rem</div>
<div class="pt-4">padding-top</div>
<div class="px-4">padding-x</div>

<!-- Margin -->
<div class="m-4">margin</div>
<div class="mx-auto">horizontal center</div>

<!-- Colors -->
<div class="bg-blue-500">background</div>
<div class="text-white">text color</div>
<div class="border border-gray-300">border</div>

<!-- Typography -->
<p class="text-lg">large text</p>
<p class="font-bold">bold</p>
<p class="text-center">centered</p>
```

### Flexbox

```html
<div class="flex">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

<div class="flex justify-between">
  <div>Left</div>
  <div>Right</div>
</div>

<div class="flex items-center">
  <div>Vertically centered</div>
</div>

<div class="flex gap-4">
  <div>Gap</div>
  <div>Gap</div>
</div>
```

### Grid

```html
<div class="grid grid-cols-3 gap-4">
  <div>1</div>
  <div>2</div>
  <div>3</div>
</div>

<div class="grid grid-cols-2 md:grid-cols-4">
  <div>Responsive</div>
</div>
```

## Responsive

```html
<div class="text-sm md:text-base lg:text-lg">
  Responsive text
</div>

<div class="block md:flex">
  Mobile: block, Desktop: flex
</div>

<!-- Breakpoints по умолчанию:
  sm: 640px
  md: 768px
  lg: 1024px
  xl: 1280px
  2xl: 1536px
-->
```

## Pseudo-classes

```html
<button class="hover:bg-blue-600 hover:text-white">
  Hover
</button>

<input class="focus:outline-none focus:ring-2 focus:ring-blue-500" />

<div class="group hover:scale-105">
  <p class="group-hover:text-blue-500">Group hover</p>
</div>

<p class="first-letter:text-2xl">First letter</p>
```

## Состояния

```html
<button class="disabled:opacity-50 disabled:cursor-not-allowed">
  Disabled
</button>

<input class="invalid:border-red-500" />

<div class="peer-checked:bg-blue-500">
  <input type="checkbox" class="peer" />
</div>
```

## Тёмная тема

```html
<!-- Включить darkMode: 'class' в config -->
<div class="bg-white dark:bg-gray-900">
  <p class="text-gray-900 dark:text-white">Adaptive</p>
</div>
```

## Компоненты

### Button

```css
@layer components {
  .btn {
    @apply px-4 py-2 rounded font-medium transition-colors;
  }
  .btn-primary {
    @apply btn bg-blue-500 text-white hover:bg-blue-600;
  }
  .btn-secondary {
    @apply btn bg-gray-200 text-gray-800 hover:bg-gray-300;
  }
}
```

### Card

```html
<div class="bg-white rounded-lg shadow-md p-6">
  <h3 class="text-xl font-bold mb-2">Title</h3>
  <p class="text-gray-600">Content</p>
</div>
```

## Кастомные классы

```html
<!-- Arbitrary values -->
<div class="w-[300px] h-[200px]">Custom size</div>
<div class="top-[calc(100%+1rem)]">Custom calc</div>

<!-- Произвольные свойства -->
<div class="[mask-image:linear-gradient(to_bottom,white,transparent)]">
  Mask
</div>
```

## Plugins

```bash
npm install -D @tailwindcss/forms @tailwindcss/typography
```

```javascript
// tailwind.config.js
export default {
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}
```

```html
<article class="prose prose-lg">
  <h1>Article Title</h1>
  <p>Content with automatic styling</p>
</article>
```

## Animations

```html
<div class="animate-spin">Spinning</div>
<div class="animate-pulse">Pulsing</div>
<div class="animate-bounce">Bouncing</div>
```

```css
@layer utilities {
  @keyframes slideIn {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }
  .animate-slide-in {
    animation: slideIn 0.3s ease-out;
  }
}
```

## Best Practices

1. **Избегайте глубокой вложенности** — используйте компоненты
2. **Используйте @apply** — для повторяющихся паттернов
3. **Настройте config** — добавьте цвета и spacing проекта
4. **Dark mode** — проектируйте с учётом обеих тем

## Заключение

Tailwind CSS ускоряет разработку благодаря утилитарному подходу и отличной системе дизайна.