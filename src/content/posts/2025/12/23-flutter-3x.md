---
title: "Flutter 3.x: кроссплатформенная разработка"
description: "Flutter 3.x — создание нативных приложений для iOS, Android, Web и Desktop с одного codebase"
heroImage: "../../../../assets/imgs/2025/12/23-flutter-3x.webp"
pubDate: "2025-12-23"
---

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

## Заключение

Flutter позволяет создавать красивые нативные приложения для всех платформ из одного codebase.