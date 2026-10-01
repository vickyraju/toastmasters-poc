# S-17 — Export

**Route:** `/export` · **Purpose:** download roles, meeting history, or progress as CSV (FR-31).
**Who sees it:** ExComm, President only.

## Layout
Three cards side by side (stack on phone): Roles, Meeting history, Progress. Each has a date-range
picker and a "Download CSV" button.

## Exact content
No seeded record counts exist in mock-data.md for this screen (flagged in README Gaps) — keep
content generic per card:
- **Roles card:** description "Every role assignment across meetings in the selected range."
  Date range defaulting to the last 90 days.
- **Meeting history card:** description "All meetings, their status and lifecycle dates."
- **Progress card:** description "Pathways project and level completions club-wide."
Each card: icon, title, one-line description, date-range control, "Download CSV" primary button.

## Interactions and states
- **Loading:** skeleton cards. **Empty:** not really applicable (the action just downloads a file);
  if a selected range has zero matching rows, show a toast "No records in this range" instead of a
  blank download. **Error:** toast "Export failed. Try again" if the download fails.
- Clicking "Download CSV" shows the button's brief loading state (spinner) while the file
  generates, then a success toast "roles-2026-10-01.csv downloaded."

## Components used
ExportCard (icon, title, description, DateRangePicker, Button), Toast (success/error/empty-range).

## Check result
- [ ] Three cards are clearly distinguished by icon and one-line description, not identical boxes.
- [ ] Date range control is present on every card, not just one.
- [ ] "No records in this range" toast pattern is designed for the empty-result case.
- [ ] This screen is unreachable for Members (ExComm/President only).
- [ ] Download button shows a loading state, not an instant silent action.

---

## Paste-ready Stitch prompt

```
Context: Club Hub, a Toastmasters club web app. This is the Export screen for officers — download
CSV files of roles, meeting history, or progress data.

Design a page with three cards in a row (stack vertically on phone), equal width: Card 1 —
calendar-check icon, title "Roles", description "Every role assignment across meetings in the
selected range.", a date-range picker showing "1 Jul 2026 – 1 Oct 2026", primary button "Download
CSV" full width at the bottom. Card 2 — calendar icon, title "Meeting history", description "All
meetings, their status and lifecycle dates.", same date-range control and button. Card 3 —
trending-up icon, title "Progress", description "Pathways project and level completions
club-wide.", same date-range control and button. Cards use white surface, thin border, 8px radius,
20px padding, consistent icon size and colour (primary blue) across all three.
```
