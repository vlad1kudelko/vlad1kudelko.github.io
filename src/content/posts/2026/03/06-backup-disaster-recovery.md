---
title: "Backup и Disaster Recovery"
description: "Стратегии резервного копирования и восстановления в Kubernetes"
heroImage: "../../../../assets/imgs/2026/03/06-backup-disaster-recovery.webp"
pubDate: "2026-03-06"
---

Backup и disaster recovery.

```bash
# Velero backup
velero backup create my-backup \
  --include-namespaces default \
  --snapshot-volumes

# Schedule backups
velero schedule create daily-backup \
  --schedule "0 0 * * *" \
  --include-namespaces default

# Restore
velero restore create --from-backup my-backup
```