# S-03 — Meetings

**Route:** `/meetings` · **Purpose:** browse all meetings, calendar or list view, entry point to
create a meeting (FR-06). **Who sees it:** everyone signed in; Draft meetings are visible only to
ExComm/President (Members never see Draft rows/chips at all).

## Layout
App shell with sidebar/top bar. Below the page header: a segmented Calendar/List toggle, filter
row (type, status), then either a month calendar grid or a list table. ExComm/President see two
extra buttons top-right of the header: "New meeting" and "Templates".

## Exact content
Use the real seeded meeting set (all IST, venue "Conference Room B, Chennai",
link `https://teams.example.com/meet/club`) so the calendar/list isn't empty:
| Date | Title | Status | Roles filled |
| --- | --- | --- | --- |
| Fri 11 Sep, 4:00 PM | Regular Meeting | Cancelled (reason "Public holiday event") | — |
| Fri 18 Sep, 4:00 PM | Regular Meeting | Completed | 12/12 |
| Fri 25 Sep, 4:00 PM | Regular Meeting | Finalized | 12/12 |
| Fri 2 Oct, 4:00 PM | Regular Meeting | Open for roles | 9/12 |
| Fri 9 Oct, 4:00 PM | Regular Meeting | Open for roles | 3/12 |
| Fri 16 Oct, 4:00 PM | Regular Meeting | Draft (ExComm only) | 0/12 |
| Fri 23 Oct, 4:00 PM | Regular Meeting | Draft (ExComm only) | 0/12 |
| Sat 31 Oct, 10:00 AM | Area Speech Contest | Draft (ExComm only) | 0/6 |

## Interactions and states
- **Loading:** skeleton month grid or skeleton table rows depending on the active toggle.
- **Empty:** "No meetings yet" with a "Create meeting" primary action for ExComm/President, plain
  text with no action for Members.
- **Error:** inline retry card, "Could not load meetings. Try again."
- **Normal — Member variant:** the Draft rows above are simply not present at all (not
  greyed/locked, absent).
- **Normal — ExComm/President variant:** Draft rows shown with a grey Draft badge; "New meeting"
  and "Templates" buttons visible in the header.
- Cancelled row shows a red badge and the date rendered with strikethrough.
- Clicking any row opens `S-04` (meeting detail) for that meeting.

## Components used
MeetingCalendar, MeetingCard/table row, StatusBadge, SegmentedControl (Calendar/List), FilterBar,
EmptyState, ErrorState, Button (primary "New meeting", outline "Templates").

## Check result
- [ ] Draft meetings (16 Oct, 23 Oct, 31 Oct) appear only in the ExComm/President frame.
- [ ] Cancelled meeting (11 Sep) shows a red badge and strikethrough date, not just plain text.
- [ ] "New meeting" and "Templates" buttons are absent for the Member frame.
- [ ] Status badge colours match the tokens exactly: Draft grey, Open blue, Finalized green,
      Completed dark grey, Cancelled red.
- [ ] Calendar and List views both represent the same 8 seeded meetings consistently.

---

## Paste-ready Stitch prompt

```
Context: Club Hub, a Toastmasters club web app. This is the Meetings screen — a browsable calendar
and list of all club meetings, with a "New meeting" action for officers.

Design a meetings page with a segmented toggle "Calendar / List" near the top, and filter chips
for meeting type and status. For officers, show two outline buttons top-right of the header, "New
meeting" and "Templates". Calendar view: a month grid (October 2026) with small coloured chips on
the days that have meetings — chip colour follows status badge colours (blue for Open, green for
Finalized, dark grey for Completed, red for Cancelled, grey for Draft), each chip shows the time
and title, e.g. "4:00 PM Regular Meeting". List view: a table with columns Date, Title, Type,
Status (as a pill badge), and "Roles filled" (e.g. "9/12"); rows for Fri 2 Oct (Open, 9/12), Fri 9
Oct (Open, 3/12), Fri 25 Sep (Finalized, 12/12), Fri 18 Sep (Completed, 12/12), Fri 11 Sep
(Cancelled, red badge, date struck through). Sticky table header, row hover highlight. Show a
second frame as a Member (no "New meeting"/"Templates" buttons, no Draft rows visible at all).
```
