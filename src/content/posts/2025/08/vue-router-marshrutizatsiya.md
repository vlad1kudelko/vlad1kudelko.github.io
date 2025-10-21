+++
lang = "ru"
title = "Vue Router: маршрутизация"
description = "Подробное руководство по Vue Router - официальной библиотеке маршрутизации для Vue.js. Настройка маршрутов, навигация, защищенные маршруты и лучшие практики."
template = "posts"
thumb = "/imgs/2025/08/vue-router-marshrutizatsiya.webp"
publication_date = "2025-08-09"
+++

# Vue Router: маршрутизация

**Vue Router** — это официальная библиотека маршрутизации для Vue.js, которая позволяет создавать одностраничные приложения (SPA) с множественными представлениями. Она обеспечивает навигацию между компонентами без перезагрузки страницы, сохраняя состояние приложения и обеспечивая плавный пользовательский опыт.

Vue Router интегрируется с экосистемой Vue.js и предоставляет мощные возможности для управления маршрутами, включая вложенные маршруты, защищенные маршруты, ленивую загрузку компонентов и многое другое.

## 1. Установка и настройка Vue Router

### Установка

Vue Router можно установить несколькими способами. Если вы используете Vue CLI, то при создании проекта выберите опцию Router. Для существующих проектов установите пакет через npm:

```bash
npm install vue-router@4
```

**Примечание**: Vue Router 4 совместим с Vue 3, а Vue Router 3 — с Vue 2. Убедитесь, что используете правильную версию.

### Базовая настройка

Создайте файл `router/index.js` в вашем проекте:

```javascript
import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import About from '../views/About.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/about',
    name: 'About',
    component: About
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
```

### Интеграция с приложением

В главном файле `main.js` подключите роутер:

```javascript
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(router)
app.mount('#app')
```

### Использование в App.vue

В корневом компоненте добавьте `<router-view>` для отображения компонентов маршрутов:

```vue
<template>
  <div id="app">
    <nav>
      <router-link to="/">Главная</router-link> |
      <router-link to="/about">О нас</router-link>
    </nav>
    
    <router-view/>
  </div>
</template>

<script>
export default {
  name: 'App'
}
</script>
```

## 2. Основные концепции маршрутизации

### Router-Link

`<router-link>` — это компонент для навигации между маршрутами. Он автоматически генерирует правильные ссылки и обрабатывает клики:

```vue
<template>
  <div>
    <!-- Базовое использование -->
    <router-link to="/home">Главная</router-link>
    
    <!-- С именованным маршрутом -->
    <router-link :to="{ name: 'user', params: { id: 123 }}">
      Профиль пользователя
    </router-link>
    
    <!-- С query параметрами -->
    <router-link :to="{ path: '/search', query: { q: 'vue' }}">
      Поиск
    </router-link>
    
    <!-- С активным классом -->
    <router-link to="/about" active-class="active-link">
      О нас
    </router-link>
  </div>
</template>
```

### Router-View

`<router-view>` — это компонент, который отображает компонент, соответствующий текущему маршруту:

```vue
<template>
  <div>
    <!-- Основной контент -->
    <router-view />
    
    <!-- Именованные представления -->
    <router-view name="sidebar" />
    <router-view name="footer" />
  </div>
</template>
```

### Программная навигация

Для программной навигации используйте методы роутера в компонентах:

```javascript
export default {
  methods: {
    goToHome() {
      this.$router.push('/')
    },
    
    goToUser(id) {
      this.$router.push({ name: 'user', params: { id } })
    },
    
    goBack() {
      this.$router.go(-1)
    },
    
    replaceRoute() {
      this.$router.replace('/new-route')
    }
  }
}
```

## 3. Типы маршрутов

### Статические маршруты

Самый простой тип маршрутов — статические пути:

```javascript
const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/about',
    name: 'About',
    component: About
  },
  {
    path: '/contact',
    name: 'Contact',
    component: Contact
  }
]
```

### Динамические маршруты

Для маршрутов с параметрами используйте двоеточие:

```javascript
const routes = [
  {
    path: '/user/:id',
    name: 'User',
    component: User
  },
  {
    path: '/post/:category/:id',
    name: 'Post',
    component: Post
  }
]
```

В компоненте доступ к параметрам осуществляется через `$route.params`:

```vue
<template>
  <div>
    <h1>Пользователь {{ $route.params.id }}</h1>
  </div>
</template>

<script>
export default {
  name: 'User',
  created() {
    console.log('ID пользователя:', this.$route.params.id)
  }
}
</script>
```

### Вложенные маршруты

Вложенные маршруты позволяют создавать сложную структуру навигации:

```javascript
const routes = [
  {
    path: '/user/:id',
    component: UserLayout,
    children: [
      {
        path: '',
        name: 'UserProfile',
        component: UserProfile
      },
      {
        path: 'posts',
        name: 'UserPosts',
        component: UserPosts
      },
      {
        path: 'settings',
        name: 'UserSettings',
        component: UserSettings
      }
    ]
  }
]
```

В родительском компоненте `UserLayout.vue` добавьте `<router-view>`:

```vue
<template>
  <div class="user-layout">
    <nav class="user-nav">
      <router-link to="/user/123">Профиль</router-link>
      <router-link to="/user/123/posts">Посты</router-link>
      <router-link to="/user/123/settings">Настройки</router-link>
    </nav>
    
    <div class="user-content">
      <router-view />
    </div>
  </div>
</template>
```

### Именованные маршруты

Именованные маршруты упрощают навигацию и делают код более читаемым:

```javascript
const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/user/:id',
    name: 'User',
    component: User
  }
]
```

Использование:

```javascript
// Вместо this.$router.push('/user/123')
this.$router.push({ name: 'User', params: { id: 123 } })

// В template
<router-link :to="{ name: 'User', params: { id: 123 }}">
  Профиль пользователя
</router-link>
```

## 4. Продвинутые возможности

### Ленивая загрузка компонентов

Для оптимизации производительности используйте ленивую загрузку:

```javascript
const routes = [
  {
    path: '/about',
    name: 'About',
    component: () => import('../views/About.vue')
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue')
  }
]
```

### Защищенные маршруты

Реализуйте защиту маршрутов с помощью навигационных стражей:

```javascript
const routes = [
  {
    path: '/admin',
    name: 'Admin',
    component: Admin,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { requiresAuth: true }
  }
]

router.beforeEach((to, from, next) => {
  const isAuthenticated = checkAuthStatus()
  const isAdmin = checkAdminStatus()
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (to.meta.requiresAdmin && !isAdmin) {
    next('/forbidden')
  } else {
    next()
  }
})
```

### Перехватчики навигации

Используйте перехватчики для выполнения действий при навигации:

```javascript
router.beforeEach((to, from, next) => {
  // Показать индикатор загрузки
  showLoading()
  next()
})

router.afterEach((to, from) => {
  // Скрыть индикатор загрузки
  hideLoading()
  
  // Отправить аналитику
  trackPageView(to.path)
})
```

### Query параметры

Работа с query параметрами:

```javascript
// В компоненте
export default {
  methods: {
    updateQuery() {
      this.$router.push({
        query: { 
          ...this.$route.query,
          page: 2,
          sort: 'name'
        }
      })
    }
  },
  
  computed: {
    currentPage() {
      return parseInt(this.$route.query.page) || 1
    },
    
    sortBy() {
      return this.$route.query.sort || 'id'
    }
  }
}
```

## 5. Практические примеры

### Пример приложения блога

```javascript
// router/index.js
import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/blog',
    name: 'Blog',
    component: () => import('../views/Blog.vue'),
    children: [
      {
        path: '',
        name: 'BlogList',
        component: () => import('../views/BlogList.vue')
      },
      {
        path: ':id',
        name: 'BlogPost',
        component: () => import('../views/BlogPost.vue'),
        props: true
      }
    ]
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
```

### Компонент навигации

```vue
<template>
  <nav class="navbar">
    <div class="nav-brand">
      <router-link to="/">Мой блог</router-link>
    </div>
    
    <div class="nav-links">
      <router-link to="/" exact-active-class="active">
        Главная
      </router-link>
      <router-link to="/blog" active-class="active">
        Блог
      </router-link>
      <router-link v-if="!isAuthenticated" to="/login">
        Войти
      </router-link>
      <a v-else @click="logout" href="#">Выйти</a>
    </div>
  </nav>
</template>

<script>
export default {
  name: 'Navbar',
  computed: {
    isAuthenticated() {
      return this.$store.state.auth.isAuthenticated
    }
  },
  methods: {
    logout() {
      this.$store.dispatch('auth/logout')
      this.$router.push('/login')
    }
  }
}
</script>
```

## 6. Лучшие практики

### Организация файлов

```
src/
├── router/
│   ├── index.js          # Основная конфигурация
│   ├── routes/           # Отдельные файлы маршрутов
│   │   ├── auth.js
│   │   ├── blog.js
│   │   └── admin.js
│   └── guards.js         # Навигационные стражы
├── views/                 # Компоненты страниц
│   ├── Home.vue
│   ├── Blog.vue
│   └── Admin.vue
└── components/            # Переиспользуемые компоненты
    ├── Navbar.vue
    └── Footer.vue
```

### Разделение маршрутов

```javascript
// router/routes/blog.js
export default [
  {
    path: '/blog',
    name: 'Blog',
    component: () => import('@/views/Blog.vue'),
    children: [
      {
        path: '',
        name: 'BlogList',
        component: () => import('@/views/BlogList.vue')
      },
      {
        path: ':id',
        name: 'BlogPost',
        component: () => import('@/views/BlogPost.vue'),
        props: true
      }
    ]
  }
]

// router/index.js
import blogRoutes from './routes/blog.js'

const routes = [
  ...blogRoutes,
  // другие маршруты
]
```

### Обработка ошибок

```javascript
router.onError((error) => {
  if (error.name === 'ChunkLoadError') {
    // Ошибка загрузки компонента
    router.push('/error')
  }
})
```

## 7. Отладка и инструменты

### Vue DevTools

Установите Vue DevTools для отладки маршрутизации:

```bash
# Chrome
npm install -g @vue/devtools

# Или через расширение браузера
```

### Логирование

Добавьте логирование для отладки:

```javascript
router.beforeEach((to, from, next) => {
  console.log(`Навигация: ${from.path} → ${to.path}`)
  console.log('Параметры:', to.params)
  console.log('Query:', to.query)
  next()
})
```

## Заключение

Vue Router предоставляет мощную и гибкую систему маршрутизации для Vue.js приложений. Он позволяет создавать сложные SPA с множественными представлениями, защищенными маршрутами и оптимизированной производительностью.

Основные преимущества Vue Router:
- **Простота использования** — интуитивный API и хорошая документация
- **Гибкость** — поддержка различных типов маршрутов и навигации
- **Производительность** — ленивая загрузка и оптимизация
- **Интеграция** — тесная интеграция с экосистемой Vue.js
- **Расширяемость** — возможность создания собственных плагинов и расширений

При правильном использовании Vue Router значительно упрощает разработку сложных веб-приложений и улучшает пользовательский опыт. 