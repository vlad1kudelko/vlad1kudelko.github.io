---
title: "Svelte 5: Runes и реактивность — новая эра фреймворка"
description: "Изучите Svelte 5 с Runes: $state, $derived, $effect. Освойте новую систему реактивности и создавайте эффективные приложения."
heroImage: "../../../../assets/imgs/2025/12/17-svelte-5.webp"
pubDate: "2025-12-17"
---

# Svelte 5: новая система реактивности Runes

Svelte 5 представляет Runes — новую систему реактивности, которая меняет подход к управлению состоянием. Runes решают ограничения предыдущей системы, делая код более предсказуемым и удобным для тестирования.

## Установка

```bash
npm create svelte@latest my-app
# или
npm install svelte@5
```

## Runes

### $state

```svelte
<script>
    let count = $state(0);
    
    function increment() {
        count += 1;
    }
</script>

<button onclick={increment}>
    Count: {count}
</button>
```

### $derived

```svelte
<script>
    let count = $state(0);
    let double = $derived(count * 2);
    let isEven = $derived(count % 2 === 0);
</script>

<p>Count: {count}</p>
<p>Double: {double}</p>
<p>Is even: {isEven}</p>
```

### $effect

```svelte
<script>
    let count = $state(0);
    let history = $state([]);
    
    $effect(() => {
        console.log('Count changed:', count);
        history = [...history, count];
    });
</script>
```

### $props

```svelte
<script>
    let { title = 'Default', count = 0 } = $props();
</script>

<h1>{title}</h1>
<p>Count: {count}</p>
```

### $props + $derived

```svelte
<script>
    let { items = [] } = $props();
    let total = $derived(items.reduce((sum, item) => sum + item.price, 0));
</script>

<p>Total: ${total}</p>
```

## Deep reactivity

```svelte
<script>
    let user = $state({
        name: 'John',
        email: 'john@example.com'
    });
    
    function updateName() {
        user.name = 'Jane';
    }
</script>

<button onclick={updateName}>
    Name: {user.name}
</button>
```

## Snippets

```svelte
<script>
    function greet(name) {
        return `Hello, ${name}!`;
    }
</script>

{@render greet('World')}
```

```svelte
<script>
    let { title, children } = $props();
</script>

<div class="card">
    <h2>{title}</h2>
    {@render children?.()}
</div>
```

## Stores

```svelte
<script>
    import { writable } from 'svelte/store';
    
    const count = writable(0);
</script>

<button onclick={() => count.update(n => n + 1)}>
    {$count}
</button>
```

## Event handling

```svelte
<script>
    function handleClick(event) {
        console.log(event.target);
    }
</script>

<button onclick={handleClick}>Click me</button>

<input oninput={(e) => console.log(e.target.value)} />
```

## Conditional rendering

```svelte
<script>
    let show = $state(false);
</script>

<button onclick={() => show = !show}>Toggle</button>

{#if show}
    <p>Now you see me</p>
{/if}
```

## List rendering

```svelte
<script>
    let items = $state([
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' }
    ]);
</script>

<ul>
    {#each items as item (item.id)}
        <li>{item.name}</li>
    {/each}
</ul>
```

## Class directive

```svelte
<script>
    let active = $state(false);
</script>

<button class:active>Toggle</button>

<style>
    .active {
        background: blue;
    }
</style>
```

## Bindings

```svelte
<script>
    let value = $state('');
</script>

<input bind:value />
<p>{value}</p>
```

```svelte
<script>
    let checked = $state(false);
</script>

<input type="checkbox" bind:checked />
<p>{checked ? 'Checked' : 'Unchecked'}</p>
```

## Component composition

```svelte
<!-- Button.svelte -->
<script>
    let { children, onclick } = $props();
</script>

<button {onclick}>
    {@render children?.()}
</button>

<!-- App.svelte -->
<script>
    import Button from './Button.svelte';
</script>

<Button onclick={() => console.log('clicked')}>
    Click me
</Button>
```

## Отличия от Svelte 4

**Svelte 4:**
```svelte
<script>
  import { writable } from 'svelte/store';
  let count = writable(0);
  
  $: double = $count * 2;
  
  function increment() {
    count.update(n => n + 1);
  }
</script>
```

**Svelte 5:**
```svelte
<script>
  let count = $state(0);
  let double = $derived(count * 2);
  
  function increment() {
    count += 1;
  }
</script>
```

## Fine-grained reactivity

Svelte 5 отслеживает зависимости на уровне отдельных переменных:

```svelte
<script>
  let user = $state({ name: 'John', age: 30 });
  
  // Перерисовывается только при изменении name
  $: console.log('Name:', user.name);
  
  // Перерисовывается только при изменении age
  $: console.log('Age:', user.age);
</script>
```

## Runes в действии

**$inspect — отладка:**
```svelte
<script>
  let count = $state(0);
  
  // Логирование изменений в dev mode
  $inspect(count);
  
  // С кастомным тегом
  $inspect('counter', count);
</script>
```

**$host — доступ к элементу:**
```svelte
<script>
  const input = $host();
  
  function focus() {
    input.focus();
  }
</script>

<input bind:this={input} />
<button onclick={focus}>Focus</button>
```

## Migration с других фреймворков

**Из React:**
- `useState` → `$state`
- `useMemo` → `$derived`
- `useEffect` → `$effect`
- Props → `$props()`

**Из Vue:**
- `ref()` → `$state()`
- `computed()` → `$derived()`
- `watch()` → `$effect()`

## Производительность

**Преимущества:**
- Компиляция в ванильный JS (нет runtime overhead)
- Tree-shaking неиспользуемого кода
- Минимальный размер бандла (~2KB gzip)
- No virtual DOM — прямые обновления

**Бенчмарки:**
- Быстрее React при частых обновлениях
- Меньший размер бандла чем Vue/Angular
- Мгновенная загрузка на слабых устройствах

## Экосистема

**UI библиотеки:**
- `sveltekit` — fullstack фреймворк
- `@sveltejs/adapter-*` — деплой адаптеры
- `lucide-svelte` — иконки
- `bits-ui` — headless компоненты

**Инструменты:**
- `svelte-check` — типизация
- `eslint-plugin-svelte` — линтинг
- `prettier-plugin-svelte` — форматирование

## SvelteKit

```bash
npm create svelte@latest my-app
cd my-app
npm install
npm run dev
```

**Структура:**
```
src/
├── routes/
│   ├── +page.svelte      # Главная
│   ├── +layout.svelte    # Layout
│   └── api/
│       └── +server.js    # API endpoint
├── lib/
│   └── components/
└── app.html
```

## Best Practices

**Компоненты:**
- Держите компоненты маленькими
- Используйте slots для композируемости
- Избегайте глубокой вложенности

**Состояние:**
- Используйте `$state` для локального состояния
- Stores для глобального состояния
- `$derived` для вычисляемых значений

**Производительность:**
- `{#key}` блоки для списков
- `{#await}` для асинхронных данных
- Ленивая загрузка компонентов

## Ограничения

- Меньше готовых компонентов чем у React
- Меньше вакансий на рынке
- Экосистема моложе

## Когда использовать Svelte 5

**Подходит:**
- Для приложений с фокусом на производительность
- Команда хочет простой синтаксис
- Критичен размер бандла

**Не подходит:**
- Нужна большая экосистема
- Команда уже знает React/Vue
- Требуется много готовых компонентов
