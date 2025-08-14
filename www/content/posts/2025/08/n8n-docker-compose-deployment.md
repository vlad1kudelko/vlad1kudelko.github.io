+++
lang = "ru"
title = "n8n + Docker Compose: настройка и развертывание"
description = "Полное руководство по настройке и развертыванию n8n workflow automation платформы с использованием Docker Compose: от базовой установки до продакшен конфигурации."
template = "posts"
thumb = "/imgs/2025/08/n8n-docker-compose-deployment.png"
publication_date = "2025-08-14"
+++

# n8n + Docker Compose: настройка и развертывание

**n8n** — это мощная платформа для автоматизации рабочих процессов (workflow automation), которая позволяет создавать сложные цепочки автоматизации без написания кода. Развертывание n8n с помощью Docker Compose обеспечивает простоту установки, масштабируемость и легкое управление инфраструктурой. В этой статье мы рассмотрим, как эффективно развернуть n8n в контейнерах с настройкой персистентности данных и оптимизацией для продакшена.

n8n поддерживает более 400 интеграций с различными сервисами и API, что делает его идеальным решением для автоматизации бизнес-процессов, интеграции систем и создания сложных workflow.

## 1. Что такое n8n и зачем он нужен

**n8n** — это open-source платформа для автоматизации рабочих процессов, которая позволяет:

- **Создавать workflow** — визуально проектировать цепочки автоматизации с помощью drag-and-drop интерфейса
- **Интегрировать сервисы** — подключать более 400 различных API и сервисов (Slack, GitHub, Google Sheets, CRM системы и т.д.)
- **Автоматизировать процессы** — выполнять повторяющиеся задачи без вмешательства человека
- **Мониторить выполнение** — отслеживать статус и результаты выполнения workflow
- **Масштабировать автоматизацию** — легко адаптировать процессы под изменяющиеся требования

### Основные сценарии использования:

- **Интеграция CRM и маркетинговых инструментов** — автоматическое создание лидов, обновление контактов
- **Автоматизация поддержки клиентов** — создание тикетов, уведомлений
- **Управление проектами** — автоматическое создание задач, обновление статусов
- **Аналитика и отчетность** — сбор данных из различных источников, формирование отчетов
- **DevOps автоматизация** — деплой, мониторинг, уведомления о статусе сборки

## 2. Преимущества Docker Compose для n8n

Использование Docker Compose для развертывания n8n предоставляет множество преимуществ:

- **Простота развертывания** — один файл конфигурации для всего стека
- **Изоляция окружения** — n8n работает в своем контейнере с предсказуемым поведением
- **Легкость масштабирования** — простое добавление новых экземпляров
- **Персистентность данных** — надежное хранение workflow и настроек
- **Быстрое обновление** — обновление версии n8n без влияния на систему
- **Портативность** — легко переносить между серверами и окружениями

## 3. Базовая структура проекта

Создадим структуру проекта для развертывания n8n:

```
n8n-docker-project/
├── docker-compose.yml
├── .env
├── n8n-data/
├── postgres-data/
├── nginx/
│   └── nginx.conf
└── README.md
```

- **docker-compose.yml** — основная конфигурация Docker Compose
- **.env** — переменные окружения и настройки
- **n8n-data/** — директория для данных n8n (workflow, credentials)
- **postgres-data/** — директория для базы данных PostgreSQL
- **nginx/** — конфигурация веб-сервера (опционально)

## 4. Начало работы

### 4.1. Развертывание в один клик

**💡 Быстрый старт:** Всю платформу n8n можно развернуть в один клик на хостинге [Timeweb Cloud](/go/timeweb-cloud), используя их готовые шаблоны развертывания. Это идеальное решение для тех, кто хочет быстро запустить n8n без настройки Docker.

![Timeweb n8n](/res/2025/08/timeweb-n8n.png)

### 4.2. Создание docker-compose.yml

Создадим основной файл конфигурации Docker Compose:

```yaml
version: '3.8'

services:
  # База данных PostgreSQL для n8n
  postgres:
    image: postgres:15-alpine
    container_name: n8n-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: n8n
      POSTGRES_USER: n8n
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U n8n"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - n8n-network

  # Redis для кэширования и сессий
  redis:
    image: redis:7-alpine
    container_name: n8n-redis
    restart: unless-stopped
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - n8n-network

  # Основной сервис n8n
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      # Основные настройки
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USERNAME}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      
      # Настройки базы данных
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=n8n
      - DB_POSTGRESDB_USER=n8n
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD}
      
      # Настройки Redis
      - N8N_REDIS_HOST=redis
      - N8N_REDIS_PORT=6379
      
      # Настройки безопасности
      - N8N_HOST=${N8N_HOST}
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=${WEBHOOK_URL}
      
      # Настройки производительности
      - N8N_EXECUTIONS_DATA_SAVE_ON_ERROR=all
      - N8N_EXECUTIONS_DATA_SAVE_ON_SUCCESS=all
      - N8N_EXECUTIONS_DATA_SAVE_MANUAL_EXECUTIONS=true
      - N8N_EXECUTIONS_DATA_SAVE_ON_PROGRESS=true
      
      # Настройки логирования
      - N8N_LOG_LEVEL=info
      - N8N_LOG_OUTPUT=console
      
      # Настройки email (опционально)
      - N8N_EMAIL_MODE=smtp
      - N8N_EMAIL_SMTP_HOST=${SMTP_HOST}
      - N8N_EMAIL_SMTP_PORT=${SMTP_PORT}
      - N8N_EMAIL_SMTP_USER=${SMTP_USER}
      - N8N_EMAIL_SMTP_PASS=${SMTP_PASS}
      - N8N_EMAIL_SMTP_SECURE=true
      
      # Настройки уведомлений
      - N8N_NOTIFICATIONS_ENABLED=true
      - N8N_NOTIFICATIONS_EMAIL_ENABLED=true
      
      # Настройки webhook
      - N8N_WEBHOOK_TUNNEL_URL=${WEBHOOK_TUNNEL_URL}
      
      # Настройки масштабирования
      - N8N_QUEUE_BULL_REDIS_HOST=redis
      - N8N_QUEUE_BULL_REDIS_PORT=6379
      
      # Настройки безопасности
      - N8N_ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - N8N_USER_MANAGEMENT_DISABLED=false
      - N8N_DISABLE_PRODUCTION_MAIN_PROCESS=false
      
      # Настройки API
      - N8N_API_ENABLED=true
      - N8N_API_KEY=${API_KEY}
      
      # Настройки webhook
      - N8N_WEBHOOK_ENABLED=true
      - N8N_WEBHOOK_VERIFY_SSL=true
      
      # Настройки файлов
      - N8N_FILES_ENABLED=true
      - N8N_FILES_BACKEND=local
      - N8N_FILES_LOCAL_STORAGE_PATH=/home/node/.n8n/files
      
      # Настройки временных зон
      - GENERIC_TIMEZONE=${TIMEZONE}
      
    volumes:
      - n8n_data:/home/node/.n8n
      - n8n_files:/home/node/.n8n/files
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - n8n-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5678/healthz"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx для обратного прокси (опционально)
  nginx:
    image: nginx:alpine
    container_name: n8n-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - n8n
    networks:
      - n8n-network

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  n8n_data:
    driver: local
  n8n_files:
    driver: local

networks:
  n8n-network:
    driver: bridge
```

## 5. Создание файла .env

Создадим файл с переменными окружения:

```bash
# Основные настройки n8n
N8N_USERNAME=admin
N8N_PASSWORD=your_secure_password_here
N8N_HOST=localhost
WEBHOOK_URL=http://localhost:5678/
WEBHOOK_TUNNEL_URL=https://your-domain.com/

# Настройки базы данных
POSTGRES_PASSWORD=your_postgres_password_here

# Настройки Redis
REDIS_PASSWORD=your_redis_password_here

# Настройки email (опционально)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Настройки безопасности
ENCRYPTION_KEY=your-32-character-encryption-key-here
API_KEY=your-api-key-here

# Настройки временных зон
TIMEZONE=Europe/Moscow

# Настройки домена (для продакшена)
DOMAIN=your-domain.com
```

## 6. Настройка Nginx (опционально)

Создадим конфигурацию Nginx для обратного прокси:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream n8n_backend {
        server n8n:5678;
    }

    # HTTP -> HTTPS редирект
    server {
        listen 80;
        server_name your-domain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS сервер
    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        # SSL сертификаты
        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        
        # SSL настройки
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        # Безопасность
        add_header X-Frame-Options DENY;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Проксирование к n8n
        location / {
            proxy_pass http://n8n_backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # WebSocket поддержка
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            
            # Таймауты
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        # Статические файлы
        location /static/ {
            proxy_pass http://n8n_backend;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # Health check
        location /healthz {
            proxy_pass http://n8n_backend;
            access_log off;
        }
    }
}
```

## 7. Запуск и настройка

### Запуск сервисов:

```bash
# Создание директорий для данных
mkdir -p n8n-data postgres-data

# Запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f n8n

# Проверка статуса
docker-compose ps
```

### Первоначальная настройка:

1. **Откройте браузер** и перейдите по адресу `http://localhost:5678`
2. **Войдите** используя учетные данные из `.env` файла
3. **Создайте первого пользователя** (если это первый запуск)
4. **Настройте базовые параметры** (временная зона, уведомления)

## 8. Настройка персистентности данных

### Структура данных n8n:

```
n8n-data/
├── .n8n/
│   ├── database.sqlite (если используется SQLite)
│   ├── workflows/ (сохраненные workflow)
│   ├── credentials/ (сохраненные credentials)
│   ├── executions/ (данные выполнения)
│   ├── files/ (загруженные файлы)
│   └── logs/ (логи приложения)
```

### Резервное копирование:

```bash
#!/bin/bash
# backup-n8n.sh

BACKUP_DIR="/backups/n8n"
DATE=$(date +%Y%m%d_%H%M%S)

# Создание директории для бэкапа
mkdir -p $BACKUP_DIR

# Бэкап данных n8n
docker run --rm \
  --volumes-from n8n \
  -v $BACKUP_DIR:/backup \
  alpine tar czf /backup/n8n-data-$DATE.tar.gz /home/node/.n8n

# Бэкап базы данных PostgreSQL
docker exec n8n-postgres pg_dump -U n8n n8n > $BACKUP_DIR/postgres-$DATE.sql

# Удаление старых бэкапов (старше 30 дней)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete

echo "Backup completed: $DATE"
```

## 9. Мониторинг и логирование

### Настройка логирования:

```yaml
# В docker-compose.yml добавьте:
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

### Мониторинг через Docker:

```bash
# Статистика контейнеров
docker stats n8n postgres redis

# Использование диска
docker system df

# Логи в реальном времени
docker-compose logs -f --tail=100
```

### Health checks:

```bash
# Проверка здоровья n8n
curl -f http://localhost:5678/healthz

# Проверка базы данных
docker exec n8n-postgres pg_isready -U n8n

# Проверка Redis
docker exec n8n-redis redis-cli ping
```

## 10. Оптимизация для продакшена

### Настройки безопасности:

```yaml
# В docker-compose.yml добавьте:
security_opt:
  - no-new-privileges:true
read_only: true
tmpfs:
  - /tmp
  - /var/run
  - /var/lock
```

### Ограничения ресурсов:

```yaml
# Ограничения для n8n
deploy:
  resources:
    limits:
      cpus: '2.0'
      memory: 2G
    reservations:
      cpus: '1.0'
      memory: 1G
```

### Настройки сети:

```yaml
# Изоляция сети
networks:
  n8n-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

## 11. Масштабирование

### Горизонтальное масштабирование:

```bash
# Увеличение количества экземпляров n8n
docker-compose up -d --scale n8n=3

# Проверка балансировки
docker-compose ps n8n
```

### Load balancer конфигурация:

```nginx
upstream n8n_backend {
    server n8n:5678;
    server n8n:5678;
    server n8n:5678;
}
```

## 12. Обновление n8n

### Процесс обновления:

```bash
# Остановка сервисов
docker-compose down

# Обновление образов
docker-compose pull

# Запуск с новыми образами
docker-compose up -d

# Проверка статуса
docker-compose ps
```

### Откат при проблемах:

```bash
# Возврат к предыдущей версии
docker-compose down
docker tag n8nio/n8n:previous_version n8nio/n8n:latest
docker-compose up -d
```

## 13. Устранение неполадок

### Частые проблемы:

1. **Проблемы с подключением к базе данных:**
   ```bash
   # Проверка статуса PostgreSQL
   docker exec n8n-postgres pg_isready -U n8n
   
   # Проверка логов
   docker-compose logs postgres
   ```

2. **Проблемы с Redis:**
   ```bash
   # Проверка подключения Redis
   docker exec n8n-redis redis-cli ping
   
   # Очистка кэша Redis
   docker exec n8n-redis redis-cli flushall
   ```

3. **Проблемы с правами доступа:**
   ```bash
   # Исправление прав на директории
   sudo chown -R 1000:1000 n8n-data postgres-data
   ```

### Полезные команды:

```bash
# Перезапуск конкретного сервиса
docker-compose restart n8n

# Просмотр логов с фильтрацией
docker-compose logs n8n | grep ERROR

# Проверка использования ресурсов
docker stats --no-stream

# Очистка неиспользуемых ресурсов
docker system prune -f
```

## 14. Интеграция с CI/CD

### GitHub Actions для автоматического деплоя:

```yaml
name: Deploy n8n to production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.KEY }}
          script: |
            cd /path/to/n8n-project
            git pull origin main
            docker-compose down
            docker-compose pull
            docker-compose up -d
            docker system prune -f
```

## 15. Заключение

Развертывание n8n с помощью Docker Compose предоставляет надежное, масштабируемое и легко управляемое решение для автоматизации рабочих процессов. Основные преимущества:

- **Простота развертывания** — один файл конфигурации для всего стека
- **Надежность** — изоляция сервисов и автоматические health checks
- **Масштабируемость** — легкое добавление новых экземпляров
- **Персистентность** — надежное хранение данных и workflow
- **Безопасность** — изоляция окружения и настройки безопасности
- **Мониторинг** — встроенные инструменты для отслеживания состояния

### Следующие шаги:

1. **Настройка мониторинга** — интеграция с Prometheus, Grafana
2. **Автоматизация бэкапов** — настройка cron задач для резервного копирования
3. **SSL сертификаты** — настройка Let's Encrypt для HTTPS
4. **Кластеризация** — развертывание в нескольких зонах доступности
5. **Интеграция с внешними системами** — настройка webhook'ов и API

n8n с Docker Compose — это мощное решение для автоматизации бизнес-процессов, которое легко развернуть, настроить и масштабировать под ваши потребности.
