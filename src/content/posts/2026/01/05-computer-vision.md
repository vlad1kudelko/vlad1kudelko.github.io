---
title: "Компьютерное зрение: CNN и классификация изображений"
description: "Свёрточные нейросети для задач компьютерного зрения: архитектуры, техники и инструменты"
heroImage: "../../../../assets/imgs/2026/01/05-computer-vision.webp"
pubDate: "2026-01-05"
---

Компьютерное зрение — область ML, связанная с обработкой и анализом изображений.

## Свёрточные нейросети (CNN)

```python
import torch.nn as nn

class CNN(nn.Module):
    def __init__(self):
        super().__init__()
        self.conv1 = nn.Conv2d(3, 32, 3, padding=1)
        self.pool = nn.MaxPool2d(2, 2)
        self.conv2 = nn.Conv2d(32, 64, 3, padding=1)
        self.fc1 = nn.Linear(64 * 8 * 8, 256)
        self.fc2 = nn.Linear(256, 10)
    
    def forward(self, x):
        x = self.pool(nn.ReLU(self.conv1(x)))
        x = self.pool(nn.ReLU(self.conv2(x)))
        x = x.view(-1, 64 * 8 * 8)
        x = nn.ReLU(self.fc1(x))
        x = self.fc2(x)
        return x
```

## Pretrained models

```python
import torchvision.models as models
import torchvision.transforms as transforms

model = models.resnet50(pretrained=True)

transform = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                         std=[0.229, 0.224, 0.225])
])
```