---
title: "OPA и Policy as Code"
description: "Open Policy Agent: Gatekeeper, Rego policies, enforcement"
heroImage: "../../../../assets/imgs/2026/03/18-opa-gatekeeper.webp"
pubDate: "2026-03-18"
---

Policy as Code с OPA.

```rego
# policy.rego
package kubernetes.admission

deny[msg] {
  input.request.kind.kind == "Deployment"
  input.request.object.spec.replicas < 2
  msg = "Deployments must have at least 2 replicas"
}
```