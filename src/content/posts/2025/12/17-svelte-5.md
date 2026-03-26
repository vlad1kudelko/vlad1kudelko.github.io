---
title: "Svelte 5: Runes и реактивность — новая эра фреймворка"
description: "Изучите Svelte 5 с Runes: $state, $derived, $effect. Освойте новую систему реактивности и создавайте эффективные приложения."
heroImage: "../../../../assets/imgs/2025/12/17-svelte-5.webp"
pubDate: "2025-12-17"
---

# Svelte 5: новая система реактивности Runes

Svelte 5 представляет Runes — новую систему реактивности, которая меняет подход к управлению состоянием.

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

## Заключение

Svelte 5 с Runes предлагает простой и мощный API для реактивности, делая код чище и эффективнее.