# rules.md: Business Rules, Coding Rules and Guardrails for Claude Code

Status: Draft v1. This file has three parts:
- **Part A:** business rules (R-xx) that must be implemented exactly, each with test cases.
- **Part B:** coding rules for how Claude Code works in this repo.
- **Part C:** a drop-in `CLAUDE.md` for the repo root.

If two docs disagree, precedence is: `prd.md` (what) > `flow.md` (behaviour) > `schema.md` (data and API) > `design.md` (look) > `architecture.md` (structure) > `rules.md` (details). If a doc is silent, **ask; do not invent**.

---

## Part A: Business rules

Implement each as a pure function in `src/lib/domain/rules/` with unit tests. Both adapters (mock, API) call the same functions.

### R-01 Permissions
Single function `can(user, action, resource)` in `src/lib/permissions/can.ts`, implementing the matrix in `schema.md` section 6. No component or service checks `account_type` directly. Hiding a button is never the only protection: every service method calls `can()` first.
Tests: Member cannot `position.assign`; ExComm (non-VPE) cannot `completion.verify`; President cannot `completion.verify` unless holding VPE (impossible); TMOD holder can edit theme of own meeting but not the next meeting; TMOD loses edit right once the meeting is Completed or Cancelled.

### R-02 One main role per member per meeting
A member may hold at most one slot where `is_main = true` in a meeting. Support roles (Timer, Ah-Counter, Grammarian, Hark Master) can be held alongside a main role, but one member holds at most **one** support role per meeting **[assumption, default]**. Claim or assign that breaks this returns `ALREADY_HAS_MAIN_ROLE` (or `ALREADY_HAS_SUPPORT_ROLE`) with a message naming the existing role. ExComm assignment is also blocked (they must free the other role first) so the rule has no exceptions.
Optional consecutive-repeat limit: if `consecutive_repeat_limit = N` (off by default), a member cannot take the same role code in more than N consecutive completed-or-scheduled meetings. Off means no check.

### R-03 Evaluator eligibility (FR-23, assumption A10)
```ts
// speakerLevel: level of the speech being evaluated (speaker_details.level, falls back to speaker's current_level)
function evaluatorEligibility(evaluator: {id, currentLevel}, speaker: {id, level}) {
  if (evaluator.id === speaker.id) return { ok: false, reason: 'SELF' };
  const required = Math.min(speaker.level + 1, 5);          // completed the speaker's level, or in the next one
  return evaluator.currentLevel >= required ? { ok: true } : { ok: false, reason: 'LEVEL', required };
}
```
- Levels compare as numbers regardless of pathway.
- Level 5 speeches need evaluators at level 5 (cap).
- An evaluator slot with no speaker assigned yet is claimable by anyone eligible for the slot's expected level; if the speaker is unknown, use the speaker slot's `speaker_details.level` if set, otherwise allow and re-check when the speaker is set (ineligible evaluator is flagged for ExComm, not removed).
- ExComm and President can override (audited as `role.override`).
- Error: `422 NOT_ELIGIBLE` with `reason` and `required`. UI text: "You need to be at level 3 or higher to evaluate this speech."
Tests: L2 speaker + L3 evaluator ok; L2 speaker + L2 evaluator not ok; L5 speaker + L4 not ok, L5 ok; self not ok.

### R-04 Timer card (FR-24)
Inputs: `seconds`, slot `min_seconds`, `max_seconds`, `grace = club_settings.timer_grace_seconds` (default 30).
```ts
function timerCard(t: number, min: number, max: number, grace = 30): Card {
  const mid = Math.floor((min + max) / 2);
  if (t < min - grace || t > max + grace) return 'disqualified';
  if (t < min) return 'none';        // qualifies (within grace) but no card reached
  if (t < mid) return 'green';
  if (t < max) return 'yellow';
  return 'red';                       // t >= max, up to max + grace
}
```
Show the thresholds under the form: "Green from 5:00, yellow from 6:00, red from 7:00. Qualifies from 4:30 to 7:30." Card is computed at save and stored in the payload. Speaker slots without limits (project not chosen) cannot be scored; the row shows "Set project timings" and the timer can still enter time.
Tests: (300,300,420) green; (359) green; (360) yellow; (419) yellow; (420) red; (450) red; (451) disqualified; (269) disqualified; (280) none.

### R-05 Withdrawal cutoff (FR-14, assumption A3)
`hoursUntilStart = (meeting.starts_at - now()) / 3600s`. If `hoursUntilStart >= cutoff` (meeting override or club default 24): withdraw is immediate; slot becomes open; audit `role.withdraw`; ExComm gets nothing unless <48 h to go (then normal N-15 logic applies). Otherwise create a `withdrawal_request` (one pending per slot), notify ExComm (task T-02), holder keeps the role until decided. Approve: slot opens, requester gets N-17. Reject: requester keeps role, gets N-17. Members cannot withdraw after the meeting has started; only ExComm can remove them. ExComm withdrawals are never delayed.
Tests: 48 h ok immediate, exactly 24 h immediate, 23 h 59 m request, duplicate request rejected, after start blocked.

### R-06 Swaps (FR-47)
Requester must hold a role in the meeting; target holds another role in the same meeting; meeting is Open or Finalized; not with self; only one pending swap per role. On accept, both roles exchange holders in one transaction. Both members must still satisfy R-02 and R-03 after the swap (an evaluator swapped into a speaker slot must be eligible for the role they receive). Otherwise `422 NOT_ELIGIBLE` on accept, swap stays pending. ExComm gets an audit row and N-16 goes to both. Decline or cancel closes it. Swaps expire automatically when either role changes hands or the meeting starts.

### R-07 Meeting lifecycle (FR-10, assumptions A1, A2, A7)
| From | To | Who | Conditions |
| --- | --- | --- | --- |
| Draft | Open | ExComm | Has a venue or link; sends N-01 to all members |
| Open | Finalized | ExComm | Warn if roles are still open, allow anyway; sends N-02 to role holders |
| Finalized | Open | ExComm | Reopen; no notification unless roles change |
| Finalized | Completed | ExComm | Manual. Only after `ends_at`. Warn if required reports are missing; allow anyway. Closes role-holder permissions and locks reports |
| Draft/Open/Finalized | Cancelled | ExComm | Reason required; N-04 to role holders; pending tasks for that meeting are removed |
| Open | Completed | not allowed | |
Rescheduling (changing `starts_at`/`ends_at`) is allowed until Completed; sends N-03 and re-keys reminders. Members do not see Draft meetings. Completed and Cancelled meetings are read-only except the audit log and ExComm agenda upload.
Bulk "Open all drafts" is one action producing one N-01 per meeting.

### R-08 Recurring generation (FR-07, FR-12)
For each active template, ensure meetings exist for every matching weekday from today through `weeks_ahead`, skipping `skip_dates`. Idempotent via UNIQUE (template_id, starts_at). Generated meetings are `draft` with slots from the meeting type. Editing a template affects only meetings not yet generated, unless ExComm ticks "Apply to generated meetings that are still Draft". Never overwrite meetings that have any role holder.

### R-09 Claim concurrency (FR-19)
See `schema.md` section 5. Claim is a single atomic operation. In mock mode, the claim runs inside one synchronous store `set` callback; UI shows "Someone just took this role" on `SLOT_TAKEN` and refreshes the board. Optimistic UI is allowed but must roll back on error.

### R-10 Reminders, tasks and notifications (FR-36 to FR-40)
Tasks (T-xx) and notifications (N-xx) are created only by service code in `src/lib/domain/events.ts` through one function per trigger, following the tables in `flow.md` sections 6 and 7. Every notification has a `link` that lands on the exact action (`?tab=roles&slot=...`, `?tab=reports`, `/progress/club?tab=queue`, `/votes/:id`). Reminder times: 3 days, 1 day, 3 hours before `starts_at`. Idempotency by `dedupe_key`, for example `N-14:{meetingId}:{slotId}:{3d}`. Cancelled meetings send none. A task is marked done by the action itself, not by opening the link. Preferences (FR-40): locked codes are N-03, N-04, N-07, N-14, N-17.
Toast: shown when a notification arrives while the app is open; in mock mode arrival is simulated by the dev panel and by the local action events (for example, "Vikram accepted your swap").

### R-11 Levels and progress (FR-32 to FR-35)
- Project completion: counts immediately (`counted`).
- Level completion: `pending` until VPE decides. Verify: `members.current_level = min(level + 1, 5)` only if `level >= current_level` (never move a member backwards); notify N-10. Reject: reason required; N-10.
- A member cannot log a level completion for a level above `current_level`, and cannot log the same level twice while one is pending.
- Completion date cannot be in the future.
- Proof upload optional unless `proof_required`.
- Inactive = `last_active_at` older than `inactive_after_days`.

### R-12 Positions and President (FR-04, assumption A6)
Only the President can assign, replace or remove a non-President position. Assigning a position to a member who already holds one is blocked (remove first) **[default]**. Assigning updates `account_type` to excomm; removing recomputes it. **President transfer:** the President names the next President; on "Transfer now" (explicit confirm dialog) the next President gets position `president` and becomes President; the outgoing President becomes a plain Member with no position; audit `president.transfer`. The first President is created by seed (flow.md section 9). There must always be exactly one President; the UI and service block anything that would leave zero or two.

### R-13 Voting (FR-44, assumption A5)
- Only the President starts a vote (title 3 to 120 chars, description up to 1000, 2 to 6 options, default Yes/No/Abstain, optional deadline in the future).
- Eligible voters = ExComm plus President at the moment the vote starts, stored in `vote_eligible`.
- One vote each, final. Cast writes `vote_participation` and `vote_ballots` (no member link) in one transaction.
- While open: eligible voters see turnout only (`cast / eligible`). Nobody, including the President and any admin screen, sees per-option counts.
- Closes at deadline (job) or by the President's "Close vote" action. After close: results (counts and percentages) visible to eligible voters. Individual choices are never visible.
- A closed vote cannot be reopened. Tie is shown as a tie; no automatic decision.
- The mock adapter must also keep ballots free of member IDs (store `{ voteId, optionId }` only) so the UI code cannot accidentally depend on them.

### R-14 Uploads (FR-45, FR-32)
PDF, DOCX, PNG, JPG only; max 10 MB; reject by MIME and extension; sanitise file name; one agenda file per meeting (replace overwrites, old file kept 30 days in API mode). Mock mode: store as object URL for the session, and show the placeholder `public/mock/agenda-sample.pdf` for seeded meetings.

### R-15 Dates and time
Store UTC, display IST via `date-fns-tz`. The clock is `now()` (mock clock in demo). Meeting `ends_at` must be after `starts_at`; a meeting cannot span more than 12 hours. Past meetings cannot be created except by ExComm (for back-filling) **[default: blocked; enable if you want back-fill]**.

### R-16 Member management (FR-03)
Add requires unique employee ID and email. Deactivate/remove: blocks sign-in; releases future role slots to Open with an ExComm warning listing them; history preserved. A removed member's name still appears on past reports. Cannot remove yourself or the President.

### R-17 Audit (FR-30)
Append-only; every event listed in `schema.md` section 7; expose only through `audit.list`. Show actor, action, target, time (IST), before and after.

### R-18 Empty and edge states
No meetings: "No meetings yet" with Create meeting (ExComm) or nothing (Member). Meeting with zero roles: allow save as Draft, block Open. No eligible evaluator: show "No eligible evaluators yet" to ExComm. Member with no pathway: prompt on My progress. A user opening a Draft meeting link (not ExComm): G-05.

---

## Part B: Coding rules

1. **Scope:** implement only what is in the docs. If a needed screen, field or behaviour is not in the docs, stop and ask or add it to `docs/decisions.md`. Never add features, screens, packages or tables "for later".
2. **Data layer:** UI components never import from `adapters/`. They call hooks in `src/hooks`, which call services from `src/lib/services`. Mock and API adapters implement the same interfaces. Switching `NEXT_PUBLIC_DATA_MODE` must not change any component.
3. **Types:** TypeScript `strict`; no `any`, no `@ts-ignore` without a comment explaining why. Domain types live in `src/lib/domain/types.ts` and mirror `schema.md`. Validate all form input with Zod schemas from `schemas.ts`.
4. **Permissions:** call `can()` in services and hide/disable UI using the same function through a `useCan()` hook.
5. **No hard-coded strings for enums:** import from `constants.ts`.
6. **Time:** only `now()` and IST helpers. No `new Date()` in features, no `Date.now()`.
7. **Design:** use tokens from `design.md` via CSS variables and Tailwind theme. No raw hex in components. Stitch exports are reference only; never copy their markup or class names.
8. **Accessibility:** labels on all inputs, visible focus, keyboard-operable dialogs, text alongside colour. Run `eslint-plugin-jsx-a11y`.
9. **States:** every data view implements loading, empty, error and normal.
10. **Mock realism:** service methods return promises with a short delay (150 to 400 ms) and can fail on demand from the dev panel ("Simulate error") to exercise error states.
11. **Testing:** unit tests for every rule R-01 to R-13 (Vitest). Component tests for RoleBoard claim/withdraw, TimerForm card colours, VoteForm secrecy. A short Playwright smoke test comes when the backend is added.
12. **Small steps:** one screen or one feature per commit. Commit message format: `feat(S-04): role board claim and withdraw` with the screen or rule ID.
13. **No secrets** in the repo. `.env.example` lists every variable in `architecture.md` section 9. Demo mode is off by default in production.
14. **Security reminder:** ID-only login must not protect real data. Real data must not go on a public URL until real authentication or platform protection exists (decision D-09).
15. **Definition of done for a screen:** matches `design.md` layout; all four states; permissions enforced through `can()`; keyboard navigable; phone layout has no horizontal scroll; relevant rule tests pass; seed scenario from `mock-data.md` section 9 works.

---

## Part C: Drop-in `CLAUDE.md` (repo root)

````markdown
# Club Hub: instructions for Claude Code

Read these before writing code, in this order: docs/prd.md, docs/flow.md, docs/schema.md, docs/design.md, docs/architecture.md, docs/rules.md, docs/mock-data.md, docs/implementation_plan.md.

## What we are building
A Toastmasters club management web app (desktop-first, responsive). Phase 1 is a frontend with mock data behind service interfaces. Backend and real authentication come later, without changing the UI.

## Hard rules
- Build only what the docs describe. If something is missing or ambiguous, ask before coding. Do not invent screens, fields, roles or libraries.
- Work through docs/implementation_plan.md one milestone at a time. Stop after each milestone and summarise what changed, what is untested, and any doc gaps.
- Names of screens (S-xx), tasks (T-xx), notifications (N-xx) and rules (R-xx) must match the docs exactly and appear in commit messages.
- UI code talks only to hooks and service interfaces. Never import from src/lib/adapters in components.
- All permission checks go through can(). Business rules live in src/lib/domain/rules and have unit tests.
- Time comes from now() (mock clock). Display in IST.
- Use design tokens from docs/design.md. Stitch exports in design/stitch-exports are reference only.
- Every data view has loading, empty, error and normal states.
- Secret-ballot voting: never store or read a member ID on a ballot.
- TypeScript strict, Zod for validation, no any.

## Commands
npm run dev, npm run build, npm run lint, npm run typecheck, npm test

## When unsure
Ask one short question, offering your best default. Record accepted defaults in docs/decisions.md.
````
