---
title: "Ansible: роли и коллекции, Galaxy, best practices"
description: "Создавайте Ansible: роли и коллекции, Galaxy, best practices. Структурируйте плейбуки для автоматизации."
pubDate: "2026-03-13"
---

# Ansible: роли и коллекции

Ansible роль -- это переиспользуемая единица автоматизации с задачами, переменными, шаблонами и обработчиками. Вместо монолитного плейбука на 500 строк -- структурированные роли, каждая из которых устанавливает и настраивает один компонент.

Плейбук из 500 задач в одном файле -- типичная история для проектов, где Ansible добавляли постепенно. Роли структурируют автоматизацию: каждая роль является изолированной единицей с задачами, переменными, шаблонами и обработчиками.

> **Key Takeaways**
> - `defaults/main.yml` содержит переопределяемые переменные; `vars/main.yml` -- внутренние константы, которые не переопределяются
> - `handlers` срабатывают один раз в конце play, даже если `notify` вызван несколько раз -- идеально для `restart service`
> - `ansible-galaxy collection install -r requirements.yml` устанавливает все зависимости одной командой
> - `ansible-vault encrypt` шифрует файлы с секретами; `--vault-password-file` для CI/CD
> - `--check --diff` показывает что изменится без применения -- незаменимо перед деплоем в production

## Структура роли

```
roles/
└── postgresql/
    ├── tasks/
    │   ├── main.yml        # точка входа
    │   ├── install.yml
    │   └── configure.yml
    ├── handlers/
    │   └── main.yml        # обработчики (restart service)
    ├── templates/
    │   └── postgresql.conf.j2
    ├── files/
    │   └── pg_hba.conf
    ├── vars/
    │   └── main.yml        # внутренние переменные (не переопределяются)
    ├── defaults/
    │   └── main.yml        # переопределяемые defaults
    └── meta/
        └── main.yml        # зависимости роли
```

```yaml
# roles/postgresql/defaults/main.yml
postgresql_version: "16"
postgresql_port: 5432
postgresql_max_connections: 100
postgresql_shared_buffers: "256MB"
postgresql_effective_cache_size: "1GB"
postgresql_data_dir: "/var/lib/postgresql/{{ postgresql_version }}/main"

postgresql_databases: []
postgresql_users: []
```

```yaml
# roles/postgresql/tasks/main.yml
- name: Install PostgreSQL
  import_tasks: install.yml
  tags: [install]

- name: Configure PostgreSQL
  import_tasks: configure.yml
  notify: Restart postgresql
  tags: [configure]

- name: Manage databases and users
  import_tasks: users.yml
  tags: [users]
```

```yaml
# roles/postgresql/tasks/install.yml
- name: Add PostgreSQL APT key
  ansible.builtin.apt_key:
    url: https://www.postgresql.org/media/keys/ACCC4CF8.asc
    state: present

- name: Add PostgreSQL repository
  ansible.builtin.apt_repository:
    repo: "deb https://apt.postgresql.org/pub/repos/apt {{ ansible_distribution_release }}-pgdg main"
    state: present

- name: Install PostgreSQL packages
  ansible.builtin.apt:
    name:
      - "postgresql-{{ postgresql_version }}"
      - "postgresql-client-{{ postgresql_version }}"
      - "python3-psycopg2"
    state: present
    update_cache: yes
```

```yaml
# roles/postgresql/handlers/main.yml
- name: Restart postgresql
  ansible.builtin.service:
    name: "postgresql@{{ postgresql_version }}-main"
    state: restarted

- name: Reload postgresql
  ansible.builtin.service:
    name: "postgresql@{{ postgresql_version }}-main"
    state: reloaded
```

## Шаблоны

```ini
# roles/postgresql/templates/postgresql.conf.j2
listen_addresses = '{{ postgresql_listen_addresses | default("localhost") }}'
port = {{ postgresql_port }}
max_connections = {{ postgresql_max_connections }}

shared_buffers = {{ postgresql_shared_buffers }}
effective_cache_size = {{ postgresql_effective_cache_size }}
work_mem = {{ postgresql_work_mem | default("4MB") }}

{% if postgresql_log_min_duration_statement is defined %}
log_min_duration_statement = {{ postgresql_log_min_duration_statement }}
{% endif %}

# Checkpoint
checkpoint_completion_target = 0.9
wal_buffers = 16MB
```

## Плейбук с ролями

```yaml
# site.yml
- name: Configure database servers
  hosts: db_servers
  become: yes
  roles:
    - role: postgresql
      vars:
        postgresql_max_connections: 200
        postgresql_shared_buffers: "512MB"
        postgresql_databases:
          - name: myapp
            encoding: UTF8
        postgresql_users:
          - name: app_user
            password: "{{ vault_db_password }}"
            db: myapp
            priv: "ALL"

- name: Configure web servers
  hosts: web_servers
  become: yes
  roles:
    - role: nginx
    - role: app
      vars:
        app_workers: 4
        app_port: 8000
```

## Коллекции и Galaxy

Коллекции -- пакеты с ролями, модулями и плагинами. Установка через `ansible-galaxy`:

```bash
# Из Galaxy
ansible-galaxy collection install community.postgresql

# Из requirements.yml (рекомендуемый способ)
ansible-galaxy collection install -r requirements.yml
```

```yaml
# requirements.yml
collections:
  - name: community.postgresql
    version: ">=3.0.0"
  - name: community.docker
    version: "3.4.0"
  - name: amazon.aws
    version: "7.0.0"

roles:
  - name: geerlingguy.docker
    version: "7.0.0"
  - src: https://github.com/my-org/ansible-role-nginx.git
    version: v2.1
    name: nginx
```

```bash
# Установить все зависимости
ansible-galaxy collection install -r requirements.yml
ansible-galaxy role install -r requirements.yml
```

## Ansible Vault

```bash
# Зашифровать файл с секретами
ansible-vault encrypt vars/secrets.yml

# Редактировать зашифрованный файл
ansible-vault edit vars/secrets.yml

# Расшифровать для проверки
ansible-vault view vars/secrets.yml

# Запуск с паролем из файла (для CI/CD)
ansible-playbook site.yml --vault-password-file .vault_pass

# Или через переменную окружения
ANSIBLE_VAULT_PASSWORD_FILE=.vault_pass ansible-playbook site.yml
```

Для CI/CD: хранить vault пароль в secrets CI системы, передавать через env или файл.

## Идемпотентность и теги

```yaml
- name: Create databases
  community.postgresql.postgresql_db:
    name: "{{ item.name }}"
    encoding: "{{ item.encoding | default('UTF8') }}"
    state: present
  loop: "{{ postgresql_databases }}"
  become: yes
  become_user: postgres
  tags: [databases]

- name: Create users
  community.postgresql.postgresql_user:
    name: "{{ item.name }}"
    password: "{{ item.password }}"
    db: "{{ item.db }}"
    priv: "{{ item.priv }}"
  loop: "{{ postgresql_users }}"
  become: yes
  become_user: postgres
  tags: [users]
  no_log: true   # не логировать пароли
```

```bash
# Запустить только задачи с тегом "databases"
ansible-playbook site.yml --tags databases

# Пропустить определённые теги
ansible-playbook site.yml --skip-tags install

# Проверить без выполнения -- показать что изменится
ansible-playbook site.yml --check --diff

# Один конкретный хост из inventory
ansible-playbook site.yml --limit db1.production.local
```

## Inventory и группы

```ini
# inventory/production
[db_servers]
db1.production.local
db2.production.local

[web_servers]
web1.production.local ansible_user=ubuntu
web2.production.local ansible_user=ubuntu

[all:vars]
ansible_python_interpreter=/usr/bin/python3
```

Или динамический inventory для AWS EC2:

```bash
ansible-inventory -i aws_ec2.yml --list
```

## Итог

Ansible роли структурируют автоматизацию в переиспользуемые компоненты. Galaxy предоставляет готовые роли для большинства задач -- не нужно писать установку PostgreSQL или Docker с нуля. Vault шифрует секреты прямо в репозитории. `--check --diff` делает применение предсказуемым.

Следующий шаг -- [HashiCorp Vault для управления секретами в Kubernetes](/posts/2026/03/14-vault).

