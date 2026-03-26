---
title: "Fine-tuning LLM"
description: "Дообучение больших языковых моделей: LoRA, QLoRA, PEFT техники"
heroImage: "../../../../assets/imgs/2026/01/04-llm-fine-tuning.webp"
pubDate: "2026-01-04"
---

Fine-tuning позволяет адаптировать предобученные модели под конкретные задачи.

## LoRA

```python
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM

model = AutoModelForCausalLM.from_pretrained("meta-llama/Llama-2-7b")

lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=["q_proj", "v_proj"],
    lora_dropout=0.05,
    bias="none"
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
```

## QLoRA

```python
from peft import LoraConfig, get_peft_model
from transformers import AutoModelForCausalLM, BitsAndBytesConfig

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype="float16"
)

model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Llama-2-7b",
    quantization_config=bnb_config
)
```

## RLHF

```python
# Reward model
from transformers import AutoModelForSequenceClassification

reward_model = AutoModelForSequenceClassification.from_pretrained(
    "reward-model",
    num_labels=1
)

# PPO
from trl import PPOTrainer, PPOConfig

config = PPOConfig(
    model_name="policy-model",
    reward_model="reward-model"
)

ppo_trainer = PPOTrainer(config, model, reward_model)
```