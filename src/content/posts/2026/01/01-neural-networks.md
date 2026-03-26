---
title: "Нейронные сети: основы"
description: "Фундаментальные концепции нейронных сетей: перцептрон, активации, backpropagation"
heroImage: "../../../../assets/imgs/2026/01/01-neural-networks.webp"
pubDate: "2026-01-01"
---

Нейронные сети — основа современного машинного обучения. Разберём фундаментальные концепции.

## Перцептрон

```python
import numpy as np

class Perceptron:
    def __init__(self, n_inputs):
        self.weights = np.random.randn(n_inputs)
        self.bias = 0
    
    def forward(self, x):
        z = np.dot(x, self.weights) + self.bias
        return 1 if z > 0 else 0
    
    def train(self, X, y, epochs=100, lr=0.01):
        for _ in range(epochs):
            for xi, yi in zip(X, y):
                prediction = self.forward(xi)
                error = yi - prediction
                self.weights += lr * error * xi
                self.bias += lr * error
```

## Полносвязная сеть

```python
import torch
import torch.nn as nn

class NeuralNetwork(nn.Module):
    def __init__(self, input_size, hidden_size, output_size):
        super().__init__()
        self.layer1 = nn.Linear(input_size, hidden_size)
        self.relu = nn.ReLU()
        self.layer2 = nn.Linear(hidden_size, output_size)
    
    def forward(self, x):
        x = self.layer1(x)
        x = self.relu(x)
        x = self.layer2(x)
        return x

model = NeuralNetwork(784, 128, 10)
```

## Функции активации

```python
# Sigmoid
def sigmoid(x):
    return 1 / (1 + np.exp(-x))

# ReLU
def relu(x):
    return np.maximum(0, x)

# Tanh
def tanh(x):
    return np.tanh(x)

# Softmax
def softmax(x):
    exp_x = np.exp(x - np.max(x))
    return exp_x / exp_x.sum()
```

## Backpropagation

```python
def backpropagation(y_true, y_pred, X):
    # Loss (MSE)
    loss = np.mean((y_true - y_pred) ** 2)
    
    # Gradients
    d_loss_d_pred = -2 * (y_true - y_pred)
    d_pred_d_z = sigmoid(z) * (1 - sigmoid(z))
    d_z_d_weights = X
    
    gradients = d_loss_d_pred * d_pred_d_z * d_z_d_weights
    
    # Update
    weights -= learning_rate * gradients
```

## Training loop

```python
model = NeuralNetwork(784, 128, 10)
criterion = nn.CrossEntropyLoss()
optimizer = torch.optim.Adam(model.parameters(), lr=0.001)

for epoch in range(10):
    for batch in dataloader:
        X, y = batch
        optimizer.zero_grad()
        outputs = model(X)
        loss = criterion(outputs, y)
        loss.backward()
        optimizer.step()
```

## Заключение

Понимание основ нейронных сетей критически важно для работы с современными ML моделями.