# Meridian Capital Partners — Trading Portal Platform

A production-grade managed-trading platform: a CMS-driven public marketing site plus three
role-scoped portals (Admin, Trader, Client) with live balances, an auditable ledger, withdrawal
workflows, feedback threads, real-time analytics and first-run onboarding tours.

> **Stack note.** The brief specified Supabase. This sandbox provisions **PostgreSQL + Drizzle ORM**,
> so the equivalent capabilities are implemented natively:
>
> | Brief (Supabase)      | Implemented here                                                                 |
> | --------------------- | -------------------------------------------------------------------------------- |
> | Supabase Auth         | Cookie sessions signed with HMAC-SHA256 (Web Crypto), scrypt password hashing      |
> | Row Level Security    | Server-side ownership guards on every query/mutation (`assertRole`, `assertTraderOwnsClient`) plus middleware route guards |
> | Realtime channels     | Live polling endpoints (`/api/live`, `/api/notifications`) via TanStack Query with a "Live" indicator and last-updated stamp |
> | Postgres RPC          | `applyBalanceChange()` — a single Postgres transaction with `SELECT … FOR UPDATE`, ledger write, notification and audit entry |
> | Storage               | Avatar / image URLs (validated) — no binary storage service in the sandbox          |

## Getting started

```bash
npm install
cp .env.example .env          # set DATABASE_URL and AUTH_SECRET
npx drizzle-kit push          # create the schema
npx tsx src/db/seed.ts        # seed realistic demo data
npm run dev
```

Production: `npm run build && npm run start`. Deploys cleanly to Vercel with a managed Postgres URL.

## Demo accounts

| Role   | Email                              | Password    |
| ------ | ---------------------------------- | ----------- |
| Admin  | admin@meridiancp.com               | Admin123!   |
| Trader | dana.whitfield@meridiancp.com      | Trader123!  |
| Client | amelia.rhodes@northstarfm.com      | Client123!  |

## Architecture

```
src/
  app/
    (public)/           marketing site + legal pages (CMS driven, ISR)
    login/ forgot-password/
    admin/ trader/ client/   role portals (layout = role guard + shell + tour)
    actions/            server actions: session, admin, trader, client, cms, portal, public
    api/                health, live metrics, notifications
  components/
    ui/                 Button, Card, Field, DataTable, ChartCard, ConfirmDialog, Toast, StatCard…
    features/           portal shell, dashboards, ledger table, CMS studio, onboarding tour…
  db/                   Drizzle schema + seed script
  lib/                  auth, session crypto, ledger (atomic money), queries, analytics, validators
  middleware.ts         edge route guards for /admin, /trader, /client, /login
```

### Access control (three layers)

1. **Middleware** verifies the signed session cookie and the role prefix before a portal route renders.
2. **Server guards** (`requireRole`, `assertRole`) re-verify the session against the `sessions` table on
   every page and action; traders additionally pass `assertTraderOwnsClient` before touching client data.
3. **Data scoping** — every query is filtered by owner (`clientId`, `traderId`), so hiding UI is never
   the security boundary. Sensitive mutations append to `audit_log` with before/after values.

### Money movements

`applyBalanceChange()` runs in one transaction: lock the account row, reject negative outcomes, write
the ledger entry (with `balance_before` / `balance_after`), update lifetime totals, insert the client
notification and append the audit record. Idempotency keys make double submission a no-op.

### CMS

Admins edit **draft** rows; publishing copies drafts to **published** rows, snapshots the draft into
`cms_versions` (restorable) and revalidates the public routes. The marketing site only ever reads
published content.

### Design system

Tokens live as CSS variables in `globals.css` and are mapped into Tailwind v4 (`@theme inline`), so
light and dark share identical component code. Uber-inspired: flat surfaces, 1px borders, pill
buttons, tabular numerals for every figure, 8/12px radii, restrained colour (green = positive,
red = negative, amber = pending). Motion uses one easing curve, respects `prefers-reduced-motion`,
and every async surface has a skeleton.

## Scripts

| Command                    | Purpose                            |
| -------------------------- | ---------------------------------- |
| `npm run dev`              | Development server                 |
| `npm run build` / `start`  | Production build / serve           |
| `npm run typecheck`        | TypeScript                         |
| `npm run lint`             | ESLint                             |
| `npx tsx src/db/seed.ts`   | Reset + seed demo data             |
