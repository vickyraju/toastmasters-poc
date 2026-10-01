# S-11 — Members

**Route:** `/members` · **Purpose:** add, edit, deactivate, remove members; the club roster
(FR-03). **Who sees it:** ExComm, President only (member directory is officer-only, per A8).

## Layout
Table with a search box, a status filter (Active/Inactive/Removed), and an "Add member"
primary button top-right. Each row has a row-menu (Edit, Deactivate, Remove).

## Exact content
Use a representative slice of the 15 seeded members plus the one removed member:
| Employee ID | Name | Position | Status | Pathway / Level |
| --- | --- | --- | --- | --- |
| IL1001 | Arjun Mehta | President | Active | Dynamic Leadership / 4 |
| IL1002 | Priya Raman | VPE | Active | Presentation Mastery / 5 |
| IL1009 | Mohammed Faisal | — | Active | Dynamic Leadership / 2 |
| IL1015 | Ganesh Kumar | — | **Inactive** | Persuasive Influence / 2 |
| IL1099 | Old Member | — | **Removed** | — |
"Add member" dialog fields: Employee ID, Name, Email, Toastmasters ID, Pathway (optional), Level
(default 1).

## Interactions and states
- **Loading:** skeleton table rows. **Empty:** "No members match your search" for a no-results
  search (not a true empty roster, since seed always has 15+1). **Error:** inline retry card.
- **Removing a member who holds future roles:** clicking Remove on someone with upcoming role
  assignments opens a warning dialog first, listing those meetings/roles, forcing reassignment or
  release before the remove can be confirmed (use Vikram Rao, Timer on 2 Oct, as the example —
  removing him would list "2 Oct Regular Meeting — Timer").
- **Cannot remove:** the row-menu's Remove option is disabled with a tooltip for the current
  President and for the signed-in user themselves ("You cannot remove yourself" / "Transfer the
  presidency first").
- Removed row (IL1099) shows a muted/greyed style with status "Removed" and no row-menu actions
  except perhaps "View history".

## Components used
MembersTable, SearchInput, FilterSelect (status), Button ("Add member"), RowMenu, MemberForm
(add/edit dialog), WarningDialog (remove-with-future-roles), StatusBadge, EmptyState, ErrorState.

## Check result
- [ ] Removed member (IL1099) is visually distinct (greyed) and clearly marked "Removed", not deleted from the list.
- [ ] Remove action on a member with future roles shows the warning-with-list dialog before allowing confirmation.
- [ ] Remove is disabled for the President row and for "yourself" with an explanatory tooltip.
- [ ] "Add member" dialog fields match exactly: Employee ID, Name, Email, Toastmasters ID, Pathway, Level.
- [ ] This whole screen is unreachable for Members (only ExComm/President see /members).

---

## Paste-ready Stitch prompt

```
Context: Club Hub, a Toastmasters club web app. This is the Members screen for club officers — the
full roster with add/edit/remove actions.

Design a members page: search input and a status filter dropdown ("All / Active / Inactive /
Removed") in a row above the table, primary button "Add member" top-right. Table columns: Employee
ID, Name, Position (small blue-outline pill if held, blank if none), Status (pill: green Active,
amber Inactive, grey Removed), Pathway / Level. Rows: "IL1001 / Arjun Mehta / President (maroon
pill) / Active / Dynamic Leadership, L4"; "IL1002 / Priya Raman / VPE / Active / Presentation
Mastery, L5"; "IL1009 / Mohammed Faisal / — / Active / Dynamic Leadership, L2"; "IL1015 / Ganesh
Kumar / — / Inactive (amber) / Persuasive Influence, L2"; "IL1099 / Old Member / — / Removed
(grey, whole row visually muted/greyed out)". Each active row has a three-dot row menu on the
right. Show a warning dialog open alongside: title "Remove Vikram Rao?", body text "Vikram holds
these upcoming roles:" followed by a list item "2 Oct Regular Meeting — Timer", and a note
"Reassign or release these roles before removing", with Cancel and a disabled red "Remove" button.
```
