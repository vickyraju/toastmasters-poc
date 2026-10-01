## Non-obvious business rules (full detail + test cases in rules.md Part A, R-01..R-18)
Each rule is a pure function in `src/lib/domain/rules/`, shared by mock + API adapters.

- **R-01 Permissions**: single `can(user, action, resource)` gate (src/lib/permissions/can.ts) per
  the matrix in schema.md §6. No component/service ever checks `account_type` directly.
- **R-02 One main role rule**: a member holds at most one `is_main=true` slot per meeting; separately,
  at most one *support* role per meeting too (assumption, default). Enforced even for ExComm
  assignment (must free the other role first) — no exceptions, no override bypass.
- **R-03 Evaluator eligibility**: evaluator needs `currentLevel >= min(speaker.level + 1, 5)` —
  levels compare as plain numbers **regardless of pathway**. Self-evaluation blocked. ExComm/President
  can override (audited as `role.override`).
- **R-04 Timer card**: colour computed from `seconds` vs slot min/max + `grace` (default 30s):
  below `min-grace` or above `max+grace` = disqualified; below `min` = qualifies but no card; below
  midpoint = green; below `max` = yellow; else red. Computed at save time and frozen into the report
  payload (doesn't change retroactively if timings are edited later).
- **R-05 Withdrawal cutoff**: >= cutoff hours (default 24) before meeting = immediate withdraw, slot
  reopens. Inside cutoff = creates a pending `withdrawal_request`, holder keeps role until ExComm
  decides. Members can never withdraw after the meeting starts (ExComm-only removal then).
- **R-06 Swaps**: both members must still individually satisfy R-02 and R-03 *after* the swap, or it's
  blocked (`422 NOT_ELIGIBLE`) and stays pending. Auto-expires if either role changes hands or the
  meeting starts.
- **R-07 Meeting lifecycle**: Draft -> Open -> Finalized -> Completed, with Cancelled reachable from
  any pre-Completed state. Completion is **always manual** (ExComm clicks it) — nothing auto-completes,
  by explicit decision (see FR-10 / edge case table in prd-toast.md).
- **R-08 Recurring generation**: idempotent via UNIQUE(template_id, starts_at). Editing a template
  only affects not-yet-generated meetings unless ExComm explicitly opts in ("apply to generated
  Draft meetings"). Never overwrites a meeting that has any role holder.
- **R-09 Claim concurrency**: atomic single-statement claim (`UPDATE ... WHERE member_id IS NULL`);
  zero rows updated -> `409 SLOT_TAKEN`. Mock adapter must replicate this inside one synchronous
  Zustand store callback, not a check-then-set across two calls.
- **R-12 Positions/President**: exactly one President must exist at all times (system blocks any
  action that would leave zero or two). Only the President can assign/remove ExComm positions or
  transfer the presidency; the outgoing President becomes a plain Member. First President is
  seeded via DB, not assigned in-app.
- **R-13 Voting secrecy**: ballots (`vote_ballots`) store **no member_id**, only `{voteId, optionId}`;
  separately `vote_participation` records *that* someone voted (PK prevents double-vote ->
  `409 ALREADY_VOTED`). While open, only turnout (`cast/eligible`) is visible to anyone, including
  the President. Results appear only after close, per-option counts only, never linked to a voter.
  Eligible voters are snapshotted at vote-start time (`vote_eligible` table) so later position
  changes don't retroactively change turnout.
- **R-15 Dates**: store UTC, display IST (date-fns-tz). Meeting can't span >12 hours. Past meetings
  blocked from creation except ExComm back-filling (config default: blocked).
- **R-16 Member removal**: releases their future role slots to Open (member gets no notification,
  ExComm gets a warning listing affected meetings); their name still shows on historical reports;
  cannot remove yourself or the President.

## API error codes (schema.md §8) — shared by mock and API adapters
`400 VALIDATION`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 SLOT_TAKEN`,
`409 ALREADY_HAS_MAIN_ROLE`, `409 ALREADY_VOTED`, `409 STALE` (optimistic-concurrency version
mismatch), `409 INVALID_STATE`, `422 NOT_ELIGIBLE`, `422 INSIDE_CUTOFF`, `423 CLOSED`, `500 INTERNAL`.
Body shape: `{ "error": { "code", "message", "fields"? } }`.
