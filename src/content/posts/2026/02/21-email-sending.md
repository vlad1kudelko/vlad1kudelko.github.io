---
title: "Email: отправка и шаблоны"
description: "Nodemailer, SendGrid, email templates, SPF/DKIM/DMARC"
heroImage: "../../../../assets/imgs/2026/02/21-email-sending.webp"
pubDate: "2026-02-21"
---

Отправка email в приложениях.

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendEmail(to, subject, html) {
  await transporter.sendMail({
    from: '"My App" <noreply@myapp.com>',
    to,
    subject,
    html
  });
}
```