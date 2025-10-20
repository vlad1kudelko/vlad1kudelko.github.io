+++
lang = "ru"
title = "AlmaLinux: надежная бесплатная альтернатива CentOS для серверов"
description = "Обзор AlmaLinux — стабильной и бесплатной операционной системы на базе RHEL для замены CentOS в корпоративной среде."
template = "posts"
thumb = "/imgs/2025/06/28-almalinux-free-centos-alternative.webp"
publication_date = "2025-06-28"
+++

# AlmaLinux: надежная бесплатная альтернатива CentOS для серверов

В конце 2020 года Red Hat объявила о прекращении поддержки CentOS в его традиционном формате, что стало настоящим потрясением для миллионов системных администраторов по всему миру. CentOS долгие годы был золотым стандартом для корпоративных серверов — стабильный, надежный и полностью бесплатный клон Red Hat Enterprise Linux (RHEL). Его внезапная трансформация в CentOS Stream оставила множество компаний в поиске достойной замены.

Одной из наиболее перспективных альтернатив стал AlmaLinux — дистрибутив, позиционирующий себя как прямой преемник CentOS. В этой статье мы подробно рассмотрим, что представляет собой AlmaLinux, почему он заслуживает внимания и как его использовать в корпоративной среде.

## Что такое AlmaLinux

AlmaLinux — это бесплатная операционная система на базе Linux, созданная компанией CloudLinux как полностью совместимая с RHEL альтернатива. Название "Alma" происходит от латинского слова, означающего "душа", что символизирует стремление сохранить дух оригинального CentOS.

Проект был официально анонсирован в марте 2021 года и быстро завоевал доверие сообщества благодаря нескольким ключевым преимуществам:

- **Полная бинарная совместимость с RHEL** — приложения, разработанные для RHEL, работают на AlmaLinux без модификаций
- **Бесплатность и открытость** — дистрибутив полностью бесплатен и распространяется с открытым исходным кодом
- **Долгосрочная поддержка** — каждая мажорная версия поддерживается минимум 10 лет
- **Поддержка сообщества и организации** — за проектом стоит некоммерческая организация AlmaLinux OS Foundation

## История возникновения и развитие проекта

После объявления Red Hat о том, что CentOS 8 прекратит существование в декабре 2021 года (вместо запланированного 2029), индустрия оказалась перед необходимостью быстрого поиска альтернативы. CentOS Stream, предложенный как замена, не подходил для production-окружений из-за своего статуса "предрелизной" версии RHEL.

CloudLinux, компания с более чем десятилетним опытом работы с RHEL-подобными системами, взяла на себя ответственность за создание настоящего преемника. Уже в феврале 2021 года была выпущена бета-версия AlmaLinux 8, а стабильный релиз появился 30 марта 2021 года.

В 2022 году проект преобразовался в управление некоммерческой организацией AlmaLinux OS Foundation, что гарантировало его независимость и долгосрочное развитие. Сегодня AlmaLinux поддерживается не только CloudLinux, но и множеством крупных технологических компаний и спонсоров.

## Основные возможности и преимущества

### Стабильность и надежность

AlmaLinux наследует проверенную временем архитектуру RHEL, что обеспечивает исключительную стабильность. Каждый пакет проходит тщательное тестирование перед включением в репозиторий. Это критично для серверов, требующих максимального времени безотказной работы.

### Безопасность

Дистрибутив получает все обновления безопасности синхронно с RHEL, обеспечивая защиту от известных уязвимостей. В состав включены:

- SELinux для мандатного контроля доступа
- Firewalld для управления межсетевым экраном
- Регулярные патчи безопасности
- Поддержка Secure Boot

### Широкая аппаратная поддержка

AlmaLinux поддерживает множество архитектур процессоров:

- x86_64 (Intel и AMD)
- ARM64 (AArch64)
- PowerPC (ppc64le)
- s390x (IBM Z)

Это делает его пригодным для использования на любых платформах — от виртуальных машин до физических серверов и облачных инфраструктур.

### Совместимость с экосистемой RHEL

Одно из главных преимуществ — полная совместимость с экосистемой Red Hat:

- RPM-пакеты для RHEL работают без изменений
- Инструкции и документация для RHEL применимы к AlmaLinux
- Панели управления вроде cPanel, Plesk, DirectAdmin официально поддерживают AlmaLinux
- Коммерческое ПО, сертифицированное для RHEL, работает на AlmaLinux

## Сравнение с конкурентами

### AlmaLinux vs Rocky Linux

Rocky Linux — еще один популярный форк CentOS, созданный Грегори Курцером, одним из основателей оригинального CentOS. Оба дистрибутива очень похожи:

**Сходства:**
- Полная совместимость с RHEL
- Бесплатность и открытость
- Управление сообществом

**Различия:**
- AlmaLinux выпустила стабильную версию раньше
- AlmaLinux управляется фондом с участием крупных компаний
- Rocky Linux имеет более тесную связь с оригинальной командой CentOS
- Незначительные различия в политике обновлений

На практике оба дистрибутива являются отличным выбором, и решение зависит от личных предпочтений.

### AlmaLinux vs CentOS Stream

CentOS Stream — это rolling-release дистрибутив, находящийся между Fedora и RHEL в цикле разработки. Ключевые различия:

- **Стабильность**: AlmaLinux стабильнее, так как является точкой релиза, а не развивающейся веткой
- **Предсказуемость**: AlmaLinux имеет четкие версии и график обновлений
- **Применение**: Stream больше подходит для тестирования, AlmaLinux — для production

### AlmaLinux vs Ubuntu Server

Ubuntu Server — популярная альтернатива на базе Debian:

- **Цикл релизов**: AlmaLinux следует графику RHEL (новая версия каждые 3-4 года), Ubuntu имеет LTS каждые 2 года
- **Пакетный менеджер**: AlmaLinux использует RPM/DNF, Ubuntu — DEB/APT
- **Философия**: AlmaLinux консервативнее, Ubuntu более современна
- **Корпоративная поддержка**: обе системы имеют платные опции поддержки

## Установка AlmaLinux

### Системные требования

Минимальные требования для установки AlmaLinux:

- **Процессор**: 64-битный x86_64 или ARM64
- **Оперативная память**: минимум 1.5 ГБ (рекомендуется 2 ГБ+)
- **Дисковое пространство**: минимум 10 ГБ (рекомендуется 20 ГБ+)
- **Сеть**: подключение к интернету для установки обновлений

### Загрузка образа

Образы AlmaLinux доступны на официальном сайте:

```
https://almalinux.org/get-almalinux/
```

Доступны следующие варианты:

- **DVD ISO** — полный образ с пакетами (~9 ГБ)
- **Minimal ISO** — минимальная установка (~2 ГБ)
- **Boot ISO** — загрузочный образ для сетевой установки (~700 МБ)

Также доступны облачные образы для:
- AWS
- Azure
- Google Cloud Platform
- OpenStack
- Docker/Podman контейнеры
- Vagrant
- LXC/LXD

### Процесс установки

Установка AlmaLinux похожа на установку RHEL или CentOS:

1. **Загрузка с носителя**: запустите систему с ISO-образа
2. **Выбор языка**: выберите язык интерфейса установщика
3. **Настройка разметки диска**: создайте разделы вручную или используйте автоматическую разметку
4. **Настройка сети**: настройте сетевые интерфейсы и hostname
5. **Выбор программного обеспечения**: выберите профиль установки (сервер, рабочая станция и т.д.)
6. **Создание пользователя**: установите root-пароль и создайте пользователя
7. **Установка**: дождитесь завершения копирования файлов
8. **Перезагрузка**: удалите установочный носитель и перезагрузите систему

### Пример минимальной установки через командную строку

После загрузки Minimal ISO можно выполнить текстовую установку:

```bash
# Выбор режима текстовой установки при загрузке
# Нажмите Tab при выборе "Install AlmaLinux" и добавьте
inst.text

# После загрузки установщика следуйте инструкциям
# Базовая настройка сети
nmcli con mod eth0 ipv4.addresses 192.168.1.100/24
nmcli con mod eth0 ipv4.gateway 192.168.1.1
nmcli con mod eth0 ipv4.dns 8.8.8.8
nmcli con mod eth0 ipv4.method manual
nmcli con up eth0
```

## Первоначальная настройка системы

### Обновление системы

После первой загрузки рекомендуется обновить систему:

```bash
# Обновление всех пакетов
sudo dnf update -y

# Проверка версии системы
cat /etc/almalinux-release

# Проверка доступных обновлений
sudo dnf check-update
```

### Настройка firewall

AlmaLinux использует firewalld для управления межсетевым экраном:

```bash
# Проверка статуса firewalld
sudo systemctl status firewalld

# Запуск и автозапуск
sudo systemctl enable --now firewalld

# Разрешение HTTP и HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# Применение изменений
sudo firewall-cmd --reload

# Просмотр правил
sudo firewall-cmd --list-all
```

### Настройка SELinux

SELinux обеспечивает дополнительный уровень безопасности:

```bash
# Проверка статуса SELinux
getenforce

# Временное переключение в permissive режим (для отладки)
sudo setenforce 0

# Постоянная настройка в /etc/selinux/config
sudo nano /etc/selinux/config
# SELINUX=enforcing  # enforcing, permissive, или disabled

# Просмотр логов SELinux
sudo ausearch -m avc -ts recent
```

### Настройка SSH

Усиление безопасности SSH-доступа:

```bash
# Редактирование конфигурации SSH
sudo nano /etc/ssh/sshd_config

# Рекомендуемые изменения:
# Port 2222                    # Изменить порт
# PermitRootLogin no           # Запретить вход под root
# PasswordAuthentication no    # Только ключи
# MaxAuthTries 3               # Ограничить попытки

# Перезапуск службы
sudo systemctl restart sshd

# Добавление порта в firewall
sudo firewall-cmd --permanent --add-port=2222/tcp
sudo firewall-cmd --reload
```

## Управление пакетами

AlmaLinux использует DNF (Dandified YUM) в качестве менеджера пакетов.

### Основные команды DNF

```bash
# Поиск пакета
sudo dnf search nginx

# Информация о пакете
sudo dnf info nginx

# Установка пакета
sudo dnf install nginx

# Удаление пакета
sudo dnf remove nginx

# Обновление конкретного пакета
sudo dnf update nginx

# Просмотр установленных пакетов
sudo dnf list installed

# Просмотр истории операций
sudo dnf history

# Откат последней операции
sudo dnf history undo last
```

### Работа с репозиториями

```bash
# Список подключенных репозиториев
sudo dnf repolist

# Добавление EPEL репозитория
sudo dnf install epel-release

# Отключение репозитория
sudo dnf config-manager --disable epel

# Включение репозитория
sudo dnf config-manager --enable epel

# Очистка кэша
sudo dnf clean all
```

### Установка популярных репозиториев

```bash
# EPEL - дополнительные пакеты для Enterprise Linux
sudo dnf install epel-release

# Remi репозиторий - для PHP и связанных пакетов
sudo dnf install https://rpms.remirepo.net/enterprise/remi-release-8.rpm

# Docker CE репозиторий
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Node.js из NodeSource
curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
```

## Настройка веб-сервера

### Установка и настройка Nginx

```bash
# Установка Nginx
sudo dnf install nginx

# Запуск и автозапуск
sudo systemctl enable --now nginx

# Разрешение в firewall
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Проверка статуса
sudo systemctl status nginx

# Базовая конфигурация виртуального хоста
sudo nano /etc/nginx/conf.d/example.conf
```

Пример конфигурации:

```nginx
server {
    listen 80;
    server_name example.com www.example.com;
    root /var/www/example.com;
    index index.html index.htm;

    location / {
        try_files $uri $uri/ =404;
    }

    access_log /var/log/nginx/example.com.access.log;
    error_log /var/log/nginx/example.com.error.log;
}
```

```bash
# Проверка конфигурации
sudo nginx -t

# Перезагрузка конфигурации
sudo systemctl reload nginx

# Создание директории для сайта
sudo mkdir -p /var/www/example.com
sudo chown -R nginx:nginx /var/www/example.com
```

### Установка Apache

```bash
# Установка Apache (httpd)
sudo dnf install httpd

# Запуск и автозапуск
sudo systemctl enable --now httpd

# Создание виртуального хоста
sudo nano /etc/httpd/conf.d/example.conf
```

Пример конфигурации Apache:

```apache
<VirtualHost *:80>
    ServerName example.com
    ServerAlias www.example.com
    DocumentRoot /var/www/example.com
    
    <Directory /var/www/example.com>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog /var/log/httpd/example.com-error.log
    CustomLog /var/log/httpd/example.com-access.log combined
</VirtualHost>
```

```bash
# Проверка конфигурации
sudo apachectl configtest

# Перезагрузка
sudo systemctl reload httpd
```

## Установка баз данных

### MySQL/MariaDB

```bash
# Установка MariaDB
sudo dnf install mariadb-server

# Запуск и автозапуск
sudo systemctl enable --now mariadb

# Начальная настройка безопасности
sudo mysql_secure_installation

# Подключение к базе
sudo mysql -u root -p

# Создание базы данных и пользователя
CREATE DATABASE myapp;
CREATE USER 'myappuser'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON myapp.* TO 'myappuser'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### PostgreSQL

```bash
# Установка PostgreSQL
sudo dnf install postgresql-server postgresql-contrib

# Инициализация базы данных
sudo postgresql-setup --initdb

# Запуск и автозапуск
sudo systemctl enable --now postgresql

# Переключение на пользователя postgres
sudo -i -u postgres

# Создание базы данных и пользователя
createdb myapp
createuser myappuser
psql

ALTER USER myappuser WITH PASSWORD 'strong_password';
GRANT ALL PRIVILEGES ON DATABASE myapp TO myappuser;
\q
exit
```

### Redis

```bash
# Установка Redis
sudo dnf install redis

# Редактирование конфигурации
sudo nano /etc/redis/redis.conf

# Рекомендуемые изменения:
# bind 127.0.0.1               # Только локальные подключения
# requirepass your_password     # Установить пароль
# maxmemory 256mb              # Ограничить память
# maxmemory-policy allkeys-lru # Политика вытеснения

# Запуск и автозапуск
sudo systemctl enable --now redis

# Проверка работы
redis-cli ping
```

## Настройка PHP

```bash
# Установка PHP 8.x из Remi репозитория
sudo dnf install epel-release
sudo dnf install https://rpms.remirepo.net/enterprise/remi-release-8.rpm

# Включение модуля PHP 8.1
sudo dnf module reset php
sudo dnf module enable php:remi-8.1

# Установка PHP и расширений
sudo dnf install php php-fpm php-mysqlnd php-pgsql php-xml php-mbstring \
    php-json php-gd php-curl php-zip php-intl php-opcache

# Настройка PHP-FPM для Nginx
sudo nano /etc/php-fpm.d/www.conf

# Изменить пользователя на nginx:
# user = nginx
# group = nginx

# Запуск и автозапуск
sudo systemctl enable --now php-fpm

# Проверка версии
php -v
```

Настройка Nginx для работы с PHP:

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/example.com;
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php-fpm/www.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ /\.ht {
        deny all;
    }
}
```

## Мониторинг и логирование

### Системные логи

```bash
# Просмотр системных логов через journalctl
sudo journalctl -xe          # Последние записи с деталями
sudo journalctl -u nginx     # Логи конкретной службы
sudo journalctl --since today # Логи за сегодня
sudo journalctl -f           # Мониторинг в реальном времени

# Традиционные логи в /var/log
sudo tail -f /var/log/messages    # Системные сообщения
sudo tail -f /var/log/secure      # Логи аутентификации
sudo tail -f /var/log/audit/audit.log # Логи аудита
```

### Мониторинг ресурсов

```bash
# Установка инструментов мониторинга
sudo dnf install htop iotop nethogs sysstat

# htop - интерактивный просмотр процессов
htop

# iotop - мониторинг дисковой активности
sudo iotop

# nethogs - мониторинг сетевой активности по процессам
sudo nethogs

# iostat - статистика дисковых операций
iostat -x 2

# Мониторинг дискового пространства
df -h
du -sh /var/log/*
```

### Установка системы мониторинга

Пример установки Netdata для комплексного мониторинга:

```bash
# Автоматическая установка Netdata
bash <(curl -Ss https://my-netdata.io/kickstart.sh)

# Разрешение доступа через firewall
sudo firewall-cmd --permanent --add-port=19999/tcp
sudo firewall-cmd --reload

# Доступ к веб-интерфейсу: http://your-server:19999
```

## Резервное копирование

### Настройка rsync для бэкапов

```bash
# Установка rsync
sudo dnf install rsync

# Пример скрипта бэкапа
sudo nano /usr/local/bin/backup.sh
```

Содержимое скрипта:

```bash
#!/bin/bash

BACKUP_DIR="/backup"
SOURCE_DIRS="/var/www /etc /home"
DATE=$(date +%Y-%m-%d)
BACKUP_PATH="$BACKUP_DIR/$DATE"

mkdir -p $BACKUP_PATH

for dir in $SOURCE_DIRS; do
    rsync -avz --delete $dir $BACKUP_PATH/
done

# Удаление бэкапов старше 7 дней
find $BACKUP_DIR -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;

echo "Backup completed: $DATE"
```

```bash
# Сделать скрипт исполняемым
sudo chmod +x /usr/local/bin/backup.sh

# Добавление в cron для ежедневного выполнения
sudo crontab -e
# Добавить строку:
0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1
```

### Использование Restic

Restic — современная утилита для резервного копирования:

```bash
# Установка Restic
sudo dnf install restic

# Инициализация репозитория
restic init --repo /backup/restic

# Создание бэкапа
restic -r /backup/restic backup /var/www /etc /home

# Просмотр снимков
restic -r /backup/restic snapshots

# Восстановление
restic -r /backup/restic restore latest --target /restore
```

## Автоматизация и DevOps

### Установка Ansible

```bash
# Установка Ansible
sudo dnf install ansible

# Проверка версии
ansible --version

# Создание инвентаря
sudo nano /etc/ansible/hosts
```

Пример инвентаря:

```ini
[webservers]
web1.example.com
web2.example.com

[databases]
db1.example.com

[all:vars]
ansible_user=admin
ansible_become=yes
```

Простой playbook для обновления серверов:

```yaml
---
- name: Обновление серверов
  hosts: all
  tasks:
    - name: Обновление всех пакетов
      dnf:
        name: "*"
        state: latest
    
    - name: Перезагрузка если требуется
      reboot:
        msg: "Перезагрузка после обновлений"
      when: ansible_facts.packages | length > 0
```

### Установка Docker

```bash
# Удаление старых версий
sudo dnf remove docker docker-common docker-engine

# Установка необходимых пакетов
sudo dnf install dnf-plugins-core

# Добавление официального репозитория Docker
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# Установка Docker
sudo dnf install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Запуск и автозапуск
sudo systemctl enable --now docker

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER

# Проверка установки
docker --version
docker compose version

# Тестовый запуск
docker run hello-world
```

### Пример Docker Compose для веб-приложения

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./html:/usr/share/nginx/html:ro
    depends_on:
      - php

  php:
    image: php:8.1-fpm-alpine
    volumes:
      - ./html:/var/www/html:ro

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: myapp
      MYSQL_USER: myappuser
      MYSQL_PASSWORD: myapppassword
    volumes:
      - mysql-data:/var/lib/mysql

volumes:
  mysql-data:
```

## Безопасность и hardening

### Установка и настройка Fail2Ban

```bash
# Установка Fail2Ban
sudo dnf install fail2ban fail2ban-systemd

# Создание локальной конфигурации
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local
```

Рекомендуемая конфигурация:

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5
destemail = admin@example.com
sendername = Fail2Ban
action = %(action_mwl)s

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-noscript]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
```

```bash
# Запуск и автозапуск
sudo systemctl enable --now fail2ban

# Проверка статуса
sudo fail2ban-client status
sudo fail2ban-client status sshd
```

### Настройка автоматических обновлений безопасности

```bash
# Установка dnf-automatic
sudo dnf install dnf-automatic

# Настройка для автоматической установки обновлений безопасности
sudo nano /etc/dnf/automatic.conf
```

Изменить параметры:

```ini
[commands]
upgrade_type = security
apply_updates = yes

[emitters]
emit_via = email

[email]
email_to = admin@example.com
```

```bash
# Запуск и автозапуск
sudo systemctl enable --now dnf-automatic.timer

# Проверка расписания
sudo systemctl list-timers dnf-automatic.timer
```

### Настройка системы обнаружения вторжений

```bash
# Установка AIDE (Advanced Intrusion Detection Environment)
sudo dnf install aide

# Инициализация базы данных
sudo aide --init

# Копирование базы данных
sudo mv /var/lib/aide/aide.db.new.gz /var/lib/aide/aide.db.gz

# Проверка целостности
sudo aide --check

# Добавление в cron для регулярных проверок
echo "0 3 * * * root /usr/sbin/aide --check | mail -s 'AIDE Check' admin@example.com" | sudo tee -a /etc/crontab
```

## Производительность и оптимизация

### Настройка параметров ядра

```bash
# Редактирование sysctl
sudo nano /etc/sysctl.conf
```

Рекомендуемые параметры для веб-сервера:

```ini
# Увеличение лимитов сетевых соединений
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 8192

# Оптимизация TCP
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_tw_reuse = 1

# Защита от SYN flood
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_synack_retries = 2

# Увеличение лимитов файловых дескрипторов
fs.file-max = 2097152
```

```bash
# Применение изменений
sudo sysctl -p

# Увеличение лимитов для пользователей
sudo nano /etc/security/limits.conf
```

Добавить:

```
* soft nofile 65535
* hard nofile 65535
* soft nproc 65535
* hard nproc 65535
```

### Настройка swap

```bash
# Создание файла подкачки (8GB)
sudo fallocate -l 8G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Добавление в fstab для постоянного монтирования
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Настройка swappiness
sudo sysctl vm.swappiness=10
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

### Оптимизация Nginx

```nginx
# Редактирование главной конфигурации
sudo nano /etc/nginx/nginx.conf
```

Оптимизированная конфигурация:

```nginx
user nginx;
worker_processes auto;
worker_rlimit_nofile 65535;
error_log /var/log/nginx/error.log warn;
pid /run/nginx.pid;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Логирование
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    access_log /var/log/nginx/access.log main;
    
    # Производительность
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;
    
    # Gzip сжатие
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss 
               application/rss+xml font/truetype font/opentype 
               application/vnd.ms-fontobject image/svg+xml;
    
    # Кэширование
    open_file_cache max=10000 inactive=20s;
    open_file_cache_valid 30s;
    open_file_cache_min_uses 2;
    open_file_cache_errors on;
    
    # Безопасность
    server_tokens off;
    
    include /etc/nginx/conf.d/*.conf;
}
```

## Миграция с CentOS на AlmaLinux

Для существующих серверов на CentOS 8 доступен инструмент для миграции на AlmaLinux.

### Подготовка к миграции

```bash
# Создание резервной копии
sudo tar -czf /backup/system-backup-$(date +%F).tar.gz \
    /etc /var/www /home --exclude=/home/*/.cache

# Обновление текущей системы
sudo dnf update -y

# Перезагрузка
sudo reboot
```

### Процесс миграции

```bash
# Загрузка скрипта миграции
curl -O https://raw.githubusercontent.com/AlmaLinux/almalinux-deploy/master/almalinux-deploy.sh

# Проверка скрипта
less almalinux-deploy.sh

# Запуск миграции
sudo bash almalinux-deploy.sh

# Перезагрузка после завершения
sudo reboot
```

### Проверка после миграции

```bash
# Проверка версии ОС
cat /etc/almalinux-release

# Проверка работы служб
sudo systemctl status nginx
sudo systemctl status mariadb
sudo systemctl status php-fpm

# Проверка логов на ошибки
sudo journalctl -p err -b
```

## Управление версиями и обновление

### Обновление между минорными версиями

AlmaLinux автоматически получает обновления в рамках мажорной версии:

```bash
# Регулярное обновление
sudo dnf update -y

# Проверка доступных обновлений безопасности
sudo dnf updateinfo list security

# Установка только обновлений безопасности
sudo dnf update --security
```

### Обновление до новой мажорной версии

Для обновления с AlmaLinux 8 до AlmaLinux 9:

```bash
# Создание полной резервной копии!

# Установка инструмента обновления
sudo dnf install leapp-upgrade leapp-data-almalinux

# Проверка возможности обновления
sudo leapp preupgrade

# Просмотр отчета
sudo cat /var/log/leapp/leapp-report.txt

# Устранение всех выявленных проблем

# Запуск обновления
sudo leapp upgrade

# Перезагрузка
sudo reboot
```

## Облачные и контейнерные решения

### AlmaLinux в облаке

AlmaLinux официально поддерживается всеми крупными облачными провайдерами:

**AWS**:
```bash
# Поиск AMI AlmaLinux в AWS
aws ec2 describe-images --owners 679593333241 \
    --filters "Name=name,Values=AlmaLinux OS*" \
    --query 'Images[*].[ImageId,Name,CreationDate]' \
    --output table
```

**Azure**:
```bash
# Создание VM с AlmaLinux в Azure
az vm create \
    --resource-group myResourceGroup \
    --name myVM \
    --image almalinux:almalinux:8_5:latest \
    --admin-username azureuser \
    --generate-ssh-keys
```

**Google Cloud**:
```bash
# Создание инстанса в GCP
gcloud compute instances create almalinux-instance \
    --image-family=almalinux-8 \
    --image-project=almalinux-cloud
```

### AlmaLinux Docker образы

```bash
# Загрузка официального образа
docker pull almalinux:8
docker pull almalinux:9

# Запуск контейнера
docker run -it almalinux:8 bash

# Создание собственного образа на базе AlmaLinux
```

Пример Dockerfile:

```dockerfile
FROM almalinux:8

# Установка необходимых пакетов
RUN dnf update -y && \
    dnf install -y nginx php php-fpm php-mysqlnd && \
    dnf clean all

# Копирование конфигурации
COPY nginx.conf /etc/nginx/nginx.conf
COPY app/ /var/www/html/

# Открытие порта
EXPOSE 80

# Запуск
CMD ["nginx", "-g", "daemon off;"]
```
