# S-06 — Templates

**Route:** `/meetings/templates` · **Purpose:** manage recurring templates, meeting types, the
role catalog, and Pathways project timings (FR-07, FR-11, FR-12). **Who sees it:** ExComm,
President only. Reached via a "Templates" button inside the Meetings screen, not the sidebar.

## Layout
Page with 4 tabs: Recurring templates, Meeting types, Role catalog, Project timings. Each tab is a
table with an "Add" button that opens a dialog. Recurring templates tab is the default/active one.

## Exact content
**Recurring templates tab** (default view): one seeded row — "Friday Regular Meeting", type
Regular Meeting, weekday Friday, start time 16:00, duration 90 min, venue "Conference Room B,
Inception Labs, Chennai", weeks ahead 4, Active toggle on. "Add template" button top-right opens a
dialog with fields: Name, Meeting type (select), Weekday (select), Start time, Duration, Venue,
Meeting link, Weeks ahead (number), Skip dates (multi date picker).
**Meeting types tab:** rows for Regular Meeting (90 min), Speech Contest (150 min), Workshop
(90 min), Joint Session (120 min), each with an edit icon.
**Role catalog tab:** rows for the 9 catalog roles — TMOD, General Evaluator, Table Topics Master,
Speaker (default count 3), Evaluator (default count 3), Timer, Ah-Counter, Grammarian, Hark
Master (default count 0, optional) — columns Code, Category (main/support), Report kind, Default
count.
**Project timings tab:** rows from the preloaded set — Level 1 Ice Breaker (4:00–6:00), Level 2–5
generic speeches (5:00–7:00 each), Table Topics response (1:00–2:00), Evaluation (2:00–3:00), plus
one custom row "Workshop demo" (8:00–10:00) tagged "Custom". Banner above the table: "Verify these
timings with the VPE before relying on them."

## Interactions and states
- **Loading:** skeleton table rows per tab. **Empty:** "No templates yet" + "Add template" if the
  Recurring templates list is empty (not the case in the seed, but design the state). **Error:**
  inline retry card.
- Editing a template shows a note: "Changes apply to future meetings only" with a checkbox
  "Also apply to Draft meetings already generated from this template."
- Saving a new template/type triggers a toast: "All members notified" (matches N-08).

## Components used
Tabs, Table, Dialog (add/edit per tab), Toggle (Active), Banner (verify-timings notice), Toast.

## Check result
- [ ] Project timings tab shows the "verify with VPE" banner — these numbers are explicitly unverified.
- [ ] Recurring template row shows all 4 configured fields (weekday, time, venue, weeks ahead), not just the name.
- [ ] Role catalog table distinguishes main vs support category visibly (not just as a text column).
- [ ] "Changes apply to future meetings only" note appears when editing a template.
- [ ] This whole screen is unreachable for Members (confirm it only opens via the ExComm "Templates" button).

---

## Paste-ready Stitch prompt

```
Context: Club Hub, a Toastmasters club web app. This is the Templates screen for club officers —
manage recurring meeting templates, meeting types, the role catalog and Pathways project timings.

Design a page with 4 tabs: "Recurring templates" (active), "Meeting types", "Role catalog",
"Project timings". Recurring templates tab: a table with columns Name, Type, Day, Time, Weeks
ahead, Active (toggle switch), one row "Friday Regular Meeting / Regular Meeting / Friday / 4:00
PM / 4 weeks / [on]", and a primary "Add template" button top-right. Show an "Add template" dialog
open alongside it with fields: Name (text), Meeting type (select), Weekday (select), Start time
(time picker), Duration (number, minutes), Venue (text), Meeting link (text), Weeks ahead
(number), Skip dates (multi date picker), and Cancel/Save buttons bottom-right of the dialog. Also
show the Project timings tab as a second frame: an amber info banner "Verify these timings with
the VPE before relying on them", then a table with columns Pathway/Level, Project, Min, Max — rows
for Level 1 Ice Breaker (4:00–6:00), Level 2 speech (5:00–7:00), Table Topics response (1:00–2:00),
Evaluation (2:00–3:00), and one row tagged "Custom" for "Workshop demo" (8:00–10:00).
```
