# S-02 — Home (Member view)

**Route:** `/home` · **Purpose:** role-adaptive dashboard, the landing screen after sign-in
(FR-28). **Who sees it:** every signed-in Member (no officer widgets).

## Layout
Full app shell: left sidebar (desktop) / bottom tab bar (phone), top bar with bell + avatar menu.
Content area: two columns on desktop (main 2/3 left, side 1/3 right); single column on phone in
the order tasks, next meeting, my roles, open roles, then the rest.

## Exact content
Signed in as **Priya's colleague, member persona — use Mohammed Faisal (IL1009)** for this frame
(Speaker 1 on the 2 Oct meeting), greeting "Good afternoon, Mohammed".
- **Next meeting card (main, top):** "Regular Meeting, Fri 2 Oct, 4:00 PM IST", theme "New
  beginnings", word of the day "Embark", "Your role: Speaker 1", button "Open meeting".
- **My tasks card:** up to 4 open tasks with action buttons — use realistic examples like "Add
  speech project and title" (task type T-06, for a speaker with missing details) and "Submit your
  Timer report" (T-01) as illustrative task rows; "View all" link to My tasks.
- **Open roles I can take card:** up to 5 open rows from the 2 Oct meeting — "Evaluator 2 (for
  Lakshmi's Ice Breaker) — Open", "Evaluator 3 (for Meera's speech) — Open", "Grammarian — Open",
  each with a "Take this role" button.
- **My upcoming roles card (side):** list with date + role, e.g. "Fri 2 Oct — Speaker 1".
- **My progress card (side):** pathway "Dynamic Leadership", level ring showing 2 of 5, "3
  projects done".
- No "Roles filled vs open", no "Pending approvals", no "Quick actions", no "Votes needing me" —
  those are officer-only (see `S-02-home-officer.md`).

## Interactions and states
- **Loading:** every card shows a skeleton matching its final shape.
- **Empty:** "No upcoming meeting" if none scheduled; "No open roles right now" with no action
  button if none are open; "No tasks. You are all caught up." for the tasks card.
- **Error:** each card fails independently — inline "Could not load this. Try again" with Retry,
  other cards still render normally.
- **Normal:** as described above.
- Bell icon shows an unread-count badge (use 3 for this frame).

## Components used
AppShell, Sidebar/BottomTabBar, TopBar, BellMenu, MeetingCard, TaskList, RoleBoard (compact list
variant), Avatar, StatusBadge, EmptyState, ErrorState, ProgressRing.

## Check result
- [ ] No ExComm-only cards visible (no "roles filled vs open" bar, no quick actions, no votes card).
- [ ] Next-meeting card shows theme + word of the day + the member's own role, not everyone's roles.
- [ ] Sidebar shows only "My club" group items (Home, Meetings, My tasks, My progress) highlighted
      for a Member — Manage/Admin groups are absent, not just greyed out.
- [ ] Bell badge count and avatar initials are visible in the top bar.
- [ ] Two-column desktop layout collapses to a single sensible column order at 390px.

---

## Paste-ready Stitch prompt

```
Context: Club Hub, a Toastmasters club web app. This is the Home dashboard for a Member (not an
officer) — the landing page after sign-in, with the standard left sidebar and top bar.

Design a home dashboard on desktop (1440px) with a left sidebar showing only Home, Meetings, My
tasks, My progress (Home active, primary-soft background). Top bar: page title "Home", bell icon
with badge "3", avatar menu with initials "MF". Greeting "Good afternoon, Mohammed" at 32px. Main
column (left, 2/3 width): a large next-meeting card — "Regular Meeting, Fri 2 Oct, 4:00 PM IST",
theme "New beginnings", word of the day "Embark", "Your role: Speaker 1", primary button "Open
meeting"; below it an "Open roles I can take" card with 3 rows (role name, small "Open" amber
chip, "Take this role" outline button); below that a "My tasks" card with 2 task rows, each an
icon, a title, and an action button. Side column (right, 1/3): "My upcoming roles" list (date +
role), "My progress" card with a circular progress ring showing "2 of 5" and pathway name "Dynamic
Leadership" underneath. Cards use white surface, thin border, 8px radius, 20px padding, 16px gap.
Show a loading variant with skeleton shapes in the same layout.
```
