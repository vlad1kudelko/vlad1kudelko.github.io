---
title: "React Native: состояние и данные — Zustand и React Query"
description: "Управляйте состоянием в React Native: Context, Redux, Zustand, TanStack Query. Выберите оптимальное решение для вашего приложения."
heroImage: "../../../../assets/imgs/2025/12/22-react-native-state.webp"
pubDate: "2025-12-22"
---

# Управление состоянием в React Native

Управление состоянием — ключевой аспект React Native разработки. Рассмотрим различные подходы.

## Local State

```tsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <View>
      <Text>{count}</Text>
      <Button title="+" onPress={() => setCount(c => c + 1)} />
    </View>
  );
}
```

## Context

```tsx
// ThemeContext.tsx
import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Использование
function ThemedButton() {
  const { theme, setTheme } = useTheme();
  
  return (
    <Button 
      title={theme}
      onPress={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
    />
  );
}
```

## Redux Toolkit

```bash
npm install @reduxjs/toolkit react-redux
```

```tsx
// store.ts
import { configureStore, createSlice } from '@reduxjs/toolkit';

const counterSlice = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    increment: (state) => { state.value += 1; },
    decrement: (state) => { state.value -= 1; },
    incrementByAmount: (state, action) => { state.value += action.payload; },
  },
});

export const { increment, decrement, incrementByAmount } = counterSlice.actions;

export const store = configureStore({
  reducer: { counter: counterSlice.reducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

```tsx
// Использование
import { useSelector, useDispatch } from 'react-redux';
import { increment } from './store';

function Counter() {
  const count = useSelector((state: RootState) => state.counter.value);
  const dispatch = useDispatch<AppDispatch>();
  
  return (
    <Button title={count} onPress={() => dispatch(increment())} />
  );
}
```

```tsx
// Provider
import { Provider } from 'react-redux';
import { store } from './store';

function App() {
  return (
    <Provider store={store}>
      <MainScreen />
    </Provider>
  );
}
```

## Zustand

```bash
npm install zustand
```

```tsx
// store.ts
import { create } from 'zustand';

interface CounterStore {
  count: number;
  increment: () => void;
  decrement: () => void;
}

const useStore = create<CounterStore>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));

// Использование
function Counter() {
  const { count, increment, decrement } = useStore();
  
  return (
    <View>
      <Text>{count}</Text>
      <Button title="+" onPress={increment} />
    </View>
  );
}
```

## React Query

```bash
npm install @tanstack/react-query
```

```tsx
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserList />
    </QueryClientProvider>
  );
}

function UserList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('https://api.example.com/users');
      return res.json();
    },
  });
  
  if (isLoading) return <Text>Loading...</Text>;
  if (error) return <Text>Error: {error.message}</Text>;
  
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <Text>{item.name}</Text>}
    />
  );
}
```

## AsyncStorage

```bash
npm install @react-native-async-storage/async-storage
```

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';

// Сохранение
await AsyncStorage.setItem('user', JSON.stringify(user));

// Чтение
const userJson = await AsyncStorage.getItem('user');
const user = userJson ? JSON.parse(userJson) : null;

// Удаление
await AsyncStorage.removeItem('user');
```

## Persist с Zustand

```tsx
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useStore = create(
  persist(
    (set) => ({
      count: 0,
      increment: () => set((state) => ({ count: state.count + 1 })),
    }),
    {
      name: 'my-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

## Заключение

Выбор инструмента зависит от сложности приложения: local state для простых компонентов, Context для theme/locale, Zustand/Redux для глобального состояния, React Query для данных с сервера.