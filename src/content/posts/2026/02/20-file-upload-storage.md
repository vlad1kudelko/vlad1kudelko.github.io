---
title: "File Upload и хранение файлов"
description: "Загрузка файлов, S3, multipart/form-data, CDN"
heroImage: "../../../../assets/imgs/2026/02/20-file-upload-storage.webp"
pubDate: "2026-02-20"
---

Обработка загрузки файлов.

```javascript
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');

const s3 = new AWS.S3();

const upload = multer({
  storage: multerS3({
    s3,
    bucket: 'my-bucket',
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      cb(null, Date.now().toString() + '-' + file.originalname);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ url: req.file.location });
});
```