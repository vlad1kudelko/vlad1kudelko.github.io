+++
lang = "ru"
title = "React: основы компонентного подхода"
description = "Подробное руководство по React: компоненты, JSX, состояние, пропсы, жизненный цикл и лучшие практики разработки."
template = "posts"
thumb = "/imgs/2025/08/react-component-basics-guide.png"
publication_date = "2025-08-02"
+++

# React: основы компонентного подхода

> **Читайте также:**
> - [FastAPI: современный фреймворк для API](/posts/fastapi-modern-api-framework)
> - [Django: руководство по разработке](/posts/django-development-guide)
> - [Python Type Hints: типизация кода](/posts/python-type-hints-typing-guide)

**React** — это JavaScript библиотека для создания пользовательских интерфейсов, разработанная Facebook (ныне Meta). React основан на компонентном подходе, где интерфейс разбивается на независимые, переиспользуемые компоненты. Это позволяет создавать сложные приложения из простых, изолированных частей, что значительно упрощает разработку, тестирование и поддержку кода.

## 1. Что такое React и зачем он нужен?

React решает несколько ключевых проблем современной веб-разработки:

- **Компонентный подход** — интерфейс разбивается на независимые, переиспользуемые блоки
- **Виртуальный DOM** — эффективное обновление только изменённых частей интерфейса
- **Односторонний поток данных** — предсказуемое поведение приложения
- **Богатая экосистема** — огромное количество библиотек и инструментов
- **Кроссплатформенность** — React Native для мобильных приложений

React особенно эффективен для создания динамических, интерактивных веб-приложений с большим количеством обновляемых данных.

## 2. Первые шаги с React

### Установка и настройка

Создание нового React проекта с помощью Create React App:

```bash
npx create-react-app my-react-app
cd my-react-app
npm start
```

Или с использованием Vite (более быстрый инструмент):

```bash
npm create vite@latest my-react-app -- --template react
cd my-react-app
npm install
npm run dev
```

### Структура проекта

```
my-react-app/
├── public/
│   ├── index.html
│   └── favicon.ico
├── src/
│   ├── App.js
│   ├── index.js
│   └── components/
├── package.json
└── README.md
```

## 3. Основы JSX

JSX (JavaScript XML) — это синтаксическое расширение JavaScript, которое позволяет писать HTML-подобный код прямо в JavaScript:

```jsx
// Простой JSX элемент
const element = <h1>Привет, мир!</h1>;

// JSX с атрибутами
const element = <div className="container">Содержимое</div>;

// JSX с вложенными элементами
const element = (
  <div>
    <h1>Заголовок</h1>
    <p>Параграф текста</p>
  </div>
);

// JSX с JavaScript выражениями
const name = "Иван";
const element = <h1>Привет, {name}!</h1>;
```

**Важные моменты:**
- `className` вместо `class` (так как `class` — зарезервированное слово в JavaScript)
- Все атрибуты в camelCase (`onClick`, `backgroundColor`)
- JavaScript выражения заключаются в фигурные скобки `{}`

## 4. Функциональные компоненты

Функциональные компоненты — это самый простой способ создания React компонентов:

```jsx
// Простой функциональный компонент
function Greeting() {
  return <h1>Привет, мир!</h1>;
}

// Компонент с параметрами (пропсами)
function Greeting(props) {
  return <h1>Привет, {props.name}!</h1>;
}

// Использование деструктуризации
function Greeting({ name, age }) {
  return (
    <div>
      <h1>Привет, {name}!</h1>
      <p>Тебе {age} лет</p>
    </div>
  );
}

// Arrow function синтаксис
const Greeting = ({ name, age }) => {
  return (
    <div>
      <h1>Привет, {name}!</h1>
      <p>Тебе {age} лет</p>
    </div>
  );
};
```

## 5. Пропсы (Props)

Пропсы — это способ передачи данных от родительского компонента к дочернему:

```jsx
// Родительский компонент
function App() {
  return (
    <div>
      <Greeting name="Иван" age={25} />
      <Greeting name="Анна" age={30} />
    </div>
  );
}

// Дочерний компонент
function Greeting({ name, age, children }) {
  return (
    <div className="greeting">
      <h2>Привет, {name}!</h2>
      <p>Возраст: {age}</p>
      {children} {/* Дополнительное содержимое */}
    </div>
  );
}

// Использование с children
function App() {
  return (
    <Greeting name="Иван" age={25}>
      <p>Дополнительная информация</p>
    </Greeting>
  );
}
```

**Особенности пропсов:**
- Пропсы доступны только для чтения (неизменяемы)
- Можно передавать любые типы данных: строки, числа, объекты, функции
- `children` — специальный проп для передачи дочерних элементов

## 6. Состояние (State) с useState

Хук `useState` позволяет компонентам иметь внутреннее состояние:

```jsx
import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  
  return (
    <div>
      <p>Счётчик: {count}</p>
      <button onClick={() => setCount(count + 1)}>
        Увеличить
      </button>
      <button onClick={() => setCount(count - 1)}>
        Уменьшить
      </button>
    </div>
  );
}
```

**Синтаксис useState:**
```jsx
const [state, setState] = useState(initialValue);
```

- `state` — текущее значение состояния
- `setState` — функция для обновления состояния
- `initialValue` — начальное значение

### Примеры использования useState

```jsx
// Строка
const [name, setName] = useState('');

// Число
const [age, setAge] = useState(0);

// Булево значение
const [isVisible, setIsVisible] = useState(false);

// Массив
const [items, setItems] = useState([]);

// Объект
const [user, setUser] = useState({
  name: '',
  email: '',
  age: 0
});

// Обновление объекта
const updateUser = (field, value) => {
  setUser(prevUser => ({
    ...prevUser,
    [field]: value
  }));
};
```

## 7. Обработка событий

React использует camelCase для имен событий:

```jsx
function EventHandler() {
  const [text, setText] = useState('');
  
  const handleClick = () => {
    alert('Кнопка нажата!');
  };
  
  const handleChange = (event) => {
    setText(event.target.value);
  };
  
  const handleSubmit = (event) => {
    event.preventDefault();
    console.log('Форма отправлена:', text);
  };
  
  return (
    <div>
      <button onClick={handleClick}>
        Нажми меня
      </button>
      
      <input
        type="text"
        value={text}
        onChange={handleChange}
        placeholder="Введите текст"
      />
      
      <form onSubmit={handleSubmit}>
        <input type="text" value={text} onChange={handleChange} />
        <button type="submit">Отправить</button>
      </form>
    </div>
  );
}
```

## 8. Условный рендеринг

React позволяет условно отображать элементы:

```jsx
function ConditionalRendering({ isLoggedIn, user }) {
  return (
    <div>
      {/* Условный рендеринг с if/else */}
      {isLoggedIn ? (
        <div>
          <h1>Добро пожаловать, {user.name}!</h1>
          <button>Выйти</button>
        </div>
      ) : (
        <div>
          <h1>Пожалуйста, войдите</h1>
          <button>Войти</button>
        </div>
      )}
      
      {/* Условный рендеринг с && */}
      {isLoggedIn && <p>Вы авторизованы</p>}
      
      {/* Условный рендеринг с || */}
      {user.name || <p>Гость</p>}
    </div>
  );
}
```

## 9. Списки и ключи

Рендеринг списков в React:

```jsx
function TodoList() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Изучить React', completed: false },
    { id: 2, text: 'Создать проект', completed: true },
    { id: 3, text: 'Написать код', completed: false }
  ]);
  
  return (
    <ul>
      {todos.map(todo => (
        <li key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => toggleTodo(todo.id)}
          />
          <span style={{ 
            textDecoration: todo.completed ? 'line-through' : 'none' 
          }}>
            {todo.text}
          </span>
        </li>
      ))}
    </ul>
  );
  
  const toggleTodo = (id) => {
    setTodos(prevTodos =>
      prevTodos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };
}
```

**Важно:** Каждый элемент в списке должен иметь уникальный `key` для оптимизации рендеринга.

## 10. useEffect - побочные эффекты

Хук `useEffect` позволяет выполнять побочные эффекты в функциональных компонентах:

```jsx
import { useState, useEffect } from 'react';

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Выполняется после каждого рендера
  useEffect(() => {
    console.log('Компонент обновился');
  });
  
  // Выполняется только при монтировании компонента
  useEffect(() => {
    console.log('Компонент смонтирован');
  }, []);
  
  // Выполняется при изменении userId
  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/users/${userId}`);
        const userData = await response.json();
        setUser(userData);
      } catch (error) {
        console.error('Ошибка загрузки пользователя:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, [userId]); // Зависимость от userId
  
  // Очистка при размонтировании
  useEffect(() => {
    const timer = setInterval(() => {
      console.log('Таймер сработал');
    }, 1000);
    
    return () => {
      clearInterval(timer);
    };
  }, []);
  
  if (loading) return <div>Загрузка...</div>;
  if (!user) return <div>Пользователь не найден</div>;
  
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}
```

## 11. Лучшие практики

### Именование компонентов

```jsx
// ✅ Правильно - PascalCase
function UserProfile() { }
const UserList = () => { };

// ❌ Неправильно - camelCase
function userProfile() { }
const userList = () => { };
```

### Структура компонентов

```jsx
// Рекомендуемая структура
function ComponentName({ prop1, prop2 }) {
  // 1. Хуки состояния
  const [state, setState] = useState(initialValue);
  
  // 2. Побочные эффекты
  useEffect(() => {
    // эффекты
  }, []);
  
  // 3. Вспомогательные функции
  const handleClick = () => {
    // логика
  };
  
  // 4. Условный рендеринг
  if (condition) {
    return <div>Загрузка...</div>;
  }
  
  // 5. Основной JSX
  return (
    <div>
      {/* содержимое */}
    </div>
  );
}
```

### Разделение ответственности

```jsx
// ✅ Хорошо - компонент делает одну вещь
function UserCard({ user }) {
  return (
    <div className="user-card">
      <h3>{user.name}</h3>
      <p>{user.email}</p>
    </div>
  );
}

// ✅ Хорошо - отдельный компонент для списка
function UserList({ users }) {
  return (
    <div className="user-list">
      {users.map(user => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
```

## 12. Заключение

React предоставляет мощный и гибкий подход к созданию пользовательских интерфейсов. Компонентный подход делает код более модульным, переиспользуемым и легким в поддержке. Основные концепции React:

- **Компоненты** — строительные блоки интерфейса
- **JSX** — синтаксис для описания UI
- **Пропсы** — передача данных между компонентами
- **Состояние** — управление внутренними данными компонента
- **Хуки** — функциональный подход к состоянию и эффектам

Изучив эти основы, вы сможете создавать интерактивные веб-приложения с помощью React. Для дальнейшего изучения рекомендуется ознакомиться с:

- React Router для навигации
- Redux или Context API для управления состоянием
- React Testing Library для тестирования
- Next.js для серверного рендеринга

React продолжает развиваться и остаётся одной из самых популярных библиотек для создания пользовательских интерфейсов в современной веб-разработке. 