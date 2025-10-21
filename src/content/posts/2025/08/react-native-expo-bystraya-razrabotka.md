---
title: "React Native + Expo: быстрая разработка"
description: "Самый быстрый путь к рабочему мобильному приложению: создание проекта на Expo, Expo Router, популярные модули, работа с API и состоянием, EAS Build и OTA‑обновления, советы по производительности и переходу на Bare."
heroImage: "../../../../assets/imgs/2025/08/react-native-expo-bystraya-razrabotka.webp"
pubDate: "2025-08-19"
---

# React Native + Expo: быстрая разработка

Expo — это слой инструментов и сервисов вокруг React Native, который позволяет стартовать и двигаться значительно быстрее: меньше нативной настройки, больше готовых модулей, стабильная среда разработки и облачные сборки. В этой статье — практический, «быстрый» маршрут: от создания проекта до публикации сборок, с фокусом на типичных задачах MVP.

## 1. Почему Expo ускоряет

- Быстрый старт без нативной конфигурации (iOS/Android не нужны для первого запуска).
- Готовые модули: камера, уведомления, безопасное хранилище, обновления «по воздуху» и многое другое.
- Облачные сборки через EAS Build — без локальной установки Xcode/Android SDK.
- Консистентная DX: Expo Dev Tools, логирование, туннели, профилирование.
- Возможность «сойти» на Bare Workflow, если понадобится полный натив.

Практическое правило: начните с Expo. Если позже потребуется глубокая нативная интеграция — мигрируйте на Bare.

## 2. Создание проекта

```bash
npm create expo@latest myapp
cd myapp
npm run start
```

Откройте Expo Dev Tools в браузере. Запустите приложение в Expo Go на устройстве (QR‑код) или в эмуляторе Android/симуляторе iOS.

## 3. Expo Router: быстрее, чем вручную настраивать навигацию

Expo Router использует файловую систему для маршрутов — минимум кода, максимум скорости.

```bash
npm i expo-router react-native-safe-area-context react-native-screens
```

Затем включите Router в `app/_layout.tsx`:

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Главная' }} />
        <Stack.Screen name="details" options={{ title: 'Детали' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
```

Создайте страницы `app/index.tsx` и `app/details.tsx`:

```tsx
// app/index.tsx
import { Link } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Expo: быстрый старт</Text>
      <Link href="/details?id=42">Перейти к деталям</Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 8 }
});
```

```tsx
// app/details.tsx
import { useLocalSearchParams } from 'expo-router';
import { View, Text } from 'react-native';

export default function Details() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text>Детали элемента: {id}</Text>
    </View>
  );
}
```

Преимущества:
- Маршруты соответствуют файлам в `app/`.
- Готовая поддержка стеков, табов, модалок.
- Глубокие ссылки и параметры из коробки.

## 4. UI и стили: базовый экран

```tsx
// components/Hello.tsx
import { View, Text, StyleSheet } from 'react-native';

export function Hello({ name }: { name: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Привет, {name}!</Text>
      <Text>Expo + RN позволяют очень быстро собрать MVP.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 8 }
});
```

Используйте компонент на странице:

```tsx
// app/index.tsx (фрагмент)
import { Hello } from '../components/Hello';
// ...
<Hello name="мир" />
```

## 5. Работа со списком и API

```tsx
// app/posts.tsx
import { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';

type Post = { id: number; title: string };

export default function Posts() {
  const [data, setData] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('https://jsonplaceholder.typicode.com/posts?_limit=20');
        const json = (await res.json()) as Post[];
        setData(json);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 24 }} />;

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
  );
}
```

Советы:
- Для реальных API добавьте обработку ошибок, кэш и «pull‑to‑refresh».
- Для серверного состояния рассмотрите TanStack Query или RTK Query.

## 6. Популярные модули Expo

- Безопасное хранилище: `expo-secure-store` — храните токены безопасно.
- Камера/медиа: `expo-camera`, `expo-image-picker`.
- Уведомления: `expo-notifications`.
- Обновления «по воздуху»: `expo-updates`.
- Биометрия: `expo-local-authentication`.

Пример безопасного хранилища:

```bash
npm i expo-secure-store
```

```ts
// lib/secure.ts
import * as SecureStore from 'expo-secure-store';

export async function saveToken(token: string) {
  await SecureStore.setItemAsync('auth:token', token);
}

export async function loadToken() {
  return SecureStore.getItemAsync('auth:token');
}
```

## 7. Типизация с TypeScript

```bash
npm i -D typescript @types/react @types/react-native
```

Добавьте `tsconfig.json` и используйте `.ts`/`.tsx`. Типизируйте параметры роутера (`useLocalSearchParams<...>()`), пропсы компонентов и ответы API — это снижает число скрытых ошибок.

## 8. Производительность и размер бандла

- Избегайте лишних ре‑рендеров: мемоизация компонентов/селекторов, вынос коллбэков.
- Используйте `FlatList`/`SectionList` для больших списков.
- Отложенная загрузка экранов (файловая маршрутизация делает это естественным).
- Следите за размером ассетов: оптимизируйте изображения, используйте `.webp`.

## 9. Сборка и публикация через EAS

```bash
npm i -g eas-cli
npx expo login
npx eas build:configure
# Android
npx eas build -p android --profile preview
# iOS
npx eas build -p ios --profile preview
```

- Профили сборки настраиваются в `eas.json`.
- Ссылки на сборки доступны в кабинете Expo — удобно для QA/стейкхолдеров.

OTA‑обновления (без публикации в сторах):

```bash
npx expo publish
```

Учитывайте правила магазинов: OTA предназначены для JS‑изменений, не для добавления новых нативных модулей.

## 10. Когда Bare Workflow

- Нужны кастомные нативные SDK/модули, отсутствующие в Expo.
- Гранулярная настройка Gradle/Xcode, специфические плагины.
- Необходимо подключить библиотеки, несовместимые с Managed Workflow.

Миграция выполнима в любой момент, но планируйте её под релизное окно.

## 11. Частые ошибки и как их избежать

- Слишком ранний уход с Expo: потеряете скорость. Начните с Managed и измерьте, чего реально не хватает.
- Хранение секретов в AsyncStorage: используйте `expo-secure-store`.
- Отсутствие стратегий кэша/ошибок для API: внедрите TanStack Query/RTK Query.
- Игнорирование производительности списков: без `FlatList` UI начнёт «задыхаться».

## Итоги

Expo + React Native — самый быстрый путь к работающему мобильному приложению: файловая маршрутизация через Expo Router, набор готовых модулей, облачные сборки EAS и OTA‑обновления. Начните с Managed Workflow, добавьте типизацию и базовую архитектуру, а при росте требований переходите на Bare.
