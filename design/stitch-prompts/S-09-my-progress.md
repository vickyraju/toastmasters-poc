# S-09 — My progress

**Route:** `/progress` · **Purpose:** log Pathways project/level completions and see own progress
(FR-32, FR-33). **Who sees it:** everyone, own data only.

## Layout
Header card: pathway name + a circular level-progress ring. Below it, two tabs: Projects, Levels.
Each tab is a table of completions with status badges. Primary button "Log completion" opens a
dialog.

## Exact content
Persona **Ananya Das (IL1008)**: pathway "Presentation Mastery", level ring "3 of 5".
**Levels tab rows:**
| Level | Date | Status |
| --- | --- | --- |
| Level 3 | 28 Sep 2026 | **Pending** (awaiting VPE verification, no proof attached) |
| Level 2 | earlier | Verified |
| Level 1 | earlier | Verified |
**Projects tab:** at least 2-3 illustrative completed project rows with dates and "Counted" status
(project completions count immediately, no verification step).
**Log completion dialog fields:** type toggle (Project / Level), Pathway (pre-filled from
profile), Level (select), Project name (text, only for Project type), Date (date picker, cannot be
future), Proof upload (optional unless club setting requires it — show as optional here since
`proof_required = false` in the seed).

## Interactions and states
- **Loading:** skeleton header + skeleton table rows. **Empty:** "You haven't logged any progress
  yet" + "Log completion" button, for a brand-new member (use Lakshmi Narayanan, Level 1, sparse
  data, as the empty-ish example — she'd have at most 0-1 rows).
- **Error:** inline retry card.
- Status badges: Pending (amber), Verified (green), Rejected (red, with a rejection-reason tooltip
  or expandable note e.g. Ganesh's "Evaluation form missing").
- Rejected row shows a small "Resubmit" link.

## Components used
ProgressRing, Tabs (Projects/Levels), Table, StatusBadge, Button ("Log completion"),
LogCompletionDialog (type toggle, selects, date picker, FileUpload), EmptyState, ErrorState.

## Check result
- [ ] Level ring shows "3 of 5" matching Ananya's `current_level` (still 3 until VPE verifies the
      pending Level 3 completion, which would advance her to 4).
- [ ] Pending row has no proof file shown (this entry was logged without proof).
- [ ] Rejected example row (Ganesh's Level 2) shows the rejection reason somewhere on/near the row.
- [ ] Date picker in the Log completion dialog cannot select a future date (state this constraint visibly, e.g. disabled future dates).
- [ ] Proof upload field is clearly marked optional, not required, matching the seeded club setting.

---

## Paste-ready Stitch prompt

```
Context: Club Hub, a Toastmasters club web app. This is the My progress screen, persona "Ananya
Das", pathway "Presentation Mastery".

Design a progress page: header card with a circular progress ring showing "3 of 5" and the pathway
name "Presentation Mastery" beside it, plus a primary button "Log completion" top-right. Below,
two tabs "Projects" and "Levels" (Levels active). Levels tab: a table with columns Level, Date,
Status — three rows: "Level 3 / 28 Sep 2026 / Pending" (amber pill), "Level 2 / — / Verified"
(green pill), "Level 1 / — / Verified" (green pill). Show the "Log completion" dialog open
alongside: a type toggle "Project / Level" (Level selected), a Pathway select pre-filled
"Presentation Mastery", a Level select, a Date picker (today's date, future dates visibly
disabled/greyed), an optional file-upload row labelled "Proof (optional)", and Cancel/Save buttons
bottom-right. Also show one row in a different frame with a Rejected (red pill) status and a small
expandable note underneath reading "Evaluation form missing" plus a "Resubmit" text link.
```
