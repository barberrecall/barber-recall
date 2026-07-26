---
name: Auth System
description: Real session-based authentication replacing the mock auth. Each user owns one barbershop; all data is tenant-isolated.
---

## Architecture

**Users table** (`users`): id, email, password_hash (bcrypt, 12 rounds), nome, created_at
**Barbershop table**: added `user_id` FK (unique — one user = one shop)
**All data tables** (clients, barbers, services, appointments, campaigns, coupons, notifications): added `barbershop_id` FK

Sessions stored in PostgreSQL via `connect-pg-simple` (table: `session`).

## Key files
- `artifacts/api-server/src/routes/auth.ts` — POST /auth/register, /auth/login, /auth/logout, GET /auth/me
- `artifacts/api-server/src/middleware/requireAuth.ts` — returns 401 if no session.barbershopId
- `artifacts/api-server/src/routes/index.ts` — auth/health/payment before requireAuth; all data routes after
- `artifacts/barber-crm/src/contexts/auth-context.tsx` — AuthProvider + useAuth hook
- `artifacts/barber-crm/src/components/protected-route.tsx` — redirects to /login if not authenticated

## Tenancy rule
Every data query **must** include `eq(table.barbershopId, req.session.barbershopId!)` in its WHERE clause.
Every insert **must** include `barbershopId` in values.
Cross-tenant FK references (clienteId in appointments, cupomId in campaigns) are validated before insert.

**Why:** Without barbershopId filter, any authenticated user sees all tenants' data.

## Session config
- SECRET: `SESSION_SECRET` env var — fails startup in production if missing
- Cookie: httpOnly, sameSite=lax, secure in production, 30-day maxAge
- Store: connect-pg-simple (table `session` created in migration SQL)

## Migration SQL applied
All `barbershop_id` columns added with `NOT NULL` after backfilling existing data to barbershop id=1.
`coupons.codigo` global unique dropped; replaced with composite unique (codigo, barbershop_id).
`users` and `session` tables created.
