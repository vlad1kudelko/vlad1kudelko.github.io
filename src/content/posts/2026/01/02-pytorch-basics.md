---
title: "PyTorch: основы глубокого обучения"
description: "Работа с PyTorch: тензоры, автоградиенты, модули и создание нейросетей"
heroImage: "../../../../assets/imgs/2026/01/02-pytorch-basics.webp"
pubDate: "2026-01-02"
---

PyTorch — основной фреймворк для глубокого обучения от Meta.

## Тензоры

```python
import torch

# Создание тензоров
x = torch.tensor([1, 2, 3])
x = torch.zeros(3, 3)
x = torch.randn(3, 3)  # нормальное распределение

# Операции
y = x + 2
z = torch.matmul(x, y)
w = x.view(9)  # reshape
```

## Автоградиенты

```python
x = torch.tensor([1., 2., 3.], requires_grad=True)
y = x ** 2
z = y.mean()

z.backward()  # вычисление градиентов

print(x.grad)  # градиенты d(z)/d(x)
```

## Нейросеть

```python
import torch.nn as nn

class Net(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc1 = nn.Linear(784, 256)
        self.relu = nn.ReLU()
        self.fc2 = nn.Linear(256, 10)
    
    def forward(self, x):
        x = x.view(-1, 784)
        x = self.relu(self.fc1(x))
        x = self.fc2(x)
        return x
```

## DataLoader

```python
from torch.utils.data import DataLoader, TensorDataset

X = torch.randn(1000, 784)
y = torch.randint(0, 10, (1000,))

dataset = TensorDataset(X, y)
loader = DataLoader(dataset, batch_size=32, shuffle=True)

for batch_x, batch_y in loader:
    # Обучение
    pass
```

## Transfer Learning

```python
import torchvision.models as models

model = models.resnet50(pretrained=True)

# Заморозка слоёв
for param in model.parameters():
    param.requires_grad = False

# Замена последнего слоя
model.fc = nn.Linear(2048, 10)

# Обучение только последнего слоя
optimizer = torch.optim.Adam(model.fc.parameters())
```