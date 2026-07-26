# Barber Recall CRM

Micro-SaaS mobile-first CRM for barbershops focused on client retention via WhatsApp automations. Dark/light mode, Brazilian Portuguese UI.

## Run & Operate

Copy `.env.example` to `.env` first — the API server and drizzle-kit both read it.

- `pnpm --filter @workspace/api-server run dev` — build + run the API (port 8080)
- `pnpm --filter @workspace/barber-crm run dev` — web CRM (needs `PORT` and `BASE_PATH`; proxies `/api` to 8080 in dev)
- `pnpm --filter @workspace/barber-app run dev` — Expo dev server for the mobile app, LAN mode
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed:demo` — populate a demo barbershop (refuses to run over existing clients)

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
- Recall rules: `artifacts/api-server/src/lib/recall.ts`
- Web CRM: `artifacts/barber-crm/src/` — theme in `src/index.css`
- Mobile app: `artifacts/barber-app/` — screens in `app/`, theme in `global.css` + `tailwind.config.js`
- Business rules: `.claude/skills/` — read the matching skill before touching recall, campaigns, appointments or tenant scoping

## Architecture decisions

- OpenAPI-first: all types generated from spec — never hand-write what codegen produces.
- Client recall status (`active`/`awaiting_return`/`at_risk`) is derived at read time from `ultimoAtendimento` + `barbershop.diasRetorno` in `artifacts/api-server/src/lib/recall.ts` — the single source of truth for status counts and taxa de retorno. `clients.status` is only a cache.
- Multi-tenant: every user owns one barbershop, and every domain table carries `barbershop_id`. Queries scope by the id on the session, never one sent by the client.
- Auth has two shapes for one session model: the web uses the `express-session` cookie, native clients send `Authorization: Bearer` (React Native has no dependable persistent cookie jar). `bearerAuth` runs before the session middleware and skips it, so routes read `req.session` unchanged either way. Tokens are only minted when the caller asks with `issueToken: true`, so a browser never receives one.
- Appointments are records of what happened, not schedule entries — there is no `status` column and `data <= now()` is what "already happened" means. `syncClientRecallCache` recomputes the client's cached recall fields after any appointment write.
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
- Typecheck the whole workspace (`pnpm run typecheck`), not one package. Two copies of `@types/react` in the tree make TypeScript treat the same type as unrelated, and per-package checks hide it.
- The API server uses `pino` logging — never use `console.log` in server code; use `req.log` in handlers.
- `date(..., { mode: "string" })` for calendar-only columns, `timestamp(..., { withTimezone: true })` for instants. Sending `""` to a `date` column is a 500 — map empty strings to null on PATCH.
- Metro must not live on a cloud-synced folder. Its watcher init timeout is a hard-coded 4 minutes, and crawling node_modules through OneDrive exceeds it.
- The mobile app derives the API address from Metro's `hostUri`, so a phone reaches the dev machine without editing a constant. Production needs `EXPO_PUBLIC_API_URL`.
- Windows needs inbound firewall rules on 8080 and 8081 for a physical device to connect.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
