---
title: "Ansible: роли и коллекции, Galaxy, best practices"
description: "Создавайте Ansible: роли и коллекции, Galaxy, best practices. Структурируйте плейбуки для автоматизации."
pubDate: "2026-03-13"
---

# Ansible: роли и коллекции

Плейбук из 500 задач в одном файле, типичная история для проектов, где Ansible добавляли постепенно. Роли структурируют автоматизацию: каждая роль, изолированная единица с задачами, переменными, шаблонами и обработчиками.

## Структура роли

```
roles/
└── postgresql/
 ├── tasks/
 │ ├── main.yml # точка входа
 │ ├── install.yml
 │ └── configure.yml
 ├── handlers/
 │ └── main.yml # обработчики (restart service)
 ├── templates/
 │ └── postgresql.conf.j2
 ├── files/
 │ └── pg_hba.conf
 ├── vars/
 │ └── main.yml # внутренние переменные
 ├── defaults/
 │ └── main.yml # переопределяемые defaults
 └── meta/
 └── main.yml # зависимости роли
```

```yaml
# roles/postgresql/defaults/main.yml
postgresql_version: "16"
postgresql_port: 5432
postgresql_max_connections: 100
postgresql_shared_buffers: "256MB"
postgresql_data_dir: "/var/lib/postgresql/{{ postgresql_version }}/main"

postgresql_databases: []
postgresql_users: []
```

```yaml
# roles/postgresql/tasks/main.yml
- name: Install PostgreSQL
 import_tasks: install.yml

- name: Configure PostgreSQL
 import_tasks: configure.yml
 notify: Restart postgresql
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

- name: Install PostgreSQL packages
 ansible.builtin.apt:
 name:
 - "postgresql-{{ postgresql_version }}"
 - "postgresql-client-{{ postgresql_version }}"
 state: present
 update_cache: yes
```

```yaml
# roles/postgresql/handlers/main.yml
- name: Restart postgresql
 ansible.builtin.service:
 name: "postgresql@{{ postgresql_version }}-main"
 state: restarted
```

## Шаблоны

```ini
# roles/postgresql/templates/postgresql.conf.j2
# Managed by Ansible, не редактировать вручную
listen_addresses = '{{ postgresql_listen_addresses | default("localhost") }}'
port = {{ postgresql_port }}
max_connections = {{ postgresql_max_connections }}
shared_buffers = {{ postgresql_shared_buffers }}
effective_cache_size = {{ postgresql_effective_cache_size | default("1GB") }}

{% if postgresql_log_min_duration_statement is defined %}
log_min_duration_statement = {{ postgresql_log_min_duration_statement }}
{% endif %}
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
```

## Коллекции и Galaxy

Коллекции, пакеты с ролями, модулями и плагинами. Установка через `ansible-galaxy`:

```bash
# Из Galaxy
ansible-galaxy collection install community.postgresql

# Из requirements.yml
ansible-galaxy collection install -r requirements.yml
```

```yaml
# requirements.yml
collections:
 - name: community.postgresql
 version: ">=3.0.0"
 - name: community.docker
 - name: amazon.aws
 version: "7.0.0"

roles:
 - name: geerlingguy.docker
 version: "7.0.0"
 - src: https://github.com/my-org/ansible-role-nginx.git
 version: v2.1
 name: nginx
```

## Ansible Vault

```bash
# Зашифровать файл с секретами
ansible-vault encrypt vars/secrets.yml

# Редактировать зашифрованный файл
ansible-vault edit vars/secrets.yml

# Запуск с паролем из файла
ansible-playbook site.yml --vault-password-file.vault_pass
```

## Идемпотентность и теги

```yaml
- name: Create database
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
 no_log: true # не логировать пароли
```

```bash
# Запустить только задачи с тегом "databases"
ansible-playbook site.yml --tags databases

# Проверить без выполнения
ansible-playbook site.yml --check --diff
```
