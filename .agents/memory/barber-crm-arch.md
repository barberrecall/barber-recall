---
name: Barber CRM architecture
description: Key non-obvious design decisions for the Barber Recall CRM that future work must stay consistent with.
---

## Single barbershop row
The barbershop table holds exactly one row. `GET /api/barbershop` auto-creates it with defaults if missing. No multi-tenant yet; the row ID is always 1. Extend by adding a tenant FK if multi-tenant is needed later.

**Why:** The spec describes a single-barbearia micro-SaaS; no user auth yet.

**How to apply:** All routes that need barbershop config do `db.select().from(barbershopTable).limit(1)`.

## Client status lifecycle
Recall status is `active` / `awaiting_return` / `at_risk` and is **derived at read time**, never read from the `clients.status` column: `artifacts/api-server/src/lib/recall.ts` computes it in SQL from `coalesce(ultimo_atendimento, created_at)` vs `barbershop.diasRetorno` (+ 7-day tolerance). The column stays as a cache set to `"active"` on appointment creation; no background job is needed. Dashboard counts, the `/clients?status=` filter, insights and `taxaRetorno` all go through that module.

**Why:** Status must never be computed in two places (skill `client-recall-logic`), and a derived value can't go stale between visits.

**How to apply:** Need a status or a recall metric anywhere? Import from `../lib/recall`. Never re-implement the thresholds, and never accept `status` as user input.

## barberId filter on /clients
`GET /clients?barberId=N` is implemented via a subquery — it fetches `clienteId`s from the appointments table where `barbeiroId = N`, then filters clients by those IDs. There is no `barbeiroId` FK on the clients table.

**Why:** A client is associated with a barber through their appointments, not statically.

## Date columns
Use `date(..., { mode: "string" })` for calendar-only values (dataNascimento, validade). Use `timestamp(..., { withTimezone: true })` for instants (createdAt, ultimoAtendimento, data in appointments).
