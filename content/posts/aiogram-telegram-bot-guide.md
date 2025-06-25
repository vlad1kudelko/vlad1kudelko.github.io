+++
lang = "ru"
title = "Создание первого Telegram-бота на aiogram"
description = "Пошаговая инструкция по созданию Telegram-бота на Python с использованием библиотеки aiogram: примеры кода, настройка и расширение возможностей."
template = "posts"
thumb = "/imgs/aiogram-telegram-bot-guide.jpg"
+++

# Создание первого Telegram-бота на aiogram: пошаговая инструкция

**Telegram-боты** — это удобный способ автоматизировать задачи, общаться с пользователями и интегрировать различные сервисы. В этой статье мы рассмотрим, как создать своего первого бота на Python с помощью популярной библиотеки **aiogram**.

---

## 1. Что такое aiogram?

**aiogram** — это современная асинхронная библиотека для создания Telegram-ботов на Python. Она проста в использовании, поддерживает последние возможности Telegram Bot API и позволяет писать быстрые и масштабируемые боты.

---

## 2. Получение токена бота

1. Откройте Telegram и найдите пользователя [@BotFather](https://t.me/BotFather).
2. Введите команду `/newbot` и следуйте инструкциям.
3. После создания бота BotFather выдаст вам **токен** — сохраните его, он понадобится для работы.

---

## 3. Установка aiogram

Установите библиотеку через pip:

```bash
pip install aiogram
```

---

## 4. Минимальный пример кода

Создадим простого бота, который отвечает на команду `/start`:

```python
from aiogram import Bot, Dispatcher, types
from aiogram.utils import executor

API_TOKEN = 'ВАШ_ТОКЕН_ЗДЕСЬ'

bot = Bot(token=API_TOKEN)
dp = Dispatcher(bot)

@dp.message_handler(commands=['start'])
async def send_welcome(message: types.Message):
    await message.reply("Привет! Я твой первый Telegram-бот на aiogram.")

if __name__ == '__main__':
    executor.start_polling(dp, skip_updates=True)
```

**Пояснения:**
- `@dp.message_handler(commands=['start'])` — обработчик команды `/start`.
- `await message.reply(...)` — отправка ответа пользователю.

---

## 5. Запуск бота

Сохраните код в файл, например, `bot.py`, и запустите:

```bash
python bot.py
```

Теперь напишите своему боту в Telegram команду `/start` — он должен ответить приветствием.

---

## 6. Добавление новых возможностей

**Пример: бот, который повторяет сообщения**

```python
@dp.message_handler()
async def echo(message: types.Message):
    await message.answer(message.text)
```

**Пример: бот, который отправляет стикер**

```python
@dp.message_handler(commands=['sticker'])
async def send_sticker(message: types.Message):
    await message.answer_sticker('CAACAgIAAxkBAAEBQe9kV...')  # Вставьте ID стикера
```

---

## 7. Возможности ботов на aiogram

- Ответы на команды и текстовые сообщения
- Работа с кнопками и inline-меню
- Отправка фото, видео, документов, стикеров
- Интеграция с внешними API
- Хранение данных пользователей
- Модерация чатов и автоматизация

---

## 8. Полезные ссылки

- [Документация aiogram (RU)](https://docs.aiogram.dev/ru/latest/)
- [Примеры ботов на aiogram](https://github.com/aiogram/aiogram/tree/dev-3.x/examples)
- [Официальный чат aiogram](https://t.me/aiogram_ru)

---

## Заключение

Создать Telegram-бота на aiogram — просто! Начните с базового примера, постепенно добавляйте новые функции и изучайте возможности библиотеки. Aiogram отлично подходит как для новичков, так и для профессиональных разработчиков.