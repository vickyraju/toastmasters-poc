## Schema conventions (schema.md §1) — apply when translating to Drizzle/TS types
`uuid` PK named `id` everywhere (mock: `crypto.randomUUID()`); all timestamps `timestamptz` stored
UTC (IST for display only); durations as integer `*_seconds`; members are **soft-deleted only**
(`status='removed'` blocks sign-in, keeps history — no hard delete, ever); every write listed in
schema.md §7 also writes an `audit_log` row in the **same transaction**; DB field names
`snake_case`, TS `camelCase`; `account_type` (member/excomm/president) is **derived** from the
`positions` table, never edited directly — recompute on every position change.

## Key entities to know exist (full DDL in schema.md §3)
`members`, `positions` (one row per position code, seeded with the 7 rows), `meeting_types`,
`role_templates` (role catalog), `meeting_type_roles` (agenda template), `recurring_templates`,
`meetings`, `meeting_roles` (the slots — has partial unique index enforcing one-main-role, see
`mem:domain/business_rules` R-02), `speaker_details` (1:1 w/ speaker slot), `pathways_projects`
(preloaded timer timings), `meeting_reports` (payload is a kind-specific Zod-validated jsonb blob),
`completions` (Pathways progress log), `role_swaps`, `withdrawal_requests`, `club_settings`
(single-row config: cutoff hours, timer grace, inactive-after-days, generate-weeks-ahead, etc — these
are meant to be admin-editable settings, never hardcoded per rules.md maintainability NFR),
`notifications`/`tasks` (deduped via `dedupe_key` UNIQUE constraint so reminder jobs are idempotent),
`votes`/`vote_options`/`vote_participation`/`vote_ballots`/`vote_eligible` (see R-13 secrecy design),
`files`, `audit_log` (append-only, no UPDATE/DELETE grants at the DB level).

## Screens/routes reference
Full S-xx -> route -> who-can-open table lives in `flow.md` §2 and is recapped with Stitch-prompt
detail in `design.md` §7/§9. Service method -> API route mapping lives in `schema.md` §9. Don't
duplicate that table here — read those files directly when working on a specific screen.

## Design tokens
CSS variables + full palette/spacing/breakpoint spec in `design.md` §2 (becomes `src/styles/tokens.css`
+ Tailwind theme). Notable: primary `#004165`, input borders must use `--border-input` (`#758195`,
~3.9:1 contrast) not `--border` (`#D5DBE3`, only ~1.5:1 — too low for inputs). Timer card colours are
fixed swatches separate from the semantic success/warning/danger tokens.
