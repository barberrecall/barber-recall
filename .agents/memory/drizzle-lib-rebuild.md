---
name: Drizzle lib rebuild rule
description: Must run typecheck:libs after any lib/db or lib/api-spec change or api-server typecheck will show false "no exported member" errors for all tables.
---

## The rule
After any change to `lib/db/src/schema/` or `lib/api-spec/openapi.yaml`, run:

```bash
pnpm run typecheck:libs
```

before running `pnpm --filter @workspace/api-server run typecheck`.

**Why:** `lib/db` is a composite lib that emits declarations. The api-server reads those declarations. If they are stale, TypeScript reports every table import as "Module has no exported member 'xTable'" even though the source is correct. `typecheck:libs` rebuilds the declarations via `tsc --build`.

**How to apply:** Any time you write or edit files in `lib/db/src/schema/` or run codegen, run `pnpm run typecheck:libs` immediately after, then check api-server.
