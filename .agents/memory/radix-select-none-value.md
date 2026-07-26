---
name: Radix Select "none" value bug
description: Using value="none" in Radix SelectItem leads to parseInt("none")=NaN being sent to the API when the field is optional.
---

When a Select field is optional (e.g. barbeiro, serviço), the "no selection" option uses `value="none"`. Since "none" is truthy, a guard like `data.field ? parseInt(data.field) : undefined` will call `parseInt("none")` and produce `NaN`.

**Fix:** Check `data.field && data.field !== "none"` before parsing, OR use empty string `""` as the no-selection value (but Radix may not allow empty strings — check behavior).

**How to apply:** All optional Select fields in forms — appointments (barbeiroId, servicoId), campaigns (cupomId).
