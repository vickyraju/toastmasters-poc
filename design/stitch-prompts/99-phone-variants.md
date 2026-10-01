# 99 — Phone variants (follow-up prompt per screen)

Run this **after** a screen's desktop version has been generated and accepted in the same Stitch
session. Paste the screen-specific line below in place of `<SCREEN NAME>` and `<KEY DIFFERENCES>`,
or just use the generic version if nothing screen-specific needs calling out.

## Generic follow-up (use for any screen)

```
Create the 390px phone version of this screen. Bottom tab bar replaces the sidebar: 5 items — Home,
Meetings, Tasks, Progress, More (More opens a bottom sheet listing whichever Manage/Admin items
this account can see, plus Settings and Sign out). Any table becomes a stack of cards, one per row,
with the same fields shown as label/value pairs. Any dialog becomes a bottom sheet sliding up from
the bottom edge, full width, rounded top corners only. Page padding drops to 16px, card padding
stays 20px. Inputs are 16px text to avoid iOS zoom. Touch targets at least 44px. Keep all four
states (loading, empty, error, normal) and all colours/tokens identical to the desktop version —
only layout changes.
```

## Screen-specific notes to fold into the generic prompt above

| Screen | Extra phone-specific instruction to add |
| --- | --- |
| S-01-login | Card becomes full-width with 16px side margins instead of a fixed 400px width. |
| S-02-home-* | Single column order: My tasks, Next meeting, My upcoming roles, Open roles I can take, then the rest (officer cards last). |
| S-03-meetings | Calendar view becomes a simple agenda list by default on phone; List view is the stacked-card pattern. |
| S-04-roles | Speaker rows' expand/collapse becomes an accordion — tap to expand, one open at a time is fine on phone. |
| S-04-reports | Timer form's table becomes one card per speaker with the time input and card pill stacked vertically. |
| S-05-create-edit-meeting | Sticky footer (Save draft / Open for roles) becomes two full-width stacked buttons pinned above the tab bar. |
| S-06-templates | Tabs scroll horizontally if all 4 don't fit; each tab's table becomes stacked cards. |
| S-10-club-progress | Table becomes stacked member cards; filter chip stays pinned at the top. |
| S-11-members | Table becomes stacked member cards with the row-menu as a bottom-sheet action list. |
| S-13-positions | 7 position cards become a single scrollable column instead of a grid. |
| S-15-vote-detail | Radio-card options stack full width; result bars stay horizontal but shrink to fit. |
| S-16-audit-log | Table becomes stacked entries; before/after diff expands inline below each card. |
| S-17-export | Three cards stack vertically full width. |

Every other screen (S-07, S-08, S-09, S-12, S-14, S-18, G-05) already uses a single-column or
list/card layout on desktop, so the generic follow-up prompt is sufficient without an extra note.
