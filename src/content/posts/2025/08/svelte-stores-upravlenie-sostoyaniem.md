---
title: "Svelte Stores: управление состоянием"
description: "Понимание и практики работы со сторами в Svelte и SvelteKit: writable/readable/derived, реактивный синтаксис, кастомные стора, персистентность, SSR‑нюансы и лучшие паттерны. Больше пояснений, меньше кода."
heroImage: "../../../../assets/imgs/2025/08/svelte-stores-upravlenie-sostoyaniem.webp"
pubDate: "2025-08-17"
---

# Svelte Stores: управление состоянием

Svelte предлагает простой и мощный механизм состояния — stores. Он тесно интегрирован в реактивность и позволяет делиться данными между компонентами без громоздких обвязок. Ниже — практическое руководство: минимум нужного кода и максимум пояснений о том, как, когда и зачем использовать стора.

## Что такое store и когда он нужен

Store — это объект с методом `subscribe`, который уведомляет подписчиков об изменениях значения. Используйте стора, когда:
- **состояние нужно за пределами одного компонента** (например, текущий пользователь, настройки UI);
- **значение вычисляется из нескольких источников** (деривативные значения);
- **нужно централизованно синхронизировать** состояние с хранилищем (localStorage, сервер, URL и т.д.).

Если состояние локально и используется только внутри одного компонента — начинайте с обычных переменных и пропсов. Store добавляйте тогда, когда возникает реальная потребность в разделении/повторном использовании состояния.

## Базовые типы: writable, readable, derived

- **writable**: изменяемое состояние (наиболее частый случай).
- **readable**: только для чтения (значение приходит извне; полезно для таймеров, внешних источников).
- **derived**: производное значение из других стора.

Минимальный пример writable‑стора:

```ts
import { writable } from 'svelte/store';

export const counter = writable(0);
// counter.set(1); counter.update((n) => n + 1);
```

Пояснения:
- У writable всегда есть `subscribe`, `set`, `update`.
- Вызывайте `set`/`update` для уведомления подписчиков. Простая мутация вложенного объекта «по месту» не триггерит обновления, пока вы не вызовете `set` с новой ссылкой.

Пример derived‑стора:

```ts
import { derived, writable } from 'svelte/store';

export const price = writable(100);
export const qty = writable(2);
export const total = derived([price, qty], ([$price, $qty]) => $price * $qty);
```

## Реактивный синтаксис в компонентах: `$store`

Внутри `.svelte`‑компонента у стора можно «распаковать» значение префиксом `$` — это автоматически создаёт подписку и отписку:

```svelte
<script>
  import { counter } from '../lib/stores/counter';
</script>

<p>Значение: {$counter}</p>
<button on:click={() => counter.update((n) => n + 1)}>+1</button>
```

Пояснения:
- `$counter` — это текущее значение стора внутри шаблона/скрипта компонента.
- В обычных `.ts`/`.js` файлах используйте явную подписку: `counter.subscribe(fn)` или утилиту `get` из `svelte/store` (только вне реактивного контекста компонента, чтобы не мешать реактивности).

## Паттерны обновления: `set` и `update`

- **Иммутабельность упрощает жизнь**: создавайте новые объекты/массивы, а не мутируйте существующие, затем вызывайте `set`.
- Если нужно обновить на основе текущего значения, используйте `update((value) => nextValue)` — это короче и безопаснее.

Пример с объектом настроек:

```ts
type UiSettings = { theme: 'light' | 'dark'; sidebarOpen: boolean };
export const uiSettings = writable<UiSettings>({ theme: 'light', sidebarOpen: true });

export function toggleSidebar() {
  uiSettings.update((s) => ({ ...s, sidebarOpen: !s.sidebarOpen }));
}
```

## Кастомные stores: инкапсуляция логики

Кастомный store — это функция/модуль, возвращающий объект с `subscribe` и, при необходимости, дополнительными методами. Это помогает инкапсулировать побочные эффекты, загрузку, валидацию.

```ts
import { writable } from 'svelte/store';

export function createAsyncData<T>(loader: () => Promise<T>) {
  const { subscribe, set, update } = writable<{ data: T | null; loading: boolean; error: string | null }>({
    data: null,
    loading: false,
    error: null
  });

  async function refresh() {
    update((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loader();
      set({ data, loading: false, error: null });
    } catch (e) {
      set({ data: null, loading: false, error: (e as Error).message });
    }
  }

  return { subscribe, refresh };
}
```

Как использовать: создайте инстанс через фабрику и вызывайте `refresh()` там, где это уместно (например, в `onMount` компонента). Такой подход облегчает тестирование и повторное использование.

## SvelteKit и SSR: как избежать утечек состояния

При серверном рендеринге модульные синглтоны могут привести к «протеканию» состояния между пользователями, если объект создаётся на уровне модуля и мутируется. Рекомендации:
- **Храните глобально только неизменяемые константы**. Для изменяемого состояния используйте фабрики (`createStore`), чтобы создавать отдельные инстансы на клиентах или в пределах запроса.
- **Инициализацию от окружения браузера оборачивайте** проверкой `browser` из `$app/environment`.
- **Передавайте стартовые данные через `load`** и затем гидратируйте стор на клиенте.

Мини‑пример инициализации только в браузере:

```ts
import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export const sessionToken = writable<string | null>(null);
if (browser) {
  const saved = localStorage.getItem('session');
  sessionToken.set(saved);
}
```

## Персистентность: localStorage с защитой от SSR

Персистентный стор хранит/восстанавливает значение из `localStorage` и синхронизируется при изменениях. Главное — не обращаться к `localStorage` на сервере.

```ts
import { browser } from '$app/environment';
import { writable, type Writable } from 'svelte/store';

export function persistent<T>(key: string, initial: T): Writable<T> {
  const store = writable<T>(initial);

  if (browser) {
    const saved = localStorage.getItem(key);
    if (saved != null) {
      try { store.set(JSON.parse(saved)); } catch { /* ignore */ }
    }
    store.subscribe((value) => {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota/errors */ }
    });
  }

  return store;
}
```

Пояснения:
- На сервере код не тронет `localStorage`, поэтому отрисовка безопасна.
- Данные сериализуются/десериализуются; для сложных структур подумайте о миграциях версий.

## Комбинирование стора: derived из нескольких источников

Derived‑стор хорош, когда нужно «склеить» части состояния. Пример: доступность кнопки «Купить» зависит от логина и наличия товара.

```ts
import { derived } from 'svelte/store';
import { currentUser } from './auth';
import { stockBySku, selectedSku } from './catalog';

export const canBuy = derived([currentUser, stockBySku, selectedSku], ([$user, $stock, $sku]) => {
  if (!$user || !$sku) return false;
  return ($stock[$sku] ?? 0) > 0;
});
```

Важно: derived‑сторы не должны иметь побочных эффектов — только чистые вычисления. Если нужно «запускать эффект» при изменениях, делайте это в компоненте через реактивные блоки или `derived(...).subscribe(...)` с явной отпиской.

## Когда store не нужен

- Значение используется только в одном компоненте и просто пробрасывается вниз как проп — начинайте без стора.
- Состояние зависит от URL/серверных данных — в SvelteKit сначала подумайте о `load` и данных страницы. Store — для чисто клиентских аспектов и кэширования между страницами.

## Тестирование стора

Хорошие стора легко тестировать в чистом Node‑окружении:
- Экспортируйте фабрики (`createX`) и тестируйте методы (`refresh`, `toggle` и т.д.).
- Избегайте прямого доступа к глобальным объектам; инжектируйте зависимости (функции загрузки, клиенты API).

## Частые ошибки и как их избежать

- Не мутируйте объекты «тихо» — используйте иммутабельные обновления и `set`/`update`.
- Не создавайте изменяемые синглтоны на уровне модуля в SSR — применяйте фабрики стора.
- Не перегружайте стора логикой рендеринга — вычисления оставляйте чистыми, эффекты переносите в компоненты.
- Для персистентности всегда защищайтесь от отсутствия `window`/`localStorage` на сервере.

## Итоги

Stores — нативный способ управления состоянием в Svelte: простые API, сильная интеграция с реактивностью и гибкость через кастомные реализации. Начните с `writable`, добавьте `derived` для вычисляемых значений, инкапсулируйте логику в кастомных сторах, учитывайте особенности SSR в SvelteKit и внимательно подходите к персистентности. Так вы получите предсказуемое и поддерживаемое состояние без излишней сложности.
