---
title: "CSS Grid и Flexbox: полное руководство по макетам"
description: "Освойте CSS Grid и Flexbox для создания адаптивных макетов. Примеры, best practices — верстайте сложные интерфейсы с лёгкостью."
heroImage: "../../../../assets/imgs/2025/12/19-css-grid-flexbox.webp"
pubDate: "2025-12-19"
---

# CSS Grid и Flexbox: современные макеты

CSS Grid и Flexbox — два мощных инструмента для создания макетов. Разберём когда и как их использовать. Flexbox идеален для одномерных макетов (строка или колонка), а Grid — для двумерных (строки и колонки одновременно).

## Flexbox

Flexbox (Flexible Box Layout) предназначен для одномерных макетов — либо строка, либо колонка.

### Основы

Базовая настройка flex-контейнера включает направление осей и выравнивание.

```css
.container {
  display: flex;
  flex-direction: row;        /* row, row-reverse, column, column-reverse */
  justify-content: center;    /* main axis */
  align-items: center;        /* cross axis */
  gap: 16px;
}
```

### justify-content

- `flex-start` | `flex-end` | `center`
- `space-between`, `space-around`, `space-evenly`

### align-items

Допустимые значения: `stretch`, `flex-start`, `flex-end`, `center`, `baseline`

### flex-direction

```css
/* Row (по умолчанию) */
flex-direction: row;

/* Column */
flex-direction: column;
height: 100vh;
```

### flex-wrap

```css
flex-wrap: nowrap;   /* по умолчанию */
flex-wrap: wrap;     /* перенос на новую строку */
flex-wrap: wrap-reverse;
```

### flex-grow/shrink

```css
.item {
  flex: 1 1 auto;     /* grow, shrink, basis */
}

/* Эквивалентно: */
flex-grow: 1;
flex-shrink: 1;
flex-basis: auto;
```

### Примеры

```css
/* Центрирование */
.center {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Navigation */
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Карточки */
.cards {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.card {
  flex: 1 1 300px;  /* min-width: 300px */
}
```

## CSS Grid

### Основы

```css
.container {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;  /* три равные колонки */
  grid-template-rows: auto;
  gap: 20px;
}
```

### Единицы измерения

```css
/* fr - доля доступного пространства */
grid-template-columns: 1fr 2fr 1fr;  /* 25% 50% 25% */

/* repeat */
grid-template-columns: repeat(3, 1fr);

/* minmax */
grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));

/* auto */
grid-template-columns: auto 1fr auto;
```

### grid-template-areas

```css
.container {
  display: grid;
  grid-template-areas:
    "header header header"
    "sidebar main main"
    "footer footer footer";
  grid-template-columns: 200px 1fr 1fr;
  grid-template-rows: auto 1fr auto;
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main    { grid-area: main; }
.footer  { grid-area: footer; }
```

### Позиционирование

```css
.item {
  grid-column: 1 / 3;    /* с 1 по 3 линию */
  grid-row: 1 / 2;
  
  /* Или через именованные линии */
  grid-column: span 2;
}
```

### Примеры

```css
/* Адаптивная сетка */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

/* Dashboard */
.dashboard {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: 60px 1fr;
  height: 100vh;
}

.header { grid-column: 1 / -1; }
.sidebar { grid-row: 2; }
.content { grid-row: 2; }
```

## Когда что использовать

### Flexbox

- Одномерные макеты (строка ИЛИ колонка)
- Выравнивание элементов в строке/колонке
- Навигация
- Карточки одинаковой высоты
- Центрирование

### Grid

- Двумерные макеты (строка И колонка)
- Сложные макеты страниц
- Галереи
- Dashboard
- Таблицы стилей

## Комбинирование

```css
.page {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}

.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
```

## Gap

```css
.container {
  display: flex;
  gap: 20px;
}

.grid {
  display: grid;
  gap: 20px;
}
```

## Subgrid (Grid Level 2)

```css
.parent {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
}

.child {
  display: grid;
  grid-column: span 3;
  grid-template-columns: subgrid;  /* наследует от родителя */
}
```

## Заключение

Flexbox и Grid — мощные инструменты. Используйте Flexbox для выравнивания, Grid для макетов.
