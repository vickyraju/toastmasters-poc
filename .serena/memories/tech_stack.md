## Tech stack (architecture.md §2, §4) — planned, not yet scaffolded (see M0 in mem:task_completion)

Frontend (build now): Next.js App Router + React, TypeScript strict, Tailwind CSS + CSS var tokens,
shadcn/ui (Radix), lucide-react icons, react-hook-form + Zod, TanStack Query, Zustand+persist
(mock "database" in localStorage), sonner (toasts), date-fns/date-fns-tz (IST), Vitest+Testing
Library (Playwright later), ESLint+Prettier.

Backend (later, not built yet): PostgreSQL (Supabase managed) + Drizzle ORM, Next.js Route Handlers
under `/api` with Zod, Supabase Storage for files, Supabase Realtime/SSE (polling 10-15s fallback)
for live updates, cron via `/api/cron/tick` every 10 min (`CRON_SECRET`), Auth.js or Supabase Auth
added last.

## Layered architecture (architecture.md §3) — strict, enforced by rules.md Part B
```
Pages/components -> hooks (src/hooks) -> service interfaces (src/lib/services)
  -> [DATA_MODE=mock] mock adapter + Zustand store + seed
  -> [DATA_MODE=api]  API adapter -> route handlers (Zod + can()) -> Postgres/Drizzle
Domain rules (src/lib/domain) are pure functions, no React/DB, shared by mock adapter + API routes + UI.
Permissions: single can(user, action, resource) fn, used both to hide UI and to gate server writes.
```
Hard invariants:
- Components **never** import from `src/lib/adapters/*` — only hooks -> services.
- Every service method returns a Promise even in mock mode (so swapping adapters needs zero caller changes).
- Every write goes through a service method that also writes the audit-log entry + creates
  notifications/tasks per `flow.md` — never bypass this.
- Switching `NEXT_PUBLIC_DATA_MODE` (mock|api) must not change any component.

## Directory layout (planned, architecture.md §4)
`src/app/(auth)`, `src/app/(app)/<feature>/page.tsx` (mapped 1:1 to S-xx screen IDs),
`src/components/{ui,layout,meetings,roles,reports,progress,votes,shared}`,
`src/hooks/`, `src/lib/domain/{types.ts,schemas.ts,rules/,constants.ts}`,
`src/lib/permissions/can.ts`, `src/lib/services/`, `src/lib/adapters/{mock/,api/}`,
`src/lib/auth/` (isolated sign-in layer — only this dir changes when real auth is added),
`src/lib/time/`, `drizzle/` (later), `design/stitch-exports/<ID>/` (Stitch output, reference only,
never imported into app code).

## Env vars (architecture.md §9, put in .env.example with no values)
`NEXT_PUBLIC_DATA_MODE` (mock default|api), `NEXT_PUBLIC_DEMO_MODE`, `NEXT_PUBLIC_MOCK_NOW` (ISO,
drives the mock clock), `NEXT_PUBLIC_CLUB_NAME`, `CLUB_TIMEZONE`=Asia/Kolkata, `DATABASE_URL`,
`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_BUCKET`, `SESSION_SECRET`, `CRON_SECRET`,
`SEED_PRESIDENT_EMPLOYEE_ID`. Only `NEXT_PUBLIC_*` vars may reach the browser. Never commit real values.

Do not add any dependency not already listed here without recording it + reason in `docs/decisions.md`
(rules.md Part B rule 1 — scope is locked to what the docs describe).
