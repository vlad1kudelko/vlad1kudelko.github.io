+++
lang = "ru"
title = "React + TypeScript: типизация компонентов"
description = "Подробное руководство по типизации React компонентов с TypeScript: интерфейсы пропсов, типизация событий, хуки, дженерики и лучшие практики."
template = "posts"
thumb = "/imgs/2025/08/react-typescript-component-typing.webp"
publication_date = "2025-08-06"
+++

# React + TypeScript: типизация компонентов

**TypeScript** в сочетании с **React** создаёт мощную комбинацию для разработки надёжных и масштабируемых веб-приложений. Типизация компонентов помогает избежать ошибок на этапе компиляции, улучшает автодополнение в IDE и делает код более читаемым и поддерживаемым. В этой статье мы рассмотрим все аспекты типизации React компонентов с TypeScript.

## 1. Зачем нужна типизация в React?

TypeScript в React решает несколько критически важных задач:

- **Предотвращение ошибок** — компилятор TypeScript находит проблемы с типами до запуска приложения
- **Лучшая поддержка IDE** — автодополнение, навигация по коду и рефакторинг работают намного эффективнее
- **Документирование API** — типы служат живой документацией для компонентов
- **Рефакторинг** — при изменении интерфейсов TypeScript автоматически найдёт все места, требующие обновления
- **Командная разработка** — типы помогают разработчикам понимать, как использовать компоненты друг друга

TypeScript особенно полезен в больших проектах, где важно поддерживать консистентность и качество кода.

## 2. Базовые типы React компонентов

Начнём с простых примеров типизации React компонентов:

```typescript
import React from 'react';

// Функциональный компонент без пропсов
const Welcome: React.FC = () => {
  return <h1>Добро пожаловать!</h1>;
};

// Функциональный компонент с пропсами
interface UserProps {
  name: string;
  age: number;
  email?: string; // Опциональный проп
}

const UserProfile: React.FC<UserProps> = ({ name, age, email }) => {
  return (
    <div>
      <h2>{name}</h2>
      <p>Возраст: {age}</p>
      {email && <p>Email: {email}</p>}
    </div>
  );
};

// Классовый компонент
interface CounterProps {
  initialValue: number;
}

interface CounterState {
  count: number;
}

class Counter extends React.Component<CounterProps, CounterState> {
  constructor(props: CounterProps) {
    super(props);
    this.state = {
      count: props.initialValue
    };
  }

  render() {
    return (
      <div>
        <p>Счётчик: {this.state.count}</p>
        <button onClick={() => this.setState({ count: this.state.count + 1 })}>
          Увеличить
        </button>
      </div>
    );
  }
}
```

**Пояснения:**
- `React.FC` — тип для функциональных компонентов (Function Component)
- `React.FC<Props>` — типизированный функциональный компонент с пропсами
- `React.Component<Props, State>` — типизированный классовый компонент
- Интерфейсы описывают структуру пропсов и состояния

## 3. Типизация пропсов

Пропсы — это основной способ передачи данных между компонентами. Рассмотрим различные способы их типизации:

```typescript
import React from 'react';

// Простые типы пропсов
interface ButtonProps {
  text: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

const Button: React.FC<ButtonProps> = ({ 
  text, 
  onClick, 
  disabled = false, 
  variant = 'primary' 
}) => {
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`btn btn-${variant}`}
    >
      {text}
    </button>
  );
};

// Сложные типы пропсов
interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
}

interface UserListProps {
  users: User[];
  onUserSelect: (user: User) => void;
  loading?: boolean;
  error?: string;
}

const UserList: React.FC<UserListProps> = ({ 
  users, 
  onUserSelect, 
  loading = false, 
  error 
}) => {
  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;

  return (
    <ul>
      {users.map(user => (
        <li key={user.id} onClick={() => onUserSelect(user)}>
          {user.name} ({user.email})
        </li>
      ))}
    </ul>
  );
};

// Пропсы с дженериками
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
}

function GenericList<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  );
}
```

## 4. Типизация событий

События в React имеют свои типы. Рассмотрим основные примеры:

```typescript
import React, { ChangeEvent, FormEvent, MouseEvent } from 'react';

// Типизация обработчиков событий
interface FormProps {
  onSubmit: (data: { name: string; email: string }) => void;
}

const ContactForm: React.FC<FormProps> = ({ onSubmit }) => {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');

  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit({ name, email });
  };

  const handleButtonClick = (e: MouseEvent<HTMLButtonElement>) => {
    console.log('Кнопка нажата:', e.currentTarget.textContent);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={name}
        onChange={handleNameChange}
        placeholder="Имя"
      />
      <input
        type="email"
        value={email}
        onChange={handleEmailChange}
        placeholder="Email"
      />
      <button type="submit" onClick={handleButtonClick}>
        Отправить
      </button>
    </form>
  );
};

// Типизация кастомных событий
interface CustomEventData {
  id: number;
  value: string;
}

interface CustomComponentProps {
  onCustomEvent: (data: CustomEventData) => void;
}

const CustomComponent: React.FC<CustomComponentProps> = ({ onCustomEvent }) => {
  const handleClick = () => {
    onCustomEvent({ id: 1, value: 'test' });
  };

  return <button onClick={handleClick}>Триггер события</button>;
};
```

## 5. Типизация хуков

React хуки также нуждаются в типизации:

```typescript
import React, { useState, useEffect, useCallback, useMemo } from 'react';

// Типизация useState
const UserProfile: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Типизация useEffect
  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/user');
        const userData: User = await response.json();
        setUser(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Типизация useCallback
  const handleUserUpdate = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  // Типизация useMemo
  const userDisplayName = useMemo(() => {
    if (!user) return 'Гость';
    return `${user.name} (${user.email})`;
  }, [user]);

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;
  if (!user) return <div>Пользователь не найден</div>;

  return (
    <div>
      <h2>{userDisplayName}</h2>
      <p>Email: {user.email}</p>
    </div>
  );
};

// Кастомные хуки с типизацией
interface UseCounterReturn {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

const useCounter = (initialValue: number = 0): UseCounterReturn => {
  const [count, setCount] = useState<number>(initialValue);

  const increment = useCallback(() => {
    setCount(prev => prev + 1);
  }, []);

  const decrement = useCallback(() => {
    setCount(prev => prev - 1);
  }, []);

  const reset = useCallback(() => {
    setCount(initialValue);
  }, [initialValue]);

  return { count, increment, decrement, reset };
};
```

## 6. Типизация контекста

React Context также нуждается в типизации:

```typescript
import React, { createContext, useContext, ReactNode } from 'react';

// Типизация контекста
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Провайдер контекста
interface ThemeProviderProps {
  children: ReactNode;
}

const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const value: ThemeContextType = {
    theme,
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Хук для использования контекста
const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme должен использоваться внутри ThemeProvider');
  }
  return context;
};

// Компонент, использующий контекст
const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme}>
      Текущая тема: {theme}
    </button>
  );
};
```

## 7. Типизация refs

Refs в React также требуют типизации:

```typescript
import React, { useRef, forwardRef, RefObject } from 'react';

// Типизация useRef
const InputWithFocus: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div>
      <input ref={inputRef} type="text" placeholder="Введите текст" />
      <button onClick={focusInput}>Фокус на поле</button>
    </div>
  );
};

// Типизация forwardRef
interface CustomInputProps {
  label: string;
  placeholder?: string;
}

const CustomInput = forwardRef<HTMLInputElement, CustomInputProps>(
  ({ label, placeholder }, ref) => {
    return (
      <div>
        <label>{label}</label>
        <input ref={ref} placeholder={placeholder} />
      </div>
    );
  }
);

// Компонент, использующий forwardRef
const FormWithCustomInput: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div>
      <CustomInput 
        ref={inputRef}
        label="Имя пользователя"
        placeholder="Введите имя"
      />
      <button onClick={focusInput}>Фокус на поле</button>
    </div>
  );
};
```

## 8. Дженерики в React компонентах

Дженерики позволяют создавать переиспользуемые компоненты с различными типами данных:

```typescript
import React from 'react';

// Дженерик компонент для списка
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string | number;
  emptyMessage?: string;
}

function GenericList<T>({ 
  items, 
  renderItem, 
  keyExtractor, 
  emptyMessage = "Список пуст" 
}: ListProps<T>) {
  if (items.length === 0) {
    return <div>{emptyMessage}</div>;
  }

  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor(item)}>
          {renderItem(item, index)}
        </li>
      ))}
    </ul>
  );
}

// Использование дженерик компонента
interface User {
  id: number;
  name: string;
  email: string;
}

interface Product {
  id: string;
  title: string;
  price: number;
}

const UserList: React.FC<{ users: User[] }> = ({ users }) => {
  return (
    <GenericList
      items={users}
      renderItem={(user) => (
        <div>
          <h3>{user.name}</h3>
          <p>{user.email}</p>
        </div>
      )}
      keyExtractor={(user) => user.id}
      emptyMessage="Пользователи не найдены"
    />
  );
};

const ProductList: React.FC<{ products: Product[] }> = ({ products }) => {
  return (
    <GenericList
      items={products}
      renderItem={(product) => (
        <div>
          <h3>{product.title}</h3>
          <p>Цена: {product.price} ₽</p>
        </div>
      )}
      keyExtractor={(product) => product.id}
      emptyMessage="Товары не найдены"
    />
  );
};
```

## 9. Типизация HOC (Higher-Order Components)

HOC также нуждаются в типизации:

```typescript
import React from 'react';

// Типизация HOC
interface WithLoadingProps {
  loading: boolean;
}

function withLoading<T extends object>(
  Component: React.ComponentType<T>
): React.FC<T & WithLoadingProps> {
  return ({ loading, ...props }) => {
    if (loading) {
      return <div>Загрузка...</div>;
    }
    return <Component {...(props as T)} />;
  };
}

// Компонент для оборачивания
interface UserProfileProps {
  user: User;
}

const UserProfile: React.FC<UserProfileProps> = ({ user }) => {
  return (
    <div>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
};

// Оборачиваемый компонент
const UserProfileWithLoading = withLoading(UserProfile);

// Использование
const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Имитация загрузки данных
    setTimeout(() => {
      setUser({ id: 1, name: 'Иван', email: 'ivan@example.com' });
      setLoading(false);
    }, 2000);
  }, []);

  return (
    <UserProfileWithLoading 
      loading={loading} 
      user={user!} 
    />
  );
};
```

## 10. Лучшие практики типизации

Вот несколько важных рекомендаций для эффективной типизации React компонентов:

### 10.1. Используйте интерфейсы для пропсов

```typescript
// ✅ Хорошо
interface ButtonProps {
  text: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

// ❌ Плохо
type ButtonProps = {
  text: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
};
```

### 10.2. Избегайте any

```typescript
// ✅ Хорошо
interface DataProps {
  data: unknown;
  onDataChange: (data: unknown) => void;
}

// ❌ Плохо
interface DataProps {
  data: any;
  onDataChange: (data: any) => void;
}
```

### 10.3. Используйте утилитарные типы

```typescript
import React from 'react';

// Утилитарные типы для пропсов
type ButtonProps = React.ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary';
};

const Button: React.FC<ButtonProps> = ({ variant = 'primary', ...props }) => {
  return <button className={`btn-${variant}`} {...props} />;
};

// Утилитарные типы для событий
type InputProps = React.ComponentProps<'input'> & {
  onValueChange: (value: string) => void;
};

const Input: React.FC<InputProps> = ({ onValueChange, ...props }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange(e.target.value);
  };

  return <input onChange={handleChange} {...props} />;
};
```

### 10.4. Типизируйте кастомные хуки

```typescript
// ✅ Хорошо
interface UseCounterReturn {
  count: number;
  increment: () => void;
  decrement: () => void;
  reset: () => void;
}

const useCounter = (initialValue: number = 0): UseCounterReturn => {
  // реализация
};

// ❌ Плохо
const useCounter = (initialValue = 0) => {
  // реализация без типизации возвращаемого значения
};
```

## 11. Отладка типов

TypeScript предоставляет несколько способов отладки типов:

```typescript
// Использование typeof для проверки типов
const user: User = { id: 1, name: 'Иван', email: 'ivan@example.com' };
type UserType = typeof user;

// Использование keyof для получения ключей типа
type UserKeys = keyof User; // 'id' | 'name' | 'email'

// Использование Pick и Omit для создания новых типов
type UserBasic = Pick<User, 'name' | 'email'>;
type UserWithoutId = Omit<User, 'id'>;

// Использование Partial для создания опциональных типов
type PartialUser = Partial<User>;

// Использование Required для создания обязательных типов
type RequiredUser = Required<User>;
```

## Заключение

Типизация React компонентов с TypeScript — это мощный инструмент для создания надёжных и масштабируемых приложений. Правильная типизация помогает:

- **Предотвращать ошибки** на этапе компиляции
- **Улучшать разработку** с помощью лучшей поддержки IDE
- **Документировать код** через типы
- **Облегчать рефакторинг** и поддержку кода

Начните с простых интерфейсов для пропсов и постепенно переходите к более сложным типам. Используйте утилитарные типы TypeScript и следуйте лучшим практикам для создания качественного типизированного кода.

Помните, что TypeScript — это инструмент, который должен помогать, а не усложнять разработку. Начните с базовой типизации и постепенно добавляйте более сложные типы по мере необходимости.
