---
title: "Ansible: конфигурационный менеджмент — автоматизация серверов"
description: "Автоматизируйте конфигурацию серверов с Ansible: плейбуки, роли, модули. Упростите управление инфраструктурой — начните внедрение сейчас."
heroImage: "../../../../assets/imgs/2025/12/04-ansible-config-management.webp"
pubDate: "2025-12-04"
---

# Ansible: автоматизация без агентов

Ansible — инструмент для автоматизации конфигурации и управления серверами. Использует SSH для подключения и YAML для описания задач. Главное преимущество Ansible — отсутствие необходимости устанавливать агенты на управляемые серверы. Достаточно настроить SSH-доступ и описать желаемое состояние в плейбуке.

## Установка

```bash
# macOS
brew install ansible

# Ubuntu/Debian
sudo apt update
sudo apt install ansible

# RHEL/CentOS
sudo yum install ansible
sudo dnf install ansible

# Python
pip install ansible
```

## Базовая структура

### Inventory

```ini
# inventory.ini
[webservers]
web01.example.com ansible_host=192.168.1.10
web02.example.com ansible_host=192.168.1.11

[databases]
db01.example.com ansible_host=192.168.1.20
db02.example.com ansible_host=192.168.1.21

[production:children]
webservers
databases

[production:vars]
ansible_user=ubuntu
ansible_python_interpreter=/usr/bin/python3
```

### Ad-hoc команды

```bash
# Проверка связи
ansible all -i inventory.ini -m ping

# Выполнить команду
ansible all -i inventory.ini -a "free -h"

# Скопировать файл
ansible all -i inventory.ini -m copy -a "src=./file.conf dest=/etc/app/"

# Установить пакет
ansible webservers -i inventory.ini -m apt -a "name=nginx state=present" --become
```

## Плейбуки

### Простой плейбук

```yaml
# playbook.yml
---
- name: Setup Web Server
  hosts: webservers
  become: yes
  vars:
    nginx_port: 80
  
  tasks:
    - name: Install Nginx
      apt:
        name: nginx
        state: present
        update_cache: yes

    - name: Start Nginx
      service:
        name: nginx
        state: started
        enabled: yes

    - name: Copy nginx config
      template:
        src: templates/nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      notify: Restart Nginx

    - name: Allow nginx through firewall
      ufw:
        rule: allow
        port: "{{ nginx_port }}"
        proto: tcp

  handlers:
    - name: Restart Nginx
      service:
        name: nginx
        state: restarted
```

### Множественные плейбуки

```yaml
---
- name: Common tasks
  hosts: all
  become: yes
  
  tasks:
    - name: Update apt cache
      apt:
        update_cache: yes
      when: ansible_os_family == "Debian"

    - name: Set timezone
      timezone:
        name: UTC

- name: Web servers
  hosts: webservers
  become: yes
  
  tasks:
    - name: Install Python
      apt:
        name:
          - python3
          - python3-pip

- name: Database servers
  hosts: databases
  become: yes
  
  tasks:
    - name: Install PostgreSQL
      apt:
        name:
          - postgresql
          - postgresql-contrib
```

## Модули

### Файловые модули

```yaml
# Copy
- name: Copy file
  copy:
    src: files/app.conf
    dest: /etc/app/
    owner: app
    group: app
    mode: '0644'

# Template
- name: Render config
  template:
    src: templates/app.conf.j2
    dest: /etc/app/app.conf
    mode: '0600'

# Lineinfile
- name: Add line to file
  lineinfile:
    path: /etc/sysctl.conf
    line: "net.core.somaxconn=65535"
    create: yes

# Blockinfile
- name: Add block to file
  blockinfile:
    path: /etc/hosts
    marker: "# {mark} ANSIBLE MANAGED BLOCK"
    block: |
      192.168.1.10 web01
      192.168.1.11 web02
```

### Системные модули

```yaml
# Service
- name: Ensure service is running
  service:
    name: nginx
    state: started
    enabled: yes

# Systemd
- name: Manage service via systemd
  systemd:
    name: nginx
    state: restarted
    enabled: yes
    daemon_reload: yes

# UFW
- name: Configure firewall
  ufw:
    state: enabled
    policy: deny

- name: Allow SSH
  ufw:
    rule: allow
    from_ip: any
    port: '22'
    proto: tcp
```

### Пакетные менеджеры

```yaml
# APT
- name: Install packages
  apt:
    name:
      - nginx
      - postgresql
      - redis-server
    state: present
    update_cache: yes

# YUM/DNF
- name: Install packages (RHEL)
  dnf:
    name:
      - httpd
      - postgresql-server
    state: present

# PIP
- name: Install Python packages
  pip:
    name:
      - django
      - djangorestframework
    virtualenv: /opt/venv/myapp
```

### Базы данных

```yaml
# PostgreSQL
- name: Create database
  postgresql_db:
    name: myapp
    encoding: UTF-8
    template: template0

- name: Create user
  postgresql_user:
    name: myapp_user
    password: "secure_password"
    db: myapp
    priv: ALL

- name: Grant privileges
  postgresql_privs:
    db: myapp
    role: myapp_user
    privs: ALL
    type: database
```

## Jinja2 шаблоны

```jinja2
# templates/nginx.conf.j2
user {{ nginx_user }};
worker_processes {{ worker_processes }};

events {
    worker_connections {{ worker_connections }};
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    {% if enable_access_log %}
    access_log {{ access_log_path }};
    {% endif %}

    server {
        listen {{ nginx_port }};
        server_name {{ server_name }};

        location / {
            root {{ document_root }};
            index index.html;
        }

        {% for up in upstream_servers %}
        upstream {{ up.name }} {
            server {{ up.host }}:{{ up.port }};
        }
        {% endfor %}
    }
}
```

## Роли

### Структура роли

```
roles/
└── nginx/
    ├── defaults/
    │   └── main.yml
    ├── files/
    │   └── nginx.conf
    ├── handlers/
    │   └── main.yml
    ├── tasks/
    │   └── main.yml
    ├── templates/
    │   └── nginx.conf.j2
    └── vars/
        └── main.yml
```

### defaults/main.yml

```yaml
---
nginx_port: 80
nginx_user: www-data
worker_processes: auto
worker_connections: 1024
document_root: /var/www/html
enable_access_log: true
```

### tasks/main.yml

```yaml
---
- name: Install nginx
  apt:
    name: nginx
    state: present

- name: Copy nginx config
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
  notify: Restart nginx

- name: Start nginx
  service:
    name: nginx
    state: started
    enabled: yes
```

### handlers/main.yml

```yaml
---
- name: Restart nginx
  service:
    name: nginx
    state: restarted

- name: Reload nginx
  service:
    name: nginx
    state: reloaded
```

### Использование роли

```yaml
---
- name: Setup webserver
  hosts: webservers
  become: yes
  
  roles:
    - role: nginx
      vars:
        nginx_port: 8080
```

## Переменные и факты

### Facts

```yaml
---
- name: Gather facts
  hosts: all
  tasks:
    - name: Display all facts
      debug:
        var: ansible_facts

    - name: Display OS
      debug:
        msg: "OS: {{ ansible_facts['os_family'] }}"

    - name: Display memory
      debug:
        msg: "Memory: {{ ansible_facts['memtotal_mb'] }}MB"

    - name: Display IP
      debug:
        msg: "IP: {{ ansible_facts['default_ipv4']['address'] }}"
```

### Регистрация переменных

```yaml
- name: Check nginx status
  command: systemctl is-active nginx
  register: nginx_status
  ignore_errors: yes

- name: Display status
  debug:
    msg: "Nginx is {{ nginx_status.stdout }}"

- name: Conditional restart
  service:
    name: nginx
    state: restarted
  when: nginx_status.stdout == "active"
```

## Условия и циклы

### Условия

```yaml
- name: Install Apache on Debian
  apt:
    name: apache2
    state: present
  when: ansible_os_family == "Debian"

- name: Install httpd on RHEL
  dnf:
    name: httpd
    state: present
  when: ansible_os_family == "RedHat"

- name: Debug when variable is defined
  debug:
    msg: "Value is {{ my_var }}"
  when: my_var is defined
```

### Циклы

```yaml
- name: Install multiple packages
  apt:
    name: "{{ item }}"
    state: present
  loop:
    - nginx
    - postgresql
    - redis-server

- name: Create users
  user:
    name: "{{ item.name }}"
    shell: "{{ item.shell | default('/bin/bash') }}"
    create_home: yes
  loop:
    - { name: alice, shell: /bin/bash }
    - { name: bob, shell: /bin/zsh }
    - { name: carol }
```

### loop_control

```yaml
- name: Loop with label
  debug:
    msg: "{{ item.name }} - {{ item.role }}"
  loop:
    - { name: alice, role: admin }
    - { name: bob, role: developer }
  loop_control:
    label: "{{ item.name }}"
```

## Теги

```yaml
- name: Install nginx
  apt:
    name: nginx
    state: present
  tags:
    - install
    - nginx

- name: Configure nginx
  template:
    src: nginx.conf.j2
    dest: /etc/nginx/nginx.conf
  tags:
    - configure
    - nginx

# Запуск только определённых тегов
ansible-playbook playbook.yml --tags "install"
ansible-playbook playbook.yml --skip-tags "configure"
```

## Vault

```bash
# Создать зашифрованный файл
ansible-vault create vault.yml

# Редактировать
ansible-vault edit vault.yml

# Расшифровать
ansible-vault decrypt vault.yml

# Зашифровать
ansible-vault encrypt vault.yml

# Изменить пароль
ansible-vault rekey vault.yml
```

```yaml
# playbook.yml с vault
---
- name: Deploy app
  hosts: all
  vars_files:
    - vault.yml
  tasks:
    - name: Deploy using secrets
      template:
        src: app.conf.j2
        dest: /etc/app/app.conf
```

## Best Practices

1. **Используйте роли** — структурируйте код
2. **Избегайте `shell` и `command`** — используйте модули
3. **Idempotency** — задачи должны быть идемпотентными
4. **Handlers** — для перезапуска сервисов
5. **Tags** — для выборочного выполнения
6. **Vault** — для sensitive данных
7. **Check mode** — `ansible-playbook --check` для тестирования

## Заключение

Ansible — мощный инструмент для автоматизации управления конфигурацией. Его декларативный подход и простота SSH-агента делают его отличным выбором для инфраструктуры любого масштаба.