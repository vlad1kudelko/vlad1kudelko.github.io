---
title: "React Native: создание мобильного приложения"
description: "Пошаговое, практико‑ориентированное введение в React Native: выбор между Expo и RN CLI, структура проекта, навигация, работа с API и состоянием, платформенные отличия, сборка релиза."
heroImage: "/imgs/2025/08/react-native-sozdanie-mobilnogo-prilozheniya.webp"
pubDate: "2025-08-18"
---

# React Native: создание мобильного приложения

React Native позволяет создавать нативные iOS/Android‑приложения на JavaScript/TypeScript, переиспользуя одну кодовую базу. В этой статье — минимально необходимый практический путь: с чего начать, как структурировать проект, добавить навигацию, экран со списком и деталями, хранение данных и собрать релиз. Мы намеренно даём поменьше кода и побольше пояснений, чтобы вы видели причины решений.

## 1. Два пути старта: Expo или React Native CLI

- Expo — быстрее старт, много готовых модулей (камера, уведомления, обновления «по воздуху»), консистентный DX. Хорош для MVP, прототипов, малого/среднего продукта. Сборка через EAS.
- RN CLI — больше контроля, доступ ко всем нативным настройкам и библиотекам без ограничений. Чуть дольше настройка окружения, но гибче для специфики.

Практическая рекомендация: начинайте с Expo. Перейти на Bare Workflow можно позже, если потребуется глубокая нативная интеграция.

## 2. Создание проекта

### Expo

```bash
npm create expo@latest myapp
cd myapp
npm run start
```

Expo Dev Tools подскажет, как открыть приложение: эмулятор Android, симулятор iOS или Expo Go на реальном устройстве (скан QR‑кода).

### React Native CLI (когда нужен полный натив)

```bash
npx react-native@latest init MyApp --version latest
cd MyApp
npm run android
# или
npm run ios
```

Для iOS потребуется Xcode и macOS. Для Android — Android Studio, SDK и эмулятор/устройство в режиме разработчика.

## 3. Структура проекта

Поддерживайте простую, предсказуемую структуру:

```
src/
  app/            # навигация, корневые провайдеры
  screens/        # экраны
  components/     # UI-компоненты
  hooks/          # кастомные хуки
  services/       # API, хранилища, интеграции
  state/          # контекст/Redux/RTK Query/заглушки
  theme/          # цвета, типографика, spacing
```

Так легче удерживать модулярность: экраны опираются на компоненты, сервисы и состояние, а не друг на друга.

## 4. Первый экран и стили

React Native использует собственные примитивы (`View`, `Text`, `Image`, `ScrollView`, `FlatList`) и систему стилей, похожую на CSS‑in‑JS.

Минимальный экран:

```tsx
// src/screens/HomeScreen.tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Привет, React Native!</Text>
      <Text>Создадим приложение с навигацией и списком.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 }
})
```

Пояснения:
- Стили — обычные объекты JS/TS. Единицы измерения — «плотностезависимые» пиксели.
- Для адаптивности используйте `flex`, проценты ширины/высоты, `SafeAreaView` на iOS.

## 5. Навигация: стек и табы

Де‑факто стандарт — React Navigation. Начните со стек‑навигации:

```bash
npm i @react-navigation/native @react-navigation/native-stack
npm i react-native-screens react-native-safe-area-context
```

Пример настройки:

```tsx
// src/app/navigation.tsx
import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import HomeScreen from '../screens/HomeScreen'
import DetailsScreen from '../screens/DetailsScreen'

export type RootStackParamList = {
  Home: undefined
  Details: { id: string }
}

const Stack = createNativeStackNavigator<RootStackParamList>()

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Главная' }} />
        <Stack.Screen name="Details" component={DetailsScreen} options={{ title: 'Детали' }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
```

И экран деталей:

```tsx
// src/screens/DetailsScreen.tsx
import React from 'react'
import { View, Text } from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../app/navigation'

type Props = NativeStackScreenProps<RootStackParamList, 'Details'>

export default function DetailsScreen({ route }: Props) {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text>Детали элемента: {route.params.id}</Text>
    </View>
  )
}
```

Смысловые моменты:
- Тип `RootStackParamList` обеспечивает типобезопасные маршруты и параметры.
- Для табов подключите `@react-navigation/bottom-tabs` и положите стек в один из табов (или наоборот).

## 6. Работа со списком и API

Для списков используйте `FlatList` — он виртуализирует элементы и экономит память.

```tsx
// src/screens/PostsScreen.tsx
import React, { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'

type Post = { id: number; title: string }

export default function PostsScreen() {
  const [data, setData] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=20')
        const json = (await res.json()) as Post[]
        setData(json)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading) return <ActivityIndicator style={{ marginTop: 24 }} />

  return (
    <FlatList
      data={data}
      keyExtractor={item => String(item.id)}
      renderItem={({ item }) => (
        <TouchableOpacity style={{ padding: 12 }}>
          <Text style={{ fontWeight: '600' }}>{item.title}</Text>
        </TouchableOpacity>
      )}
      ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#eee' }} />}
      contentContainerStyle={{ padding: 12 }}
    />
  )
}
```

Пояснения:
- `FlatList` принимает `data`, `renderItem`, `keyExtractor`. Не передавайте анонимные коллбэки в бесконечном количестве — выносите в мемо‑компоненты на больших списках.
- Для реальных API добавьте обработку ошибок и «pull‑to‑refresh» (`refreshing`, `onRefresh`).

## 7. Состояние: когда Context, когда Redux Toolkit, когда RTK Query

- Context + хуки — хорошо для локального состояния (тема, авторизация, небольшие формы).
- Redux Toolkit — для средних/больших приложений с предсказуемыми потоками данных.
- RTK Query — для серверного состояния: запросы/кэш/инвалидация без лишнего кода.

Минимальный пример Context для авторизации:

```tsx
// src/state/AuthContext.tsx
import React, { createContext, useContext, useState, useMemo } from 'react'

type AuthUser = { id: string; email: string } | null

type AuthContextValue = {
  user: AuthUser
  login(email: string, password: string): Promise<boolean>
  logout(): void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null)
  const value = useMemo(() => ({
    user,
    async login(email: string) {
      setUser({ id: 'u1', email })
      return true
    },
    logout() { setUser(null) }
  }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
```

Интегрируйте `AuthProvider` в корень навигации, чтобы `useAuth()` был доступен на экранах.

## 8. Локальное хранилище: AsyncStorage

Для простых настроек/кэша используйте `@react-native-async-storage/async-storage` (в Expo ставится без нативной сборки).

```bash
npm i @react-native-async-storage/async-storage
```

```ts
// src/services/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'myapp:user'

export async function saveUser(json: unknown) {
  await AsyncStorage.setItem(KEY, JSON.stringify(json))
}

export async function loadUser<T>() {
  const raw = await AsyncStorage.getItem(KEY)
  return raw ? (JSON.parse(raw) as T) : null
}
```

Советы:
- Не храните чувствительные данные (токены) в чистом виде. Рассмотрите `expo-secure-store` или Keychain/Keystore.
- Ограничивайте объёмы данных, очищайте неиспользуемое.

## 9. Платформенные отличия и UI

- Компоненты `Pressable`, `TouchableOpacity` — для кликов; под iOS/Android вибрация/feedback могут отличаться.
- Шрифты и размеры статуса/нотации засечек различаются; учитывайте `SafeAreaView` и `Platform` API.
- Для сложных UI используйте UI‑киты: React Native Paper, NativeBase, Tamagui, Dripsy, или стили через `styled-components`/`@shopify/restyle`.

## 10. Типизация с TypeScript

Включайте TS с самого начала. Преимущества: автодополнение пропсов, типобезопасные маршруты, меньше скрытых ошибок при рефакторинге. Добавьте `tsconfig.json`, меняйте файлы на `.ts`/`.tsx` и типизируйте параметры навигации и API‑ответы.

## 11. Сборка и публикация

### Expo EAS

- Регистрируйтесь в Expo, установите `eas-cli`.
- Конфигурация в `eas.json` позволяет собирать Android/iOS в облаке без локальных нативных инструментов.
- OTA‑обновления позволяют выкатывать JS‑изменения без магазинов (в рамках правил Apple/Google).

### React Native CLI

- Android: сборка `release` через Gradle, подпись `keystore`, загрузка в Google Play.
- iOS: архив через Xcode, подпись сертификатами, загрузка в App Store Connect, TestFlight для тестирования.

Минимальные шаги одинаковые: подготовьте иконки/сплэш, проверьте разрешения (камера, гео, уведомления), настройте версии и номера сборок.

## 12. Отладка и качество

- Dev‑меню: «Reload», «Enable Fast Refresh», «Debug JS».
- Flipper — инспекция сети, логов, производительности.
- Тесты: unit (Jest/RTL), e2e (Detox). Линтеры: ESLint, Prettier. Типизация: строгий TS.

## 13. Частые ошибки и как их избежать

- Слишком ранний отказ от Expo — теряете скорость. Начинайте с Expo, переходите на Bare при необходимости.
- Отсутствие навигационной архитектуры — определите стек/табы/модальные экраны заранее.
- Смешение «серверного» и «клиентского» состояния — используйте RTK Query или SWR/TanStack Query для запросов, Context/Redux для UI‑состояния.
- Игнорирование платформенных нюансов — проверяйте оба устройства/эмуляторы, используйте `Platform.select` для тонких правок.

## Итоги

Вы можете быстро собрать работоспособный прототип на React Native: старт через Expo, добавление стек‑навигации, экран со списком и деталями, локальное хранилище и простая авторизация через контекст. По мере роста добавляйте типизацию, выделяйте серверное состояние, улучшайте архитектуру и переходите к релизным сборкам. Такой путь даёт хороший баланс скорости и качества — от MVP до продуктового приложения.
