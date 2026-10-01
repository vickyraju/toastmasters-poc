## Coding rules (rules.md Part B) — apply once code exists

- Scope is locked to the docs: if a screen/field/behaviour isn't documented, stop and ask, or log it
  to `docs/decisions.md`. Never add features/screens/packages/tables "for later".
- TypeScript `strict`; no `any`, no `@ts-ignore` without an explanatory comment. Domain types in
  `src/lib/domain/types.ts` mirror `schema.md` exactly. All form input validated with Zod schemas
  from `schemas.ts`.
- No hard-coded enum strings — import from `src/lib/domain/constants.ts`.
- Time: only `now()` + IST helpers from `src/lib/time`. No `new Date()` / `Date.now()` in feature code
  (the mock clock must be swappable and jumpable via the dev panel).
- Field naming: `snake_case` in DB/schema.md, `camelCase` in TypeScript.
- Design: tokens from `design.md`/`tokens.css` via Tailwind theme only — no raw hex in components.
  Stitch exports (`design/stitch-exports/`) are reference only, never copy their markup/classnames.
- Accessibility: labels on all inputs, visible focus, keyboard-operable dialogs, never color-only
  signal (esp. timer cards: always print Green/Yellow/Red/DQ text). Run `eslint-plugin-jsx-a11y`.
- Every data view implements all 4 states: loading, empty, error, normal.
- Mock realism: mock service methods return promises with a 150-400ms delay and can fail on demand
  from a dev panel ("Simulate error") to exercise error states.
- Commit message format: `feat(S-04): role board claim and withdraw` — include the screen/rule ID.
- Secret ballots: **never** store or read a member_id alongside a vote choice (`vote_ballots` has no
  member_id column — see `mem:domain/data_model`). This is a hard security/trust invariant, not a
  style choice.

## Milestone workflow (implementation_plan-toast.md)
Work one milestone (M0-M13) at a time from `implementation_plan-toast.md`. After each: stop, run
checks, report what was built / what's untested / doc gaps found — wait for "go to M<n>" before
continuing. Never touch scope outside the current milestone.
