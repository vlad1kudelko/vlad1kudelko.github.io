---
title: "Multi-cluster Kubernetes"
description: "Управление несколькими кластерами: federation, cluster-api"
heroImage: "../../../../assets/imgs/2026/03/14-multi-cluster-kubernetes.webp"
pubDate: "2026-03-14"
---

Управление множеством кластеров.

```yaml
# Cluster API
apiVersion: cluster.x-k8s.io/v1alpha4
kind: Cluster
metadata:
  name: my-cluster
spec:
  clusterNetwork:
    pods:
      cidrBlocks: ["10.244.0.0/16"]
  infrastructureRef:
    kind: AWSCluster
    apiVersion: infrastructure.cluster.x-k8s.io/v1alpha4
    name: my-cluster
```