# S-08 — Notifications

**Route:** `/notifications` · **Purpose:** full notification history; also has a compact "bell
dropdown" variant shown from every screen (G-02) (FR-36). **Who sees it:** everyone, their own
notifications only.

## Layout
Full page: reverse-chronological list, unread dot per row, filter toggle "All / Unread", "Mark all
read" button top-right. Plus a second, smaller frame: the bell dropdown variant (a floating panel
under the bell icon in the top bar, showing the 5 most recent, with a "View all" link at the
bottom that opens this full page).

## Exact content
Use **Aditya Kulkarni (IL1013)**'s seeded notifications, newest first:
| Code | Title | Read? |
| --- | --- | --- |
| N-16 | Vikram Rao asked to swap Timer with your Ah-Counter role | unread |
| N-06 | Your Timer report for 25 Sep is due | unread |
| N-14 | Reminder: you are Ah-Counter tomorrow, 4:00 PM | unread |
| N-05 | Theme for 2 Oct published: New beginnings | read |
Each row: unread dot (or none if read), title, one-line relative time ("2 hours ago"), and clicking
the row navigates to the linked action and marks it read.

## Interactions and states
- **Loading:** skeleton rows. **Empty:** "No notifications yet" if brand new. **Error:** inline
  retry card.
- **Unread filter:** toggling "Unread" hides the read N-05 row, leaving the 3 unread ones.
- **Mark all read:** clicking it clears all unread dots in place (rows stay, dots disappear), with
  a brief toast "All caught up."
- Bell dropdown variant: same 4 rows (or fewer if more than 5 exist, cap at 5), compact spacing,
  "View all" link/button at the bottom of the panel, small close affordance.

## Components used
NotificationList, NotificationRow (unread dot, title, relative time), Toggle (All/Unread), Button
("Mark all read"), BellMenu (dropdown panel variant), EmptyState, ErrorState.

## Check result
- [ ] Unread rows are visually distinct from read ones via the dot, not by background colour alone.
- [ ] Bell dropdown panel caps at 5 items and includes a "View all" link to this full page.
- [ ] "Mark all read" clears dots without deleting or reordering the rows.
- [ ] Each row's relative time is secondary text — no absolute timestamp is required per design.md,
      but if shown it must include IST.
- [ ] Filter toggle "All / Unread" correctly changes which rows are visible in the same frame.

---

## Paste-ready Stitch prompt

```
Context: Club Hub, a Toastmasters club web app. This is the Notifications screen, persona "Aditya
Kulkarni", plus the compact bell-dropdown variant used from the top bar on every screen.

Design a notifications page: page title "Notifications", a segmented toggle "All / Unread" and a
"Mark all read" text button top-right. List of 4 rows, each a horizontal card: a small unread dot
on the left (primary blue, absent for read rows), title text, a one-line relative timestamp below
in muted grey ("2 hours ago", "5 hours ago", "yesterday"), full row clickable with a hover state.
Rows in order: "Vikram Rao asked to swap Timer with your Ah-Counter role" (unread), "Your Timer
report for 25 Sep is due" (unread), "Reminder: you are Ah-Counter tomorrow, 4:00 PM" (unread),
"Theme for 2 Oct published: New beginnings" (read, no dot, slightly muted title). Also design a
second, smaller frame: the bell dropdown panel as it appears under the bell icon in the top bar —
a floating card, same 4 rows in compact spacing, a thin divider, and a "View all" link centred at
the bottom of the panel.
```
