---
title: "SSH-доступ из rootless-контейнера через ssh-agent: ключ остаётся на хосте"
description: "Как дать rootless Docker-контейнеру рабочий git clone и ssh по ключу, который процесс в контейнере не может прочитать: отдельный ssh-agent с mapped UID, systemd-шаблон на setpriv и монтирование каталога с сокетом."
heroImage: "../../../../assets/imgs/2026/09/27-ssh-agent-rootless-docker.png"
pubDate: "2026-09-27"
---

# Отдельный ssh-agent под mapped UID для rootless Docker

Контейнеру с приложением или ИИ-агентом часто нужен SSH: склонировать приватный репозиторий, сделать `git fetch`, подтянуть сабмодули, выполнить `rsync` на сервер. Самый быстрый способ — `-v ~/.ssh:/home/app/.ssh:ro`. Флаг `:ro` защищает файл от изменения, но прочитать ключ и отправить его наружу процесс по-прежнему может. Замена SSH на токен ничего не меняет: токен в окружении процесса — такой же секрет, который уходит при первой RCE в зависимости.

Схема ниже решает задачу иначе: в контейнер пробрасывается Unix-сокет `ssh-agent`. Процесс может подписывать запросы загруженным ключом, но самого ключа в его пространстве имён монтирования нет. Все требования к контейнеру остаются жёсткими:

- Docker daemon работает в rootless-режиме;
- процесс в контейнере запущен от UID 1000;
- `--cap-drop ALL`, `no-new-privileges`, `--read-only` для корня;
- `StrictHostKeyChecking=no` запрещён.

## Почему обычный проброс SSH_AUTH_SOCK ломается

Классический рецепт `-e SSH_AUTH_SOCK=/ssh-agent -v "$SSH_AUTH_SOCK:/ssh-agent"` работает, пока UID в контейнере и на хосте совпадают. В rootless Docker включён user namespace, и числа расходятся. Если daemon запущен от пользователя `rootless-docker` (UID 999) с диапазоном `rootless-docker:100000:65536` в `/etc/subuid`, отображение выглядит так:

```
container UID 0    → host UID 999
container UID 1    → host UID 100000
container UID 1000 → host UID 100999
```

Формула для N ≥ 1: `host UID = subuid_start + N - 1`. Для GID то же самое через `/etc/subgid`. Проверить отображение изнутри можно через `cat /proc/self/uid_map`.

`ssh-agent` проверяет UID подключившегося клиента на стороне хоста. Агент пользователя `rootless-docker` видит клиента с UID 100999 и отклоняет соединение. `chmod 0666 agent.sock` тут не помогает: `connect()` пройдёт, а `ssh-add -l` всё равно упадёт, потому что проверка UID делается внутри агента, после открытия сокета. Рабочий вариант — запустить отдельный агент ровно под тем UID, которым контейнерный пользователь представлен на хосте.

Mapped UID лучше вычислять скриптом:

```bash
ROOTLESS_USER=rootless-docker
ROOTLESS_UID=$(id -u "$ROOTLESS_USER")
DH="unix:///run/user/$ROOTLESS_UID/docker.sock"
CONTAINER_UID=$(sudo -H -u "$ROOTLESS_USER" env DOCKER_HOST="$DH" docker run --rm image-name id -u app)
SUBUID_START=$(awk -F: -v u="$ROOTLESS_USER" '$1 == u { print $2; exit }' /etc/subuid)
echo "host UID: $((SUBUID_START + CONTAINER_UID - 1))"
```

Менять `/etc/subuid` и `/etc/subgid` на живой системе опасно: числовые владельцы уже созданных файлов останутся прежними, и контейнер перестанет считать их своими.

## Раскладка каталогов

```
/opt/ssh-access/
├── .ssh/git/key, key.pub      # root:root, 0700
├── sockets/git/agent.sock     # 100999:<gid rootless>, 0710
└── ssh_known_hosts            # root:root, 0644
```

Корень `/opt/ssh-access` создаётся с правами `0711`: процесс с mapped UID может пройти по известному пути, но не может получить листинг. Каталоги `sockets` и `sockets/git` принадлежат mapped UID, группа — rootless-пользователя, чтобы Docker мог использовать их как источник bind mount. На каждую идентичность заводится свой каталог и свой агент: `git-read` и `git-write` с ключами разного уровня доступа, отдельная `gitlab`. Контейнеру монтируется только каталог нужной идентичности.

Ключ генерируется от root, без passphrase: `ssh-keygen -t ed25519 -f /opt/ssh-access/.ssh/git/key -C container-git -N ''`, публичная часть добавляется на Git-сервер.

## systemd-шаблон с setpriv

С `User=100999` все команды юнита, включая `ExecStartPost`, выполнялись бы от этого UID, и `ssh-add` не смог бы прочитать root-овый ключ. Поэтому юнит остаётся root-службой, а понижение прав делает `setpriv` только для самого агента. Шаблон `/etc/systemd/system/container-ssh-agent@.service`:

```ini
[Unit]
Description=SSH agent for container identity %i

[Service]
Type=simple
Environment=SSH_AUTH_SOCK=/opt/ssh-access/sockets/%i/agent.sock MAPPED_UID=100999 MAPPED_GID=100999
ExecStartPre=/usr/bin/rm -f -- /opt/ssh-access/sockets/%i/agent.sock
ExecStart=/usr/bin/setpriv --reuid=${MAPPED_UID} --regid=${MAPPED_GID} \
    --clear-groups --inh-caps=-all --no-new-privs \
    /usr/bin/ssh-agent -D -a /opt/ssh-access/sockets/%i/agent.sock
ExecStartPost=/bin/sh -c 'while [ ! -S "$SSH_AUTH_SOCK" ]; do sleep 0.05; done; exec /usr/bin/ssh-add /opt/ssh-access/.ssh/%i/key'
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

`--clear-groups` здесь нужен всерьёз: если запускающий пользователь состоит в группе `docker`, без этого флага агент унаследует право обращаться к `/var/run/docker.sock`. Штатно `ssh-agent` туда не ходит, но при уязвимости в агенте или подмене процесса лишняя группа становится готовым путём к Docker API.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now container-ssh-agent@git.service
ls -ln /opt/ssh-access/sockets/git/agent.sock   # ожидается 100999:100999
ps -o pid,uid,gid,cmd -C ssh-agent
```

## known_hosts без StrictHostKeyChecking=no

Для автоматизации интерактивное подтверждение host key не подходит, и его обычно выключают. Правильнее один раз снять ключ через `ssh-keyscan -p 22 -t ed25519 git.example.com`, сверить fingerprint с ключом на самом сервере или с опубликованным провайдером и дописать строку в `/opt/ssh-access/ssh_known_hosts`. Повторный `ssh-keyscan` с другой машины годится только как дополнительная проверка. Файл монтируется в контейнер read-only в `/etc/ssh/ssh_known_hosts`.

## Запуск контейнера

В образе нужен непривилегированный пользователь (`useradd -m -u 1000 -g 1000 app`, `USER 1000:1000`) и пакеты `git`, `openssh-client`. Запуск:

```bash
sudo -H -u "$ROOTLESS_USER" env DOCKER_HOST="$DH" docker run --rm -it \
  --user 1000:1000 --read-only --cap-drop ALL \
  --security-opt no-new-privileges \
  --tmpfs /tmp:rw,nosuid,nodev,noexec,size=64m \
  --tmpfs /workspace:rw,uid=1000,gid=1000 --workdir /workspace \
  -e SSH_AUTH_SOCK=/ssh-agent/agent.sock \
  -v /opt/ssh-access/sockets/git:/ssh-agent:ro \
  -v /opt/ssh-access/ssh_known_hosts:/etc/ssh/ssh_known_hosts:ro \
  ssh-client:test sh
```

Внутри `ls -ln /ssh-agent/agent.sock` покажет `1000:1000`, `ssh-add -l` выведет fingerprint ключа, после чего `git clone git@git.example.com:group/project.git` работает обычным OpenSSH без посредников. На хосте `docker info` должен показывать `rootless` в Security Options.

## Грабли с bind mount

Монтируется каталог, потому что `ssh-agent` при перезапуске пересоздаёт файл сокета. Bind mount одиночного файла остался бы привязан к старому inode, а с каталогом `systemctl restart container-ssh-agent@git.service` подхватывается запущенными контейнерами сразу.

Сам каталог-источник удалять нельзя. После `rm -rf sockets/git && mkdir sockets/git` путь тот же, но объект файловой системы новый, и контейнер продолжает смотреть на старый. `findmnt -T /ssh-agent -o TARGET,SOURCE -n` покажет источник вида `/opt/ssh-access/sockets/git//deleted`. Лечится только перезапуском или пересозданием контейнера.

## Что схема защищает и что нет

Файл ключа остаётся на хосте, после загрузки ключ живёт в памяти агента, и `cat ~/.ssh/id_ed25519` в контейнере ничего не найдёт. Утащить ключ и пользоваться им с другой машины атакующий не сможет.

Подписывать через агент он при этом может. Пока скомпрометированный процесс держит доступ к сокету, он пользуется загруженной идентичностью так же, как легитимный `git`. Доступ к `SSH_AUTH_SOCK` — это делегированное право на идентичность, поэтому ключи стоит резать по минимальным правам (read-only deploy key там, где запись не нужна) и держать разные сервисы под разными UID, чтобы чужой процесс не добрался до сокета.

Сетевые ограничения — egress-фильтрация, proxy, network policy — и изоляция через VM или microVM в схему не входят и закрывают отдельные классы угроз. Альтернатива с выносом Git-операций в MCP-сервер или отдельный API добавляет свою границу доверия: если сервис и контейнер делят рабочую копию на запись, а сервис исполняет Git hooks из неё без изоляции, подменённый hook выполнится с правами сервиса и его секретами. Когда процессу нужна собственная рабочая копия и штатный OpenSSH, агент под mapped UID обходится меньшим числом движущихся частей.
