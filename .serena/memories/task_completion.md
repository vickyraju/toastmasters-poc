## Definition of done for a screen/feature (rules.md B15)
Matches `design.md` layout; all 4 states (loading/empty/error/normal) implemented; permissions
enforced through `can()` (both UI hiding AND server-side check — hiding a button is never the only
protection); keyboard navigable; phone layout has no horizontal scroll; relevant R-xx rule unit
tests pass; the relevant seed scenario from `mock-data.md` §9 (acceptance walkthrough) works.

## Commands
Not yet scaffolded (no package.json exists). Once M0 (implementation_plan-toast.md) is done, the
standard commands will be: `npm run dev`, `npm run build`, `npm run lint`, `npm run typecheck`,
`npm test`. Milestone M12's "done when" is the full acceptance walkthrough (mock-data.md §9) passing
end to end plus build/lint/typecheck/test all green.

## Testing expectations (rules.md B11)
Vitest unit test for every business rule R-01 through R-13 (and R-11 level math, R-13 secrecy
helper) — write these tests from the examples embedded in `rules.md` itself (e.g. R-04 timer card
has 9 literal input/output test cases spelled out). Component tests required for: RoleBoard
claim/withdraw, TimerForm card colours, VoteForm secrecy (no per-option counts visible while open,
no member_id on ballots). Playwright smoke tests are deferred to Phase 2 (after backend exists).
