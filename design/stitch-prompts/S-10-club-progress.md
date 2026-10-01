# S-10 — Club progress

**Route:** `/progress/club` · **Purpose:** club-wide participation/Pathways table plus the VPE's
level-verification queue (FR-34, FR-35, R-11). **Who sees it:** ExComm, President (table); the
"Verification queue" tab's actions are VPE-only, others see it read-only.

## Layout
Two tabs: "Club progress" (table) and "Verification queue". Table has a filter chip "Inactive 60+
days". Verification queue is a list of pending rows with Verify/Reject buttons (VPE) or read-only
badges (other ExComm).

## Exact content
**Club progress table**, columns Name, Pathway, Level, Projects done, Roles taken, Last active —
include at least these seeded rows for variety:
| Name | Pathway | Level | Last active |
| --- | --- | --- | --- |
| Ananya Das | Presentation Mastery | 3 | this week |
| Suresh Babu | Strategic Relationships | 4 | this week |
| Priya Raman | Presentation Mastery | 5 | this week |
| Ganesh Kumar | Persuasive Influence | 2 | **~100 days ago** (flagged by the Inactive filter) |
Filter chip "Inactive 60+ days" toggled on isolates the Ganesh row.

**Verification queue tab:** one pending row — "Ananya Das — Level 3 — logged 28 Sep 2026", with
Verify / Reject buttons for the VPE persona (Priya Raman); for a non-VPE ExComm persona (e.g.
Karthik, VPM) the same row appears but the buttons are replaced with a read-only "Pending VPE
review" label.
Reject flow: clicking Reject opens a dialog requiring a reason (text field, required) before it
can be confirmed — reference the seeded rejected example, Ganesh's Level 2 "Evaluation form missing".

## Interactions and states
- **Loading:** skeleton table/list rows. **Empty:** "No pending verifications" for the queue when
  empty; table is never empty in this seed (15 active members) but design the pattern "No members
  match this filter" for the Inactive toggle if nothing matches.
- **Error:** inline retry card.
- Verify action: confirm dialog "Verify Ananya Das's Level 3 completion? Her level will advance to
  4." primary button "Verify".

## Components used
Tabs, Table (with sortable/filterable columns), FilterChip, VerifyQueue list, ConfirmDialog
(Verify), Dialog with required-reason field (Reject), StatusBadge, EmptyState, ErrorState.

## Check result
- [ ] Verify/Reject buttons appear only for the VPE persona; other ExComm see a read-only label instead.
- [ ] Reject requires a reason before it can be confirmed — shown as a required field, not optional.
- [ ] "Inactive 60+ days" filter correctly isolates Ganesh Kumar (last active ~100 days ago) when toggled.
- [ ] Verify's confirm dialog states the concrete effect ("Her level will advance to 4"), not just "Are you sure?".
- [ ] This screen is entirely unreachable for plain Members (G-05 if they try the URL).

---

## Paste-ready Stitch prompt

```
Context: Club Hub, a Toastmasters club web app. This is the Club progress screen for officers,
persona "Priya Raman" (VPE) — a club-wide table plus a level-verification queue.

Design a page with two tabs: "Club progress" (active) and "Verification queue". Club progress tab:
a filter chip "Inactive 60+ days" (unselected) above a table with columns Name, Pathway, Level,
Projects done, Roles taken, Last active; 4 rows — Ananya Das / Presentation Mastery / 3 / this
week; Suresh Babu / Strategic Relationships / 4 / this week; Priya Raman / Presentation Mastery /
5 / this week; Ganesh Kumar / Persuasive Influence / 2 / "100 days ago" shown in danger-coloured
text with a small warning icon since he's inactive. Verification queue tab as a second frame: one
card row — avatar, "Ananya Das", "Level 3", "Logged 28 Sep 2026", with two buttons "Verify"
(primary) and "Reject" (outline, red text). Show a Reject dialog open: title "Reject this
completion?", a required textarea labelled "Reason (required)", Cancel/Reject buttons. Also show a
compact variant of the same queue row for a non-VPE officer where Verify/Reject are replaced by a
single grey pill "Pending VPE review".
```
