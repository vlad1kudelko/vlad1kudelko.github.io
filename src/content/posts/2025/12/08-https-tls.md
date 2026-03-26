---
title: "HTTPS и TLS: как работает шифрование — настройка"
description: "Изучите работу TLS и настройте HTTPS для вашего приложения. Сертификаты, handshake, best practices — обеспечьте безопасную передачу данных."
heroImage: "../../../../assets/imgs/2025/12/08-https-tls.webp"
pubDate: "2025-12-08"
---

# TLS и HTTPS: безопасное соединение

HTTPS — это HTTP с шифрованием TLS. Рассмотрим как это работает и как правильно настроить.

## Как работает TLS

### Handshake

```
Client                          Server
   |                               |
   |-------- ClientHello -------->|
   |<------ ServerHello ----------|
   |<------ Certificate ----------|
   |<------ ServerKeyExchange ----|
   |<------ CertificateRequest ---|
   |<------ ServerHelloDone ------|
   |-------- Certificate ------->|
   |-------- ClientKeyExchange -->|
   |-------- CertificateVerify -->|
   |-------- ChangeCipherSpec --->|
   |-------- Finished ----------->|
   |<------- ChangeCipherSpec ----|
   |<------- Finished ------------|
   |                               |
   |======= Encrypted Data =======>|
   |<======= Encrypted Data =======|
```

### Версии TLS

- **TLS 1.0** — устарел (1999)
- **TLS 1.1** — устарел (2006)
- **TLS 1.2** — текущий (2008)
- **TLS 1.3** — современный (2018)

## Сертификаты

### Типы сертификатов

- **DV** — Domain Validation (проверка домена)
- **OV** — Organization Validation (проверка организации)
- **EV** — Extended Validation (расширенная проверка)

### Получение сертификата

#### Let's Encrypt (бесплатно)

```bash
# Certbot
sudo apt install certbot python3-certbot-nginx

# Получение сертификата
sudo certbot --nginx -d example.com -d www.example.com

# Автообновление
sudo certbot renew --dry-run
```

#### ACME клиент

```javascript
// Node.js - certbot-zerossl
import { certificate } from 'acme-client';

const client = new certificate({
    email: 'admin@example.com',
    agreeTos: true
});

const { csr, privateKey } = await client.generateCsr({
    commonName: 'example.com'
});

const cert = await client.sign(csr, {
    altNames: ['www.example.com']
});
```

## Настройка Nginx

```nginx
server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    # Сертификаты
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # Современные настройки
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    resolver 8.8.8.8 8.8.4.4 valid=300s;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Node.js HTTPS сервер

```javascript
const https = require('https');
const fs = require('fs');

const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
    minVersion: 'TLSv1.2',
    ciphers: 'ECDHE-ECDSA-AES128-GCM-SHA256'
};

const server = https.createServer(options, (req, res) => {
    res.writeHead(200);
    res.end('Hello, HTTPS!');
});

server.listen(443);
```

## HTTP Strict Transport Security

```javascript
// Express с Helmet
const helmet = require('helmet');
app.use(helmet.hsts({
    maxAge: 63072000,  // 2 года
    includeSubDomains: true,
    preload: true
}));
```

## Certificate Pinning

```javascript
// HPKP - больше не рекомендуется
// Вместо этого - CT (Certificate Transparency)

// Проверка сертификата
const https = require('https');
const tls = require('tls');

const options = {
    host: 'example.com',
    port: 443,
    checkServerIdentity: (host, cert) => {
        if (cert.subject.CN !== 'example.com') {
            return new Error('Invalid certificate');
        }
        // Проверка fingerprint
        const fingerprint = cert.fingerprint256;
        const allowed = 'SHA256:...';
        if (fingerprint !== allowed) {
            return new Error('Certificate not trusted');
        }
    }
};
```

## Mixed Content

```html
<!-- CSP для предотвращения mixed content -->
<meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests">
```

## Проверка SSL

```bash
# SSL Labs
openssl s_client -connect example.com:443 -showcerts

# Проверка
ssllabs-scan example.com

# Тест
curl -Iv https://example.com
```

## Best Practices

1. **TLS 1.3** — используйте последнюю версию
2. **HSTS** — включите Strict-Transport-Security
3. **OCSP Stapling** — ускоряет проверку
4. **Let's Encrypt** — бесплатные сертификаты
5. **Автообновление** — настройте renew
6. **Certificate Transparency** — мониторинг

## Заключение

HTTPS обязателен для современных веб-приложений. Правильная настройка TLS обеспечивает безопасную передачу данных.