---
title: "GAN: генеративные состязательные сети"
description: "Архитектура GAN: генератор, дискриминатор и обучение в состязательном режиме"
heroImage: "../../../../assets/imgs/2026/01/06-gan.webp"
pubDate: "2026-01-06"
---

GAN — генеративные модели, обучающиеся через соревнование генератора и дискриминатора.

```python
class Generator(nn.Module):
    def __init__(self, latent_dim, img_shape):
        super().__init__()
        self.img_shape = img_shape
        self.fc = nn.Linear(latent_dim, 128 * 8 * 8)
        self.conv1 = nn.ConvTranspose2d(128, 64, 4, 2, 1)
        self.conv2 = nn.ConvTranspose2d(64, 32, 4, 2, 1)
        self.conv3 = nn.ConvTranspose2d(32, 3, 4, 2, 1)
    
    def forward(self, z):
        x = self.fc(z).view(-1, 128, 8, 8)
        x = nn.ReLU(self.conv1(x))
        x = nn.ReLU(self.conv2(x))
        x = torch.tanh(self.conv3(x))
        return x

class Discriminator(nn.Module):
    def __init__(self, img_shape):
        super().__init__()
        self.conv1 = nn.Conv2d(3, 32, 4, 2, 1)
        self.conv2 = nn.Conv2d(32, 64, 4, 2, 1)
        self.fc = nn.Linear(64 * 8 * 8, 1)
    
    def forward(self, x):
        x = nn.LeakyReLU(0.2)(self.conv1(x))
        x = nn.LeakyReLU(0.2)(self.conv2(x))
        x = x.view(-1, 64 * 8 * 8)
        return torch.sigmoid(self.fc(x))
```