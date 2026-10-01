# S-04 — Meeting detail: Roles tab

**Route:** `/meetings/[id]?tab=roles` · **Purpose:** the signup board — the single most-used
screen in the app (FR-13, FR-14, FR-19, R-02, R-03, R-05, R-06, R-09). **Who sees it:** everyone;
actions vary by whether the viewer holds a role, is eligible, or is ExComm/President.

## Layout
Same shared header + lifecycle stepper + 4-tab bar, Roles tab active. Content is grouped into two
sections: **Main roles** (TMOD, General Evaluator, Table Topics Master, Speakers with their
Evaluators nested) and **Support roles** (Timer, Ah-Counter, Grammarian, Hark Master). Each row:
role label, holder (avatar + name) or an amber "Open" chip, and action buttons on the right.

## Exact content
Meeting `mtg-2026-10-02`, 9 of 12 filled. Rows exactly as seeded:
| Role | Holder | Notes |
| --- | --- | --- |
| TMOD | Ananya Das | theme already published |
| General Evaluator | Suresh Babu | |
| Table Topics Master | Divya Krishnan | |
| Speaker 1 | Mohammed Faisal | Level 2, "Lessons from a Failed Launch", 5:00–7:00 |
| Speaker 2 | Lakshmi Narayanan | Level 1 Ice Breaker, "My Journey to Chennai", 4:00–6:00 |
| Speaker 3 | Meera Joshi | Level 2, **title/objectives empty** |
| Evaluator 1 (for Speaker 1) | Nisha Pillai (L3) | **pending withdrawal request**, reason "Client call at 4 PM" |
| Evaluator 2 (for Speaker 2) | Open | needs level ≥ 2 |
| Evaluator 3 (for Speaker 3) | Open | needs level ≥ 3 |
| Timer | Vikram Rao | **pending swap request** with Aditya's Ah-Counter role |
| Ah-Counter | Aditya Kulkarni | has an incoming swap request to answer |
| Grammarian | Open | |

Speaker rows expand to show project, title, objectives, time limit, and the assigned evaluator
with a link to the evaluation form. Evaluator 3's row (unfilled speaker detail on Speaker 3) shows
"Set project timings" style guidance is not needed here since Speaker 3's issue is missing
title/objectives, not missing project timing.

## Interactions and states
- **Filled row:** avatar + name; ExComm sees "Reassign" and "Remove" icon buttons.
- **Open row:** amber "Open" chip + primary "Take this role" button (disabled with a tooltip
  reason if the signed-in member already holds a main role, or fails evaluator eligibility — e.g.
  Lakshmi cannot take Evaluator 2 because it's her own speech: "You can't evaluate your own
  speech").
- **Pending withdrawal banner:** amber banner inline on Nisha's row, text "Nisha requested to
  withdraw — Client call at 4 PM", Approve/Reject buttons for ExComm.
- **Pending swap banner:** inline note on Vikram's row "Swap requested with Aditya (Ah-Counter)
  — Pending", and on Aditya's row an actionable banner "Vikram wants to swap Timer for your
  Ah-Counter role" with Accept/Decline.
- **Concurrency conflict toast:** "Someone just took this role" appears if two people click Take
  at once; board auto-refreshes.
- **Loading:** skeleton rows in both groups. **Empty:** not applicable (a meeting always has role
  rows once created) — if a meeting somehow has zero roles, show "No roles added yet" with "Add
  role" for ExComm. **Error:** inline retry card replacing the whole board.
- ExComm-only "Add role" button at the bottom of each group.

## Components used
RoleBoard, RoleSlot, Avatar, StatusBadge (Open chip), SpeakerForm (expanded row), AssignDialog,
SwapDialog, WithdrawDialog, ConfirmDialog, Banner (pending withdrawal/swap), Toast (conflict).

## Check result
- [ ] Main roles and Support roles are visually separated into two labelled groups, not one flat list.
- [ ] Nisha's row shows the pending-withdrawal banner with Approve/Reject (ExComm view only).
- [ ] Lakshmi's own-speech Evaluator 2 button is disabled with a visible reason, not just hidden.
- [ ] Speaker 3 (Meera)'s row visibly flags missing title/objectives.
- [ ] "Take this role" buttons only appear on genuinely Open rows; filled rows show avatar+name instead.
- [ ] ExComm-only Reassign/Remove/Add-role controls are absent from the Member view.

---

## Paste-ready Stitch prompt

```
Context: Club Hub, a Toastmasters club web app. This is the Roles tab of the Meeting detail screen
for "Regular Meeting, Fri 2 Oct 4:00 PM IST" — reuse the same header, lifecycle stepper and 4-tab
bar from the Overview tab, Roles tab active. This is the signup board, the most-used screen.

Design a role board grouped into two labelled sections, "Main roles" and "Support roles". Main
roles rows: TMOD — Ananya Das (avatar+name); General Evaluator — Suresh Babu; Table Topics Master
— Divya Krishnan; Speaker 1 — Mohammed Faisal, expandable to show "Lessons from a Failed Launch",
time limit "5:00 to 7:00", with a nested Evaluator 1 row — Nisha Pillai, showing an amber inline
banner "Nisha requested to withdraw — Client call at 4 PM" with Approve/Reject buttons; Speaker 2
— Lakshmi Narayanan with Evaluator 2 row shown as an amber "Open" chip and a disabled "Take this
role" button with small grey text "You can't evaluate your own speech"; Speaker 3 — Meera Joshi
with a small warning tag "Missing title" and an Evaluator 3 "Open" row with an enabled "Take this
role" button. Support roles rows: Timer — Vikram Rao with a small note "Swap requested — Pending";
Ah-Counter — Aditya Kulkarni with an amber actionable banner "Vikram wants to swap Timer for your
Ah-Counter role", Accept/Decline buttons; Grammarian — amber "Open" chip, enabled "Take this role"
button. Each filled row also shows small icon-only Reassign and Remove buttons for officers.
```
