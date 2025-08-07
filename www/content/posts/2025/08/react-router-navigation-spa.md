+++
lang = "ru"
title = "React Router: навигация в SPA"
description = "Подробное руководство по React Router: настройка маршрутизации, защищенные маршруты, динамические параметры, вложенные маршруты и лучшие практики для SPA приложений."
template = "posts"
thumb = "/imgs/2025/08/react-router-navigation-spa.webp"
publication_date = "2025-08-04"
+++

# React Router: навигация в SPA

> **Читайте также:**
> - [React: основы компонентного подхода](/posts/2025/08/react-component-basics-guide)
> - [React Hooks: useState, useEffect, useContext](/posts/2025/08/react-hooks-usestate-useeffect-usecontext)
> - [Frontend JavaScript/TypeScript: современная разработка](/posts/2025/08/frontend-javascript-typescript-guide)

**React Router** — это стандартная библиотека для маршрутизации в React приложениях. Она позволяет создавать одностраничные приложения (SPA) с множественными "страницами" без перезагрузки браузера. React Router обеспечивает синхронизацию URL с состоянием приложения, что делает навигацию интуитивной и SEO-дружественной. В этой статье рассмотрим все аспекты работы с React Router, от базовой настройки до продвинутых техник.

## 1. Введение в React Router

### Что такое React Router?

React Router — это библиотека маршрутизации для React, которая позволяет:
- Создавать навигацию между компонентами без перезагрузки страницы
- Синхронизировать URL с состоянием приложения
- Создавать вложенные маршруты и динамические параметры
- Реализовывать защищенные маршруты и редиректы
- Поддерживать историю браузера (кнопки "Назад" и "Вперед")

### Установка React Router

```bash
# Для React Router v6 (рекомендуется)
npm install react-router-dom

# Или с помощью yarn
yarn add react-router-dom
```

### Основные компоненты

- `BrowserRouter` — основной роутер для веб-приложений
- `Routes` — контейнер для всех маршрутов
- `Route` — определение отдельного маршрута
- `Link` — навигационные ссылки
- `Navigate` — программная навигация и редиректы
- `Outlet` — место для рендера вложенных маршрутов

## 2. Базовая настройка маршрутизации

### Настройка роутера

```jsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './components/Home';
import About from './components/About';
import Contact from './components/Contact';
import Navigation from './components/Navigation';

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <Navigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
```

### Компонент навигации

```jsx
import React from 'react';
import { Link, NavLink } from 'react-router-dom';

function Navigation() {
  return (
    <nav>
      <ul>
        <li>
          <Link to="/">Главная</Link>
        </li>
        <li>
          <NavLink 
            to="/about"
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            О нас
          </NavLink>
        </li>
        <li>
          <NavLink 
            to="/contact"
            style={({ isActive }) => ({
              color: isActive ? 'red' : 'black'
            })}
          >
            Контакты
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

export default Navigation;
```

**Разница между Link и NavLink:**
- `Link` — простая ссылка для навигации
- `NavLink` — ссылка с дополнительными возможностями (активное состояние, стилизация)

## 3. Динамические маршруты и параметры

### URL параметры

```jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import UserList from './components/UserList';
import UserDetail from './components/UserDetail';

function App() {
  return (
    <Routes>
      <Route path="/users" element={<UserList />} />
      <Route path="/users/:id" element={<UserDetail />} />
    </Routes>
  );
}
```

### Получение параметров в компоненте

```jsx
import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

function UserDetail() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const tab = searchParams.get('tab') || 'profile';
  const sort = searchParams.get('sort') || 'name';

  const handleTabChange = (newTab) => {
    setSearchParams({ tab: newTab, sort });
  };

  return (
    <div>
      <h1>Пользователь {id}</h1>
      <div>
        <button 
          onClick={() => handleTabChange('profile')}
          className={tab === 'profile' ? 'active' : ''}
        >
          Профиль
        </button>
        <button 
          onClick={() => handleTabChange('posts')}
          className={tab === 'posts' ? 'active' : ''}
        >
          Посты
        </button>
      </div>
      
      {tab === 'profile' && <UserProfile userId={id} />}
      {tab === 'posts' && <UserPosts userId={id} sort={sort} />}
    </div>
  );
}
```

### Программная навигация

```jsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Логика авторизации
      const success = await loginUser(formData);
      
      if (success) {
        // Перенаправление на предыдущую страницу или главную
        const from = location.state?.from?.pathname || '/';
        navigate(from, { replace: true });
      }
    } catch (error) {
      console.error('Ошибка авторизации:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Форма авторизации */}
    </form>
  );
}
```

## 4. Вложенные маршруты

### Структура вложенных маршрутов

```jsx
import React from 'react';
import { Routes, Route, Outlet } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import Settings from './components/Settings';
import Analytics from './components/Analytics';

function App() {
  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />}>
        <Route index element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="analytics" element={<Analytics />} />
      </Route>
    </Routes>
  );
}
```

### Компонент с вложенными маршрутами

```jsx
import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

function Dashboard() {
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <nav>
          <NavLink 
            to="/dashboard" 
            end
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Профиль
          </NavLink>
          <NavLink 
            to="/dashboard/settings"
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Настройки
          </NavLink>
          <NavLink 
            to="/dashboard/analytics"
            className={({ isActive }) => isActive ? 'active' : ''}
          >
            Аналитика
          </NavLink>
        </nav>
      </aside>
      
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

export default Dashboard;
```

## 5. Защищенные маршруты

### Компонент защищенного маршрута

```jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

function ProtectedRoute({ children, isAuthenticated }) {
  const location = useLocation();

  if (!isAuthenticated) {
    // Сохраняем текущий путь для редиректа после авторизации
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

// Использование
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
```

### Более сложная защита с ролями

```jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

function RoleBasedRoute({ children, requiredRole, userRole }) {
  const location = useLocation();

  if (!userRole) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (userRole !== requiredRole && userRole !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

// Использование
function App() {
  const [user, setUser] = useState(null);

  return (
    <Routes>
      <Route path="/admin" element={
        <RoleBasedRoute requiredRole="admin" userRole={user?.role}>
          <AdminPanel />
        </RoleBasedRoute>
      } />
      <Route path="/moderator" element={
        <RoleBasedRoute requiredRole="moderator" userRole={user?.role}>
          <ModeratorPanel />
        </RoleBasedRoute>
      } />
    </Routes>
  );
}
```

## 6. Обработка ошибок и 404 страницы

### Страница 404

```jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';

function NotFound() {
  return (
    <div className="not-found">
      <h1>404</h1>
      <h2>Страница не найдена</h2>
      <p>Запрашиваемая страница не существует.</p>
      <Link to="/">Вернуться на главную</Link>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
```

### Обработка ошибок в маршрутах

```jsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';

function ErrorBoundary({ children }) {
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    const handleError = (error) => {
      console.error('Ошибка маршрута:', error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="error-page">
        <h1>Что-то пошло не так</h1>
        <button onClick={() => window.location.reload()}>
          Обновить страницу
        </button>
      </div>
    );
  }

  return children;
}

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}
```

## 7. Ленивая загрузка и код-сплиттинг

### Ленивая загрузка компонентов

```jsx
import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

// Ленивая загрузка компонентов
const Home = lazy(() => import('./components/Home'));
const About = lazy(() => import('./components/About'));
const Contact = lazy(() => import('./components/Contact'));
const Dashboard = lazy(() => import('./components/Dashboard'));

function LoadingSpinner() {
  return (
    <div className="loading">
      <div className="spinner"></div>
      <p>Загрузка...</p>
    </div>
  );
}

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Suspense>
  );
}
```

### Предзагрузка маршрутов

```jsx
import React from 'react';
import { Link } from 'react-router-dom';

function Navigation() {
  const preloadComponent = (component) => {
    // Предзагрузка компонента при наведении
    component();
  };

  return (
    <nav>
      <Link 
        to="/dashboard"
        onMouseEnter={() => preloadComponent(() => import('./components/Dashboard'))}
      >
        Дашборд
      </Link>
    </nav>
  );
}
```

## 8. Хуки React Router

### useNavigate

```jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

function ProductForm() {
  const navigate = useNavigate();

  const handleSubmit = async (formData) => {
    try {
      const product = await createProduct(formData);
      
      // Переход к созданному продукту
      navigate(`/products/${product.id}`);
      
      // Или назад в истории
      navigate(-1);
      
      // Или заменить текущий маршрут
      navigate('/products', { replace: true });
      
    } catch (error) {
      console.error('Ошибка создания продукта:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Форма */}
    </form>
  );
}
```

### useLocation

```jsx
import React from 'react';
import { useLocation } from 'react-router-dom';

function Analytics() {
  const location = useLocation();

  React.useEffect(() => {
    // Отправка аналитики при изменении маршрута
    analytics.track('page_view', {
      path: location.pathname,
      search: location.search,
      hash: location.hash
    });
  }, [location]);

  return (
    <div>
      <h1>Аналитика</h1>
      <p>Текущий путь: {location.pathname}</p>
      <p>Параметры: {location.search}</p>
    </div>
  );
}
```

### useMatch

```jsx
import React from 'react';
import { useMatch } from 'react-router-dom';

function Navigation() {
  const homeMatch = useMatch('/');
  const aboutMatch = useMatch('/about');
  const contactMatch = useMatch('/contact');

  return (
    <nav>
      <Link 
        to="/" 
        className={homeMatch ? 'active' : ''}
      >
        Главная
      </Link>
      <Link 
        to="/about" 
        className={aboutMatch ? 'active' : ''}
      >
        О нас
      </Link>
      <Link 
        to="/contact" 
        className={contactMatch ? 'active' : ''}
      >
        Контакты
      </Link>
    </nav>
  );
}
```

## 9. Лучшие практики

### Организация маршрутов

```jsx
// routes/index.js
import { createBrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout';
import Home from '../pages/Home';
import About from '../pages/About';
import Contact from '../pages/Contact';
import Dashboard from '../pages/Dashboard';
import NotFound from '../pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <About /> },
      { path: 'contact', element: <Contact /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: '*', element: <NotFound /> }
    ]
  }
]);

// App.js
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';

function App() {
  return <RouterProvider router={router} />;
}
```

### Константы для маршрутов

```jsx
// constants/routes.js
export const ROUTES = {
  HOME: '/',
  ABOUT: '/about',
  CONTACT: '/contact',
  DASHBOARD: '/dashboard',
  USERS: '/users',
  USER_DETAIL: (id) => `/users/${id}`,
  PRODUCTS: '/products',
  PRODUCT_DETAIL: (id) => `/products/${id}`,
} as const;

// Использование
import { ROUTES } from '../constants/routes';

function Navigation() {
  return (
    <nav>
      <Link to={ROUTES.HOME}>Главная</Link>
      <Link to={ROUTES.ABOUT}>О нас</Link>
      <Link to={ROUTES.USER_DETAIL(123)}>Пользователь 123</Link>
    </nav>
  );
}
```

### Обработка состояния загрузки

```jsx
import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route 
          path="/dashboard" 
          element={
            <Suspense fallback={<DashboardSkeleton />}>
              <Dashboard />
            </Suspense>
          } 
        />
      </Routes>
    </Suspense>
  );
}
```

## 10. Интеграция с состоянием приложения

### React Router + Redux Toolkit

```jsx
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { setCurrentPage } from '../store/navigationSlice';

function Navigation() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPage = useSelector(state => state.navigation.currentPage);

  const handleNavigation = (path) => {
    navigate(path);
    dispatch(setCurrentPage(path));
  };

  return (
    <nav>
      <button 
        onClick={() => handleNavigation('/')}
        className={currentPage === '/' ? 'active' : ''}
      >
        Главная
      </button>
      <button 
        onClick={() => handleNavigation('/about')}
        className={currentPage === '/about' ? 'active' : ''}
      >
        О нас
      </button>
    </nav>
  );
}
```

### React Router + Context API

```jsx
import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const NavigationContext = createContext();

export function NavigationProvider({ children }) {
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const navigate = useNavigate();

  const navigateWithBreadcrumbs = (path, title) => {
    navigate(path);
    setBreadcrumbs(prev => [...prev, { path, title }]);
  };

  return (
    <NavigationContext.Provider value={{ breadcrumbs, navigateWithBreadcrumbs }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  return useContext(NavigationContext);
}
```

## Заключение

React Router — это мощная и гибкая библиотека для создания навигации в React приложениях. Она предоставляет все необходимые инструменты для создания сложных SPA с профессиональной маршрутизацией.

**Ключевые моменты:**
- Используйте `BrowserRouter` для веб-приложений
- Применяйте вложенные маршруты для сложной структуры
- Реализуйте защищенные маршруты для безопасности
- Используйте ленивую загрузку для оптимизации производительности
- Следуйте лучшим практикам организации кода

React Router интегрируется с экосистемой React и позволяет создавать современные, быстрые и удобные веб-приложения с отличным пользовательским опытом.

---

**Дополнительные ресурсы:**
- [Официальная документация React Router](https://reactrouter.com/)
- [React Router Tutorial](https://reactrouter.com/en/main/start/tutorial)
- [React Router Examples](https://github.com/remix-run/react-router/tree/main/examples)
