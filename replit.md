# Barber Recall CRM

Micro-SaaS mobile-first CRM for barbershops focused on client retention via WhatsApp automations. Dark/light mode, Brazilian Portuguese UI.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at `/api`)
- `pnpm --filter @workspace/barber-crm run dev` — run the frontend (proxied at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TailwindCSS, shadcn/ui, Framer Motion, Recharts, next-themes
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- API spec: `lib/api-spec/openapi.yaml`
- DB schema: `lib/db/src/schema/` (one file per entity)
- API routes: `artifacts/api-server/src/routes/` (one file per domain)
- Frontend: `artifacts/barber-crm/src/`
- Theme/CSS: `artifacts/barber-crm/src/index.css`

## Architecture decisions

- OpenAPI-first: all types generated from spec — never hand-write what codegen produces.
- Client recall status (`active`/`awaiting_return`/`at_risk`) is derived at read time from `ultimoAtendimento` + `barbershop.diasRetorno` in `artifacts/api-server/src/lib/recall.ts` — the single source of truth for status counts and taxa de retorno. `clients.status` is only a cache.
- Single barbershop row (row 1 auto-created on first GET) — no multi-tenant yet, designed to extend.
- `barberId` filter on `/clients` resolved via appointment join (not a FK on clients table).
- After any DB schema change: run `pnpm run typecheck:libs` before checking artifact packages.

## Product

- Landing page (public) with pricing and benefits
- Dashboard with 8 KPI cards + 3 charts (daily clients, monthly return, revenue)
- Client management: list/search/filter by status, detail with appointment history
- Appointment registration (links client + barber + service, auto-updates client stats)
- Campaign manager: 4 types (return, birthday, loyalty, custom) with configurable trigger days
- Coupon system: percent/fixed discounts, usage tracking, auto-code generation
- Reports: revenue + client analytics with period selector
- AI Insights: at-risk client detection, potential revenue recovery, best campaign day
- Settings: barbershop name, colors, WhatsApp, Instagram, return window

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run `pnpm run typecheck:libs` after changing `lib/db/` or `lib/api-spec/` before checking api-server typecheck — stale lib declarations cause false errors.
- The API server uses `pino` logging — never use `console.log` in server code; use `req.log` in handlers.
- `date(..., { mode: "string" })` for calendar-only columns, `timestamp(..., { withTimezone: true })` for instants.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
