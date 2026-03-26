---
title: "Infrastructure Testing"
description: "Тестирование инфраструктуры: Terratest, InSpec, kitchen-terraform"
heroImage: "../../../../assets/imgs/2026/03/15-infrastructure-testing.webp"
pubDate: "2026-03-15"
---

Тестирование инфраструктурного кода.

```go
// Terratest example
import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
)

func TestTerraformExample(t *testing.T) {
    terraformOptions := &terraform.Options{
        TerraformDir: "../examples/basic",
        Vars: map[string]interface{}{
            "region": "us-east-1",
        },
    }
    
    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)
    
    output := terraform.Output(t, terraformOptions, "instance_id")
    assert.NotEmpty(t, output)
}
```