---
title: "Vue.js 3: Composition API"
description: "Подробное руководство по Composition API в Vue.js 3: основы, хуки, композиция логики, лучшие практики и примеры использования."
heroImage: "../../../../assets/imgs/2025/08/vue-js-3-composition-api-guide.webp"
pubDate: "2025-08-08"
---

# Vue.js 3: Composition API

**Composition API** — это новый способ организации логики компонентов в Vue.js 3, который предоставляет более гибкий и мощный подход к написанию кода по сравнению с традиционным Options API. Composition API позволяет лучше организовать код, переиспользовать логику между компонентами и создавать более читаемые и поддерживаемые приложения.

## 1. Зачем нужен Composition API?

Composition API решает несколько ключевых проблем Options API:

- **Лучшая организация логики** — связанная функциональность группируется вместе, а не разбрасывается по разным секциям
- **Переиспользование логики** — легко создавать и переиспользовать логику между компонентами
- **Лучшая типизация** — полная поддержка TypeScript из коробки
- **Древовидная структура** — логика может быть организована в древовидную структуру для лучшей читаемости
- **Лучшая поддержка IDE** — более точное автодополнение и навигация по коду

Composition API особенно полезен для больших компонентов и сложной логики, где Options API может стать трудным для понимания.

## 2. Основы Composition API

### 2.1. setup() функция

Основная точка входа в Composition API — функция `setup()`:

```vue
<template>
  <div>
    <h1>{{ title }}</h1>
    <p>Счётчик: {{ count }}</p>
    <button @click="increment">Увеличить</button>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'

export default {
  name: 'CounterComponent',
  setup() {
    // Реактивные данные
    const count = ref(0)
    const title = ref('Счётчик')

    // Методы
    const increment = () => {
      count.value++
    }

    // Хуки жизненного цикла
    onMounted(() => {
      console.log('Компонент смонтирован')
    })

    // Возвращаем всё, что нужно в template
    return {
      count,
      title,
      increment
    }
  }
}
</script>
```

**Ключевые моменты:**
- `setup()` выполняется до создания экземпляра компонента
- Все переменные и функции должны быть возвращены для использования в template
- `ref()` создаёт реактивные ссылки на данные

### 2.2. Реактивные ссылки с ref()

`ref()` создаёт реактивную ссылку на значение:

```javascript
import { ref } from 'vue'

export default {
  setup() {
    // Примитивные значения
    const count = ref(0)
    const name = ref('Иван')
    const isActive = ref(false)

    // Объекты
    const user = ref({
      name: 'Иван',
      age: 25,
      email: 'ivan@example.com'
    })

    // Массивы
    const items = ref(['item1', 'item2', 'item3'])

    // Доступ к значению через .value
    console.log(count.value) // 0
    count.value = 5
    console.log(count.value) // 5

    // В template .value не нужен
    return {
      count,
      name,
      isActive,
      user,
      items
    }
  }
}
```

### 2.3. Реактивные объекты с reactive()

`reactive()` создаёт реактивный объект:

```javascript
import { reactive } from 'vue'

export default {
  setup() {
    const state = reactive({
      count: 0,
      name: 'Иван',
      user: {
        age: 25,
        email: 'ivan@example.com'
      },
      items: ['item1', 'item2']
    })

    // Изменения автоматически реактивны
    state.count = 5
    state.user.age = 26
    state.items.push('item4')

    return {
      state
    }
  }
}
```

**Важно:** `reactive()` работает только с объектами, а `ref()` работает с любыми типами данных.

## 3. Хуки жизненного цикла

Composition API предоставляет хуки жизненного цикла, которые заменяют Options API:

```javascript
import { 
  onMounted, 
  onUnmounted, 
  onUpdated, 
  onBeforeMount,
  onBeforeUnmount,
  onBeforeUpdate
} from 'vue'

export default {
  setup() {
    onBeforeMount(() => {
      console.log('Компонент будет смонтирован')
    })

    onMounted(() => {
      console.log('Компонент смонтирован')
      // Инициализация, API вызовы, подписки
    })

    onBeforeUpdate(() => {
      console.log('Компонент будет обновлён')
    })

    onUpdated(() => {
      console.log('Компонент обновлён')
    })

    onBeforeUnmount(() => {
      console.log('Компонент будет размонтирован')
    })

    onUnmounted(() => {
      console.log('Компонент размонтирован')
      // Очистка, отписки
    })
  }
}
```

## 4. Вычисляемые свойства

### 4.1. computed() для вычисляемых свойств

```javascript
import { ref, computed } from 'vue'

export default {
  setup() {
    const firstName = ref('Иван')
    const lastName = ref('Иванов')
    const age = ref(25)

    // Простое вычисляемое свойство
    const fullName = computed(() => {
      return `${firstName.value} ${lastName.value}`
    })

    // Вычисляемое свойство с зависимостями
    const isAdult = computed(() => {
      return age.value >= 18
    })

    // Вычисляемое свойство с геттером и сеттером
    const fullNameWithSetter = computed({
      get: () => `${firstName.value} ${lastName.value}`,
      set: (value) => {
        const [first, last] = value.split(' ')
        firstName.value = first
        lastName.value = last
      }
    })

    return {
      firstName,
      lastName,
      age,
      fullName,
      isAdult,
      fullNameWithSetter
    }
  }
}
```

## 5. Наблюдатели

### 5.1. watch() для наблюдения за изменениями

```javascript
import { ref, watch, watchEffect } from 'vue'

export default {
  setup() {
    const count = ref(0)
    const name = ref('Иван')
    const user = ref({ age: 25 })

    // Простое наблюдение
    watch(count, (newValue, oldValue) => {
      console.log(`Счётчик изменился с ${oldValue} на ${newValue}`)
    })

    // Наблюдение с опциями
    watch(name, (newValue, oldValue) => {
      console.log(`Имя изменилось с "${oldValue}" на "${newValue}"`)
    }, {
      immediate: true, // Выполнить сразу при создании
      deep: false      // Не следить за вложенными свойствами
    })

    // Глубокое наблюдение за объектом
    watch(user, (newValue, oldValue) => {
      console.log('Пользователь изменился:', newValue)
    }, { deep: true })

    // Наблюдение за несколькими источниками
    watch([count, name], ([newCount, newName], [oldCount, oldName]) => {
      console.log(`Счётчик: ${oldCount} → ${newCount}`)
      console.log(`Имя: "${oldName}" → "${newName}"`)
    })

    // watchEffect - автоматически отслеживает зависимости
    watchEffect(() => {
      console.log(`Счётчик: ${count.value}, Имя: ${name.value}`)
    })

    return {
      count,
      name,
      user
    }
  }
}
```

## 6. Композиция логики

### 6.1. Создание переиспользуемых композиций

Одна из главных возможностей Composition API — создание переиспользуемых композиций:

```javascript
// composables/useCounter.js
import { ref, computed } from 'vue'

export function useCounter(initialValue = 0) {
  const count = ref(initialValue)
  
  const increment = () => count.value++
  const decrement = () => count.value--
  const reset = () => count.value = initialValue
  
  const doubleCount = computed(() => count.value * 2)
  const isEven = computed(() => count.value % 2 === 0)
  
  return {
    count,
    increment,
    decrement,
    reset,
    doubleCount,
    isEven
  }
}

// composables/useLocalStorage.js
import { ref, watch } from 'vue'

export function useLocalStorage(key, defaultValue) {
  const storedValue = localStorage.getItem(key)
  const value = ref(storedValue ? JSON.parse(storedValue) : defaultValue)
  
  watch(value, (newValue) => {
    localStorage.setItem(key, JSON.stringify(newValue))
  })
  
  return value
}

// composables/useApi.js
import { ref, onMounted } from 'vue'

export function useApi(url) {
  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)
  
  const fetchData = async () => {
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch(url)
      data.value = await response.json()
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }
  
  onMounted(fetchData)
  
  return {
    data,
    loading,
    error,
    fetchData
  }
}
```

### 6.2. Использование композиций в компонентах

```vue
<template>
  <div>
    <!-- Счётчик -->
    <div class="counter">
      <h3>Счётчик: {{ count }}</h3>
      <p>Удвоенное значение: {{ doubleCount }}</p>
      <p>Чётное: {{ isEven ? 'Да' : 'Нет' }}</p>
      <button @click="increment">+</button>
      <button @click="decrement">-</button>
      <button @click="reset">Сброс</button>
    </div>

    <!-- Пользователь -->
    <div class="user">
      <h3>Пользователь</h3>
      <input v-model="userName" placeholder="Введите имя" />
      <p>Сохранённое имя: {{ userName }}</p>
    </div>

    <!-- API данные -->
    <div class="api-data">
      <h3>Данные с API</h3>
      <div v-if="loading">Загрузка...</div>
      <div v-else-if="error">Ошибка: {{ error }}</div>
      <div v-else>
        <pre>{{ JSON.stringify(data, null, 2) }}</pre>
        <button @click="fetchData">Обновить</button>
      </div>
    </div>
  </div>
</template>

<script>
import { useCounter } from '@/composables/useCounter'
import { useLocalStorage } from '@/composables/useLocalStorage'
import { useApi } from '@/composables/useApi'

export default {
  name: 'CompositionExample',
  setup() {
    // Используем композиции
    const { count, increment, decrement, reset, doubleCount, isEven } = useCounter(10)
    const userName = useLocalStorage('userName', 'Гость')
    const { data, loading, error, fetchData } = useApi('https://api.example.com/data')

    return {
      count,
      increment,
      decrement,
      reset,
      doubleCount,
      isEven,
      userName,
      data,
      loading,
      error,
      fetchData
    }
  }
}
</script>
```

## 7. Работа с props и emit

### 7.1. Получение props

```javascript
import { toRefs } from 'vue'

export default {
  props: {
    title: String,
    count: Number,
    user: Object
  },
  setup(props) {
    // Деструктурируем props с сохранением реактивности
    const { title, count, user } = toRefs(props)
    
    // Теперь title, count, user - реактивные ссылки
    console.log(title.value) // значение title
    console.log(count.value) // значение count
    
    return {
      title,
      count,
      user
    }
  }
}
```

### 7.2. Отправка событий

```javascript
export default {
  setup(props, { emit }) {
    const increment = () => {
      emit('increment', 1)
    }
    
    const updateUser = (userData) => {
      emit('update:user', userData)
    }
    
    return {
      increment,
      updateUser
    }
  }
}
```

## 8. TypeScript поддержка

Composition API отлично работает с TypeScript:

```typescript
import { ref, computed, Ref } from 'vue'

interface User {
  id: number
  name: string
  email: string
  age: number
}

interface CounterState {
  count: Ref<number>
  increment: () => void
  decrement: () => void
  reset: () => void
}

export function useCounter(initialValue: number = 0): CounterState {
  const count = ref<number>(initialValue)
  
  const increment = (): void => {
    count.value++
  }
  
  const decrement = (): void => {
    count.value--
  }
  
  const reset = (): void => {
    count.value = initialValue
  }
  
  return {
    count,
    increment,
    decrement,
    reset
  }
}

export function useUser(): {
  user: Ref<User | null>
  setUser: (user: User) => void
  clearUser: () => void
} {
  const user = ref<User | null>(null)
  
  const setUser = (newUser: User): void => {
    user.value = newUser
  }
  
  const clearUser = (): void => {
    user.value = null
  }
  
  return {
    user,
    setUser,
    clearUser
  }
}
```

## 9. Лучшие практики

### 9.1. Организация кода

```javascript
export default {
  setup() {
    // 1. Реактивные данные в начале
    const count = ref(0)
    const name = ref('')
    const user = ref(null)
    
    // 2. Вычисляемые свойства
    const fullName = computed(() => `${name.value} ${user.value?.lastName || ''}`)
    const isAdult = computed(() => user.value?.age >= 18)
    
    // 3. Методы
    const increment = () => count.value++
    const updateUser = (newUser) => user.value = newUser
    
    // 4. Хуки жизненного цикла
    onMounted(() => {
      // инициализация
    })
    
    // 5. Возврат всего необходимого
    return {
      count,
      name,
      user,
      fullName,
      isAdult,
      increment,
      updateUser
    }
  }
}
```

### 9.2. Именование композиций

```javascript
// ✅ Хорошо - начинается с "use"
export function useCounter() { }
export function useLocalStorage() { }
export function useApi() { }

// ❌ Плохо - не начинается с "use"
export function counter() { }
export function localStorage() { }
export function api() { }
```

### 9.3. Избегание антипаттернов

```javascript
// ❌ Плохо - создание реактивных данных в циклах
export default {
  setup() {
    const items = []
    for (let i = 0; i < 1000; i++) {
      items.push(ref(i)) // Создаёт много реактивных ссылок
    }
  }
}

// ✅ Хорошо - создание массива и реактивной ссылки на него
export default {
  setup() {
    const items = ref(Array.from({ length: 1000 }, (_, i) => i))
  }
}
```

## 10. Миграция с Options API

### 10.1. Постепенная миграция

Vue 3 позволяет использовать Composition API и Options API в одном компоненте:

```vue
<template>
  <div>
    <h1>{{ title }}</h1>
    <p>Счётчик: {{ count }}</p>
    <button @click="increment">Увеличить</button>
  </div>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'HybridComponent',
  
  // Options API
  data() {
    return {
      oldCount: 0
    }
  },
  
  methods: {
    oldIncrement() {
      this.oldCount++
    }
  },
  
  // Composition API
  setup() {
    const count = ref(0)
    const title = ref('Гибридный компонент')
    
    const increment = () => {
      count.value++
    }
    
    return {
      count,
      title,
      increment
    }
  }
}
</script>
```

### 10.2. Полная миграция

```javascript
// До (Options API)
export default {
  data() {
    return {
      count: 0,
      name: 'Иван'
    }
  },
  
  computed: {
    fullName() {
      return `${this.name} Иванов`
    }
  },
  
  methods: {
    increment() {
      this.count++
    }
  },
  
  mounted() {
    console.log('Компонент смонтирован')
  }
}

// После (Composition API)
import { ref, computed, onMounted } from 'vue'

export default {
  setup() {
    const count = ref(0)
    const name = ref('Иван')
    
    const fullName = computed(() => `${name.value} Иванов`)
    
    const increment = () => {
      count.value++
    }
    
    onMounted(() => {
      console.log('Компонент смонтирован')
    })
    
    return {
      count,
      name,
      fullName,
      increment
    }
  }
}
```

## Заключение

Composition API в Vue.js 3 предоставляет мощный и гибкий способ организации логики компонентов. Основные преимущества:

- **Лучшая организация кода** — связанная функциональность группируется вместе
- **Переиспользование логики** — легко создавать и переиспользовать композиции
- **Полная поддержка TypeScript** — лучшая типизация и поддержка IDE
- **Гибкость** — возможность комбинировать с Options API
- **Производительность** — оптимизированная реактивность

Composition API особенно полезен для:
- Больших и сложных компонентов
- Переиспользуемой логики между компонентами
- Проектов с TypeScript
- Команд, которые хотят улучшить читаемость и поддерживаемость кода

Начните с простых компонентов и постепенно переходите к более сложным композициям. Помните о лучших практиках и избегайте антипаттернов для создания качественного и поддерживаемого кода. 