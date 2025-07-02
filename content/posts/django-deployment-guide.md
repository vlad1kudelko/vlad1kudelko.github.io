+++
lang = "ru"
title = "Django Deployment: развертывание на сервере"
description = "Пошаговое руководство по деплою Django-проекта на сервер: подготовка окружения, настройка Gunicorn, Nginx, миграции, статика и запуск."
template = "posts"
thumb = "/imgs/django-deployment-guide.png"
publication_date = "2025-07-04"
+++

# Django Deployment: развертывание на сервере

Развертывание Django-проекта на сервере — важный этап, позволяющий сделать ваше приложение доступным для пользователей. В этом руководстве рассмотрим основные шаги деплоя на Linux-сервере с использованием Gunicorn и Nginx.

## 1. Подготовка сервера

- Установите Python, pip и venv (виртуальное окружение):
  ```bash
  sudo apt update
  sudo apt install python3 python3-pip python3-venv
  ```
- Создайте пользователя для проекта и перейдите в его домашнюю директорию.

## 2. Клонирование проекта и настройка окружения

- Клонируйте репозиторий:
  ```bash
  git clone <ваш-репозиторий>
  cd <ваш-проект>
  ```
- Создайте и активируйте виртуальное окружение:
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```
- Установите зависимости:
  ```bash
  pip install -r requirements.txt
  ```

## 3. Настройка переменных окружения

- Создайте файл `.env` или настройте переменные окружения для секретных ключей, настроек БД и т.д.

## 4. Миграции и сбор статики

- Выполните миграции и соберите статические файлы:
  ```bash
  python manage.py migrate
  python manage.py collectstatic
  ```

## 5. Установка и настройка Gunicorn

- Установите Gunicorn:
  ```bash
  pip install gunicorn
  ```
- Запустите Gunicorn для теста:
  ```bash
  gunicorn your_project.wsgi:application --bind 0.0.0.0:8000
  ```
- Для продакшена создайте systemd unit-файл `/etc/systemd/system/gunicorn.service`:
  ```ini
  [Unit]
  Description=gunicorn daemon
  After=network.target

  [Service]
  User=youruser
  Group=www-data
  WorkingDirectory=/home/youruser/your_project
  ExecStart=/home/youruser/your_project/venv/bin/gunicorn --workers 3 --bind unix:/home/youruser/your_project/gunicorn.sock your_project.wsgi:application

  [Install]
  WantedBy=multi-user.target
  ```
- Перезапустите и включите Gunicorn:
  ```bash
  sudo systemctl daemon-reload
  sudo systemctl start gunicorn
  sudo systemctl enable gunicorn
  ```

## 6. Настройка Nginx

- Установите Nginx:
  ```bash
  sudo apt install nginx
  ```
- Создайте конфиг `/etc/nginx/sites-available/your_project`:
  ```nginx
  server {
      listen 80;
      server_name your_domain_or_ip;

      location = /favicon.ico { access_log off; log_not_found off; }
      location /static/ {
          root /home/youruser/your_project;
      }

      location /media/ {
          root /home/youruser/your_project;
      }

      location / {
          include proxy_params;
          proxy_pass http://unix:/home/youruser/your_project/gunicorn.sock;
      }
  }
  ```
- Активируйте сайт и перезапустите Nginx:
  ```bash
  sudo ln -s /etc/nginx/sites-available/your_project /etc/nginx/sites-enabled
  sudo nginx -t
  sudo systemctl restart nginx
  ```

## 7. Проверка и отладка

- Проверьте логи Gunicorn и Nginx при возникновении ошибок:
  ```bash
  journalctl -u gunicorn
  sudo tail -f /var/log/nginx/error.log
  ```

## Заключение

Теперь ваш Django-проект работает на сервере под управлением Gunicorn и Nginx. Не забудьте настроить бэкапы, HTTPS (через Let's Encrypt) и мониторинг для стабильной работы приложения. 