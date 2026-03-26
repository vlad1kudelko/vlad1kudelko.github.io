---
title: "Diffusion модели"
description: "Диффузионные модели: генерация изображений через обратный диффузионный процесс"
heroImage: "../../../../assets/imgs/2026/01/07-diffusion-models.webp"
pubDate: "2026-01-07"
---

Diffusion модели — современный подход к генерации изображений.

## DDPM

```python
import torch
import torch.nn as nn

class DiffusionModel(nn.Module):
    def __init__(self, num_timesteps=1000):
        super().__init__()
        self.num_timesteps = num_timesteps
        self.model = Unet()
    
    def forward_diffusion(self, x0, t):
        noise = torch.randn_like(x0)
        alpha_bar = self.get_alpha_bar(t)
        xt = torch.sqrt(alpha_bar) * x0 + torch.sqrt(1 - alpha_bar) * noise
        return xt
    
    @torch.no_grad()
    def sample(self, shape):
        x = torch.randn(shape)
        for t in reversed(range(self.num_timesteps)):
            predicted_noise = self.model(x, t)
            x = self.denoise_step(x, predicted_noise, t)
        return x
```