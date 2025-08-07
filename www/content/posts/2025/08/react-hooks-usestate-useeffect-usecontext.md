+++
lang = "ru"
title = "React Hooks: useState, useEffect, useContext"
description = "Подробное руководство по React Hooks: useState для управления состоянием, useEffect для побочных эффектов, useContext для контекста и лучшие практики использования."
template = "posts"
thumb = "/imgs/2025/08/react-hooks-usestate-useeffect-usecontext.avif"
publication_date = "2025-08-03"
+++

# React Hooks: useState, useEffect, useContext

**React Hooks** — это функции, которые позволяют использовать состояние и другие возможности React в функциональных компонентах. Hooks были представлены в React 16.8 и стали революционным изменением в подходе к разработке React приложений. Они позволяют писать более чистый, читаемый код и избегать сложностей, связанных с классовыми компонентами. В этой статье рассмотрим три основных хука: `useState`, `useEffect` и `useContext`.

## 1. Введение в React Hooks

### Что такое Hooks?

Hooks — это функции, которые позволяют "подключаться" к состоянию и жизненному циклу React из функциональных компонентов. Они не работают внутри классов — вместо этого они дают возможность использовать React без классов.

**Основные правила Hooks:**
- Вызывайте Hooks только на верхнем уровне (не внутри циклов, условий или вложенных функций)
- Вызывайте Hooks только из React функциональных компонентов или кастомных Hooks
- Имена Hooks всегда начинаются с `use`

### Преимущества Hooks

- **Более простой код** — нет необходимости в `this` и привязке методов
- **Лучшая читаемость** — логика разделяется по функциональности, а не по жизненному циклу
- **Переиспользование логики** — кастомные Hooks для общей логики
- **Меньше boilerplate кода** — нет необходимости в конструкторах и методах жизненного цикла

## 2. useState — управление состоянием

### Основы useState

`useState` — это хук для добавления состояния в функциональные компоненты:

```jsx
import React, { useState } from 'react';

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
- `initialValue` — начальное значение состояния

### Работа с объектами и массивами

```jsx
import React, { useState } from 'react';

function UserForm() {
  const [user, setUser] = useState({
    name: '',
    email: '',
    age: 0
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser(prevUser => ({
      ...prevUser,
      [name]: value
    }));
  };

  return (
    <form>
      <input
        type="text"
        name="name"
        value={user.name}
        onChange={handleChange}
        placeholder="Имя"
      />
      <input
        type="email"
        name="email"
        value={user.email}
        onChange={handleChange}
        placeholder="Email"
      />
      <input
        type="number"
        name="age"
        value={user.age}
        onChange={handleChange}
        placeholder="Возраст"
      />
    </form>
  );
}
```

### Работа с массивами

```jsx
import React, { useState } from 'react';

function TodoList() {
  const [todos, setTodos] = useState([]);
  const [inputValue, setInputValue] = useState('');

  const addTodo = () => {
    if (inputValue.trim()) {
      setTodos(prevTodos => [...prevTodos, {
        id: Date.now(),
        text: inputValue,
        completed: false
      }]);
      setInputValue('');
    }
  };

  const toggleTodo = (id) => {
    setTodos(prevTodos =>
      prevTodos.map(todo =>
        todo.id === id
          ? { ...todo, completed: !todo.completed }
          : todo
      )
    );
  };

  const deleteTodo = (id) => {
    setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
  };

  return (
    <div>
      <div>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Новая задача"
        />
        <button onClick={addTodo}>Добавить</button>
      </div>
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
            <button onClick={() => deleteTodo(todo.id)}>Удалить</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Функциональные обновления

Когда новое состояние зависит от предыдущего, используйте функциональную форму:

```jsx
// ❌ Неправильно — может привести к race conditions
setCount(count + 1);

// ✅ Правильно — гарантирует актуальное значение
setCount(prevCount => prevCount + 1);
```

## 3. useEffect — побочные эффекты

### Основы useEffect

`useEffect` позволяет выполнять побочные эффекты в функциональных компонентах:

```jsx
import React, { useState, useEffect } from 'react';

function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
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
  }, [userId]); // Зависимости

  if (loading) return <div>Загрузка...</div>;
  if (!user) return <div>Пользователь не найден</div>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>Email: {user.email}</p>
    </div>
  );
}
```

### Массив зависимостей

```jsx
// Выполняется после каждого рендера
useEffect(() => {
  console.log('Компонент обновился');
});

// Выполняется только при монтировании (аналог componentDidMount)
useEffect(() => {
  console.log('Компонент смонтирован');
}, []);

// Выполняется при изменении count (аналог componentDidUpdate)
useEffect(() => {
  console.log('Count изменился:', count);
}, [count]);

// Выполняется при изменении count или name
useEffect(() => {
  console.log('Count или name изменились:', count, name);
}, [count, name]);
```

### Очистка эффектов

```jsx
import React, { useState, useEffect } from 'react';

function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(prevSeconds => prevSeconds + 1);
    }, 1000);

    // Функция очистки (аналог componentWillUnmount)
    return () => {
      clearInterval(interval);
    };
  }, []);

  return <div>Прошло секунд: {seconds}</div>;
}
```

### Работа с подписками

```jsx
import React, { useState, useEffect } from 'react';

function ChatComponent() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Подписка на WebSocket
    const socket = new WebSocket('ws://localhost:8080');
    
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages(prevMessages => [...prevMessages, message]);
    };

    // Очистка подписки
    return () => {
      socket.close();
    };
  }, []);

  return (
    <div>
      {messages.map((message, index) => (
        <div key={index}>{message.text}</div>
      ))}
    </div>
  );
}
```

### Множественные useEffect

```jsx
import React, { useState, useEffect } from 'react';

function UserDashboard({ userId }) {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Эффект для загрузки пользователя
  useEffect(() => {
    const fetchUser = async () => {
      const response = await fetch(`/api/users/${userId}`);
      const userData = await response.json();
      setUser(userData);
    };
    fetchUser();
  }, [userId]);

  // Эффект для загрузки постов
  useEffect(() => {
    const fetchPosts = async () => {
      const response = await fetch(`/api/users/${userId}/posts`);
      const postsData = await response.json();
      setPosts(postsData);
      setLoading(false);
    };
    fetchPosts();
  }, [userId]);

  if (loading) return <div>Загрузка...</div>;

  return (
    <div>
      <h1>{user?.name}</h1>
      <div>
        {posts.map(post => (
          <div key={post.id}>
            <h3>{post.title}</h3>
            <p>{post.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## 4. useContext — контекст

### Основы Context API

`useContext` позволяет потреблять данные из React Context без необходимости передавать пропсы через каждый уровень компонентов:

```jsx
import React, { createContext, useContext, useState } from 'react';

// Создание контекста
const ThemeContext = createContext();
const UserContext = createContext();

// Провайдер контекста
function App() {
  const [theme, setTheme] = useState('light');
  const [user, setUser] = useState({ name: 'Иван', role: 'user' });

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <UserContext.Provider value={{ user, setUser }}>
        <Header />
        <MainContent />
        <Footer />
      </UserContext.Provider>
    </ThemeContext.Provider>
  );
}

// Компонент, использующий контекст
function Header() {
  const { theme, setTheme } = useContext(ThemeContext);
  const { user } = useContext(UserContext);

  return (
    <header style={{
      backgroundColor: theme === 'light' ? '#fff' : '#333',
      color: theme === 'light' ? '#333' : '#fff'
    }}>
      <h1>Добро пожаловать, {user.name}!</h1>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Переключить тему
      </button>
    </header>
  );
}
```

### Создание кастомного контекста

```jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

// Создание контекста для аутентификации
const AuthContext = createContext();

// Кастомный хук для использования аутентификации
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
}

// Провайдер аутентификации
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Проверка токена в localStorage
    const token = localStorage.getItem('authToken');
    if (token) {
      // Валидация токена на сервере
      validateToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, error: data.message };
      }
    } catch (error) {
      return { success: false, error: 'Ошибка сети' };
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const validateToken = async (token) => {
    try {
      const response = await fetch('/api/auth/validate', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        localStorage.removeItem('authToken');
      }
    } catch (error) {
      localStorage.removeItem('authToken');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Компонент входа
function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    if (!result.success) {
      alert(result.error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Пароль"
      />
      <button type="submit">Войти</button>
    </form>
  );
}

// Защищённый компонент
function ProtectedComponent() {
  const { user, logout } = useAuth();

  return (
    <div>
      <h2>Добро пожаловать, {user.name}!</h2>
      <button onClick={logout}>Выйти</button>
    </div>
  );
}
```

### Контекст для темы

```jsx
import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme должен использоваться внутри ThemeProvider');
  }
  return context;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const themeStyles = {
    light: {
      backgroundColor: '#ffffff',
      color: '#333333',
      primaryColor: '#007bff',
      secondaryColor: '#6c757d'
    },
    dark: {
      backgroundColor: '#1a1a1a',
      color: '#ffffff',
      primaryColor: '#4dabf7',
      secondaryColor: '#adb5bd'
    }
  };

  const value = {
    theme,
    toggleTheme,
    styles: themeStyles[theme]
  };

  return (
    <ThemeContext.Provider value={value}>
      <div style={{
        backgroundColor: value.styles.backgroundColor,
        color: value.styles.color,
        minHeight: '100vh'
      }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

// Компонент с темой
function ThemedComponent() {
  const { theme, toggleTheme, styles } = useTheme();

  return (
    <div>
      <h1 style={{ color: styles.primaryColor }}>
        Текущая тема: {theme}
      </h1>
      <button 
        onClick={toggleTheme}
        style={{
          backgroundColor: styles.primaryColor,
          color: '#ffffff',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Переключить тему
      </button>
    </div>
  );
}
```

## 5. Лучшие практики использования Hooks

### Правила Hooks

```jsx
// ❌ Неправильно — хук в условии
function Component({ condition }) {
  if (condition) {
    const [state, setState] = useState(0);
  }
  return <div>...</div>;
}

// ✅ Правильно — хук всегда вызывается
function Component({ condition }) {
  const [state, setState] = useState(0);
  
  if (condition) {
    // Логика для условия
  }
  
  return <div>...</div>;
}
```

### Кастомные Hooks

```jsx
import { useState, useEffect } from 'react';

// Кастомный хук для загрузки данных
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, loading, error };
}

// Кастомный хук для localStorage
function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}

// Кастомный хук для debounce
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Использование кастомных хуков
function UserProfile({ userId }) {
  const { data: user, loading, error } = useFetch(`/api/users/${userId}`);
  const [theme, setTheme] = useLocalStorage('theme', 'light');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Поиск..."
      />
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Тема: {theme}
      </button>
    </div>
  );
}
```

### Оптимизация производительности

```jsx
import React, { useState, useCallback, useMemo } from 'react';

function ExpensiveComponent({ items }) {
  const [filter, setFilter] = useState('');

  // Мемоизация вычислений
  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.name.toLowerCase().includes(filter.toLowerCase())
    );
  }, [items, filter]);

  // Мемоизация функций
  const handleItemClick = useCallback((itemId) => {
    console.log('Клик по элементу:', itemId);
  }, []);

  return (
    <div>
      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Фильтр..."
      />
      <ul>
        {filteredItems.map(item => (
          <li key={item.id} onClick={() => handleItemClick(item.id)}>
            {item.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## 6. Типизация с TypeScript

```tsx
import React, { useState, useEffect, useContext, createContext } from 'react';

// Типы для контекста
interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

// Создание типизированного контекста
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Типизированный кастомный хук
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
}

// Типизированный кастомный хук для загрузки данных
function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result: T = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url]);

  return { data, loading, error };
}

// Типизированный компонент
interface UserProfileProps {
  userId: number;
}

function UserProfile({ userId }: UserProfileProps) {
  const { data: user, loading, error } = useFetch<User>(`/api/users/${userId}`);

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;
  if (!user) return <div>Пользователь не найден</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <p>Email: {user.email}</p>
    </div>
  );
}
```

## Заключение

React Hooks предоставляют мощный и элегантный способ работы с состоянием и побочными эффектами в функциональных компонентах. `useState` позволяет управлять локальным состоянием, `useEffect` — выполнять побочные эффекты, а `useContext` — потреблять данные из контекста приложения.

**Ключевые преимущества Hooks:**
- Более простой и читаемый код
- Лучшая композиция логики
- Переиспользование состояния между компонентами
- Более предсказуемое поведение
- Лучшая поддержка TypeScript

При использовании Hooks важно следовать правилам их использования и применять лучшие практики для оптимизации производительности. Кастомные Hooks позволяют инкапсулировать и переиспользовать логику между компонентами, что делает код более модульным и поддерживаемым. 