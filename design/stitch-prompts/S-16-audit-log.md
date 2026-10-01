# S-16 — Audit log

**Route:** `/audit` · **Purpose:** append-only record of role/member/position/vote/level changes,
each with actor, time, before/after (FR-30). **Who sees it:** ExComm, President only.

## Layout
Table with filters (actor, action, date range) above it. Each row expandable to reveal before/after
values.

## Exact content
Rows built from events explicitly described in `mock-data.md` (not invented — see README Gaps for
this derivation note):
| Time | Actor | Action | Target |
| --- | --- | --- | --- |
| 28 Sep 2026 | Ananya Das | `level.verify` pending... *(shown as the still-pending log entry from her logging it, not yet verified)* | Ananya Das — Level 3 |
| ~1 Sep 2026 | Priya Raman | `level.verify` | Suresh Babu — Level 3 |
| 10 Aug 2026 | Priya Raman | `level.reject` | Ganesh Kumar — Level 2, reason "Evaluation form missing" |
| 12 Sep 2026 | Arjun Mehta | `vote.close` | vote-000 "Move meetings to 5 PM?" |
| (seed date) | Arjun Mehta | `vote.start` | vote-001 "Approve club anniversary budget" |
| 11 Sep 2026 | (ExComm actor) | `meeting.cancel` | mtg-2026-09-11, reason "Public holiday event" |
| (recent) | Vikram Rao | `role.swap` request created | Timer ↔ Ah-Counter, mtg-2026-10-02 |
| (recent) | Nisha Pillai | `role.withdraw_request` | Evaluator 1, mtg-2026-10-02, reason "Client call at 4 PM" |
Expanded row example: `level.reject` shows before `{status: "pending"}` / after `{status:
"rejected", reason: "Evaluation form missing"}`.

## Interactions and states
- **Loading:** skeleton table rows. **Empty:** "No audit entries match these filters" (only for a
  narrowed filter combination — the unfiltered log always has entries). **Error:** inline retry card.
- Filters: Actor (select of members), Action (select of AUDIT_ACTIONS), Date range (two date
  pickers). Clearing filters restores the full list.
- Expand/collapse chevron per row reveals a compact before/after diff block.

## Components used
AuditTable, FilterBar (actor/action/date-range), ExpandableRow, Chip/Badge (action type), Diff
block (before/after), EmptyState, ErrorState.

## Check result
- [ ] Every row shows actor, action, target and time (IST) at minimum, even before expanding.
- [ ] Expanded rows show a clear before/after diff, not a raw JSON dump.
- [ ] Filters (actor, action, date range) are visible and independently clearable.
- [ ] This screen is unreachable for Members (ExComm/President only — G-05 otherwise).
- [ ] Reject/verify rows correctly distinguish `level.verify` vs `level.reject` as different action chips.

---

## Paste-ready Stitch prompt

```
Context: Club Hub, a Toastmasters club web app. This is the Audit log screen for officers — an
append-only, filterable history of sensitive actions.

Design an audit log page: a filter row with three controls — "Actor" select, "Action" select,
"Date range" (two date pickers) — above a table. Table columns: Time, Actor (avatar + name),
Action (small coloured chip, e.g. blue "level.verify", red "level.reject", grey "vote.close"),
Target, and a chevron to expand. Rows: "1 Sep 2026 / Priya Raman / level.verify (blue chip) /
Suresh Babu — Level 3"; "10 Aug 2026 / Priya Raman / level.reject (red chip) / Ganesh Kumar —
Level 2"; "12 Sep 2026 / Arjun Mehta / vote.close (grey chip) / Move meetings to 5 PM?"; "11 Sep
2026 / Karthik Subramanian / meeting.cancel (red chip) / Regular Meeting, 11 Sep — reason: Public
holiday event". Show one row expanded: below it a compact two-column "Before / After" block with
small code-style text, e.g. Before `status: pending`, After `status: rejected, reason: Evaluation
form missing`. Sticky table header, row hover highlight.
```
