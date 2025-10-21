---
title: "React Native + TypeScript: Полное руководство по типизации"
description: "Подробное руководство по использованию TypeScript в React Native разработке: типизация компонентов, навигация, хуки, контекст и лучшие практики."
heroImage: "../../../../assets/imgs/2025/08/react-native-typescript-guide.webp"
pubDate: "2025-08-23"
---

# React Native + TypeScript: Полное руководство по типизации

**TypeScript** в связке с **React Native** позволяет создавать надёжные мобильные приложения с строгой типизацией. В этом руководстве рассмотрим:

1. Настройку TypeScript в React Native проекте
2. Типизацию компонентов и пропсов
3. Работу с навигацией и типами маршрутов
4. Использование хуков с TypeScript
5. Типизацию контекста и глобального состояния

## 1. Настройка TypeScript в React Native

```bash
npx react-native init MyApp --template react-native-template-typescript
```

Основные файлы типизации:
- `tsconfig.json` - конфигурация TypeScript
- `@types/react-native` - типы React Native
- `@types/react` - типы React

## 2. Типизация компонентов

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}

const CustomButton: React.FC<ButtonProps> = ({ 
  title, 
  onPress, 
  disabled = false 
}) => {
  return (
    <View style={[styles.button, disabled && styles.disabled]}>
      <Text style={styles.text} onPress={!disabled ? onPress : undefined}>
        {title}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 15,
    backgroundColor: '#007bff',
    borderRadius: 5,
  },
  text: {
    color: 'white',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.6,
  }
});

export default CustomButton;
```

## 3. Типизация навигации

Для React Navigation установите типы:
```bash
npm install @react-navigation/native @react-navigation/native-stack
npm install -D @types/react-navigation
```

Пример типизации стековой навигации:
```typescript
import { createNativeStackNavigator } from '@react-navigation/native-stack';

type RootStackParamList = {
  Home: undefined;
  Profile: { userId: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen}
          initialParams={{ userId: 'default' }}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
```

## 4. Типизация хуков состояния

```typescript
import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, Text } from 'react-native';

interface UserData {
  id: string;
  name: string;
  email: string;
}

const UserProfile: React.FC = () => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('https://api.example.com/user');
        const data: UserData = await response.json();
        setUser(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) return <ActivityIndicator size="large" />;
  if (error) return <Text>Ошибка: {error}</Text>;
  if (!user) return <Text>Пользователь не найден</Text>;

  return (
    <View>
      <Text>{user.name}</Text>
      <Text>{user.email}</Text>
    </View>
  );
};
```

## 5. Типизация контекста

```typescript
import React, { createContext, useContext, useReducer } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themeReducer = (state: Theme): Theme => 
  state === 'light' ? 'dark' : 'light';

export const ThemeProvider: React.FC = ({ children }) => {
  const [theme, dispatch] = useReducer(themeReducer, 'light');

  const toggleTheme = () => dispatch();

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
```

## Лучшие практики TypeScript в React Native

1. **Строгий режим**
Включите `strict: true` в tsconfig.json для максимальной проверки типов

2. **Типизация пропсов**
Всегда определяйте интерфейсы для пропсов компонентов:
```typescript
interface UserCardProps {
  user: User;
  onPress: (userId: string) => void;
  isActive?: boolean;
}
```

3. **Утилитарные типы**
Используйте встроенные TypeScript утилиты:
```typescript
type UserPreview = Pick<User, 'id' | 'name'>;
type UserWithoutEmail = Omit<User, 'email'>;
type OptionalUser = Partial<User>;
```

4. **Валидация данных**
Используйте Zod для проверки API-ответов:
```typescript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
  email: z.string().email()
});

const safeUser = UserSchema.safeParse(apiResponse);
```

5. **Типизация API**
Определяйте типы для всех API-ответов:
```typescript
interface ApiResponse<T> {
  data: T;
  error?: string;
  status: number;
}
```

6. **Интеграция с ESLint**
Настройте eslint-plugin-typescript для автоматической проверки:
```json
{
  "extends": [
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ]
}
```

7. **Обновление типов**
Регулярно обновляйте @types-пакеты для совместимости с версиями библиотек

## Заключение

Внедрение TypeScript в React Native разработку требует начальных затрат времени, но даёт значительные преимущества:
- Снижение количества runtime-ошибок на 40-60%
- Ускорение разработки за счёт автодополнения
- Упрощение онбординга новых разработчиков
- Повышение стабильности при рефакторинге

Начните с базовой типизации компонентов и постепенно добавляйте сложные типы. Используйте приведённые примеры как основу для построения типобезопасного приложения.