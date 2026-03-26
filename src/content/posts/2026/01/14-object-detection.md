---
title: "Object Detection: детекция объектов"
description: "YOLO, Faster R-CNN — современные модели детекции объектов"
heroImage: "../../../../assets/imgs/2026/01/14-object-detection.webp"
pubDate: "2026-01-14"
---

Object detection — поиск и классификация объектов на изображении.

```python
from ultralytics import YOLO

model = YOLO("yolov8n.pt")

results = model("image.jpg")

for result in results:
    boxes = result.boxes
    for box in boxes:
        print(f"Class: {box.cls}, Conf: {box.conf}, Box: {box.xyxy}")
```