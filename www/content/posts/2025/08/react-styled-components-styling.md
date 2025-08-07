+++
lang = "ru"
title = "React + Styled Components: стилизация"
description = "Подробное руководство по Styled Components в React: CSS-in-JS подход, создание компонентов, темизация, анимации и лучшие практики стилизации."
template = "posts"
thumb = "/imgs/2025/08/react-styled-components-styling.webp"
publication_date = "2025-08-07"
+++

# React + Styled Components: стилизация

**Styled Components** — это библиотека для CSS-in-JS, которая позволяет писать CSS код прямо в JavaScript файлах. Она предоставляет мощный и элегантный способ стилизации React компонентов, объединяя преимущества CSS и JavaScript. Styled Components позволяет создавать переиспользуемые, тематизируемые компоненты с динамическими стилями, что делает разработку более эффективной и поддерживаемой.

## 1. Что такое Styled Components?

### Основные концепции

Styled Components — это библиотека, которая позволяет:

- **Писать CSS в JavaScript** — стили определяются как компоненты
- **Динамические стили** — стили могут изменяться на основе пропсов
- **Темизация** — глобальные темы для всего приложения
- **Автоматическая генерация уникальных классов** — избежание конфликтов имён
- **Лучшая производительность** — только используемые стили попадают в бандл

### Преимущества CSS-in-JS

- **Компонентный подход** — стили привязаны к компонентам
- **Динамические стили** — стили могут зависеть от состояния
- **Типобезопасность** — поддержка TypeScript
- **Лучшая изоляция** — стили не влияют на другие компоненты
- **Переиспользование** — компоненты можно легко переиспользовать

## 2. Установка и настройка

### Установка Styled Components

```bash
npm install styled-components
```

Или с использованием yarn:

```bash
yarn add styled-components
```

### Установка типов для TypeScript

```bash
npm install --save-dev @types/styled-components
```

### Базовая настройка

```jsx
import styled from 'styled-components';

// Простой styled компонент
const Button = styled.button`
  background-color: #007bff;
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: #0056b3;
  }
`;

function App() {
  return (
    <div>
      <Button>Нажми меня</Button>
    </div>
  );
}
```

## 3. Создание базовых компонентов

### Стилизация HTML элементов

```jsx
import styled from 'styled-components';

// Стилизация div
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
`;

// Стилизация заголовка
const Title = styled.h1`
  font-size: 2.5rem;
  color: #333;
  margin-bottom: 1rem;
  text-align: center;
`;

// Стилизация параграфа
const Paragraph = styled.p`
  font-size: 1.1rem;
  line-height: 1.6;
  color: #666;
  margin-bottom: 1rem;
`;

// Стилизация кнопки
const Button = styled.button`
  background-color: #007bff;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
  
  &:hover {
    background-color: #0056b3;
  }
  
  &:active {
    transform: translateY(1px);
  }
`;

function Card() {
  return (
    <Container>
      <Title>Заголовок карточки</Title>
      <Paragraph>
        Это пример использования Styled Components для создания
        красивых и переиспользуемых компонентов.
      </Paragraph>
      <Button>Подробнее</Button>
    </Container>
  );
}
```

### Стилизация с псевдоклассами

```jsx
import styled from 'styled-components';

const Link = styled.a`
  color: #007bff;
  text-decoration: none;
  font-weight: 500;
  
  &:hover {
    color: #0056b3;
    text-decoration: underline;
  }
  
  &:visited {
    color: #6f42c1;
  }
  
  &:active {
    color: #e83e8c;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
  
  &:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  }
  
  &:invalid {
    border-color: #dc3545;
  }
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  
  li {
    padding: 8px 0;
    border-bottom: 1px solid #eee;
    
    &:last-child {
      border-bottom: none;
    }
    
    &:hover {
      background-color: #f8f9fa;
    }
  }
`;
```

## 4. Динамические стили с пропсами

### Условные стили

```jsx
import styled from 'styled-components';

const Button = styled.button`
  background-color: ${props => props.primary ? '#007bff' : '#6c757d'};
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: ${props => props.primary ? '#0056b3' : '#545b62'};
  }
  
  ${props => props.large && `
    padding: 16px 32px;
    font-size: 1.2rem;
  `}
  
  ${props => props.disabled && `
    opacity: 0.6;
    cursor: not-allowed;
    
    &:hover {
      background-color: ${props.primary ? '#007bff' : '#6c757d'};
    }
  `}
`;

function App() {
  return (
    <div>
      <Button primary>Основная кнопка</Button>
      <Button>Вторичная кнопка</Button>
      <Button primary large>Большая основная кнопка</Button>
      <Button disabled>Отключенная кнопка</Button>
    </div>
  );
}
```

### Стили на основе состояния

```jsx
import React, { useState } from 'react';
import styled from 'styled-components';

const ToggleButton = styled.button`
  background-color: ${props => props.isActive ? '#28a745' : '#dc3545'};
  color: white;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  
  &:hover {
    background-color: ${props => props.isActive ? '#218838' : '#c82333'};
  }
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 20px;
  background-color: #e9ecef;
  border-radius: 10px;
  overflow: hidden;
  
  &::after {
    content: '';
    display: block;
    height: 100%;
    background-color: #007bff;
    width: ${props => props.progress}%;
    transition: width 0.3s ease;
  }
`;

function ToggleComponent() {
  const [isActive, setIsActive] = useState(false);
  const [progress, setProgress] = useState(0);
  
  return (
    <div>
      <ToggleButton 
        isActive={isActive} 
        onClick={() => setIsActive(!isActive)}
      >
        {isActive ? 'Активно' : 'Неактивно'}
      </ToggleButton>
      
      <ProgressBar progress={progress} />
      <button onClick={() => setProgress(Math.min(100, progress + 10))}>
        Увеличить прогресс
      </button>
    </div>
  );
}
```

## 5. Расширение и композиция компонентов

### Расширение существующих компонентов

```jsx
import styled from 'styled-components';

const Button = styled.button`
  background-color: #007bff;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
  
  &:hover {
    background-color: #0056b3;
  }
`;

// Расширение базовой кнопки
const SuccessButton = styled(Button)`
  background-color: #28a745;
  
  &:hover {
    background-color: #218838;
  }
`;

const DangerButton = styled(Button)`
  background-color: #dc3545;
  
  &:hover {
    background-color: #c82333;
  }
`;

const OutlineButton = styled(Button)`
  background-color: transparent;
  color: #007bff;
  border: 2px solid #007bff;
  
  &:hover {
    background-color: #007bff;
    color: white;
  }
`;

function App() {
  return (
    <div>
      <Button>Обычная кнопка</Button>
      <SuccessButton>Успех</SuccessButton>
      <DangerButton>Ошибка</DangerButton>
      <OutlineButton>Контурная кнопка</OutlineButton>
    </div>
  );
}
```

### Композиция компонентов

```jsx
import styled from 'styled-components';

const Card = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin: 10px;
`;

const CardHeader = styled.div`
  border-bottom: 1px solid #eee;
  padding-bottom: 15px;
  margin-bottom: 15px;
`;

const CardTitle = styled.h3`
  margin: 0;
  color: #333;
  font-size: 1.5rem;
`;

const CardBody = styled.div`
  color: #666;
  line-height: 1.6;
`;

const CardFooter = styled.div`
  border-top: 1px solid #eee;
  padding-top: 15px;
  margin-top: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CardButton = styled.button`
  background-color: #007bff;
  color: white;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: #0056b3;
  }
`;

function ProductCard({ title, description, price, onBuy }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody>
        {description}
      </CardBody>
      <CardFooter>
        <span>Цена: ${price}</span>
        <CardButton onClick={onBuy}>Купить</CardButton>
      </CardFooter>
    </Card>
  );
}
```

## 6. Темизация с ThemeProvider

### Создание темы

```jsx
import styled, { ThemeProvider } from 'styled-components';

// Определение темы
const lightTheme = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    success: '#28a745',
    danger: '#dc3545',
    warning: '#ffc107',
    info: '#17a2b8',
    light: '#f8f9fa',
    dark: '#343a40',
    white: '#ffffff',
    body: '#ffffff',
    text: '#333333',
    textMuted: '#666666'
  },
  fonts: {
    primary: 'Arial, sans-serif',
    secondary: 'Georgia, serif'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px'
  },
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px'
  },
  shadows: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.1)',
    md: '0 4px 8px rgba(0, 0, 0, 0.1)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.1)'
  }
};

const darkTheme = {
  ...lightTheme,
  colors: {
    ...lightTheme.colors,
    body: '#1a1a1a',
    text: '#ffffff',
    textMuted: '#cccccc'
  }
};

// Компоненты с использованием темы
const Container = styled.div`
  background-color: ${props => props.theme.colors.body};
  color: ${props => props.theme.colors.text};
  font-family: ${props => props.theme.fonts.primary};
  padding: ${props => props.theme.spacing.lg};
  min-height: 100vh;
`;

const Button = styled.button`
  background-color: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.white};
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border: none;
  border-radius: ${props => props.theme.borderRadius.sm};
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
  
  &:hover {
    background-color: ${props => props.theme.colors.primary}dd;
  }
`;

const Card = styled.div`
  background-color: ${props => props.theme.colors.white};
  border-radius: ${props => props.theme.borderRadius.md};
  box-shadow: ${props => props.theme.shadows.md};
  padding: ${props => props.theme.spacing.lg};
  margin: ${props => props.theme.spacing.md} 0;
`;

function App() {
  const [isDark, setIsDark] = useState(false);
  
  return (
    <ThemeProvider theme={isDark ? darkTheme : lightTheme}>
      <Container>
        <Button onClick={() => setIsDark(!isDark)}>
          Переключить тему
        </Button>
        <Card>
          <h2>Пример карточки</h2>
          <p>Этот компонент автоматически адаптируется к выбранной теме.</p>
        </Card>
      </Container>
    </ThemeProvider>
  );
}
```

## 7. Анимации и переходы

### CSS анимации

```jsx
import styled, { keyframes } from 'styled-components';

// Определение анимации
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const pulse = keyframes`
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
`;

const rotate = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
`;

// Компоненты с анимациями
const AnimatedCard = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin: 10px;
  animation: ${fadeIn} 0.5s ease-out;
  
  &:hover {
    animation: ${pulse} 0.3s ease-in-out;
  }
`;

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: ${rotate} 1s linear infinite;
`;

const SlideInButton = styled.button`
  background-color: #007bff;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transform: translateX(-100%);
  animation: ${fadeIn} 0.5s ease-out 0.5s forwards;
  
  &:hover {
    background-color: #0056b3;
  }
`;

function AnimatedComponents() {
  return (
    <div>
      <AnimatedCard>
        <h3>Анимированная карточка</h3>
        <p>Эта карточка появляется с анимацией fade-in</p>
      </AnimatedCard>
      
      <LoadingSpinner />
      
      <SlideInButton>
        Кнопка с задержкой
      </SlideInButton>
    </div>
  );
}
```

### Переходы и hover эффекты

```jsx
import styled from 'styled-components';

const HoverCard = styled.div`
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin: 10px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
`;

const GradientButton = styled.button`
  background: linear-gradient(45deg, #007bff, #0056b3);
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: linear-gradient(45deg, #0056b3, #004085);
    transform: scale(1.05);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const ImageCard = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  img {
    width: 100%;
    height: 200px;
    object-fit: cover;
    transition: transform 0.3s ease;
  }
  
  &:hover img {
    transform: scale(1.1);
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  
  &:hover::after {
    opacity: 1;
  }
`;
```

## 8. Медиа-запросы и адаптивность

### Адаптивные компоненты

```jsx
import styled from 'styled-components';

const ResponsiveContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  
  @media (max-width: 768px) {
    padding: 0 15px;
  }
  
  @media (max-width: 480px) {
    padding: 0 10px;
  }
`;

const ResponsiveGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
    gap: 15px;
  }
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 10px;
  }
`;

const ResponsiveText = styled.h1`
  font-size: 3rem;
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    font-size: 2rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1.5rem;
  }
`;

const ResponsiveButton = styled.button`
  background-color: #007bff;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  
  @media (max-width: 768px) {
    padding: 10px 20px;
    font-size: 0.9rem;
  }
  
  @media (max-width: 480px) {
    padding: 8px 16px;
    font-size: 0.8rem;
  }
`;

function ResponsiveLayout() {
  return (
    <ResponsiveContainer>
      <ResponsiveText>Адаптивный заголовок</ResponsiveText>
      
      <ResponsiveGrid>
        <div>Элемент 1</div>
        <div>Элемент 2</div>
        <div>Элемент 3</div>
        <div>Элемент 4</div>
      </ResponsiveGrid>
      
      <ResponsiveButton>Адаптивная кнопка</ResponsiveButton>
    </ResponsiveContainer>
  );
}
```

## 9. TypeScript с Styled Components

### Типизированные компоненты

```tsx
import styled from 'styled-components';

interface ButtonProps {
  primary?: boolean;
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
}

const StyledButton = styled.button<ButtonProps>`
  background-color: ${props => props.primary ? '#007bff' : '#6c757d'};
  color: white;
  border: none;
  border-radius: 6px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.6 : 1};
  
  ${props => {
    switch (props.size) {
      case 'small':
        return `
          padding: 8px 16px;
          font-size: 0.875rem;
        `;
      case 'large':
        return `
          padding: 16px 32px;
          font-size: 1.125rem;
        `;
      default:
        return `
          padding: 12px 24px;
          font-size: 1rem;
        `;
    }
  }}
  
  &:hover {
    background-color: ${props => 
      props.disabled 
        ? (props.primary ? '#007bff' : '#6c757d')
        : (props.primary ? '#0056b3' : '#545b62')
    };
  }
`;

interface CardProps {
  elevation?: 'low' | 'medium' | 'high';
}

const StyledCard = styled.div<CardProps>`
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin: 10px;
  
  ${props => {
    switch (props.elevation) {
      case 'low':
        return 'box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);';
      case 'high':
        return 'box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);';
      default:
        return 'box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);';
    }
  }}
`;

function TypedComponents() {
  return (
    <div>
      <StyledButton primary size="large">
        Большая основная кнопка
      </StyledButton>
      
      <StyledButton size="small" disabled>
        Маленькая отключенная кнопка
      </StyledButton>
      
      <StyledCard elevation="high">
        Карточка с высокой тенью
      </StyledCard>
    </div>
  );
}
```

## 10. Лучшие практики

### Организация кода

```jsx
// styles/theme.js
export const theme = {
  colors: {
    primary: '#007bff',
    secondary: '#6c757d',
    // ... другие цвета
  },
  // ... другие настройки темы
};

// styles/GlobalStyles.js
import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: 'Arial', sans-serif;
    line-height: 1.6;
    color: #333;
  }
  
  button {
    cursor: pointer;
  }
  
  a {
    text-decoration: none;
    color: inherit;
  }
`;

// components/Button/styles.js
import styled from 'styled-components';

export const StyledButton = styled.button`
  // стили кнопки
`;

// components/Button/index.js
export { default } from './Button';
export { StyledButton } from './styles';

// components/Button/Button.js
import React from 'react';
import { StyledButton } from './styles';

const Button = ({ children, ...props }) => {
  return <StyledButton {...props}>{children}</StyledButton>;
};

export default Button;
```

### Производительность

```jsx
import styled from 'styled-components';

// Хорошо: статические стили
const GoodButton = styled.button`
  background-color: #007bff;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
`;

// Плохо: динамические стили в каждом рендере
const BadButton = styled.button`
  background-color: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.white};
  padding: ${props => props.theme.spacing.md};
`;

// Хорошо: использование CSS переменных
const BetterButton = styled.button`
  background-color: var(--primary-color);
  color: var(--white-color);
  padding: var(--spacing-md);
`;

// Хорошо: мемоизация для сложных вычислений
const ComplexButton = styled.button`
  background: ${props => {
    // Кэшируем результат для производительности
    if (props.cachedBackground) return props.cachedBackground;
    
    const background = `linear-gradient(45deg, ${props.theme.colors.primary}, ${props.theme.colors.secondary})`;
    props.cachedBackground = background;
    return background;
  }};
`;
```

### Переиспользование стилей

```jsx
import styled, { css } from 'styled-components';

// Базовые стили
const baseButtonStyles = css`
  padding: 12px 24px;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
`;

const primaryButtonStyles = css`
  background-color: #007bff;
  color: white;
  
  &:hover {
    background-color: #0056b3;
  }
`;

const secondaryButtonStyles = css`
  background-color: #6c757d;
  color: white;
  
  &:hover {
    background-color: #545b62;
  }
`;

// Компоненты с переиспользованием стилей
const PrimaryButton = styled.button`
  ${baseButtonStyles}
  ${primaryButtonStyles}
`;

const SecondaryButton = styled.button`
  ${baseButtonStyles}
  ${secondaryButtonStyles}
`;

// Миксины для повторяющихся стилей
const flexCenter = css`
  display: flex;
  align-items: center;
  justify-content: center;
`;

const cardShadow = css`
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const Card = styled.div`
  ${flexCenter}
  ${cardShadow}
  background: white;
  border-radius: 8px;
  padding: 20px;
`;
```

## Заключение

Styled Components предоставляет мощный и элегантный способ стилизации React приложений. Основные преимущества:

- **Компонентный подход** — стили привязаны к компонентам
- **Динамические стили** — стили могут зависеть от пропсов и состояния
- **Темизация** — глобальные темы для всего приложения
- **TypeScript поддержка** — полная типизация
- **Производительность** — только используемые стили попадают в бандл
- **Лучшая изоляция** — избежание конфликтов имён

При правильном использовании Styled Components может значительно улучшить качество и поддерживаемость кода, делая разработку более эффективной и приятной.
