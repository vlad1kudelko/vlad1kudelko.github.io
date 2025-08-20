+++
lang = "ru"
title = "React Native Navigation: навигация"
description = "Практическое руководство по React Navigation: стек, табы, drawer, типобезопасные параметры, модальные экраны, deep linking и лучшие практики."
template = "posts"
thumb = "/imgs/2025/08/react-native-navigation-navigaciya.jpeg"
publication_date = "2025-08-20"
+++

# React Native Navigation: навигация

Надёжная навигация — основа удобного мобильного приложения. В экосистеме React Native де‑факто стандарт — React Navigation. В этой статье разберём архитектуру навигации (стек, табы, drawer), типизацию маршрутов, передачу параметров, модальные экраны, deep linking, а также практические советы по производительности и UX.

## 1. Что использовать и почему

- **React Navigation**: кроссплатформенная, гибкая, имеет нативные контейнеры (`react-native-screens`, `react-native-safe-area-context`), отличную документацию, типизацию и большое сообщество.
- **Альтернативы** (реже): `react-native-navigation` (нативные стеки от Wix), `expo-router` (файловая маршрутизация в Expo). В большинстве кейсов начните с React Navigation.

## 2. Установка базового стека

```bash
npm i @react-navigation/native @react-navigation/native-stack
npm i react-native-screens react-native-safe-area-context
```

Минимальная настройка:

```tsx
// src/app/navigation.tsx
import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import HomeScreen from '../screens/HomeScreen'
import DetailsScreen from '../screens/DetailsScreen'

type RootStackParamList = {
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

Пояснение:
- `NavigationContainer` держит состояние навигации и интеграцию с платформой.
- `createNativeStackNavigator` использует нативные представления экранов, даёт лучшую производительность и системную анимацию.

## 3. Параметры маршрутов и типобезопасность

Тип `RootStackParamList` описывает схему маршрут → параметры. Это:
- предотвращает опечатки в названиях экранов;
- подчёркивает обязательность/необязательность параметров;
- улучшает DX (подсказки IDE).

Получение параметров на экране:

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
      <Text>Детали: {route.params.id}</Text>
    </View>
  )
}
```

Советы:
- Храните типы маршрутов рядом с навигатором.
- Для общих параметров (например, `title`) вводите вспомогательные типы.

## 4. Комбинированная архитектура: стек + табы + модальные

Частый паттерн: в корне — табы, внутри табов — стеки. Модальные экраны задаются отдельным стеком или презентацией экрана.

```bash
npm i @react-navigation/bottom-tabs
```

```tsx
// src/app/tabs.tsx
import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import FeedStack from './FeedStack'
import ProfileStack from './ProfileStack'

const Tab = createBottomTabNavigator()

export default function Tabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Feed" component={FeedStack} options={{ title: 'Лента' }} />
      <Tab.Screen name="Profile" component={ProfileStack} options={{ title: 'Профиль' }} />
    </Tab.Navigator>
  )
}
```

Зачем так:
- Таб — якорь раздела; стек внутри таба — история переходов.
- Модальные экраны (создать, редактировать) лучше отделять логически и визуально.

Модальная презентация:

```tsx
// при объявлении экрана можно указать presentation: 'modal'
<Stack.Screen name="CreatePost" component={CreatePost} options={{ presentation: 'modal', title: 'Новый пост' }} />
```

## 5. Drawer (бургер‑меню)

Подходит для навигации по разделам второго уровня или панели действий.

```bash
npm i @react-navigation/drawer
```

Ключевые моменты:
- Не перегружайте drawer — оставьте 5–7 пунктов максимум.
- Часто сочетается с табами: drawer на уровне приложения, табы — внутри текущего раздела.

## 6. Программная навигация и жизненные сценарии

- `navigation.navigate('Details', { id })` — переход к экрану (если уже в стеке — переиспользует).
- `navigation.push('Details', { id })` — всегда кладёт новый экземпляр в стек.
- `navigation.replace('Home')` — заменить текущий экран.
- `navigation.goBack()` — назад.
- `navigation.reset(...)` — сбросить стек (например, после логина).

Практика:
- После успешной аутентификации делайте `reset` на корневой стек приложения.
- Для «мастер → детали → поддетали» используйте `push`, чтобы сохранять историю.

## 7. Заголовок, жесты и безопасные зоны

- Управляйте заголовком через `options`: `title`, `headerRight`, `headerShown`.
- На iOS жест «свайп‑назад» включён по умолчанию; отключайте на критичных шагах (например, подтверждение платежа).
- Используйте `react-native-safe-area-context` для корректных отступов на iOS с «чёлкой» и Android с жестовой навигацией.

Пример мини‑кастомизации:

```tsx
<Stack.Screen
  name="Details"
  component={DetailsScreen}
  options={{
    title: 'Детали',
    headerBackTitleVisible: false,
  }}
/>
```

## 8. Deep linking: открытие экранов по URL/схемам

Deep linking позволяет открывать конкретные экраны из пуш‑уведомлений, e‑mail и браузера.

Шаги:
- Определите схему: `myapp://` и пути: `myapp://details/42`.
- Настройте `linking` у контейнера.

```ts
// src/app/linking.ts
export const linking = {
  prefixes: ['myapp://', 'https://myapp.example.com'],
  config: {
    screens: {
      Home: '',
      Details: 'details/:id',
    },
  },
}
```

```tsx
// navigation.tsx
<NavigationContainer linking={linking}>{/* ... */}</NavigationContainer>
```

Советы:
- Тестируйте на реальных устройствах: `npx uri-scheme open myapp://details/42 --ios | --android` (Expo поддерживает `npx expo start --tunnel`).
- Для веб‑версии (Expo for Web) добавляйте HTTPS‑префикс.

## 9. Сохранение состояния навигации

При перезапуске приложения удобно восстанавливать стек.

Подход:
- Подпишитесь на изменения состояния контейнера.
- Сериализуйте состояние в AsyncStorage.
- В `initialState` восстановите, когда готово.

Это улучшает UX при непредвиденном закрытии приложения.

## 10. Производительность и лучшие практики

- Длинные списки рендерите через `FlatList` в отдельных экранах, выносите тяжёлые компоненты по маршрутам лениво.
- Не храните большие объекты в параметрах навигации; передавайте идентификаторы и загружайте данные на целевом экране.
- Избегайте анонимных коллбэков в пропсах заголовка; мемоизируйте обработчики.
- Логически группируйте навигаторы по доменам: `AuthStack`, `AppTabs`, `SettingsStack`.

## 11. Частые ошибки

- Смешение «серверного» и «клиентского» состояния в параметрах маршрутов.
- Слишком глубокие вложенности навигаторов без необходимости.
- Отсутствие единого источника прав доступа (гварды) — решается обёрткой навигатора провайдерами авторизации.

## 12. Чек‑лист интеграции

- Установлены `@react-navigation/native`, `@react-navigation/native-stack`, `react-native-screens`, `react-native-safe-area-context`.
- Определён тип `ParamList` и он используется в навигаторах и экранах.
- Архитектура выбрана: табы, стеки, модальные.
- Заголовки и жесты настроены под сценарии.
- Deep linking сконфигурирован и протестирован.
- Состояние навигации восстанавливается при запуске (по необходимости).

## Итоги

React Navigation покрывает большинство сценариев мобильной навигации: от простого стека до сложной многоуровневой архитектуры с табами, модалками и deep linking. Стройте маршруты вокруг пользовательских задач, типизируйте параметры, разгружайте экраны и тестируйте навигацию на реальных устройствах — так вы получите предсказуемый UX и масштабируемую архитектуру.
