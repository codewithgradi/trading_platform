# Northline — Trading portal

A considered trading platform for three roles, built with Next.js App Router, TypeScript, Drizzle/PostgreSQL, Supabase Auth/Realtime/Storage, Tailwind CSS, Radix primitives, Framer Motion and Recharts. All financial amounts are ZAR and all display dates use Africa/Johannesburg.

## What is included

- A CMS-driven public site with an editorial hero, platform previews, company story, testimonials, FAQs, contact form and legal/risk pages.
- Client dashboard, complete transaction ledger and CSV export, notifications, withdrawal requests, conversations, profile and guided tour.
- Trader desk with assigned customers, atomic balance adjustments, trade logging and allocation, withdrawal review, feedback and analytics.
- Admin overview, user creation/assignment/suspension, account security, audit log, enquiries, analytics and a draft/publish content studio with image uploads and focal-point control.
- Signed demo sessions locally; Supabase Auth, RLS, Realtime and Storage when configured. No public account creation.

## Quick start — local demo

1. Install dependencies: `npm install`.
2. Copy `.env.example` to `.env` and set `DATABASE_URL` and a long `SESSION_SECRET`.
3. Start PostgreSQL and create the database. Apply the local Drizzle schema with `npx drizzle-kit push`.
4. Load the demo with `npm run seed`. The script is idempotent and refuses to run with `NODE_ENV=production` or `VERCEL_ENV=production`.
5. Run `npm run dev` and visit `http://localhost:3000`.

The local mode is for development and demonstrations. Image uploads are saved to `public/uploads` only in this mode. In production, configure Supabase Storage and shared, distributed rate limiting.

### Demo logins

| Role | Email | Demo password |
| --- | --- | --- |
| Admin | `admin@northline.co.za` | `Northline2026!` |
| Trader | `thabo@northline.co.za` | `Northline2026!` |
| Client | `nomsa@northline.co.za` | `Northline2026!` |

Two additional traders and nineteen additional clients are created with the same demo password. Never use these credentials in a production deployment. The login page includes one-click demo-role shortcuts.

## Supabase setup

1. Create a Supabase project, or run the Supabase CLI locally. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` and a **server-only, privileged direct Postgres** `DATABASE_URL` for the same project. Never expose the service-role key or Postgres URL in client code.
2. Apply `supabase/migrations/20261001000000_initial.sql` with `supabase db push`. This creates tables, indexes, Auth-linked profiles, RLS policies, a published-only CMS function, Storage buckets/policies, Realtime publication entries and transactional balance RPCs.
3. Run `npm run seed` only in a non-production environment. It creates demo Auth users with the Supabase Auth admin API, creates their profiles through Drizzle, loads `supabase/seed.sql`, and uploads the local editorial images to the CMS Storage bucket.
4. For local CLI resets, `supabase/config.toml` wires `supabase/seed.sql` into `supabase db reset`. Run `npm run seed` afterwards to create Auth users/profiles and load the remaining relation-dependent demo data. Both runs are safe to repeat.
5. In Supabase Auth settings, allow your site origin and the `/reset-password` redirect URL. Users should change their temporary password after first sign-in.

The Next.js server checks every role and assignment before touching data. The direct database connection is trusted and **must** remain server-only; browser access to Supabase is additionally restricted by RLS. Sensitive financial changes lock the account row and commit balance, ledger, notification and audit entries in one transaction. Idempotency keys guard retries. Supabase RPCs are included for clients that require direct database calls in the future.

## Content editing

Sign in as an admin and open **Content studio**. Select a section, edit its fields, upload images if needed, and adjust the hero focal point and overlay. **Save draft** does not affect the public site. The preview switches between your draft and the published version. **Publish changes** requires typing `PUBLISH` and revalidates the public pages. FAQs and testimonials have their own visibility controls and ordering. Published CMS content is read server-side; drafts are not exposed publicly.

## Data and safety notes

- `src/lib/format.ts` is the single source of ZAR number and en-ZA date formatting. Monetary columns are `numeric(18,2)` with an accounts currency constraint of `ZAR`.
- The local demo's session cookie is signed and HTTP-only. Supabase mode uses `@supabase/ssr` cookies and verified `auth.getUser()` calls. The Next.js proxy guards portal routes, layouts and actions recheck access, and the SQL migration applies RLS to every table.
- Financial and destructive actions use clear review dialogs. High-risk actions require a confirmation word. Audit entries preserve before/after values without storing passwords.
- Contact and auth endpoints include an in-process rate limit for the demo. A distributed limiter is required before deploying across multiple production instances.
- Rich CMS copy is sanitised to plain text. Image uploads accept only JPG, PNG and WebP under 4 MB. Do not treat performance illustrations as a promise of returns.

## Deploy on Vercel

Deploy the repository as a Next.js project, set all required environment variables, apply the Supabase migration before first traffic, and configure an appropriate production domain in Supabase Auth. **Do not run the demo seed in production.** Use Supabase for persistent images; the local file upload fallback is ephemeral on serverless hosts. Keep the `DATABASE_URL`, `SESSION_SECRET` and service-role key in server-only environment variables. Configure a shared rate limiter, monitoring and backups before handling real customer accounts.

## Quality checklist

- [ ] `npx next typegen`, `npm exec tsc -- --noEmit`, `npm run build` and the production health check pass.
- [ ] Public site, legal pages and every portal work at 360, 768, 1024 and 1440 pixels in light and dark mode.
- [ ] Verify client A cannot access client B, and trader A cannot manage trader B's customers. Confirm this at route, action and RLS layers.
- [ ] Test a repeated balance request with the same idempotency key, negative balance rejection, withdrawal state transitions and trade allocation totals.
- [ ] Check keyboard navigation, visible focus rings, reduced-motion behaviour and screen-reader labels for charts and controls.
- [ ] Confirm displayed money, seeded content, tooltips, notifications and CSV values use the shared ZAR formatter; no other currency symbol is hard-coded in UI copy.
- [ ] Review the risk disclosure and all published content with legal/compliance counsel before going live.
