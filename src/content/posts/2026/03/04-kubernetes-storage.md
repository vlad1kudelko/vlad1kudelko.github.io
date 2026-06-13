---
title: "Kubernetes: storage, PV, PVC, StorageClass"
description: "Организуйте Kubernetes: storage с Persistent Volumes, PVC, StorageClass. Храните данные в кластере надёжно."
pubDate: "2026-03-04"
---

# Kubernetes storage: PV, PVC, StorageClass

Kubernetes управляет хранилищем через три абстракции: StorageClass описывает тип диска, PVC запрашивает нужный объём, PV -- реальный диск, который создаётся автоматически. Stateful приложения (базы данных, очереди, файловые хранилища) работают в Kubernetes именно через эту модель.

Контейнеры ephemeral: данные внутри исчезают при перезапуске пода. Для баз данных и других stateful приложений нужны тома, которые живут независимо от пода. Kubernetes предоставляет несколько уровней абстракции для этого.

> **Key Takeaways**
> - `StorageClass` с `WaitForFirstConsumer` создаёт диск там, где запланирован под -- критично для зональных дисков в облаке
> - `volumeClaimTemplates` в StatefulSet автоматически создаёт отдельный PVC для каждого пода -- данные изолированы
> - `reclaimPolicy: Retain` сохраняет диск при удалении PVC; `Delete` удаляет -- выбирайте осознанно
> - `ReadWriteMany` для shared storage требует NFS, CephFS или EFS; обычные блочные диски поддерживают только `ReadWriteOnce`
> - Velero делает бэкапы PV через VolumeSnapshot API -- тестируйте восстановление, а не только создание

## Три абстракции хранилища

**PersistentVolume (PV)** -- физическое хранилище: диск на ноде, NFS-шара, облачный диск. Создаётся администратором вручную или динамически через StorageClass.

**PersistentVolumeClaim (PVC)** -- запрос на хранилище от пода. Указывает размер, тип доступа и StorageClass. Kubernetes находит подходящий PV или создаёт новый.

**StorageClass** -- шаблон для динамического создания PV. Абстрагирует тип хранилища (SSD, HDD, network) от приложения.

## StorageClass и динамическое выделение

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-ssd
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: pd.csi.storage.gke.io    # Google Persistent Disk CSI
parameters:
  type: pd-ssd
  replication-type: regional-pd       # репликация между зонами
reclaimPolicy: Retain                 # не удалять диск при удалении PVC
volumeBindingMode: WaitForFirstConsumer  # создать диск там, где под
allowVolumeExpansion: true            # разрешить расширение без пересоздания
```

`WaitForFirstConsumer` откладывает создание диска до момента, когда планировщик выберет ноду для пода. Это критично для зональных дисков: AWS EBS и GCP PD привязаны к зоне. Если PVC создаётся сразу (Immediate), диск может оказаться в другой зоне, чем под -- и под не запустится.

Для AWS:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: gp3-ssd
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true
```

## PVC и использование в поде

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
spec:
  storageClassName: fast-ssd
  accessModes:
    - ReadWriteOnce   # один под на чтение/запись
  resources:
    requests:
      storage: 50Gi
```

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  serviceName: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:16-alpine
          env:
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: postgres-data
```

## Режимы доступа

- `ReadWriteOnce (RWO)` -- монтируется для чтения/записи одним подом. Блочные диски: AWS EBS, GCP Persistent Disk.
- `ReadOnlyMany (ROX)` -- много подов читают, никто не пишет. NFS, CephFS.
- `ReadWriteMany (RWX)` -- много подов читают и пишут одновременно. NFS, CephFS, AWS EFS. Нужен для shared uploads, конфигурационных файлов, shared caches.
- `ReadWriteOncePod (RWOP)` -- монтируется строго одним подом (не одной нодой). Kubernetes 1.22+.

Блочные диски (AWS EBS, GCP PD) поддерживают только `ReadWriteOnce`. Если нужен `ReadWriteMany` -- используйте NFS или облачный файловый сервис.

## StatefulSet и volumeClaimTemplates

StatefulSet автоматически создаёт отдельный PVC для каждого пода через `volumeClaimTemplates`:

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
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          command: ["redis-server", "--appendonly", "yes", "--save", "60", "1"]
          ports:
            - containerPort: 6379
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

Каждый под (`redis-cluster-0`, `redis-cluster-1`, `redis-cluster-2`) получит свой PVC (`data-redis-cluster-0`, `data-redis-cluster-1`, `data-redis-cluster-2`). При удалении StatefulSet PVC не удаляются -- данные сохраняются. Это поведение не изменить без явного удаления PVC.

## CSI драйверы

Container Storage Interface -- стандарт для подключения внешних хранилищ. CSI-драйверы устанавливаются как обычные Kubernetes workloads и не требуют изменений кубера:

```bash
# AWS EBS CSI
helm repo add aws-ebs-csi-driver https://kubernetes-sigs.github.io/aws-ebs-csi-driver
helm install aws-ebs-csi-driver aws-ebs-csi-driver/aws-ebs-csi-driver \
  --namespace kube-system

# Longhorn (локальное распределённое хранилище)
helm repo add longhorn https://charts.longhorn.io
helm install longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --create-namespace
```

Популярные CSI-драйверы:
- `ebs.csi.aws.com` -- AWS EBS
- `pd.csi.storage.gke.io` -- Google Persistent Disk
- `disk.csi.azure.com` -- Azure Managed Disk
- `rook-ceph.rbd.csi.ceph.com` -- Ceph RBD в самом кластере
- `driver.longhorn.io` -- распределённое хранилище на локальных дисках нод

## Volume Snapshots

Kubernetes поддерживает создание снапшотов через VolumeSnapshot API:

```yaml
# Создать снапшот
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-snapshot-2026-03-04
spec:
  volumeSnapshotClassName: csi-aws-vsc
  source:
    persistentVolumeClaimName: postgres-data
---
# Восстановить PVC из снапшота
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data-restored
spec:
  dataSource:
    name: postgres-snapshot-2026-03-04
    kind: VolumeSnapshot
    apiGroup: snapshot.storage.k8s.io
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
```

## Бэкапы через Velero

Velero -- стандартное решение для бэкапа PV и Kubernetes-ресурсов:

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

# Расписание: каждый день в 2:00
velero schedule create daily-backup \
  --schedule="0 2 * * *" \
  --include-namespaces production \
  --ttl 720h    # хранить 30 дней

# Проверить бэкапы
velero backup get

# Восстановление
velero restore create --from-backup prod-backup
```

Velero сохраняет и восстанавливает не только данные на дисках, но и все Kubernetes-объекты: Deployment, ConfigMap, Service, PVC. Тестируйте восстановление в staging регулярно -- бэкап, который никто не проверял, это ненадёжный бэкап.

## Расширение томов

Если в StorageClass включён `allowVolumeExpansion: true`, PVC можно расширить без пересоздания:

```bash
# Увеличить размер с 50Gi до 100Gi
kubectl patch pvc postgres-data -p '{"spec": {"resources": {"requests": {"storage": "100Gi"}}}}'

# Проверить статус расширения
kubectl describe pvc postgres-data
# Conditions: ...FileSystemResizePending -> ResizeFinished
```

Уменьшение тома не поддерживается -- только увеличение.

## Итог

Kubernetes Storage Model даёт надёжное хранилище для stateful workloads через три уровня: StorageClass определяет тип диска, PVC запрашивает ресурс, StatefulSet управляет жизненным циклом подов и томов. Ключевые моменты: `reclaimPolicy: Retain` для защиты данных, `WaitForFirstConsumer` для зональных дисков, VolumeSnapshot для быстрых бэкапов.

Следующий шаг -- [безопасность Kubernetes: RBAC, Pod Security](/posts/2026/03/05-kubernetes-security).
