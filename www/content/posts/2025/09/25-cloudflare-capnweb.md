+++
lang = "ru"
title = "Cap'n Web: JavaScript-ориентированная RPC система"
description = "Cap'n Web - это мощный объектно-способностный протокол, специально разработанный для веб-окружений, объединяющий простоту использования с типобезопасностью TypeScript и возможность двунаправленных вызовов."
template = "posts"
thumb = "/imgs/2025/09/25-cloudflare-capnweb.png"
publication_date = "2025-09-25"
github = "https://github.com/cloudflare/capnweb"
+++

# Cap'n Web: JavaScript-ориентированная RPC система

Cap'n Web — это RPC система, разработанная для эффективной работы в веб-стеке и активно используемая в современных JavaScript приложениях. Этот проект является духовным собратьем Cap'n Proto и предназначен для работы в условиях, где важна легкость и простота интеграции.

## Основные особенности

1. **Объектная модель**: Cap'n Web основан на протоколе объектных возможностей (object-capability protocol), что делает его более выразительным по сравнению с большинством других RPC систем. Это позволяет создавать сложные взаимодействия и реализовывать продвинутые модели безопасности.

2. **Отсутствие схем**: В отличие от Cap'n Proto, Cap'n Web не требует схем для сериализации данных. Это делает его использование гораздо проще и избавляет от необходимости написания большого количества шаблонного кода.

3. **Читаемая сериализация**: Сериализация данных происходит в формате JSON, который прост для понимания и работы.

4. **Совместимость с различными транспортами**: Cap'n Web поддерживает работу через HTTP, WebSocket и postMessage(), что позволяет легко интегрировать его в существующие приложения.

5. **Работа с TypeScript**: Система отлично интегрируется с TypeScript, что позволяет разработчикам использовать статическую типизацию и получать преимущества автодополнения.

6. **Маленький размер**: Библиотека имеет компактный размер менее 10kB и не требует внешних зависимостей.

## Задачи проекта

Cap'n Web решает несколько ключевых задач, включая:

- Упрощение взаимодействия между клиентом и сервером в веб-приложениях с использованием JavaScript.
- Поддержка двустороннего вызова между клиентом и сервером, что позволяет серверу инициировать вызовы на клиент.
- Возможность передачи функций и объектов по ссылке, что существенно упрощает обработку событий и возврат данных.
- Оптимизация сетевых операций через поддержку pipelining, что позволяет осуществлять множественные вызовы в одном запросе.
- Обеспечение безопасности через возможности, в частности, поддержку базовых паттернов безопасности.

## Примеры применения

### Простейший пример

Пример создания клиента с использованием WebSocket:

```javascript
import { newWebSocketRpcSession } from "capnweb";

let api = newWebSocketRpcSession("wss://example.com/api");
let result = await api.hello("World");
console.log(result);
```

На стороне сервера это может выглядеть так:

```javascript
import { RpcTarget, newWorkersRpcResponse } from "capnweb";

class MyApiServer extends RpcTarget {
  hello(name) {
    return `Hello, ${name}!`;
  }
}

export default {
  fetch(request, env, ctx) {
    let url = new URL(request.url);
    if (url.pathname === "/api") {
      return newWorkersRpcResponse(request, new MyApiServer());
    }
    return new Response("Not found", { status: 404 });
  }
}
```

### Сложный пример с TypeScript

Вы можете также реализовать более сложные сценарии, например, используя TypeScript и поддерживая зависимые вызовы:

```typescript
interface PublicApi {
  authenticate(apiToken: string): AuthedApi;
  getUserProfile(userId: string): Promise<UserProfile>;
}

interface AuthedApi {
  getUserId(): number;
  getFriendIds(): number[];
}

type UserProfile = {
  name: string;
  photoUrl: string;
};

let api = newHttpBatchRpcSession<PublicApi>("https://example.com/api");
let authedApi: RpcPromise<AuthedApi> = api.authenticate(apiToken);
let userIdPromise: RpcPromise<number> = authedApi.getUserId();
let profilePromise = api.getUserProfile(userIdPromise);
let friendsPromise = authedApi.getFriendIds();
// Дополнительные действия...
```

## Заключение

Cap'n Web представляет собой мощный инструмент для разработчиков, работающих с JavaScript и необходимостью создания распределенных систем. Его простота в использовании, возможность интеграции с существующими проектами и поддержка современных стандартов делают его отличным выбором для создания API.