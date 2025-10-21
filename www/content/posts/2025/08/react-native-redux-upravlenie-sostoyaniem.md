+++
lang = "ru"
title = "React Native + Redux: управление состоянием"
description = "Как настроить Redux Toolkit в React Native: структура стора, слайсы, асинхронные операции, Redux Persist, типизация и производительность. Минимум кода — максимум пояснений."
template = "posts"
thumb = "/imgs/2025/08/react-native-redux-upravlenie-sostoyaniem.webp"
publication_date = "2025-08-21"
+++

# React Native + Redux: управление состоянием

Redux остаётся надёжным выбором для масштабируемого управления состоянием в мобильных приложениях на React Native. С современным Redux Toolkit (RTK) он стал проще, безопаснее и короче. Ниже — практическое руководство: когда Redux действительно нужен, как его настроить в RN‑проекте, как работать с асинхронными эффектами, кэшировать серверные данные и не потерять производительность.

## 1. Когда выбирать Redux в React Native

- **Сложная бизнес‑логика**: много источников данных, сложные преобразования, права доступа, офлайн‑режим.
- **Кросс‑экранные сценарии**: одни и те же данные используются в разных местах (профиль, корзина, настройки).
- **Прозрачность и инспекция**: тайм‑тревел, логирование, сериализация — важно при сложном дебаге.
- **Команда/масштаб**: явные правила, неизменяемость, единый стор упрощают коллективную разработку.

Если состояние преимущественно «серверное» (списки, карточки, пагинация) — рассмотрите RTK Query или TanStack Query. Redux удобен для «клиентского» состояния: авторизация, локальные настройки, сложные формы‑мастера, кэш офлайна, очередь действий.

## 2. Установка и базовая структура

```bash
npm i @reduxjs/toolkit react-redux
```

Минимальная структура:

- `src/store/index.ts` — создание стора
- `src/features/<domain>/<domain>.slice.ts` — слайс домена
- `src/app/App.tsx` — подключение `Provider`

## 3. Создание стора через RTK

Нужны безопасные значения по умолчанию, строгая типизация и селекторы — это обеспечивает RTK.

```ts
// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'
import authReducer from '../features/auth/auth.slice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
```

Пояснение:
- `configureStore` сразу включает полезные миддлвары и строгую проверку immutable/serializable в дев‑режиме.
- Типизированные хуки убирают ручные дженерики во всех компонентах.

## 4. Слайс: состояние аутентификации

Не усложняйте. Начните с малого и расширяйте по мере роста требований.

```ts
// src/features/auth/auth.slice.ts
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'

type AuthState = {
  token: string | null
  loading: boolean
  error: string | null
}

const initialState: AuthState = {
  token: null,
  loading: false,
  error: null,
}

export const login = createAsyncThunk(
  'auth/login',
  async (args: { email: string; password: string }) => {
    // Здесь будет реальный вызов API
    const res = await fetch('https://example.com/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    })
    if (!res.ok) throw new Error('Неверные учётные данные')
    const data = (await res.json()) as { token: string }
    return data.token
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.token = null
      state.error = null
    },
  },
  extraReducers: builder => {
    builder
      .addCase(login.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false
        state.token = action.payload
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? 'Ошибка входа'
      })
  },
})

export const { logout } = authSlice.actions
export default authSlice.reducer
```

Ключевые мысли:
- `createAsyncThunk` упрощает эффекты: loading/error/fulfilled обрабатываются в одном месте.
- Состояние лаконично и предсказуемо; всё, что касается auth, держите в одном слайсе.

## 5. Подключение к корню приложения

В React Native провайдер ставится в корневой компонент (например, `App.tsx`).

```tsx
// src/app/App.tsx
import React from 'react'
import { Provider } from 'react-redux'
import { store } from '../store'
import { View, Text } from 'react-native'

export default function App() {
  return (
    <Provider store={store}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Приложение с Redux готово</Text>
      </View>
    </Provider>
  )
}
```

Использование в экране:

```tsx
// пример экрана
import React, { useState } from 'react'
import { View, Text, Button, TextInput } from 'react-native'
import { useAppDispatch, useAppSelector } from '../store'
import { login, logout } from '../features/auth/auth.slice'

export function AuthScreen() {
  const dispatch = useAppDispatch()
  const { token, loading, error } = useAppSelector(s => s.auth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <View style={{ padding: 16 }}>
      {token ? (
        <>
          <Text>Токен: {token.slice(0, 6)}...</Text>
          <Button title="Выйти" onPress={() => dispatch(logout())} />
        </>
      ) : (
        <>
          <TextInput placeholder="Email" value={email} onChangeText={setEmail} />
          <TextInput placeholder="Пароль" value={password} onChangeText={setPassword} secureTextEntry />
          <Button title={loading ? 'Вход...' : 'Войти'} onPress={() => dispatch(login({ email, password }))} />
          {!!error && <Text style={{ color: 'red' }}>{error}</Text>}
        </>
      )}
    </View>
  )
}
```

Замечания:
- Избегайте хранения больших объектов (например, ответа профиля целиком) — сохраняйте ключи/токены, а данные запрашивайте по идентификатору.
- Для списков используйте `FlatList`, чтобы не инициировать лишние ре‑рендеры.

## 6. Сохранение состояния с Redux Persist

Аутентификация и пользовательские настройки полезно переживают перезапуск приложения. Для RN используйте `AsyncStorage` как движок.

```bash
npm i redux-persist @react-native-async-storage/async-storage
```

```ts
// src/store/index.ts (фрагмент)
import AsyncStorage from '@react-native-async-storage/async-storage'
import { persistStore, persistReducer } from 'redux-persist'
import authReducer from '../features/auth/auth.slice'

const authPersistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  whitelist: ['token'],
}

const rootReducer = {
  auth: persistReducer(authPersistConfig, authReducer),
}

export const store = configureStore({ reducer: rootReducer })
export const persistor = persistStore(store)
```

И обёртка в корне:

```tsx
// src/app/App.tsx (фрагмент)
import { PersistGate } from 'redux-persist/integration/react'
import { persistor, store } from '../store'

<Provider store={store}>
  <PersistGate loading={null} persistor={persistor}>
    {/* ваш навигатор/экраны */}
  </PersistGate>
</Provider>
```

Советы:
- В `whitelist` перечисляйте только действительно нужные ключи, чтобы не сохранять лишнее.
- Храните секреты (токены) в `SecureStore`/Keychain, если это требование безопасности; сочетайте с Persist через синхронизацию при старте.

## 7. RTK Query для серверных данных

Если в приложении много запросов к API и кэша, RTK Query закроет 80% задач без ручного `createAsyncThunk`.

```bash
npm i @reduxjs/toolkit
```

```ts
// src/features/api/api.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: 'https://example.com/api' }),
  endpoints: builder => ({
    getPosts: builder.query<{ id: number; title: string }[], void>({
      query: () => '/posts?_limit=20',
    }),
  }),
})

export const { useGetPostsQuery } = api
```

Подключение:

```ts
// src/store/index.ts (фрагмент)
import { api } from '../features/api/api'

export const store = configureStore({
  reducer: {
    auth: persistReducer(authPersistConfig, authReducer),
    [api.reducerPath]: api.reducer,
  },
  middleware: getDefault => getDefault().concat(api.middleware),
})
```

Использование:

```tsx
// любой экран
import { useGetPostsQuery } from '../features/api/api'

function PostsScreen() {
  const { data, isLoading, refetch } = useGetPostsQuery()
  // отрисовка списка с учётом загрузки/ошибок
}
```

Преимущества:
- Автокэш, инвалидация, рефетч по фокусу/сетям — без вспомогательного кода.
- Для RN работает из коробки на `fetch`, не требует дополнительных зависимостей.

## 8. Производительность и архитектура

- **Мемоизация селекторов**: для дорогих вычислений используйте `reselect` или `createSelector` из RTK.
- **Точечные селекторы**: выбирайте только необходимые поля в `useAppSelector`, а не целые ветки состояния.
- **Нормализация**: храните коллекции как `byId + allIds`, чтобы обновления затрагивали меньше компонентов.
- **Разделение стора по доменам**: `auth`, `profile`, `cart`, `settings`. Держите границы чёткими, чтобы проще было следить за побочными эффектами.
- **Отладка**: в RN удобно использовать Flipper с плагином Redux. Для Expo — Remote JS Debugging/Flipper через dev‑меню.

## 9. Частые ошибки

- Смешение «серверного» и «клиентского» состояния в одном слайсе. Держите кэш API отдельно (RTK Query) от локальной логики.
- Сохранение чрезмерного объёма данных в Persist (лишние мегабайты и долгий старт).
- Глобализация всего подряд: локальное UI‑состояние (открыт ли модал) храните в компоненте/навигации, а не в Redux.
- Отсутствие типизации хуков селектора/диспатча — ведёт к слабым подсказкам и скрытым ошибкам.

## 10. Чек‑лист интеграции

- Установлены `@reduxjs/toolkit` и `react-redux`, создан стор через `configureStore`.
- Слайсы по доменам, асинхронные операции через `createAsyncThunk` (или RTK Query для API).
- Типизированы `RootState`, `AppDispatch`, добавлены `useAppSelector`/`useAppDispatch`.
- Persist настроен для критичных данных (токен/настройки), белый список минимален.
- Селекторы узкие и по возможности мемоизированы.
- Производительность проверена на реальных списках (`FlatList`), лишние ре‑рендеры устранены.

## Итоги

С современным Redux Toolkit интеграция Redux в React Native стала заметно проще: меньше шаблонного кода, лучше типизация, встроенные инструменты для асинхронности и кэширования. Используйте Redux для сложной клиентской логики и сквозного состояния, а для серверных данных — RTK Query. Сдерживайте объём Persist, проектируйте слайсы по доменам и следите за производительностью — так вы получите предсказуемую и масштабируемую архитектуру.
