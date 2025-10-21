---
title: "Vue.js + TypeScript: полное руководство"
description: "Подробное руководство по использованию TypeScript с Vue.js: настройка проекта, типизация компонентов, Composition API, лучшие практики и примеры."
heroImage: "../../../../assets/imgs/2025/08/vuejs-typescript-guide.webp"
pubDate: "2025-08-12"
---

# Vue.js + TypeScript: полное руководство

**Vue.js** в сочетании с **TypeScript** предоставляет мощную платформу для создания надёжных, масштабируемых веб-приложений. TypeScript добавляет статическую типизацию к динамическому JavaScript, что значительно улучшает качество кода, упрощает рефакторинг и помогает избежать множества ошибок на этапе разработки. В этой статье мы рассмотрим, как эффективно использовать TypeScript с Vue.js 3 и Composition API.

## 1. Зачем использовать TypeScript с Vue.js?

TypeScript приносит множество преимуществ в разработку Vue.js приложений:

- **Типобезопасность** — обнаружение ошибок на этапе компиляции
- **Лучшая поддержка IDE** — автодополнение, навигация по коду, рефакторинг
- **Документирование API** — типы служат живой документацией
- **Упрощение рефакторинга** — IDE может автоматически найти все места использования
- **Улучшение командной работы** — чёткие контракты между компонентами
- **Поддержка современных возможностей** — декораторы, условные типы, mapped types

## 2. Настройка проекта Vue.js + TypeScript

### 2.1 Создание проекта с помощью Vue CLI

```bash
# Установка Vue CLI
npm install -g @vue/cli

# Создание нового проекта
vue create vue-typescript-app

# Выбор TypeScript при настройке
# ✓ Babel
# ✓ TypeScript
# ✓ Router
# ✓ Vuex
# ✓ CSS Pre-processors
# ✓ Linter / Formatter
```

### 2.2 Ручная настройка TypeScript

Если вы предпочитаете настройку вручную, создайте `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "strict": true,
    "jsx": "preserve",
    "moduleResolution": "node",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "useDefineForClassFields": true,
    "sourceMap": true,
    "baseUrl": ".",
    "types": [
      "webpack-env"
    ],
    "paths": {
      "@/*": [
        "src/*"
      ]
    },
    "lib": [
      "esnext",
      "dom",
      "dom.iterable"
    ]
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx",
    "src/**/*.vue",
    "tests/**/*.ts",
    "tests/**/*.tsx"
  ],
  "exclude": [
    "node_modules"
  ]
}
```

### 2.3 Установка необходимых зависимостей

```bash
npm install --save-dev typescript @vue/cli-plugin-typescript
npm install --save-dev @types/node
```

## 3. Типизация Vue компонентов

### 3.1 Базовый компонент с TypeScript

```vue
<template>
  <div class="user-card">
    <h2>{{ user.name }}</h2>
    <p>{{ user.email }}</p>
    <button @click="handleEdit">Редактировать</button>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'

interface User {
  id: number
  name: string
  email: string
  age?: number
}

export default defineComponent({
  name: 'UserCard',
  props: {
    user: {
      type: Object as PropType<User>,
      required: true
    }
  },
  emits: ['edit'],
  setup(props, { emit }) {
    const handleEdit = () => {
      emit('edit', props.user.id)
    }

    return {
      handleEdit
    }
  }
})
</script>
```

### 3.2 Использование Composition API с TypeScript

```vue
<template>
  <div class="counter">
    <h3>Счётчик: {{ count }}</h3>
    <button @click="increment">+1</button>
    <button @click="decrement">-1</button>
    <button @click="reset">Сброс</button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface CounterState {
  count: number
  maxValue: number
}

// Типизированные refs
const count = ref<number>(0)
const maxValue = ref<number>(100)

// Типизированные computed
const isMaxReached = computed<boolean>(() => count.value >= maxValue.value)
const displayText = computed<string>(() => 
  isMaxReached.value ? 'Достигнут максимум!' : `Счётчик: ${count.value}`
)

// Типизированные функции
const increment = (): void => {
  if (count.value < maxValue.value) {
    count.value++
  }
}

const decrement = (): void => {
  if (count.value > 0) {
    count.value--
  }
}

const reset = (): void => {
  count.value = 0
}

// Типизированные lifecycle hooks
onMounted((): void => {
  console.log('Компонент смонтирован')
})
</script>
```

## 4. Типизация Props и Emits

### 4.1 Детальная типизация Props

```vue
<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

interface ButtonProps {
  variant: 'primary' | 'secondary' | 'danger'
  size: 'small' | 'medium' | 'large'
  disabled?: boolean
  loading?: boolean
}

interface ButtonEmits {
  click: [event: MouseEvent]
  'click:outside': [event: MouseEvent]
}

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: 'primary',
  size: 'medium',
  disabled: false,
  loading: false
})

const emit = defineEmits<ButtonEmits>()
</script>
```

### 4.2 Валидация Props с TypeScript

```vue
<script setup lang="ts">
import { defineProps } from 'vue'

interface ValidationRule {
  required?: boolean
  min?: number
  max?: number
  pattern?: RegExp
}

interface FormField {
  name: string
  value: string
  rules: ValidationRule[]
}

const props = defineProps<{
  fields: FormField[]
  submitText?: string
}>()

// Валидация на уровне TypeScript
const validateField = (field: FormField): boolean => {
  if (field.rules.some(rule => rule.required) && !field.value) {
    return false
  }
  
  const minRule = field.rules.find(rule => rule.min !== undefined)
  if (minRule?.min !== undefined && field.value.length < minRule.min) {
    return false
  }
  
  const maxRule = field.rules.find(rule => rule.max !== undefined)
  if (maxRule?.max !== undefined && field.value.length > maxRule.max) {
    return false
  }
  
  const patternRule = field.rules.find(rule => rule.pattern)
  if (patternRule?.pattern && !patternRule.pattern.test(field.value)) {
    return false
  }
  
  return true
}
</script>
```

## 5. Типизация Vuex Store

### 5.1 Типизированный Store

```typescript
// store/types.ts
export interface User {
  id: number
  name: string
  email: string
  role: 'user' | 'admin' | 'moderator'
}

export interface UserState {
  users: User[]
  currentUser: User | null
  loading: boolean
  error: string | null
}

export interface UserGetters {
  getUserById: (id: number) => User | undefined
  getUsersByRole: (role: User['role']) => User[]
  isAdmin: boolean
}

export interface UserMutations {
  setUsers: (users: User[]) => void
  setCurrentUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export interface UserActions {
  fetchUsers: () => Promise<void>
  createUser: (user: Omit<User, 'id'>) => Promise<User>
  updateUser: (id: number, updates: Partial<User>) => Promise<User>
  deleteUser: (id: number) => Promise<void>
}
```

### 5.2 Реализация типизированного Store

```typescript
// store/user.ts
import { Module } from 'vuex'
import { UserState, User, UserGetters, UserMutations, UserActions } from './types'

const userModule: Module<UserState, any> = {
  namespaced: true,
  
  state: (): UserState => ({
    users: [],
    currentUser: null,
    loading: false,
    error: null
  }),
  
  getters: {
    getUserById: (state: UserState) => (id: number): User | undefined => {
      return state.users.find(user => user.id === id)
    },
    
    getUsersByRole: (state: UserState) => (role: User['role']): User[] => {
      return state.users.filter(user => user.role === role)
    },
    
    isAdmin: (state: UserState): boolean => {
      return state.currentUser?.role === 'admin'
    }
  },
  
  mutations: {
    setUsers(state: UserState, users: User[]): void {
      state.users = users
    },
    
    setCurrentUser(state: UserState, user: User | null): void {
      state.currentUser = user
    },
    
    setLoading(state: UserState, loading: boolean): void {
      state.loading = loading
    },
    
    setError(state: UserState, error: string | null): void {
      state.error = error
    }
  },
  
  actions: {
    async fetchUsers({ commit }: { commit: any }): Promise<void> {
      commit('setLoading', true)
      try {
        const response = await fetch('/api/users')
        const users: User[] = await response.json()
        commit('setUsers', users)
      } catch (error) {
        commit('setError', error instanceof Error ? error.message : 'Ошибка загрузки')
      } finally {
        commit('setLoading', false)
      }
    },
    
    async createUser({ commit }: { commit: any }, userData: Omit<User, 'id'>): Promise<User> {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      })
      const newUser: User = await response.json()
      return newUser
    }
  }
}

export default userModule
```

## 6. Типизация API вызовов

### 6.1 Типизированные API функции

```typescript
// api/types.ts
export interface ApiResponse<T> {
  data: T
  message: string
  success: boolean
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface User {
  id: number
  name: string
  email: string
  createdAt: string
  updatedAt: string
}

export interface CreateUserRequest {
  name: string
  email: string
  password: string
}

export interface UpdateUserRequest {
  name?: string
  email?: string
}

export interface UserFilters {
  search?: string
  role?: string
  page?: number
  limit?: number
}
```

### 6.2 Реализация типизированного API

```typescript
// api/users.ts
import { ApiResponse, PaginatedResponse, User, CreateUserRequest, UpdateUserRequest, UserFilters } from './types'

class UserApi {
  private baseUrl: string = '/api/users'
  
  async getUsers(filters: UserFilters = {}): Promise<PaginatedResponse<User>> {
    const params = new URLSearchParams()
    
    if (filters.search) params.append('search', filters.search)
    if (filters.role) params.append('role', filters.role)
    if (filters.page) params.append('page', filters.page.toString())
    if (filters.limit) params.append('limit', filters.limit.toString())
    
    const response = await fetch(`${this.baseUrl}?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return await response.json()
  }
  
  async getUserById(id: number): Promise<ApiResponse<User>> {
    const response = await fetch(`${this.baseUrl}/${id}`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return await response.json()
  }
  
  async createUser(userData: CreateUserRequest): Promise<ApiResponse<User>> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return await response.json()
  }
  
  async updateUser(id: number, userData: UpdateUserRequest): Promise<ApiResponse<User>> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return await response.json()
  }
  
  async deleteUser(id: number): Promise<ApiResponse<void>> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE'
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    return await response.json()
  }
}

export const userApi = new UserApi()
```

## 7. Типизация Composition API функций

### 7.1 Кастомные composables с TypeScript

```typescript
// composables/useLocalStorage.ts
import { ref, watch } from 'vue'

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const storedValue = localStorage.getItem(key)
  const value = ref<T>(storedValue ? JSON.parse(storedValue) : defaultValue)
  
  watch(value, (newValue) => {
    localStorage.setItem(key, JSON.stringify(newValue))
  })
  
  return value
}

// composables/useApi.ts
import { ref, Ref } from 'vue'

interface UseApiOptions<T> {
  immediate?: boolean
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

interface UseApiReturn<T> {
  data: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
  execute: (...args: any[]) => Promise<void>
  reset: () => void
}

export function useApi<T>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: UseApiOptions<T> = {}
): UseApiReturn<T> {
  const data = ref<T | null>(null)
  const loading = ref<boolean>(false)
  const error = ref<Error | null>(null)
  
  const execute = async (...args: any[]): Promise<void> => {
    loading.value = true
    error.value = null
    
    try {
      const result = await apiFunction(...args)
      data.value = result
      options.onSuccess?.(result)
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Неизвестная ошибка')
      error.value = errorObj
      options.onError?.(errorObj)
    } finally {
      loading.value = false
    }
  }
  
  const reset = (): void => {
    data.value = null
    loading.value = false
    error.value = null
  }
  
  if (options.immediate) {
    execute()
  }
  
  return {
    data,
    loading,
    error,
    execute,
    reset
  }
}
```

### 7.2 Использование типизированных composables

```vue
<template>
  <div class="user-management">
    <div v-if="loading" class="loading">Загрузка...</div>
    <div v-else-if="error" class="error">{{ error.message }}</div>
    <div v-else-if="data" class="users">
      <h2>Пользователи ({{ data.pagination.total }})</h2>
      <div class="user-list">
        <div v-for="user in data.data" :key="user.id" class="user-item">
          <h3>{{ user.name }}</h3>
          <p>{{ user.email }}</p>
          <p>Создан: {{ formatDate(user.createdAt) }}</p>
        </div>
      </div>
    </div>
    
    <button @click="loadUsers" :disabled="loading">
      {{ loading ? 'Загрузка...' : 'Обновить' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useApi } from '@/composables/useApi'
import { userApi } from '@/api/users'
import { PaginatedResponse, User } from '@/api/types'

const { data, loading, error, execute: loadUsers } = useApi<PaginatedResponse<User>>(
  userApi.getUsers,
  {
    immediate: true,
    onSuccess: (data) => {
      console.log(`Загружено ${data.data.length} пользователей`)
    },
    onError: (error) => {
      console.error('Ошибка загрузки пользователей:', error.message)
    }
  }
)

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('ru-RU')
}
</script>
```

## 8. Лучшие практики и рекомендации

### 8.1 Организация типов

```typescript
// types/index.ts - центральный файл типов
export * from './api'
export * from './components'
export * from './store'
export * from './utils'

// types/components.ts - типы для компонентов
export interface BaseComponentProps {
  class?: string
  id?: string
}

export interface ButtonProps extends BaseComponentProps {
  variant: 'primary' | 'secondary' | 'danger'
  size: 'small' | 'medium' | 'large'
  disabled?: boolean
}

// types/utils.ts - утилитарные типы
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
```

### 8.2 Типизация событий

```typescript
// types/events.ts
export interface VueEvents {
  'user:created': [userId: number]
  'user:updated': [userId: number, userData: Partial<User>]
  'user:deleted': [userId: number]
  'form:submitted': [formData: Record<string, any>]
  'modal:opened': [modalId: string]
  'modal:closed': [modalId: string]
}

// В компоненте
const emit = defineEmits<{
  'user:created': [userId: number]
  'user:updated': [userId: number, userData: Partial<User>]
}>()

// Использование
emit('user:created', 123)
emit('user:updated', 123, { name: 'Новое имя' })
```

### 8.3 Типизация refs и template refs

```vue
<template>
  <div>
    <input ref="inputRef" type="text" />
    <button @click="focusInput">Фокус на поле</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

// Типизация template ref
const inputRef = ref<HTMLInputElement>()

// Типизация обычного ref
const count = ref<number>(0)
const message = ref<string>('Привет')

onMounted(() => {
  // TypeScript знает, что inputRef.value - это HTMLInputElement
  inputRef.value?.focus()
})

const focusInput = (): void => {
  inputRef.value?.focus()
}
</script>
```

## 9. Отладка и инструменты

### 9.1 Настройка ESLint для TypeScript

```json
// .eslintrc.js
module.exports = {
  extends: [
    '@vue/typescript/recommended',
    '@vue/prettier',
    '@vue/prettier/@typescript-eslint'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/prefer-const': 'error'
  }
}
```

### 9.2 Настройка Vetur (если используете)

```json
// vetur.config.js
module.exports = {
  projects: [
    {
      root: './src',
      package: './package.json',
      tsconfig: './tsconfig.json'
    }
  ]
}
```

## 10. Заключение

TypeScript значительно улучшает разработку Vue.js приложений, предоставляя:

- **Надёжность** — обнаружение ошибок на этапе компиляции
- **Производительность** — лучшая поддержка IDE и инструментов
- **Масштабируемость** — чёткие контракты между компонентами
- **Поддержка** — упрощение работы в команде и рефакторинга

Начните с простых типов и постепенно усложняйте типизацию по мере развития проекта. Используйте union types, conditional types и mapped types для создания гибких и мощных типовых систем.

Помните, что TypeScript — это инструмент, который должен помогать, а не мешать разработке. Начните с базовой типизации и постепенно добавляйте более сложные типы там, где они действительно нужны.

**Дополнительные ресурсы:**
- [Официальная документация Vue.js + TypeScript](https://vuejs.org/guide/typescript/overview.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vue Class Component](https://class-component.vuejs.org/)
- [Vuex TypeScript Guide](https://vuex.vuejs.org/guide/typescript-support.html) 