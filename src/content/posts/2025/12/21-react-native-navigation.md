---
title: "React Native: навигация 2025"
description: "Навигация в React Native с React Navigation: Stack, Tabs, Drawer и нативная анимация"
heroImage: "../../../../assets/imgs/2025/12/21-react-native-navigation.webp"
pubDate: "2025-12-21"
---

React Navigation — стандартная библиотека для навигации в React Native приложениях.

## Установка

```bash
npm install @react-navigation/native @react-navigation/native-stack
npm install @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
```

## Stack Navigator

```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ title: 'Главная' }}
        />
        <Stack.Screen 
          name="Details" 
          component={DetailsScreen}
          options={{ title: 'Детали' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function HomeScreen({ navigation }) {
  return (
    <Button 
      title="Открыть детали"
      onPress={() => navigation.navigate('Details', { id: 1 })}
    />
  );
}

function DetailsScreen({ route, navigation }) {
  const { id } = route.params;
  return <Text>ID: {id}</Text>;
}
```

## Передача параметров

```tsx
// TypeScript types
type RootStackParamList = {
  Home: undefined;
  Details: { id: number; name?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// navigation.navigate с typed params
navigation.navigate('Details', { id: 123 });
```

## Навигационные опции

```tsx
<Stack.Screen 
  name="Details"
  component={DetailsScreen}
  options={{
    title: 'Детали',
    headerStyle: { backgroundColor: '#f4511e' },
    headerTintColor: '#fff',
    headerTitleStyle: { fontWeight: 'bold' },
    animation: 'slide_from_right',
  }}
/>
```

## Bottom Tabs

```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

function App() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'home';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Settings') iconName = focused ? 'settings' : 'settings-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: 'tomato',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
```

## Drawer Navigator

```bash
npm install @react-navigation/drawer
```

```tsx
import { createDrawerNavigator } from '@react-navigation/drawer';

const Drawer = createDrawerNavigator();

function App() {
  return (
    <Drawer.Navigator>
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="Notifications" component={NotificationsScreen} />
    </Drawer.Navigator>
  );
}
```

## Вложенная навигация

```tsx
function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Auth" component={AuthStack} />
        <Stack.Screen name="Main" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
```

## Actions

```tsx
// Переход
navigation.navigate('Details');
navigation.push('Details');
navigation.replace('Details');

// Назад
navigation.goBack();
navigation.canGoBack();

// С параметрами
navigation.navigate('Details', { id: 1 });

// Pop to top
navigation.popToTop();
```

## Header

```tsx
// Программное управление header
useLayoutEffect(() => {
  navigation.setOptions({
    title: 'Новый заголовок',
    headerRight: () => (
      <Button onPress={onPress} title="Настройки" />
    ),
  });
}, [navigation]);
```

## Заключение

React Navigation предоставляет полный инструментарий для реализации навигации любой сложности в React Native.