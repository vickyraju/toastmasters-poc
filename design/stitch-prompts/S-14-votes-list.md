# S-14 — Votes list

**Route:** `/votes` · **Purpose:** list all ExComm votes, open and closed; President starts new
ones (FR-44). **Who sees it:** ExComm, President only.

## Layout
Simple list/table: title, status badge, deadline (if open) or closed date. President-only primary
button "Start vote" top-right.

## Exact content
| Title | Status | Detail |
| --- | --- | --- |
| Approve club anniversary budget | **Open** (blue) | Deadline Sun 4 Oct, 6:00 PM IST · turnout 4/7 |
| Move meetings to 5 PM? | **Closed** (grey) | Closed 12 Sep 2026 |
Clicking either row opens `S-15-vote-detail.md` for that vote.

## Interactions and states
- **Loading:** skeleton rows. **Empty:** "No votes yet" + "Start vote" button for the President
  only, plain text for other ExComm. **Error:** inline retry card.
- Open row shows a small turnout indicator inline ("4/7 voted") but **never** any result — this is
  a hard rule (R-13): nobody, including the President, sees per-option counts before close.
- "Start vote" button opens a form (title, description, options — default Yes/No/Abstain,
  optional deadline) — show this as part of the paste-ready prompt too since it's the only entry
  point to vote creation and has no separate screen ID.

## Components used
VotesList/Table, StatusBadge (Open/Closed), TurnoutIndicator (inline, count only), Button ("Start
vote", President only), VoteForm (start-vote dialog: title, description, options list, deadline).

## Check result
- [ ] Open vote row shows turnout ("4/7") but absolutely no result breakdown or percentages.
- [ ] "Start vote" button is visible only for the President persona, not for other ExComm positions.
- [ ] Closed vote row shows a closed date, not a deadline (deadlines only apply while open).
- [ ] Start-vote form defaults its options to Yes / No / Abstain, editable.
- [ ] This screen is unreachable for Members (ExComm/President only).

---

## Paste-ready Stitch prompt

```
Context: Club Hub, a Toastmasters club web app. This is the Votes list screen for officers,
persona "Divya Krishnan" (VPPR, ExComm — not President, so no "Start vote" button in this frame).

Design a votes list page: page title "Votes", a table/list with two rows: "Approve club
anniversary budget" — blue "Open" pill, muted subtext "Deadline Sun 4 Oct, 6:00 PM IST", and a
small turnout chip "4 of 7 voted" (no result numbers anywhere on this row); "Move meetings to 5
PM?" — grey "Closed" pill, muted subtext "Closed 12 Sep 2026". Rows are clickable cards with hover
state, thin border, 8px radius. Show a second frame for the President persona "Arjun Mehta": same
list plus a primary button "Start vote" top-right, and the Start-vote form open as a dialog:
Title input, Description textarea, an options list defaulting to three rows "Yes / No / Abstain"
each with a remove icon and an "+ Add option" link below (max 6), an optional Deadline date-time
picker, Cancel/Start buttons.
```
