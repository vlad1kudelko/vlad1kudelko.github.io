---
title: "FinOps: управление облачными затратами"
description: "FinOps: showback, chargeback, cost optimization процессы"
heroImage: "../../../../assets/imgs/2026/03/26-finops.webp"
pubDate: "2026-03-26"
---

FinOps — управление облачными расходами.

## FinOps Lifecycle

- **Inform** — видимость затрат
- **Optimize** — оптимизация
- **Operate** — continuous improvement

```sql
-- Cost Explorer запрос
SELECT 
  line_item_usage_account_id,
  product_instance_type,
  sum(line_item_unblended_cost) as cost
FROM cur
WHERE line_item_usage_start_date >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY 1, 2
ORDER BY 3 DESC
```