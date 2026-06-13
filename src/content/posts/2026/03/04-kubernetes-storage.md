---
title: "Kubernetes: storage — PV, PVC, StorageClass"
description: "Организуйте Kubernetes: storage с Persistent Volumes, PVC, StorageClass. Храните данные в кластере надёжно."
pubDate: "2026-03-04"
---

# Kubernetes storage: PV, PVC, StorageClass

Контейнеры ephemeral — данные внутри исчезают при перезапуске пода. Для stateful приложений (базы данных, файловые хранилища, очереди) нужны тома, которые живут независимо от пода.

## Три абстракции

**PersistentVolume (PV)** — физическое хранилище: диск на ноде, NFS, облачный диск. Создаётся администратором или динамически.

**PersistentVolumeClaim (PVC)** — запрос на хранилище от пода. Указывает размер и режим доступа.

**StorageClass** — шаблон для динамического создания PV. Абстрагирует тип хранилища от приложения.

## StorageClass и динамическое выделение

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
provisioner: pd.csi.storage.gke.io   # Google Persistent Disk CSI
parameters:
  type: pd-ssd
reclaimPolicy: Retain    # не удалять диск при удалении PVC
volumeBindingMode: WaitForFirstConsumer  # создать диск там, где под
allowVolumeExpansion: true
```

`WaitForFirstConsumer` откладывает создание диска до момента, когда планировщик выберет ноду для пода — важно для зональных дисков.

## PVC и использование в поде

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
spec:
  storageClassName: fast-ssd
  accessModes:
    - ReadWriteOnce    # один под на запись
  resources:
    requests:
      storage: 50Gi
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: postgres-data
```

## Режимы доступа

- `ReadWriteOnce (RWO)` — монтируется для чтения/записи одним подом. Блочные диски (AWS EBS, GCP PD).
- `ReadOnlyMany (ROX)` — много подов читают. NFS, CephFS.
- `ReadWriteMany (RWX)` — много подов читают и пишут. NFS, CephFS, EFS. Нужен для shared storage.

## StatefulSet и volumeClaimTemplates

StatefulSet автоматически создаёт PVC для каждого пода через `volumeClaimTemplates`:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
spec:
  replicas: 3
  serviceName: redis
  selector:
    matchLabels:
      app: redis
  template:
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          volumeMounts:
            - name: data
              mountPath: /data
  volumeClaimTemplates:
    - metadata:
        name: data
      spec:
        storageClassName: fast-ssd
        accessModes: [ReadWriteOnce]
        resources:
          requests:
            storage: 10Gi
```

Каждый под (`redis-cluster-0`, `redis-cluster-1`, `redis-cluster-2`) получит свой PVC `data-redis-cluster-0` и т.д. При удалении StatefulSet PVC не удаляются — данные сохраняются.

## CSI драйверы

Container Storage Interface (CSI) — стандарт для подключения внешних хранилищ. Популярные CSI-драйверы:

- `aws-ebs-csi-driver` — AWS EBS
- `pd.csi.storage.gke.io` — Google Persistent Disk
- `disk.csi.azure.com` — Azure Managed Disk
- `rook-ceph` — Ceph в самом кластере
- `longhorn` — распределённое хранилище на локальных дисках нод

## Бэкапы томов

Kubernetes Velero — стандартное решение для бэкапа PV:

```bash
# Установка
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.9.0 \
  --bucket my-backup-bucket \
  --backup-location-config region=eu-central-1

# Создать бэкап namespace с PV
velero backup create prod-backup \
  --include-namespaces production \
  --snapshot-volumes

# Расписание
velero schedule create daily-backup \
  --schedule="0 2 * * *" \
  --include-namespaces production
```
