---
title: "Pydantic AI: типизированные LLM-агенты с тестами и локальными моделями"
description: "Как в Pydantic AI описывать инструменты функциями, получать ответ модели в виде pydantic-модели, тестировать агента без API-вызовов и подключать Ollama или vLLM."
heroImage: "../../../../assets/imgs/2026/10/26-pydantic-ai-tipizirovannye-agenty.jpeg"
pubDate: "2026-10-26"
---

# Агент на Pydantic AI: схемы, ретраи и тесты вместо регулярок

Типичный проект с LLM-агентом начинается с сорока строк: промпт, вызов OpenAI-совместимого API, `json.loads`. Через пару недель модель начинает писать «Конечно! Вот ваш ответ:» перед JSON, обязательное поле то появляется, то пропадает, вложенный массив иногда приходит строкой. В коде появляются регулярки, ручные проверки и повторные запросы. Ломается стык между выводом модели и приложением: там нет ни типов, ни валидации.

Pydantic AI делает команда Pydantic, и фреймворк закрывает этот стык типами. Инструмент описывается обычной функцией с аннотациями, ответ — pydantic-моделью, а переход с облачной модели на локальную через Ollama — это правка одной строки.

## Минимальный агент

```bash
uv add pydantic-ai   # или pip install pydantic-ai
```

Во второй версии базовая установка стала компактнее, провайдеры доустанавливаются через extras.

```python
from pydantic_ai import Agent

agent = Agent(
    'openai:gpt-6.1-sol',
    instructions='Отвечай коротко, одним предложением.',
)
result = agent.run_sync('Откуда взялась фраза hello world?')
print(result.output)
```

Ключ берётся из `OPENAI_API_KEY`. Ядро фреймворка асинхронное: `run_sync` — обёртка для скриптов и ноутбуков, в сервисе на FastAPI используется `await agent.run(...)`.

Для произвольного OpenAI-совместимого шлюза модель собирается явно:

```python
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.openai import OpenAIProvider

provider = OpenAIProvider(base_url='https://gateway.example/v1', api_key='...')
model = OpenAIChatModel('model-name', provider=provider)
agent = Agent(model)
```

## Инструменты и зависимости

JSON-схему инструмента руками писать не нужно: сигнатура функции превращается в схему аргументов, docstring уходит модели как описание.

```python
from dataclasses import dataclass
import httpx
from pydantic_ai import Agent, ModelRetry, RunContext

@dataclass
class SupportDeps:
    http: httpx.AsyncClient
    api_base: str

support = Agent('openai:gpt-6.1-sol', deps_type=SupportDeps,
                instructions='Помогай клиенту разбираться с заказами.')

@support.tool
async def get_order(ctx: RunContext[SupportDeps], order_id: int) -> dict:
    """Вернуть статус заказа по номеру."""
    r = await ctx.deps.http.get(f'{ctx.deps.api_base}/orders/{order_id}')
    r.raise_for_status()
    return r.json()

@support.tool_plain
def normalize_phone(raw: str) -> str:
    """Привести телефон к формату +7XXXXXXXXXX."""
    digits = ''.join(ch for ch in raw if ch.isdigit())
    if len(digits) != 11:
        raise ModelRetry('В номере должно быть 11 цифр. Попробуй ещё раз.')
    return f'+7{digits[1:]}'
```

`@agent.tool` получает первым аргументом `RunContext`, через который инструмент достаёт зависимости; `@agent.tool_plain` контекст не получает. Зависимости объявляются типом в `deps_type` и передаются при запуске: `support.run(..., deps=SupportDeps(...))`. Глобальных синглтонов нет, mypy подскажет забытое поле, а в тестах HTTP-клиент заменяется заглушкой. Кто писал на FastAPI, узнает механику: аннотации задают контракт, фреймворк валидирует вход. Схему здесь читает модель.

Docstring влияет на то, выберет ли модель инструмент и с какими аргументами. «Вернуть статус заказа по номеру» работает, «хелпер для работы с заказами» — заметно хуже.

Обычное исключение из инструмента роняет запуск. `ModelRetry` отправляет текст ошибки модели, и та вызывает инструмент снова с исправленными аргументами. Аргументы, не прошедшие схему (`ValidationError`), обрабатываются так же. По умолчанию у инструмента одна повторная попытка; лимит поднимается через `retries={'tools': N}` на агенте или `@agent.tool(retries=N)` точечно. В v2 добавили `ToolFailed`: модель узнаёт о провале, бюджет ретраев не расходуется.

## Структурированный вывод

```python
from pydantic import BaseModel

class RefundDecision(BaseModel):
    approved: bool
    amount: int
    reason: str

refund = Agent('openai:gpt-6.1-sol', output_type=RefundDecision,
               instructions='Решай, одобрять ли возврат. Безопасные суммы — до 50 000.')

@refund.output_validator
def check_limit(ctx: RunContext, decision: RefundDecision) -> RefundDecision:
    if decision.approved and decision.amount > 50_000:
        raise ModelRetry('Свыше 50 000 возврат согласовывает человек. Верни approved=False.')
    return decision
```

`result.output` приходит уже типизированным объектом. Невалидный JSON до бизнес-логики не доходит: он возвращается модели на переделку.

Схема проверяет формат, но модель может аккуратно заполнить все поля и одобрить возврат на миллион. Для доменных правил есть `@agent.output_validator`: функция может быть асинхронной, ходить в базу и внешние сервисы. Бюджет переделок вывода — одна попытка, настраивается через `retries={'output': N}`. Когда он исчерпан, запуск падает с `UnexpectedModelBehavior`.

Ещё несколько деталей:

- `output_type=[RefundDecision, str]` позволяет вернуть либо структуру, либо текст, например уточняющий вопрос. Каждый вариант регистрируется отдельным output-инструментом, результат разбирается через `isinstance`.
- Кроме `BaseModel` подходят dataclass, `TypedDict` и всё, что умеет валидировать Pydantic.
- `run_stream()` + `stream_output()` отдают частично провалидированные снапшоты недописанного JSON, так что карточку ответа можно рисовать до конца генерации.

## Тесты без вызовов API

```python
import pytest
from pydantic_ai import models
from pydantic_ai.models.test import TestModel

pytestmark = pytest.mark.anyio
models.ALLOW_MODEL_REQUESTS = False  # случайный реальный вызов уронит тест

async def test_support_flow():
    deps = SupportDeps(http=FakeHttp(), api_base='http://test')
    with support.override(model=TestModel()):
        result = await support.run('Где мой заказ 42?', deps=deps)
    assert 'get_order' in result.output
```

`TestModel` читает JSON-схемы инструментов, генерирует валидные аргументы, вызывает каждый инструмент и возвращает сводку. Нейросети внутри нет, прогоны детерминированы. Тест проверяет то, что ломается чаще всего: регистрацию инструментов, проброс зависимостей, валидацию вывода. `Agent('test')` даёт ту же модель для экспериментов.

Когда нужна конкретная траектория, подставляется `FunctionModel` с функцией, которая получает историю сообщений и возвращает `ModelResponse`, например с `ToolCallPart('get_order', {'order_id': 42})`. Качество ответов живой модели так не проверить, для этого в экосистеме есть evals.

## Что изменилось в v2

Вторая версия вышла 23 июня 2026 года, примерно через десять месяцев после 1.0.

- **Capability** — блок поведения: инструкции, инструменты, хуки жизненного цикла и настройки модели вместе. Блок сериализуется в spec-файл, его можно закоммитить и подключить к другому агенту.
- **CodeMode** — модель пишет код, вызывающий инструменты как функции, и он исполняется один раз в песочнице Monty, мини-интерпретаторе Python от Pydantic. На задачах из десятка шагов экономит токены: история диалога не прогоняется через модель на каждом витке.
- **ToolSearch** — инструменты с `defer_loading=True` не попадают в промпт, модель ищет их по запросу. На Anthropic и OpenAI Responses поиск нативный, в остальных случаях работает локальная функция с выбором стратегии вплоть до BM25.

При миграции проверьте три вещи. Префикс `openai:` теперь ведёт на Responses API, прежний Chat Completions доступен как `openai-chat:`. `end_strategy` по умолчанию стал `graceful`, поэтому отмена посреди вызова инструмента ведёт себя иначе. Инструментация обновлена до v5 с собственной статистикой токенов, и самописные дашборды могут сломаться. В документации есть карта миграции V1 → V2.

## Продакшен

- `agent.iter()` отдаёт цикл агента по узлам вместе со стриминговыми событиями. Пригодится для чата, где виден статус каждого вызова инструмента.
- `UsageLimits` ограничивает число запросов к модели, токены и вызовы инструментов на весь запуск. Превышение кидает обычное исключение.
- Durable execution сохраняет каждый шаг, и после рестарта процесс продолжается без повторных вызовов модели. Есть интеграции с Temporal, DBOS, Prefect, Restate, AWS Lambda, Apache Airflow, Absurd и pgtask.
- MCP-серверы (stdio или HTTP) подключаются через `toolsets=[MCPToolset(url)]`; с `defer_loading=True` даже сотня серверов не раздувает контекст.
- `logfire.instrument_pydantic_ai()` пишет в трассы промпты, ответы, токены и стоимость. Под капотом OpenTelemetry, так что трейсы можно отправить в Grafana или Jaeger.

## Локальные модели

Провайдеров больше тридцати семи, включая локальные:

```python
agent = Agent('ollama:qwen3')  # сервер на localhost:11434

from pydantic_ai.models.ollama import OllamaModel
from pydantic_ai.providers.ollama import OllamaProvider

model = OllamaModel('qwen3',
    provider=OllamaProvider(base_url='http://gpu-box.local:11434/v1'))
```

Для vLLM есть префикс `vllm:`, остальные OpenAI-совместимые эндпоинты подключаются через `OpenAIChatModel` с `base_url`. Схема «чувствительные данные обрабатываются локально, остальное уходит в облако» собирается одним кодом.

Модели на 7–14 миллиардов параметров плохо держат строгие контракты: tool calling уходит мимо схемы, в структурном выводе пропадают поля. Помогают более простые схемы аргументов, мелкие задачи, компактный `output_type` и заранее поднятый бюджет ретраев. Прогон на `TestModel` до продакшена показывает, на каком месте агент ломается. Из лёгких открытых моделей tool calling лучше всего поддерживает семейство Qwen.

## Когда выбирать Pydantic AI

- Новый Python-проект, где агент вызывает инструменты и должен возвращать структуры, — Pydantic AI. Вывод, ретраи, валидаторы и тесты работают на одном механизме типов.
- Проект на коннекторах к десятку SaaS или со сложным stateful-графом — LangChain/LangGraph: больше семисот интеграций, LangSmith за $39–399 в месяц. На типовом агенте он многословнее: в одном замере около 60 строк на Pydantic AI против 200 на LangChain. Работающий проект на LangGraph переносить без причины незачем.
- Ролевые команды агентов — CrewAI. TypeScript — Mastra или Vercel AI SDK, у AWS есть Strands.
- Один промпт и один вызов — SDK провайдера напрямую. Фреймворк окупается, когда появляются инструменты, ретраи и структуры ответов.

Минусы тоже есть. Релизы выходят часто: за жизнь v1 их было больше сотни. В сложных сценариях приходится спускаться к истории сообщений и низкоуровневым типам. Валидация в фреймворке устроена только через pydantic-модели, и команде с другим подходом это может мешать.
