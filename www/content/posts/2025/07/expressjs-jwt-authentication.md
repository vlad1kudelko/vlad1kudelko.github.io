+++
lang = "ru"
title = "Express.js + JWT: аутентификация"
description = "Полное руководство по реализации JWT аутентификации в Express.js: настройка, middleware, защищенные маршруты, обновление токенов и безопасность."
template = "posts"
thumb = "/imgs/2025/07/expressjs-jwt-authentication.png"
publication_date = "2025-07-25"
+++

# Express.js + JWT: аутентификация

**JWT (JSON Web Token)** — это открытый стандарт для создания токенов доступа, который позволяет безопасно передавать информацию между сторонами в виде JSON-объекта. В сочетании с Express.js JWT обеспечивает надёжную и масштабируемую систему аутентификации, идеально подходящую для современных веб-приложений и API. В этой статье мы рассмотрим, как реализовать полноценную систему аутентификации с использованием JWT токенов в Express.js.

## 1. Что такое JWT и зачем он нужен

JWT (JSON Web Token) — это открытый стандарт RFC 7519, который определяет компактный и самодостаточный способ безопасной передачи информации между сторонами в виде JSON-объекта. Эта информация может быть проверена и доверена, поскольку она цифрово подписана.

### Структура JWT токена

JWT состоит из трёх частей, разделённых точками (`.`):

1. **Header** — содержит метаданные о токене:
   - Тип токена (`typ: "JWT"`)
   - Алгоритм подписи (`alg: "HS256"`, `RS256` и др.)

2. **Payload** — содержит данные (claims) о пользователе и токене:
   - **Registered claims** — стандартные поля: `iss` (издатель), `exp` (время истечения), `sub` (субъект)
   - **Public claims** — пользовательские данные: `user_id`, `username`, `roles`
   - **Private claims** — внутренние данные приложения

3. **Signature** — цифровая подпись для проверки подлинности и целостности данных

### Пример JWT токена
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### Преимущества JWT перед традиционными сессиями

**Stateless архитектура** — сервер не хранит информацию о сессиях в памяти или базе данных. Это означает, что каждый запрос содержит всю необходимую информацию для аутентификации, что значительно упрощает масштабирование приложения.

**Масштабируемость** — поскольку сервер не хранит состояние сессий, легко распределять нагрузку между несколькими серверами. Пользователь может обращаться к любому серверу в кластере, и аутентификация будет работать одинаково.

**Безопасность** — токены подписываются криптографическими алгоритмами (HMAC, RSA), что гарантирует их целостность. Дополнительно можно установить время жизни токена, после которого он становится недействительным.

**Универсальность** — JWT работает с любыми типами клиентов: веб-приложения, мобильные приложения, десктопные программы. Токен можно передавать через заголовки HTTP, cookies или в теле запроса.

**Производительность** — отсутствие необходимости обращаться к базе данных для проверки сессии на каждом запросе значительно повышает скорость работы API.

## 2. Установка необходимых зависимостей

Для работы с JWT в Express.js потребуются дополнительные библиотеки. Каждая библиотека выполняет свою специфическую роль в системе аутентификации.

```bash
npm install express jsonwebtoken bcryptjs express-validator
```

### Подробное описание зависимостей

**`express`** — основной веб-фреймворк для Node.js, который мы используем для создания API. Он предоставляет все необходимые инструменты для создания маршрутов, middleware и обработки запросов.

**`jsonwebtoken`** — библиотека для работы с JWT токенами. Она предоставляет функции для создания, подписи, проверки и декодирования JWT токенов. Это самая популярная библиотека для работы с JWT в Node.js экосистеме.

**`bcryptjs`** — библиотека для хэширования паролей. Она предоставляет безопасные алгоритмы хэширования и функции для проверки паролей. bcrypt считается одним из самых безопасных алгоритмов для хэширования паролей.

**`express-validator`** — библиотека для валидации входящих данных. Она предоставляет удобные middleware для проверки и санитизации данных, что критически важно для безопасности аутентификации.

### Альтернативные варианты установки

Если вы используете Yarn для управления зависимостями:

```bash
yarn add express jsonwebtoken bcryptjs express-validator
```

Или если используете pnpm:

```bash
pnpm add express jsonwebtoken bcryptjs express-validator
```

### Проверка установки

После установки можно проверить, что все библиотеки работают корректно:

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

console.log('Все зависимости установлены успешно!');
```

## 3. Базовая настройка Express.js приложения

Создадим базовую структуру приложения с необходимыми middleware и конфигурацией для работы с JWT.

```javascript
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const app = express();

// Middleware для парсинга JSON
app.use(express.json());

// Middleware для парсинга URL-encoded данных
app.use(express.urlencoded({ extended: true }));

// Конфигурация JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h';

// Простое хранилище пользователей (в реальном проекте используйте базу данных)
const users = [];

// Middleware для обработки ошибок валидации
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }
  next();
};

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на http://localhost:${PORT}`);
});
```

**Пояснения:**
- `express.json()` — middleware для автоматического парсинга JSON в теле запросов
- `express.urlencoded()` — middleware для парсинга данных из форм
- `JWT_SECRET` — секретный ключ для подписи JWT токенов (в продакшене должен храниться в переменных окружения)
- `JWT_EXPIRES_IN` — время жизни токена (24 часа)
- `users` — простое хранилище пользователей (в реальном проекте замените на базу данных)
- `handleValidationErrors` — middleware для обработки ошибок валидации

## 4. Создание функций для работы с JWT

Реализуем основные функции для создания и проверки JWT токенов.

```javascript
// Функция для создания JWT токена
const generateToken = (userId, username) => {
  return jwt.sign(
    { 
      userId, 
      username,
      iat: Math.floor(Date.now() / 1000) // issued at
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Функция для проверки JWT токена
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Middleware для аутентификации
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Токен доступа не предоставлен' 
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ 
      success: false, 
      message: 'Недействительный токен' 
    });
  }

  req.user = decoded;
  next();
};

// Функция для хэширования паролей
const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

// Функция для проверки паролей
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};
```

**Пояснения:**
- `generateToken()` — создаёт JWT токен с данными пользователя и временем жизни
- `verifyToken()` — проверяет подлинность токена и возвращает декодированные данные
- `authenticateToken()` — middleware для защиты маршрутов, проверяет наличие и валидность токена
- `hashPassword()` — хэширует пароль с использованием bcrypt
- `comparePassword()` — сравнивает введённый пароль с хэшем

## 5. Регистрация пользователей

Создадим маршрут для регистрации новых пользователей с валидацией данных.

```javascript
// Валидация данных для регистрации
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Имя пользователя должно содержать от 3 до 30 символов')
    .isAlphanumeric()
    .withMessage('Имя пользователя должно содержать только буквы и цифры'),
  body('email')
    .isEmail()
    .withMessage('Введите корректный email адрес')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Пароль должен содержать минимум 6 символов')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Пароль должен содержать хотя бы одну строчную букву, одну заглавную букву и одну цифру')
];

// Маршрут для регистрации
app.post('/auth/register', registerValidation, handleValidationErrors, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Проверка на существующего пользователя
    const existingUser = users.find(user => 
      user.username === username || user.email === email
    );

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Пользователь с таким именем или email уже существует'
      });
    }

    // Хэширование пароля
    const hashedPassword = await hashPassword(password);

    // Создание нового пользователя
    const newUser = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date()
    };

    users.push(newUser);

    // Создание JWT токена
    const token = generateToken(newUser.id, newUser.username);

    res.status(201).json({
      success: true,
      message: 'Пользователь успешно зарегистрирован',
      data: {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          createdAt: newUser.createdAt
        },
        token
      }
    });

  } catch (error) {
    console.error('Ошибка при регистрации:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});
```

**Пояснения:**
- `registerValidation` — массив правил валидации для проверки корректности данных
- Проверка на существующего пользователя по имени и email
- Хэширование пароля перед сохранением
- Создание JWT токена после успешной регистрации
- Возврат данных пользователя (без пароля) и токена

## 6. Аутентификация пользователей

Создадим маршрут для входа пользователей в систему.

```javascript
// Валидация данных для входа
const loginValidation = [
  body('username')
    .notEmpty()
    .withMessage('Имя пользователя обязательно'),
  body('password')
    .notEmpty()
    .withMessage('Пароль обязателен')
];

// Маршрут для входа
app.post('/auth/login', loginValidation, handleValidationErrors, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Поиск пользователя
    const user = users.find(u => u.username === username);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Неверное имя пользователя или пароль'
      });
    }

    // Проверка пароля
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Неверное имя пользователя или пароль'
      });
    }

    // Создание JWT токена
    const token = generateToken(user.id, user.username);

    res.json({
      success: true,
      message: 'Успешный вход в систему',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        },
        token
      }
    });

  } catch (error) {
    console.error('Ошибка при входе:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});
```

**Пояснения:**
- Поиск пользователя по имени пользователя
- Проверка пароля с использованием bcrypt
- Создание JWT токена при успешной аутентификации
- Возврат данных пользователя и токена
- Единое сообщение об ошибке для безопасности (не раскрываем, что именно неверно)

## 7. Защищённые маршруты

Создадим примеры защищённых маршрутов, которые требуют аутентификации.

```javascript
// Получение профиля пользователя
app.get('/profile', authenticateToken, (req, res) => {
  const user = users.find(u => u.id === req.user.userId);
  
  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Пользователь не найден'
    });
  }

  res.json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt
    }
  });
});

// Обновление профиля пользователя
const updateProfileValidation = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Введите корректный email адрес')
    .normalizeEmail(),
  body('currentPassword')
    .optional()
    .notEmpty()
    .withMessage('Текущий пароль обязателен для изменения пароля'),
  body('newPassword')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Новый пароль должен содержать минимум 6 символов')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Новый пароль должен содержать хотя бы одну строчную букву, одну заглавную букву и одну цифру')
];

app.put('/profile', authenticateToken, updateProfileValidation, handleValidationErrors, async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    const userIndex = users.findIndex(u => u.id === req.user.userId);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    const user = users[userIndex];
    const updates = {};

    // Обновление email
    if (email && email !== user.email) {
      const emailExists = users.some(u => u.email === email && u.id !== user.id);
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email уже используется другим пользователем'
        });
      }
      updates.email = email;
    }

    // Обновление пароля
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: 'Текущий пароль обязателен для изменения пароля'
        });
      }

      const isCurrentPasswordValid = await comparePassword(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({
          success: false,
          message: 'Неверный текущий пароль'
        });
      }

      updates.password = await hashPassword(newPassword);
    }

    // Применение обновлений
    Object.assign(users[userIndex], updates);

    res.json({
      success: true,
      message: 'Профиль успешно обновлён',
      data: {
        id: user.id,
        username: user.username,
        email: updates.email || user.email,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Ошибка при обновлении профиля:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Выход из системы (опционально - можно реализовать чёрный список токенов)
app.post('/auth/logout', authenticateToken, (req, res) => {
  // В stateless архитектуре с JWT выход обычно реализуется на клиенте
  // путём удаления токена. Здесь можно добавить логику для чёрного списка токенов
  
  res.json({
    success: true,
    message: 'Успешный выход из системы'
  });
});
```

**Пояснения:**
- `authenticateToken` middleware защищает маршруты от неавторизованного доступа
- Получение профиля пользователя по ID из токена
- Обновление профиля с валидацией данных
- Проверка текущего пароля при его изменении
- Опциональная реализация выхода из системы

## 8. Обновление токенов (Refresh Tokens)

Для повышения безопасности реализуем систему обновления токенов с использованием refresh tokens.

```javascript
// Конфигурация для refresh токенов
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-key';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

// Хранилище refresh токенов (в реальном проекте используйте Redis или базу данных)
const refreshTokens = new Set();

// Функция для создания refresh токена
const generateRefreshToken = (userId) => {
  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
  
  refreshTokens.add(refreshToken);
  return refreshToken;
};

// Функция для проверки refresh токена
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET);
    if (decoded.type !== 'refresh') {
      return null;
    }
    return refreshTokens.has(token) ? decoded : null;
  } catch (error) {
    return null;
  }
};

// Обновление access токена
app.post('/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh токен обязателен'
      });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Недействительный refresh токен'
      });
    }

    const user = users.find(u => u.id === decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    // Создание нового access токена
    const newAccessToken = generateToken(user.id, user.username);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: refreshToken // тот же refresh токен
      }
    });

  } catch (error) {
    console.error('Ошибка при обновлении токена:', error);
    res.status(500).json({
      success: false,
      message: 'Внутренняя ошибка сервера'
    });
  }
});

// Отзыв refresh токена
app.post('/auth/revoke', authenticateToken, (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken) {
    refreshTokens.delete(refreshToken);
  }

  res.json({
    success: true,
    message: 'Токен успешно отозван'
  });
});
```

**Пояснения:**
- Refresh токены имеют долгое время жизни (7 дней) и используются для получения новых access токенов
- Отдельный секретный ключ для refresh токенов повышает безопасность
- Хранилище активных токенов позволяет их отзывать
- Типизация токенов предотвращает неправильное использование

**Пояснения:**
- Refresh токены имеют более длительное время жизни (7 дней)
- Хранилище активных refresh токенов для возможности их отзыва
- Функция обновления access токена без повторной аутентификации
- Возможность отзыва refresh токенов для безопасности

## 9. Middleware для ролей и разрешений

Создадим систему ролей для более детального контроля доступа.

```javascript
// Роли пользователей
const ROLES = {
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin'
};

// Middleware для проверки ролей
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Требуется аутентификация'
      });
    }

    const user = users.find(u => u.id === req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден'
      });
    }

    const userRole = user.role || ROLES.USER;
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Недостаточно прав для выполнения операции'
      });
    }

    next();
  };
};

// Примеры защищённых маршрутов с ролями
app.get('/admin/users', authenticateToken, requireRole([ROLES.ADMIN]), (req, res) => {
  const userList = users.map(user => ({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role || ROLES.USER,
    createdAt: user.createdAt
  }));

  res.json({
    success: true,
    data: userList
  });
});

app.put('/admin/users/:id/role', authenticateToken, requireRole([ROLES.ADMIN]), (req, res) => {
  const { role } = req.body;
  const userId = req.params.id;

  if (!Object.values(ROLES).includes(role)) {
    return res.status(400).json({
      success: false,
      message: 'Недопустимая роль'
    });
  }

  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex === -1) {
    return res.status(404).json({
      success: false,
      message: 'Пользователь не найден'
    });
  }

  users[userIndex].role = role;

  res.json({
    success: true,
    message: 'Роль пользователя обновлена',
    data: {
      id: users[userIndex].id,
      username: users[userIndex].username,
      role: users[userIndex].role
    }
  });
});
```

**Пояснения:**
- `requireRole` middleware проверяет наличие необходимых ролей у пользователя
- Роли определяют уровень доступа к различным ресурсам
- Административные маршруты доступны только пользователям с ролью ADMIN
- Система ролей обеспечивает принцип наименьших привилегий

**Пояснения:**
- Система ролей для контроля доступа к различным ресурсам
- `requireRole` middleware проверяет наличие необходимых ролей
- `requireOwnership` middleware проверяет владение ресурсом
- Примеры административных маршрутов

## 10. Обработка ошибок и логирование

Создадим централизованную систему обработки ошибок и логирования.

```javascript
// Middleware для обработки ошибок
const errorHandler = (err, req, res, next) => {
  console.error('Ошибка:', err);

  // JWT ошибки
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Недействительный токен'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Токен истёк'
    });
  }

  // Валидация ошибок
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Ошибка валидации',
      errors: err.errors
    });
  }

  // Общие ошибки сервера
  res.status(500).json({
    success: false,
    message: 'Внутренняя ошибка сервера'
  });
};

// Middleware для логирования запросов
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });

  next();
};

// Применение middleware
app.use(requestLogger);
app.use(errorHandler);

// Обработка несуществующих маршрутов
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Маршрут не найден'
  });
});
```

**Пояснения:**
- Централизованная обработка различных типов ошибок
- Логирование всех запросов с временем выполнения
- Обработка несуществующих маршрутов
- Специальная обработка JWT ошибок

## 11. Безопасность и лучшие практики

Рассмотрим важные аспекты безопасности при работе с JWT.

### Безопасное хранение секретных ключей

```javascript
// Используйте переменные окружения для секретных ключей
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

if (!JWT_SECRET || !REFRESH_TOKEN_SECRET) {
  throw new Error('JWT_SECRET и REFRESH_TOKEN_SECRET должны быть установлены');
}
```

### Rate Limiting для защиты от брутфорса

```javascript
const rateLimit = require('express-rate-limit');

// Ограничение попыток входа
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5, // максимум 5 попыток
  message: {
    success: false,
    message: 'Слишком много попыток входа. Попробуйте позже.'
  }
});

app.post('/auth/login', loginLimiter, loginValidation, handleValidationErrors, loginWithRefreshToken);
```

### Дополнительные меры безопасности

```javascript
const cors = require('cors');
const helmet = require('helmet');

// CORS настройки
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Helmet для безопасности заголовков
app.use(helmet());
```

## Заключение

JWT аутентификация в Express.js предоставляет мощный и гибкий способ реализации системы безопасности для современных веб-приложений. Основные преимущества включают:

**Stateless архитектура** — отсутствие необходимости хранить состояние сессий на сервере
**Масштабируемость** — легкость распределения нагрузки между серверами
**Безопасность** — криптографическая подпись токенов и возможность их отзыва
**Универсальность** — работа с различными типами клиентов

При реализации JWT аутентификации важно следовать лучшим практикам безопасности:

- Использовать сильные секретные ключи и хранить их в переменных окружения
- Устанавливать разумное время жизни токенов
- Реализовывать систему обновления токенов
- Применять rate limiting для защиты от атак
- Использовать HTTPS в продакшене
- Регулярно обновлять зависимости

JWT аутентификация отлично подходит для API, микросервисов и современных веб-приложений, где важны производительность и масштабируемость. 