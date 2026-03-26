---
title: "Обучение с подкреплением (RL)"
description: "Основы RL: Q-learning, policy gradients и Deep Q-Networks"
heroImage: "../../../../assets/imgs/2026/01/10-reinforcement-learning.webp"
pubDate: "2026-01-10"
---

RL — обучение через взаимодействие со средой.

```python
import numpy as np

class QLearningAgent:
    def __init__(self, n_states, n_actions, learning_rate=0.1, gamma=0.99):
        self.q_table = np.zeros((n_states, n_actions))
        self.lr = learning_rate
        self.gamma = gamma
    
    def choose_action(self, state, epsilon=0.1):
        if np.random.random() < epsilon:
            return np.random.randint(self.q_table.shape[1])
        return np.argmax(self.q_table[state])
    
    def learn(self, state, action, reward, next_state):
        current_q = self.q_table[state, action]
        max_next_q = np.max(self.q_table[next_state])
        new_q = current_q + self.lr * (reward + self.gamma * max_next_q - current_q)
        self.q_table[state, action] = new_q
```