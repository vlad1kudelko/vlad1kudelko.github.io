---
title: "Cloud Native Storage"
description: "Ceph, Rook, Longhorn: распределённые файловые системы"
heroImage: "../../../../assets/imgs/2026/03/23-cloud-native-storage.webp"
pubDate: "2026-03-23"
---

Cloud-native хранилища для Kubernetes.

```yaml
# StorageClass
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-storage
provisioner: pd.csi.storage.gke.io
volumeBindingMode: WaitForFirstConsumer
parameters:
  type: pd-ssd
```