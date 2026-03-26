---
title: "Graph Neural Networks"
description: "GNN для работы с графовыми структурами данных"
heroImage: "../../../../assets/imgs/2026/01/21-graph-neural-networks.webp"
pubDate: "2026-01-21"
---

GNN — нейросети для работы с графами.

```python
import torch_geometric.nn as pyg_nn

class GNN(torch.nn.Module):
    def __init__(self, in_channels, hidden_channels, out_channels):
        super().__init__()
        self.conv1 = pyg_nn.GCNConv(in_channels, hidden_channels)
        self.conv2 = pyg_nn.GCNConv(hidden_channels, out_channels)
    
    def forward(self, x, edge_index):
        x = self.conv1(x, edge_index).relu()
        x = self.conv2(x, edge_index)
        return x
```