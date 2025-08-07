+++
lang = "ru"
title = "React + Redux Toolkit: управление состоянием"
description = "Подробное руководство по использованию Redux Toolkit с React для эффективного управления состоянием приложения. Создание store, slices, actions и лучшие практики."
template = "posts"
thumb = "/imgs/2025/08/react-redux-toolkit-state-management.jpg"
publication_date = "2025-08-05"
+++

# React + Redux Toolkit: управление состоянием

**Redux Toolkit** — это официальный, рекомендуемый способ написания Redux логики. Он был создан для решения трех основных проблем с Redux: слишком сложная настройка store, необходимость добавления множества пакетов для эффективной работы и слишком много boilerplate кода. В этой статье рассмотрим, как использовать Redux Toolkit с React для эффективного управления состоянием приложения.

## 1. Введение в Redux Toolkit

### Что такое Redux Toolkit?

Redux Toolkit (RTK) — это набор инструментов для эффективной работы с Redux. Он включает в себя:

- **configureStore()** — упрощенная настройка store с хорошими настройками по умолчанию
- **createSlice()** — генерация action creators и action types на основе reducer функций
- **createAsyncThunk** — обработка асинхронных операций
- **createEntityAdapter** — нормализованное управление данными
- **Immer** — иммутабельные обновления с мутабельным синтаксисом

### Преимущества Redux Toolkit

- **Меньше boilerplate кода** — автоматическая генерация action creators
- **Встроенная поддержка Immer** — упрощение иммутабельных обновлений
- **DevTools по умолчанию** — встроенная поддержка Redux DevTools
- **TypeScript поддержка** — отличная типизация из коробки
- **Стандартизированный подход** — официальные рекомендации по структуре

## 2. Установка и настройка

### Установка пакетов

```bash
npm install @reduxjs/toolkit react-redux
# или
yarn add @reduxjs/toolkit react-redux
```

### Создание store

```jsx
// src/store/index.js
import { configureStore } from '@reduxjs/toolkit';
import counterReducer from './slices/counterSlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    counter: counterReducer,
    user: userReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Подключение к React приложению

```jsx
// src/index.js
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
);
```

## 3. Создание Slice

### Основы createSlice

`createSlice` — это функция, которая автоматически генерирует action creators и action types на основе reducer функций:

```jsx
// src/store/slices/counterSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  value: 0,
  status: 'idle',
};

const counterSlice = createSlice({
  name: 'counter',
  initialState,
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action) => {
      state.value += action.payload;
    },
    reset: (state) => {
      state.value = 0;
    },
  },
});

export const { increment, decrement, incrementByAmount, reset } = counterSlice.actions;
export default counterSlice.reducer;
```

### Работа с объектами и вложенными данными

```jsx
// src/store/slices/userSlice.js
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
      state.isAuthenticated = !!action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
  },
});

export const { setUser, setLoading, setError, logout } = userSlice.actions;
export default userSlice.reducer;
```

## 4. Использование в компонентах

### Хуки для работы с Redux

Redux Toolkit работает с теми же хуками, что и обычный Redux:

```jsx
// src/components/Counter.jsx
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { increment, decrement, incrementByAmount, reset } from '../store/slices/counterSlice';

function Counter() {
  const count = useSelector((state) => state.counter.value);
  const dispatch = useDispatch();

  return (
    <div>
      <h2>Счётчик: {count}</h2>
      <button onClick={() => dispatch(increment())}>
        Увеличить
      </button>
      <button onClick={() => dispatch(decrement())}>
        Уменьшить
      </button>
      <button onClick={() => dispatch(incrementByAmount(5))}>
        Увеличить на 5
      </button>
      <button onClick={() => dispatch(reset())}>
        Сбросить
      </button>
    </div>
  );
}

export default Counter;
```

### Типизированные хуки (TypeScript)

```tsx
// src/hooks/redux.ts
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '../store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

```tsx
// src/components/UserProfile.tsx
import React from 'react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { setUser, logout } from '../store/slices/userSlice';

function UserProfile() {
  const { user, isAuthenticated, loading } = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();

  const handleLogin = () => {
    dispatch(setUser({ id: 1, name: 'Иван', email: 'ivan@example.com' }));
  };

  const handleLogout = () => {
    dispatch(logout());
  };

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <h2>Привет, {user?.name}!</h2>
          <p>Email: {user?.email}</p>
          <button onClick={handleLogout}>Выйти</button>
        </div>
      ) : (
        <div>
          <h2>Не авторизован</h2>
          <button onClick={handleLogin}>Войти</button>
        </div>
      )}
    </div>
  );
}

export default UserProfile;
```

## 5. Асинхронные операции с createAsyncThunk

### Создание асинхронных thunks

```jsx
// src/store/slices/postsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

// Создание асинхронного thunk
export const fetchPosts = createAsyncThunk(
  'posts/fetchPosts',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/posts');
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const createPost = createAsyncThunk(
  'posts/createPost',
  async (postData, { rejectWithValue }) => {
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState = {
  posts: [],
  loading: false,
  error: null,
};

const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchPosts
      .addCase(fetchPosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.loading = false;
        state.posts = action.payload;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // createPost
      .addCase(createPost.fulfilled, (state, action) => {
        state.posts.unshift(action.payload);
      });
  },
});

export const { clearError } = postsSlice.actions;
export default postsSlice.reducer;
```

### Использование в компонентах

```jsx
// src/components/PostsList.jsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchPosts, createPost } from '../store/slices/postsSlice';

function PostsList() {
  const { posts, loading, error } = useSelector((state) => state.posts);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchPosts());
  }, [dispatch]);

  const handleCreatePost = () => {
    const newPost = {
      title: 'Новый пост',
      body: 'Содержание нового поста',
      userId: 1,
    };
    dispatch(createPost(newPost));
  };

  if (loading) {
    return <div>Загрузка постов...</div>;
  }

  if (error) {
    return <div>Ошибка: {error}</div>;
  }

  return (
    <div>
      <h2>Список постов</h2>
      <button onClick={handleCreatePost}>Создать пост</button>
      <ul>
        {posts.map((post) => (
          <li key={post.id}>
            <h3>{post.title}</h3>
            <p>{post.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PostsList;
```

## 6. Нормализация данных с createEntityAdapter

### Создание адаптера для сущностей

```jsx
// src/store/slices/usersSlice.js
import { createSlice, createAsyncThunk, createEntityAdapter } from '@reduxjs/toolkit';

const usersAdapter = createEntityAdapter({
  selectId: (user) => user.id,
  sortComparer: (a, b) => a.name.localeCompare(b.name),
});

export const fetchUsers = createAsyncThunk(
  'users/fetchUsers',
  async () => {
    const response = await fetch('https://jsonplaceholder.typicode.com/users');
    return response.json();
  }
);

const initialState = usersAdapter.getInitialState({
  loading: false,
  error: null,
});

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    addUser: usersAdapter.addOne,
    updateUser: usersAdapter.updateOne,
    removeUser: usersAdapter.removeOne,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        usersAdapter.setAll(state, action.payload);
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  },
});

export const { addUser, updateUser, removeUser } = usersSlice.actions;
export default usersSlice.reducer;

// Селекторы
export const {
  selectAll: selectAllUsers,
  selectById: selectUserById,
  selectIds: selectUserIds,
} = usersAdapter.getSelectors((state) => state.users);
```

### Использование в компонентах

```jsx
// src/components/UsersList.jsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchUsers, selectAllUsers } from '../store/slices/usersSlice';

function UsersList() {
  const users = useSelector(selectAllUsers);
  const { loading, error } = useSelector((state) => state.users);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  if (loading) {
    return <div>Загрузка пользователей...</div>;
  }

  if (error) {
    return <div>Ошибка: {error}</div>;
  }

  return (
    <div>
      <h2>Список пользователей</h2>
      <ul>
        {users.map((user) => (
          <li key={user.id}>
            <h3>{user.name}</h3>
            <p>Email: {user.email}</p>
            <p>Город: {user.address.city}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default UsersList;
```

## 7. Лучшие практики

### Структура проекта

```
src/
├── store/
│   ├── index.js          # Конфигурация store
│   └── slices/
│       ├── counterSlice.js
│       ├── userSlice.js
│       ├── postsSlice.js
│       └── usersSlice.js
├── components/
│   ├── Counter.jsx
│   ├── UserProfile.jsx
│   ├── PostsList.jsx
│   └── UsersList.jsx
├── hooks/
│   └── redux.ts         # Типизированные хуки
└── App.jsx
```

### Правила именования

- **Slice файлы**: `featureSlice.js` (например, `userSlice.js`)
- **Action creators**: camelCase (например, `increment`, `fetchUsers`)
- **State свойства**: camelCase (например, `isLoading`, `userData`)
- **Селекторы**: `select` + название (например, `selectUser`, `selectAllPosts`)

### Оптимизация производительности

```jsx
// Используйте мемоизированные селекторы
import { createSelector } from '@reduxjs/toolkit';

const selectUserState = (state) => state.user;

export const selectUserById = createSelector(
  [selectUserState, (state, userId) => userId],
  (userState, userId) => userState.users[userId]
);

// В компоненте
const user = useSelector((state) => selectUserById(state, userId));
```

### Обработка ошибок

```jsx
// В slice
const userSlice = createSlice({
  name: 'user',
  initialState: {
    user: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || 'Произошла ошибка';
      });
  },
});
```

## 8. Интеграция с React Router

```jsx
// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Counter from './components/Counter';
import UserProfile from './components/UserProfile';
import PostsList from './components/PostsList';
import UsersList from './components/UsersList';
import Navigation from './components/Navigation';

function App() {
  const { isAuthenticated } = useSelector((state) => state.user);

  return (
    <Router>
      <div className="App">
        <Navigation />
        <Routes>
          <Route path="/" element={<Counter />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/posts" element={<PostsList />} />
          <Route path="/users" element={<UsersList />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
```

## 9. Тестирование

### Тестирование slice

```jsx
// src/store/slices/counterSlice.test.js
import counterReducer, { increment, decrement } from './counterSlice';

describe('counter reducer', () => {
  const initialState = {
    value: 0,
    status: 'idle',
  };

  it('should handle initial state', () => {
    expect(counterReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle increment', () => {
    const actual = counterReducer(initialState, increment());
    expect(actual.value).toEqual(1);
  });

  it('should handle decrement', () => {
    const actual = counterReducer(initialState, decrement());
    expect(actual.value).toEqual(-1);
  });
});
```

### Тестирование компонентов

```jsx
// src/components/Counter.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import counterReducer from '../store/slices/counterSlice';
import Counter from './Counter';

const createTestStore = () => {
  return configureStore({
    reducer: {
      counter: counterReducer,
    },
  });
};

test('renders counter with initial value', () => {
  const store = createTestStore();
  render(
    <Provider store={store}>
      <Counter />
    </Provider>
  );

  expect(screen.getByText(/Счётчик: 0/)).toBeInTheDocument();
});

test('increments counter when increment button is clicked', () => {
  const store = createTestStore();
  render(
    <Provider store={store}>
      <Counter />
    </Provider>
  );

  fireEvent.click(screen.getByText('Увеличить'));
  expect(screen.getByText(/Счётчик: 1/)).toBeInTheDocument();
});
```

## 10. Заключение

Redux Toolkit значительно упрощает работу с Redux, предоставляя:

- **Упрощенную настройку** — configureStore с хорошими настройками по умолчанию
- **Меньше boilerplate кода** — автоматическая генерация action creators
- **Иммутабельные обновления** — встроенная поддержка Immer
- **Асинхронные операции** — createAsyncThunk для API вызовов
- **Нормализацию данных** — createEntityAdapter для эффективной работы с сущностями
- **TypeScript поддержку** — отличная типизация из коробки

Использование Redux Toolkit с React позволяет создавать масштабируемые приложения с эффективным управлением состоянием, следуя официальным рекомендациям и лучшим практикам Redux сообщества.

### Дополнительные ресурсы

- [Официальная документация Redux Toolkit](https://redux-toolkit.js.org/)
- [Redux Toolkit Quick Start](https://redux-toolkit.js.org/introduction/quick-start)
- [Redux Style Guide](https://redux.js.org/style-guide/)
- [React Redux Hooks](https://react-redux.js.org/api/hooks)
