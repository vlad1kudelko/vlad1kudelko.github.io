+++
lang = "ru"
title = "Django Deployment: развертывание на сервере"
description = "Пошаговое руководство по деплою Django-проекта на сервер: подготовка окружения, настройка Gunicorn, Nginx, миграции, статика и запуск."
template = "posts"
thumb = "/imgs/django-deployment-guide.png"
publication_date = "2025-07-04"
+++

# Django Deployment: развертывание на сервере

> **Читайте также:**
> - [FastAPI + Docker: контейнеризация](/posts/fastapi-docker-containerization)
> - [Django ORM: продвинутые запросы и оптимизация](/posts/django-orm-advanced-queries-optimization)
> - [Разработка сайта с использованием Django](/posts/django-development-guide)

Развертывание Django-проекта на сервере — важный этап, позволяющий сделать ваше приложение доступным для пользователей в интернете. Даже если ваш проект отлично работает на локальной машине, для реального использования его нужно правильно и безопасно разместить на сервере. В этом руководстве мы подробно рассмотрим все основные шаги деплоя на Linux-сервере с использованием Gunicorn и Nginx, а также дадим пояснения к каждому этапу.

## 1. Подготовка сервера

Перед началом убедитесь, что у вас есть доступ к серверу с установленной ОС Linux (например, Ubuntu). Все действия рекомендуется выполнять под отдельным пользователем, а не под root.

- Сначала обновите список пакетов и установите Python, pip и venv (виртуальное окружение):
  ```bash
  sudo apt update
  sudo apt install python3 python3-pip python3-venv
  ```
  Эти команды обеспечат наличие всех необходимых инструментов для запуска и изоляции вашего Django-проекта.

- Создайте отдельного пользователя для проекта (например, `django`), чтобы повысить безопасность. Перейдите в его домашнюю директорию:
  ```bash
  sudo adduser django
  su - django
  ```
  Это позволит изолировать проект от других процессов на сервере.

## 2. Клонирование проекта и настройка окружения

Теперь нужно получить исходный код вашего проекта и подготовить окружение для его работы.

- Клонируйте репозиторий с вашим проектом:
  ```bash
  git clone <ваш-репозиторий>
  cd <ваш-проект>
  ```
  Здесь `<ваш-репозиторий>` — это ссылка на ваш git-репозиторий (например, с GitHub или GitLab), а `<ваш-проект>` — название папки проекта.

- Создайте и активируйте виртуальное окружение:
  ```bash
  python3 -m venv venv
  source venv/bin/activate
  ```
  Виртуальное окружение позволяет изолировать зависимости проекта от системных пакетов Python.

- Установите все зависимости, указанные в `requirements.txt`:
  ```bash
  pip install -r requirements.txt
  ```
  Это гарантирует, что все нужные библиотеки будут установлены в ваше виртуальное окружение.

## 3. Настройка переменных окружения

Для безопасности и гибкости настройки проекта используйте переменные окружения. Обычно для этого создают файл `.env` или используют системные переменные.

- В файле `.env` можно хранить такие параметры, как `SECRET_KEY`, настройки базы данных, параметры отладки и другие чувствительные данные. Пример:
  ```env
  SECRET_KEY=ваш_секретный_ключ
  DEBUG=False
  ALLOWED_HOSTS=ваш_домен,127.0.0.1
  DATABASE_URL=postgres://user:password@localhost:5432/dbname
  ```
  Никогда не храните секретные данные в открытом виде в репозитории!

## 4. Миграции и сбор статики

Перед запуском приложения на сервере необходимо подготовить базу данных и статические файлы.

- Выполните миграции для создания и обновления таблиц в базе данных:
  ```bash
  python manage.py migrate
  ```
  Эта команда применяет все изменения моделей к базе данных.

- Соберите статические файлы (CSS, JS, изображения) в одну папку для обслуживания через веб-сервер:
  ```bash
  python manage.py collectstatic
  ```
  После выполнения этой команды все статики будут скопированы в папку, указанную в настройках (`STATIC_ROOT`).

## 5. Установка и настройка Gunicorn

Django не предназначен для работы напрямую с интернет-трафиком в продакшене. Для этого используют WSGI-серверы, такие как Gunicorn.

- Установите Gunicorn в виртуальное окружение:
  ```bash
  pip install gunicorn
  ```
  Gunicorn будет запускать ваше Django-приложение и принимать запросы от Nginx.

- Проверьте работу Gunicorn локально:
  ```bash
  gunicorn your_project.wsgi:application --bind 0.0.0.0:8000
  ```
  Замените `your_project` на имя вашего Django-пакета. После запуска приложение будет доступно на порту 8000.

- Для автоматического запуска и управления Gunicorn создайте systemd unit-файл `/etc/systemd/system/gunicorn.service`:
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
  Здесь:
  - `User` — пользователь, под которым будет работать Gunicorn (например, `django`)
  - `WorkingDirectory` — путь к вашему проекту
  - `ExecStart` — команда запуска Gunicorn с указанием сокета для взаимодействия с Nginx

- Перезапустите systemd и включите Gunicorn в автозагрузку:
  ```bash
  sudo systemctl daemon-reload
  sudo systemctl start gunicorn
  sudo systemctl enable gunicorn
  ```
  Теперь Gunicorn будет автоматически запускаться при старте сервера.

## 6. Настройка Nginx

Nginx будет выступать в роли обратного прокси: принимать HTTP-запросы от пользователей и передавать их Gunicorn, а также обслуживать статические и медиа-файлы.

- Установите Nginx:
  ```bash
  sudo apt install nginx
  ```

- Создайте конфигурационный файл `/etc/nginx/sites-available/your_project`:
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
  В этом файле:
  - `server_name` — ваш домен или IP-адрес
  - `location /static/` и `location /media/` — обработка статики и медиа-файлов
  - `proxy_pass` — проксирование запросов к Gunicorn через Unix-сокет

- Активируйте сайт и перезапустите Nginx:
  ```bash
  sudo ln -s /etc/nginx/sites-available/your_project /etc/nginx/sites-enabled
  sudo nginx -t
  sudo systemctl restart nginx
  ```
  После этого ваш сайт будет доступен по HTTP.

## 7. Проверка и отладка

Если что-то не работает, важно уметь быстро найти и исправить ошибку.

- Для просмотра логов Gunicorn используйте:
  ```bash
  journalctl -u gunicorn
  ```
- Для просмотра ошибок Nginx:
  ```bash
  sudo tail -f /var/log/nginx/error.log
  ```
  Анализируйте сообщения об ошибках — они часто подсказывают, что именно пошло не так (например, проблемы с правами, путями или зависимостями).

## Заключение

Теперь ваш Django-проект работает на сервере под управлением Gunicorn и Nginx. Такой подход обеспечивает производительность, безопасность и масштабируемость. Не забудьте:
- Настроить регулярное резервное копирование базы данных и файлов
- Включить HTTPS (например, с помощью Let's Encrypt)
- Ограничить доступ к административной панели
- Настроить мониторинг и оповещения о сбоях

Следуя этому руководству, вы сможете развернуть свой Django-проект на сервере и обеспечить его стабильную работу для пользователей. 