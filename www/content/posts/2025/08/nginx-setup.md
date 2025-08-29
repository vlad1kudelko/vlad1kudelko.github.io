+++
lang = "ru"
title = "Nginx: настройка веб-сервера"
description = "Пошаговое руководство по настройке Nginx как веб-сервера и обратного прокси для приложений."
template = "posts"
thumb = "/imgs/2025/08/nginx-setup.jpg"
publication_date = "2025-08-27"
+++

# Nginx: настройка веб-сервера

Nginx — один из самых популярных веб‑серверов, известный своей производительностью и гибкостью. В этом руководстве мы разберём, как установить Nginx, настроить виртуальные хосты, включить SSL, а также как обслуживать статические файлы и проксировать запросы к backend‑приложениям.

## 1. Установка

```bash
sudo apt update
sudo apt install nginx
```

После установки проверьте статус:

```bash
sudo systemctl status nginx
```

Если сервис запущен, откройте в браузере `http://<IP-адрес>` — вы увидите страницу «Welcome to nginx!».

## 2. Базовая конфигурация

Конфигурационные файлы находятся в `/etc/nginx`. Основной файл — `/etc/nginx/nginx.conf`. В большинстве случаев достаточно редактировать файлы в каталоге `sites-available` и создавать символические ссылки в `sites-enabled`.

### 2.1 Создание виртуального хоста

Создайте файл `/etc/nginx/sites-available/example.com`:

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    root /var/www/example.com/html;
    index index.html index.htm;

    location / {
        try_files $uri $uri/ =404;
    }

    # Статические файлы
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires max;
        log_not_found off;
    }

    # Логи
    access_log /var/log/nginx/example.com.access.log;
    error_log /var/log/nginx/example.com.error.log;
}
```

Создайте каталог с контентом и файл `index.html`:

```bash
sudo mkdir -p /var/www/example.com/html
echo "<h1>Привет, Nginx!</h1>" | sudo tee /var/www/example.com/html/index.html
```

Активируйте сайт и перезапустите Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/example.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 3. Настройка обратного прокси

Если ваше приложение работает на другом порту (например, 8000), настройте проксирование:

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

После изменения конфигурации проверьте и перезапустите:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 4. Включение HTTPS

Самый простой способ получить сертификат — Let’s Encrypt. Установите `certbot`:

```bash
sudo apt install certbot python3-certbot-nginx
```

Запустите генерацию сертификата:

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

`certbot` автоматически обновит конфигурацию Nginx и настроит автоматическое обновление сертификатов.

## 5. Логи и мониторинг

- **Доступ**: `/var/log/nginx/example.com.access.log`
- **Ошибки**: `/var/log/nginx/example.com.error.log`

Для просмотра в реальном времени:

```bash
sudo tail -f /var/log/nginx/example.com.error.log
```

## 6. Тестирование

Проверьте, что сервер отвечает:

```bash
curl -I http://example.com
```

Вы должны увидеть заголовки `HTTP/1.1 200 OK`.

## 7. Заключение

Nginx — мощный инструмент, который можно настроить под любые задачи: от простого статического сайта до сложного микросервисного окружения. Следуя этому руководству, вы сможете быстро развернуть и настроить веб‑сервер под свои нужды.
