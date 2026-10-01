# S-12 — Member profile

**Route:** `/members/[id]` · **Purpose:** one member's details, role history, progress summary
(FR-05). **Who sees it:** the member themselves (own profile, editable pathway/email/name) and
ExComm/President (view + edit all other fields).

## Layout
Profile header card (avatar, name, position badge if any, employee ID, email, Toastmasters ID,
pathway/level), then two content blocks below it: Roles history (list) and Progress summary
(compact version of S-09).

## Exact content
Persona shown: **Suresh Babu (IL1011)** — no position, pathway "Strategic Relationships", level 4.
- Header: avatar "SB", name "Suresh Babu", employee ID "IL1011", email
  "suresh.babu@example.com", Toastmasters ID (placeholder format), pathway "Strategic
  Relationships", level "4 of 5".
- **Roles history:** "General Evaluator — 2 Oct 2026 (upcoming)", "General Evaluator — 25 Sep
  2026", "Evaluator (for a Level 3 speaker) — 18 Sep 2026".
- **Progress summary:** level ring "4 of 5", "Level 3 verified 1 Sep 2026 by Priya Raman (VPE)" as
  a small history line, "2 projects done".
- Edit affordance: self view shows an "Edit" button limited to pathway + contact fields; ExComm
  view shows "Edit" opening the full MemberForm (same fields as S-11's Add member dialog, minus
  Employee ID which is immutable after creation).

## Interactions and states
- **Loading:** skeleton header card + skeleton list rows. **Empty:** "No roles yet" for a
  brand-new member with no history (e.g. use Lakshmi Narayanan as the sparse-data example, one
  upcoming role only, "0 projects done" in progress summary). **Error:** inline retry card.
- Self-view vs ExComm-view of the Edit button differ in exactly which fields the resulting dialog
  allows changing — show both as labelled variants.

## Components used
ProfileHeaderCard, Avatar, PositionBadge, RolesHistoryList, ProgressSummary (ProgressRing +
mini-history), Button ("Edit"), MemberForm (edit dialog), EmptyState, ErrorState.

## Check result
- [ ] Self-view Edit only allows pathway/email/name-type fields, not position or status — annotate this distinction clearly.
- [ ] Roles history correctly separates an "(upcoming)" future role from past completed ones.
- [ ] Progress summary matches the same level-ring pattern used on `S-09-my-progress.md` for visual consistency.
- [ ] Employee ID is shown as read-only/immutable in the edit dialog, not an editable text field.
- [ ] Sparse-data (new member) variant shows believable empty states, not a broken-looking blank page.

---

## Paste-ready Stitch prompt

```
Context: Club Hub, a Toastmasters club web app. This is a Member profile screen, persona "Suresh
Babu" — General Evaluator, no officer position, level 4 of 5.

Design a profile page: header card with a large avatar (initials "SB" on a tinted circle), name
"Suresh Babu" at 24px, employee ID "IL1011" and email "suresh.babu@example.com" as muted subtext,
a small info row "Pathway: Strategic Relationships · Level 4 of 5", and an outline "Edit" button
top-right of the card. Below it, two side-by-side cards (stack on phone): left card "Roles
history" — a simple list with date + role text: "2 Oct 2026 — General Evaluator (upcoming)", "25
Sep 2026 — General Evaluator", "18 Sep 2026 — Evaluator"; right card "Progress" — a circular
progress ring "4 of 5", a line "2 projects done", and a small muted history note "Level 3 verified
1 Sep 2026 by Priya Raman". Cards use white surface, thin border, 8px radius. Show a loading
variant with skeleton blocks in the same layout.
```
