---
title: "Вход в Kubernetes по OIDC и 2FA: Dex, kube-oidc-proxy и Gateway API"
description: "Как заменить раздачу root-kubeconfig на вход через каталог пользователей с двухфакторной аутентификацией: Dex, kube-oidc-proxy, HTTPRoute и три ловушки Gateway API."
heroImage: "../../../../assets/imgs/2026/09/21-kubernetes-oidc-2fa-gateway-api-dex.jpg"
pubDate: "2026-09-21"
---

# Kubernetes без общих kubeconfig: OIDC, второй фактор и группы из каталога

Типичная картина для небольшого кластера на Talos Linux: администратор выпускает kubeconfig с клиентским сертификатом и пересылает его коллегам, например через yopass. Сертификат выписан на год, работает с любой машины, не привязан к человеку и отзывается только ротацией CA всего кластера. Уволился сотрудник или потерялся ноутбук, а доступ остался. Найти, кто выполнил `kubectl delete` не в том кластере, невозможно, потому что в аудите везде один и тот же `kubernetes-admin`.

Ниже разобрана схема, которая закрывает эти дыры: вход по учётной записи из каталога, обязательный второй фактор, права из групп и kubeconfig без единого секрета.

## Компоненты схемы

- Talos Linux 1.13 и Kubernetes 1.33 как сам кластер;
- ArgoCD с подходом app-of-apps: всё состояние лежит в Git;
- MetalLB для LoadBalancer-адреса на bare-metal;
- NGINX Gateway Fabric 2.6 как реализация Gateway API и точка входа снаружи;
- cert-manager 1.21 с wildcard-сертификатом Let's Encrypt через DNS-01;
- Dex 0.24 как OIDC-провайдер поверх LDAP;
- kube-oidc-proxy, который проверяет токен и ходит в API-сервер через impersonation;
- служба каталогов MULTIDIRECTORY с пользователями, группами и 2FA;
- небольшой сервис на Python, отдающий готовый kubeconfig по HTTP.

Флаги `kube-apiserver` в этой конструкции не меняются. Почему, объясняется в разделе про kube-oidc-proxy.

## Каталог как единственный источник пользователей

В Kubernetes нет объекта `User`, так что кластеру пользователей хранить не нужно. Источником правды становится каталог. Dex подключается к нему стандартным LDAP-коннектором:

```yaml
- type: ldap
  id: ldap
  name: LDAP (Multifactor)
  config:
    host: multidirectory.ru:939
    bindDN: "cn=dex,cn=users,dc=multifactor,dc=ru"
    bindPW: "{{.Env.LDAP_BIND_PASSWORD}}"
    userSearch:
      baseDN: "cn=users,dc=multifactor,dc=ru"
      username: cn
      idAttr: cn
      emailAttr: mail
      preferredUsernameAttr: cn
    groupSearch:
      baseDN: "cn=groups,dc=multifactor,dc=ru"
      userMatchers:
        - userAttr: dn
          groupAttr: member
      nameAttr: cn
```

Второй фактор настраивается на стороне каталога. Политику условной 2FA можно включить для группы администраторов и оставить выключенной для сервисных учёток. В кластере при этом нет ни строчки конфигурации про 2FA: Dex, kube-oidc-proxy и kubectl видят обычный OIDC-логин, который занимает на несколько секунд больше.

## Группы LDAP превращаются в RBAC

Dex кладёт группы пользователя в claim `groups`, kube-oidc-proxy передаёт их в API-сервер, а дальше работает штатный RBAC. `ClusterRoleBinding` умеет ссылаться на субъект типа `Group`:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: dex-cluster-name
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: view
subjects:
  - kind: Group
    name: dex
    apiGroup: rbac.authorization.k8s.io
```

Выдать доступ новому инженеру значит добавить его в группу в каталоге, забрать доступ значит убрать из группы. Ни `kubectl`, ни коммитов в Git, ни пересборки конфигов не нужно. Блокировка учётной записи закрывает доступ во все кластеры сразу. В логе API-сервера теперь виден конкретный человек.

## Один хост и три бэкенда

Весь процесс аутентификации живёт на одном FQDN, например `cluster-name-dex.multifactor.dev`: одна DNS-запись на кластер. Запросы разводит `HTTPRoute`:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: dex
  namespace: dex
spec:
  parentRefs:
    - name: https
      namespace: nginx-gateway
  hostnames:
    - cluster-name-dex.multifactor.dev
  rules:
    - matches:
        - path: { type: PathPrefix, value: /dex }
      backendRefs:
        - name: dex
          port: 5556
    - matches:
        - path: { type: PathPrefix, value: /kubeconfig }
      backendRefs:
        - name: kubeconfig-generator
          port: 8080
    - matches:
        - path: { type: PathPrefix, value: / }
      backendRefs:
        - name: oidc-proxy
          port: 443
```

Правило с префиксом `/` работает как catch-all и не перехватывает более специфичные маршруты: `/dex` и `/kubeconfig` срабатывают раньше. В nginx с его `location` порядок и модификаторы решают всё, и при миграции с Ingress это поведение стоит проверить.

## kubeconfig, который не страшно потерять

Пользователь открывает `/kubeconfig` в браузере или выполняет `curl -LOJ https://cluster-name-dex.multifactor.dev/kubeconfig` и получает файл:

```yaml
apiVersion: v1
kind: Config
current-context: cluster-name
clusters:
  - name: cluster-name
    cluster:
      server: https://cluster-name-dex.multifactor.dev
      certificate-authority-data: LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0t...
contexts:
  - name: cluster-name
    context:
      cluster: cluster-name
      user: oidc-user
users:
  - name: oidc-user
    user:
      exec:
        apiVersion: client.authentication.k8s.io/v1beta1
        command: kubectl
        args:
          - oidc-login
          - get-token
          - --oidc-issuer-url=https://cluster-name-dex.multifactor.dev/dex
          - --oidc-client-id=kubernetes-cli
          - --oidc-extra-scope=profile
          - --oidc-extra-scope=email
          - --oidc-extra-scope=groups
          - --oidc-extra-scope=offline_access
```

В файле нет секретов: только публичный адрес, публичный CA и идентификатор публичного OIDC-клиента. Его можно положить в вики, приложить к письму новому сотруднику или закоммитить в репозиторий с документацией, потому что без учётной записи и второго фактора он бесполезен. Scope `offline_access` включает автоматическое обновление токена. Если сертификат выпущен публичным CA, `certificate-authority-data` можно вообще убрать.

Работает всё через exec-плагин `oidc-login` из проекта kubelogin, который ставится через krew:

```bash
kubectl krew install oidc-login
```

Первый `kubectl get pods` или подключение из Lens открывает браузер. Пользователь логинится, подтверждает вход на телефоне, и токен кэшируется в `~/.kube/cache`. Когда токен истекает, kubectl снова вызывает плагин: если сессия в Dex жива, токен обновляется незаметно, иначе снова откроется браузер.

Генератор kubeconfig занимает около 60 строк на Python и монтируется через ConfigMap. Он подставляет в шаблон имя кластера и CA из того же wildcard-секрета:

```python
with open('/etc/kubeconfig-generator/ca.crt', 'rb') as f:
    ca_data = base64.b64encode(f.read()).decode()

cluster_name = os.getenv('CLUSTER_NAME', 'k8s-cluster')
kubeconfig = template.replace('{{ .CAData }}', ca_data)
kubeconfig = kubeconfig.replace('{{ .ClusterName }}', cluster_name)
```

Обойтись без сервиса можно, но тогда kubeconfig придётся пересобирать вручную при каждой ротации сертификата. Сервис читает актуальный секрет на лету.

## Три ловушки Gateway API

Gateway API устроен иначе, чем Ingress: инфраструктурная команда владеет `Gateway`, прикладные команды владеют своими `HTTPRoute`. Такое разделение ролей порождает ошибки, которые ничем себя не выдают.

### Маршрут не подключился

`HTTPRoute` лежал в одном неймспейсе, `Gateway` в другом. Деплой прошёл без ошибок, ArgoCD зелёный, поды готовы, а `curl` возвращает 404. Причина в значении по умолчанию:

```yaml
listeners:
  - name: https
    protocol: HTTPS
    port: 443
    # allowedRoutes не указан => namespaces.from: Same
```

Без явного `allowedRoutes` листенер принимает маршруты только из своего неймспейса. Диагноз виден лишь в статусе маршрута:

```text
Conditions:
  Type:    Accepted
  Status:  False
  Reason:  NotAllowedByListeners
  Message: The Route is not allowed by any listener
```

Лечится одной правкой на стороне `Gateway`:

```yaml
allowedRoutes:
  namespaces:
    from: All   # лучше явный список неймспейсов
```

После каждого применения `HTTPRoute` нужно смотреть `status.parents[].conditions`. Зелёный статус в ArgoCD ничего не гарантирует.

### BackendTLSPolicy требует проверяемого имени

kube-oidc-proxy отвечает только по HTTPS, поэтому шлюз должен расшифровать клиентский трафик и зашифровать его заново на пути к бэкенду. В Istio для такого случая обычно использовали `DestinationRule` с `insecureSkipVerify: true`. В Gateway API аналога этому флагу нет: `BackendTLSPolicy` существует, чтобы соединение с бэкендом было проверяемым, и отключить проверку нельзя, можно только указать, что проверять.

Первая версия политики выглядела логично:

```yaml
validation:
  hostname: oidc-proxy.dex.svc.cluster.local
  wellKnownCACertificates: System
```

и давала 502 с такой строкой в логах NGINX:

```text
upstream SSL certificate does not match "oidc-proxy.dex.svc.cluster.local" while SSL handshaking to upstream, upstream: "https://10.244.0.132:8443/version"
```

Под oidc-proxy монтирует тот же wildcard-сертификат Let's Encrypt для `*.multifactor.dev`, и внутреннего DNS-имени сервиса в его SAN нет. Рабочий вариант проверяет имя, которое в сертификате есть:

```yaml
validation:
  hostname: cluster-name-dex.multifactor.dev
  wellKnownCACertificates: System
```

Поле `hostname` в `BackendTLSPolicy` задаёт имя, которое обязано присутствовать в сертификате бэкенда. К адресу назначения оно отношения не имеет: туда шлюз попадает по эндпоинтам сервиса.

### Issuer URL должен совпадать с публичным

Значение `iss` в токене обязано точно совпадать с `--oidc-issuer-url`, по которому потребитель токена проверяет подпись. Если Dex выпускает токены с `iss: https://cluster-name-dex.multifactor.dev/dex`, kube-oidc-proxy обязан проверять ровно эту строку. Заменить её на `http://dex.dex.svc.cluster.local:5556` нельзя.

Поэтому под oidc-proxy внутри кластера должен уметь достучаться до публичного имени, и гонять этот трафик через интернет не хочется. Помогает `hostAliases`:

```yaml
spec:
  template:
    spec:
      hostAliases:
        - ip: 123.123.123.123   # адрес LoadBalancer
          hostnames:
            - cluster-name-dex.multifactor.dev
```

Публичное имя резолвится в LoadBalancer-адрес, трафик разворачивается локально (hairpin), а issuer остаётся корректным. Без этого под не выходит в Ready, а в логах повторяется:

```text
oidc authenticator: initializing plugin: Get ".../.well-known/openid-configuration": net/http: request canceled while waiting for connection
```

## Переносимость на следующий кластер

Значения, специфичные для кластера, вынесены в два места.

Для обычных манифестов работает Kustomize-патч `patch.cluster-config.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: oidc-proxy
spec:
  template:
    spec:
      hostAliases:
        - ip: 123.123.123.123
          hostnames:
            - cluster-name-dex.multifactor.dev
      containers:
        - name: oidc-proxy
          env:
            - name: OIDC_ISSUER_URL
              value: https://cluster-name-dex.multifactor.dev/dex
```

Списки `containers` и `env` в схеме Kubernetes помечены как `patchStrategy: merge` с ключом `name`, поэтому патч дополняет переменные окружения и ничего не затирает. У `hostAliases` такого ключа нет, список заменяется целиком. В этом сценарии так и нужно, но разницу полезно помнить.

Для значений Helm, до которых Kustomize не дотягивается (чарт подключён отдельным source в ArgoCD), используется inline-блок `values` в самом Application. ArgoCD применяет его поверх файла значений:

```yaml
helm:
  releaseName: dex
  valueFiles:
    - $values/manifests/dex/values.yaml
  values: |
    config:
      issuer: https://cluster-name-dex.multifactor.dev/dex
    frontend:
      issuerUrl: https://cluster-name-dex.multifactor.dev/dex
```

Файл `values.yaml` остаётся полностью переносимым, а всё про конкретный кластер лежит в двух предсказуемых манифестах.

## Почему kube-oidc-proxy, а не флаги kube-apiserver

Классический способ подключить OIDC состоит в добавлении `--oidc-issuer-url` и соседних флагов в `kube-apiserver`. Здесь этот путь отвергнут по трём причинам:

1. В Talos это изменение машинной конфигурации с перезапуском статик-пода, и делать его ради второго OIDC-клиента неудобно.
2. Ошибка во флагах ломает вход в кластер целиком, включая админский доступ, которым её пришлось бы чинить.
3. Флаги хранятся как состояние узла, а конфигурацию хотелось держать в Git.

kube-oidc-proxy сам валидирует токен и обращается к API-серверу от имени пользователя через impersonation. Права ему нужны широкие:

```yaml
rules:
  - apiGroups: [""]
    resources: ["users", "groups", "serviceaccounts"]
    verbs: ["impersonate"]
  - apiGroups: ["authentication.k8s.io"]
    resources: ["userextras/scopes", "tokenreviews"]
    verbs: ["create", "impersonate"]
```

Это нужно учитывать в модели угроз: компрометация пода oidc-proxy равна возможности действовать от имени любого пользователя. Взамен API-сервер остаётся нетронутым, а вся OIDC-конфигурация превращается в обычный Deployment, который откатывается через `git revert`.

## Итоговая схема

1. Инженер один раз ставит `oidc-login` через krew и скачивает kubeconfig по ссылке.
2. Первая команда открывает браузер, где он вводит корпоративный логин и подтверждает вход на телефоне.
3. Токен обновляется автоматически или через повторный вход.
4. Права определяются группами в каталоге, выдача и отзыв доступа сводятся к добавлению и удалению из группы.
5. В аудит-логе виден конкретный человек.
6. Всё описано в Git и раскатывается ArgoCD.

Практические правила, которые из этого следуют:

- Статусы объектов Gateway API читайте всегда. Большинство ошибок в нём проходят молча: сервис жив, деплой зелёный, а единственный сигнал проблемы лежит в `status.parents[].conditions` как `Accepted: False`.
- Если бэкенд говорит по HTTPS, у него должен быть сертификат с корректным именем, а у `BackendTLSPolicy` соответствующий `hostname`. Замены `insecureSkipVerify` в Gateway API нет.
- Второй фактор проще держать в каталоге. Kubernetes не обязан знать про push-уведомления и политики доступа, и включается всё одной настройкой на стороне каталога.
