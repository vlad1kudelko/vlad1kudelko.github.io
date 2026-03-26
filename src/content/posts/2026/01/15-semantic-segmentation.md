---
title: "Semantic Segmentation"
description: "Сегментация изображений на уровне пикселей: U-Net, DeepLab"
heroImage: "../../../../assets/imgs/2026/01/15-semantic-segmentation.webp"
pubDate: "2026-01-15"
---

Semantic segmentation присваивает класс каждому пикселю.

```python
import segmentation_models_pytorch as smp

model = smp.Unet(
    encoder_name="resnet34",
    encoder_weights="imagenet",
    in_channels=3,
    classes=10
)
```