---
title: "Flutter 3.x: новые виджеты — Material 3 и адаптивность"
description: "Изучите нововведения Flutter 3.x: Material 3, адаптивные виджеты, улучшения. Создавайте кроссплатформенные приложения с нативным UI."
heroImage: "../../../../assets/imgs/2025/12/23-flutter-3x.webp"
pubDate: "2025-12-23"
---

# Flutter 3.x: кроссплатформенная разработка

Flutter — фреймворк от Google для кроссплатформенной разработки с нативной производительностью.

## Установка

```bash
# macOS
brew install flutter

# Проверка
flutter doctor
```

## Основы

### Widgets

```dart
import 'package:flutter/material.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter Demo',
      home: const HomePage(),
    );
  }
}
```

### Stateful vs Stateless

```dart
// Stateless - без состояния
class StatelessWidget extends StatelessWidget {
  const StatelessWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return const Text('Static');
  }
}

// Stateful - с состоянием
class StatefulWidget extends StatefulWidget {
  const StatefulWidget({super.key});

  @override
  State<StatefulWidget> createState() => _StatefulWidgetState();
}

class _StatefulWidgetState extends State<StatefulWidget> {
  int _counter = 0;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('$_counter'),
        ElevatedButton(
          onPressed: () => setState(() => _counter++),
          child: const Text('Increment'),
        ),
      ],
    );
  }
}
```

## Layout

```dart
// Column - вертикально
Column(
  children: [
    Text('Item 1'),
    Text('Item 2'),
  ],
)

// Row - горизонтально
Row(
  children: [
    Icon(Icons.star),
    Text('Text'),
  ],
)

// Stack - наложение
Stack(
  children: [
    Container(color: Colors.blue),
    const Text('Overlay'),
  ],
)

// List
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) => ListTile(
    title: Text(items[index]),
  ),
)
```

## Navigation

```dart
// Переход на новый экран
Navigator.push(
  context,
  MaterialPageRoute(builder: (context) => const DetailsScreen()),
);

// С именем
Navigator.pushNamed(context, '/details');
```

## State Management

### Provider

```dart
// ChangeNotifier
class CounterModel extends ChangeNotifier {
  int _count = 0;
  int get count => _count;
  
  void increment() {
    _count++;
    notifyListeners();
  }
}

// Provider
ChangeNotifierProvider(
  create: (_) => CounterModel(),
  child: MyApp(),
)

// Consumer
Consumer<CounterModel>(
  builder: (context, model, _) => Text('${model.count}'),
)
```

### Riverpod

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

final counterProvider = StateProvider<int>((ref) => 0);

class MyWidget extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(counterProvider);
    return Text('$count');
  }
}
```

## HTTP

```dart
import 'package:http/http.dart' as http;

final response = await http.get(Uri.parse('https://api.example.com/data'));
final data = jsonDecode(response.body);
```

## Material 3

**Темы:**
```dart
MaterialApp(
  theme: ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: Colors.blue,
      brightness: Brightness.light,
    ),
  ),
  darkTheme: ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: Colors.blue,
      brightness: Brightness.dark,
    ),
  ),
  themeMode: ThemeMode.system,
)
```

**Новые виджеты:**
- `NavigationBar` — замена BottomNavigationBar
- `NavigationRail` — для планшетов
- `FilledButton` — акцентные кнопки
- `SegmentedButton` — выбор из нескольких опций
- `DatePickerDialog` — обновлённый диалог дат

## Адаптивный UI

**LayoutBuilder:**
```dart
LayoutBuilder(
  builder: (context, constraints) {
    if (constraints.maxWidth < 600) {
      return MobileLayout();
    } else if (constraints.maxWidth < 1200) {
      return TabletLayout();
    } else {
      return DesktopLayout();
    }
  },
)
```

**MediaQuery:**
```dart
final size = MediaQuery.of(context).size;
final orientation = MediaQuery.of(context).orientation;

if (size.width > 1200) {
  // Desktop
} else if (orientation == Orientation.landscape) {
  // Tablet landscape
} else {
  // Mobile
}
```

## Анимации

**Implicit animations:**
```dart
AnimatedContainer(
  duration: const Duration(milliseconds: 300),
  width: _expanded ? 200 : 100,
  height: _expanded ? 200 : 100,
  color: _expanded ? Colors.blue : Colors.red,
)

AnimatedOpacity(
  opacity: _visible ? 1.0 : 0.0,
  duration: const Duration(milliseconds: 500),
  child: Text('Fade in/out'),
)
```

**Explicit animations:**
```dart
class _AnimatedWidgetState extends State<AnimatedWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );
    _animation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeInOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(
      scale: _animation,
      child: const Text('Animated'),
    );
  }
}
```

## Работа с API

**Dio:**
```dart
import 'package:dio/dio.dart';

final dio = Dio(BaseOptions(
  baseUrl: 'https://api.example.com',
  connectTimeout: const Duration(seconds: 5),
  receiveTimeout: const Duration(seconds: 3),
));

// Interceptors
dio.interceptors.add(InterceptorsWrapper(
  onRequest: (options, handler) {
    // Add auth token
    options.headers['Authorization'] = 'Bearer $token';
    return handler.next(options);
  },
  onError: (error, handler) {
    if (error.response?.statusCode == 401) {
      // Refresh token
    }
    return handler.next(error);
  },
));

// Использование
final response = await dio.get('/users');
final users = response.data;
```

## Локальное хранилище

**Hive:**
```dart
import 'package:hive/hive.dart';

// Инициализация
await Hive.initFlutter();
Hive.openBox('mybox');

// Запись
var box = Hive.box('mybox');
box.put('name', 'John');
box.put('age', 30);

// Чтение
var name = box.get('name');
var age = box.get('age');

// Типобезопасность
@HiveType(typeId: 0)
class User extends HiveObject {
  @HiveField(0)
  String name;

  @HiveField(1)
  int age;
}
```

## Тестирование

**Unit тесты:**
```dart
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('Counter increments', () {
    final counter = Counter();
    expect(counter.value, 0);
    counter.increment();
    expect(counter.value, 1);
  });
}
```

**Widget тесты:**
```dart
testWidgets('Counter increments smoke test', (tester) async {
  await tester.pumpWidget(const MyApp());
  
  expect(find.text('0'), findsOneWidget);
  await tester.tap(find.byIcon(Icons.add));
  await tester.pump();
  expect(find.text('1'), findsOneWidget);
});
```

**Integration тесты:**
```dart
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Full app test', (tester) async {
    await tester.pumpWidget(MyApp());
    // Тест на реальном устройстве
  });
}
```

## Производительность

**DevTools:**
- Widget inspector — анализ дерева виджетов
- Performance — профилирование FPS
- Memory — поиск утечек памяти
- Network — мониторинг запросов

**Оптимизация:**
- `const` конструкторы для неизменяемых виджетов
- `RepaintBoundary` для изоляции перерисовки
- `ListView.builder` для длинных списков
- Lazy loading изображений

## Публикация

```bash
# Версионирование
# pubspec.yaml: version: 1.0.0+1

# iOS
flutter build ipa --release

# Android
flutter build appbundle --release

# Web
flutter build web --release

# macOS
flutter build macos --release

# Windows
flutter build windows --release

# Linux
flutter build linux --release
```

## Популярные пакеты

- **provider** / **riverpod** — state management
- **dio** — HTTP клиент
- **hive** / **isar** — локальная БД
- **go_router** — роутинг
- **flutter_bloc** — BLoC паттерн
- **freezed** — code generation
- **json_serializable** — JSON сериализация
