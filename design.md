# design.md: Club Hub UI/UX Spec (for Google Stitch and Claude Code)

Status: Draft v1. Working title "Club Hub". Sits between `flow.md` (what screens exist) and the build.
Screen IDs (S-xx), globals (G-xx), tasks (T-xx) and notifications (N-xx) come from `flow.md`. Do not rename them.

How this file is used:
1. **Google Stitch:** paste Section 1 (design brief) once, then one screen prompt from Section 9 at a time.
2. **Claude Code:** Section 2 (tokens) becomes `src/styles/tokens.css` and the Tailwind theme. Section 8 (components) maps to `src/components/`. Stitch exports are reference only; the build follows this file and shadcn/ui, not Stitch's raw markup.

---

## 1. Design brief (paste into Stitch first)

> Design a clean, calm, professional web app for a corporate Toastmasters club (about 30 to 60 members). Desktop-first (1440 px wide) with a fully usable phone layout (390 px). Used weekly to sign up for meeting roles, submit meeting reports, log progress and, for club officers, manage meetings and members.
> Style: modern SaaS, lots of white space, one strong primary blue, rounded corners (8 px), thin borders instead of heavy shadows, 14 to 16 px body text, clear status badges. Left sidebar navigation on desktop, bottom tab bar on phone. No illustrations except empty states. Friendly but not playful.
> Every screen needs four states: loading (skeletons), empty (short sentence and one action), error (message and retry), and normal.
> Use realistic Indian names and IST times (for example "Fri, 2 Oct, 4:00 PM IST").

Personality words: trustworthy, organised, encouraging. Avoid: gamified, neon, dark by default.

---

## 2. Design tokens

Contrast rules: text against background at least 4.5:1; input borders, icons and focus rings against background at least 3:1. Decorative card borders can be lighter.

### 2.1 Colour

| Token | Hex | Use |
| --- | --- | --- |
| `--primary` | `#004165` | Buttons, active nav, links (working colour; confirm brand rules, see Section 11) |
| `--primary-hover` | `#00304B` | |
| `--primary-soft` | `#E6EEF3` | Selected rows, active nav background |
| `--on-primary` | `#FFFFFF` | Text on primary (contrast about 11:1) |
| `--accent` | `#772432` | Sparing: President badge, destructive-adjacent highlights |
| `--bg` | `#F7F9FB` | App background |
| `--surface` | `#FFFFFF` | Cards, dialogs |
| `--text` | `#15212B` | Body |
| `--text-muted` | `#4A5866` | Secondary text (contrast about 7:1 on white) |
| `--border` | `#D5DBE3` | Card and table dividers (decorative only) |
| `--border-input` | `#758195` | Input, checkbox, select outlines (about 3.9:1 on white). Do not use `#CBD5E1` for inputs; it is only 1.5:1 |
| `--focus` | `#1A73E8` | 2 px focus ring with 2 px offset |
| `--success` / `--success-bg` | `#1E7B34` / `#E6F4EA` | Filled, verified, green card |
| `--warning` / `--warning-bg` | `#8A5A00` / `#FFF4D6` | Pending, yellow card text |
| `--danger` / `--danger-bg` | `#B3261E` / `#FCE8E6` | Errors, cancel, red card |
| `--info` / `--info-bg` | `#0B5CAD` / `#E8F1FB` | Neutral notices |

Timer card swatches (fixed, used only on timer report and consolidated report): green `#1E8E3E`, yellow `#F2C200` (use dark text), red `#C62828`, disqualified `#3C4043` with an "DQ" label. Never rely on colour alone: always print the words Green, Yellow, Red, DQ.

### 2.2 Typography
Font: **Inter** (system-ui fallback). Sizes: 12 (caption), 14 (body and tables), 16 (default input, mobile body), 20 (card title), 24 (page title), 32 (home greeting). Weights: 400, 500, 600. Line height 1.5 body, 1.25 headings. Inputs are 16 px on phone to stop iOS zoom.

### 2.3 Spacing, radius, elevation
4 px grid. Page padding 24 px desktop, 16 px phone. Card padding 20 px. Gap between cards 16 px. Radius: 8 (inputs, buttons, cards), 12 (dialogs), 999 (badges). Elevation: cards use border only; dialogs and dropdowns use one soft shadow `0 8px 24px rgba(21,33,43,.12)`.

### 2.4 Layout and breakpoints
`sm` 640, `md` 768, `lg` 1024, `xl` 1280. Sidebar 248 px from `lg`; below `lg` it becomes a bottom tab bar (max 5 items) plus a "More" sheet. Content max width 1200 px, centred. Tables become stacked cards below `md`. Touch targets at least 44 px on phone.

### 2.5 Motion
150 ms ease-out for hover and dropdowns, 200 ms for dialogs. Respect `prefers-reduced-motion`. Toast slides in from the top right and stays 6 s (hover pauses).

---

## 3. Navigation (resolves flow.md A9)

Sidebar (desktop) and bottom bar (phone). Items shown by account type. Icons from lucide-react.

| Item | Route | Screen | Member | ExComm | President | Icon |
| --- | --- | --- | --- | --- | --- | --- |
| Home | `/home` | S-02 | yes | yes | yes | `house` |
| Meetings | `/meetings` | S-03 | yes | yes | yes | `calendar` |
| My tasks (badge = open count) | `/tasks` | S-07 | yes | yes | yes | `list-checks` |
| My progress | `/progress` | S-09 | yes | yes | yes | `trending-up` |
| Club progress | `/progress/club` | S-10 | no | yes | yes | `users-round` |
| Members | `/members` | S-11 | no | yes | yes | `users` |
| Votes | `/votes` | S-14 | no | yes | yes | `vote` |
| Positions | `/positions` | S-13 | no | no | yes | `badge-check` |
| Audit log | `/audit` | S-16 | no | yes | yes | `scroll-text` |
| Export | `/export` | S-17 | no | yes | yes | `download` |

Grouping in the sidebar: **My club** (Home, Meetings, My tasks, My progress), **Manage** (Club progress, Members, Votes, Audit log, Export), **Admin** (Positions). Templates (S-06) sit inside Meetings as a "Templates" button for ExComm, not in the sidebar. Notifications (S-08) opens from the bell "View all". Settings (S-18) and Sign out (G-04) are in the avatar menu at the top right.

Phone bottom bar (all): Home, Meetings, Tasks, Progress, More. "More" lists the Manage and Admin items the user is allowed to see, plus Settings and Sign out.

Top bar (G-01, G-02): page title on the left (phone: hamburger not needed), on the right the **bell** with unread count, then the **avatar menu** (name, position badge if any, Settings, Sign out). Show a "Demo mode" ribbon when `NEXT_PUBLIC_DEMO_MODE=true`.

Active nav item: `--primary-soft` background, `--primary` text, 3 px left bar.

---

## 4. Role-adaptive Home (S-02)

Same page for everyone; cards differ (FR-28, FR-29).

| Card | Member | ExComm | President | Content |
| --- | --- | --- | --- | --- |
| Greeting and next meeting | yes | yes | yes | Date, time, theme, word of the day, my role in it (or "You have no role yet"), button to open meeting |
| My tasks | yes | yes | yes | Up to 4 open tasks with action buttons, "View all" |
| My upcoming roles | yes | yes | yes | List with date and role |
| Open roles I can take | yes | yes | yes | Up to 5 open slots with "Take this role" |
| My progress | yes | yes | yes | Pathway, level ring, projects done |
| Next meeting status | no | yes | yes | Roles filled vs open bar, buttons "Assign role", "Open for roles/Finalize" |
| Pending approvals | no | yes | yes | Withdrawal requests; level verifications shown only to VPE |
| Quick actions | no | yes | yes | Create meeting, Add member, Templates |
| Votes needing me | no | yes | yes | Open votes not yet cast |
| Positions summary | no | no | yes | Positions filled, "Set next President" |

Order on desktop: two columns (main 2/3, side 1/3). Main: next meeting, roles filled vs open (ExComm), open roles, tasks. Side: my roles, my progress, pending approvals, quick actions. Phone: single column in the order tasks, next meeting, my roles, open roles, then the rest.

---

## 5. Shared UI patterns

| Pattern | Rule |
| --- | --- |
| Status badges | Meeting: Draft (grey), Open for roles (blue), Finalized (green), Completed (dark grey), Cancelled (red, strikethrough date). Role slot: Open (outlined amber "Open"), Filled (name and avatar). Level: Pending (amber), Verified (green), Rejected (red). Vote: Open (blue), Closed (grey) |
| Buttons | One primary per view. Secondary = outline. Destructive = red outline, then a confirm dialog. Buttons that change data show a spinner and disable while working |
| Forms | Labels above fields, helper text below, error text in `--danger` with an icon, inline on blur and on submit, first error focused. Required fields marked "(required)" in text, not colour alone |
| Dialogs | Used for confirm, assign, swap, log completion, withdrawal reason. Escape closes, focus trapped, primary action bottom right. On phone they become bottom sheets |
| Confirm dialogs | State the effect in one sentence: "Cancel this meeting? 8 role holders will be notified." |
| Tables | Sticky header, sortable columns marked with an icon, row hover, empty state row, pagination 20 per page |
| Toasts (G-03) | Notification title, one line body, "View" action that goes to the link. Errors from actions appear as toasts too, with retry where safe |
| Empty states | One line, one action: "No open roles right now" (no action), "No tasks. You are all caught up." |
| Loading | Skeleton shapes matching the final layout. No full-page spinners |
| Errors | Inline retry card: "Could not load meetings. Try again" with a button |
| Access denied (G-05) | Lock icon, "You do not have access to this page", button Home |
| Dates | Always show weekday and "IST" on meeting times. Relative time ("in 2 days") only as secondary text |
| Avatars | Initials on a tinted circle (colour from name hash), never photos in V1 |
| Position badge | Small pill next to name: "President" (maroon), other positions (blue outline) |
| Keyboard and a11y | Everything reachable by keyboard, visible focus ring, dialogs labelled, badges have text, toasts announce via `aria-live="polite"` |

---

## 6. Meeting detail (S-04) layout

Header: title, status badge, date and time (IST), venue or link, action bar (ExComm: Edit, Open for roles / Finalize / Reopen / Mark Completed, Cancel). Below the header a **lifecycle stepper** (Draft, Open, Finalized, Completed) with the current step highlighted; Cancelled replaces the stepper with a red banner and the reason.

Tabs (URL `?tab=`): **Overview**, **Agenda**, **Roles**, **Reports**.

- **Overview:** theme, welcome note, word of the day and meaning (TMOD or ExComm see an "Edit theme" button and a Publish action), venue or link, type, my role summary, roles filled vs open bar.
- **Agenda:** uploaded agenda file (preview for PNG/JPG, embedded PDF viewer, download for DOCX) with "Upload / Replace" for ExComm; below it the template agenda outline (table: time, item, role holder).
- **Roles:** the signup board. Grouped: **Main roles** (TMOD, General Evaluator, Table Topics Master, Speakers with their Evaluators), **Support roles** (Timer, Ah-Counter, Grammarian, Hark Master...). Each row: role label, holder (avatar and name) or an "Open" chip, and actions: Take this role, Withdraw, Request swap, and (ExComm) Assign / Reassign / Remove slot. Speaker rows expand to show project, title, objectives, time limit (min to max) and the assigned evaluator with the link to the evaluation form. "Add role" button for ExComm in Draft/Open/Finalized. Pending withdrawal requests show a banner on the row with Approve / Reject for ExComm.
- **Reports:** if meeting has not ended: "Reports open after the meeting ends." After it ends: my report card(s) to fill (Timer, Ah-Counter, Grammarian, summaries) and status of each (Not started, Draft, Submitted). Once Completed: the **consolidated report** (timer table with coloured card pills, ah-counter totals, grammarian language, summaries).

Timer form: one row per speaker slot, prefilled name and time limits, input for time as `mm:ss`, live coloured card pill computed by rules.md R-04, and a read-only line "Green from 5:00, yellow from 6:00, red from 7:00" (from min, midpoint and max).

---

## 7. Screen inventory recap (for Stitch)

| ID | Screen | Primary layout |
| --- | --- | --- |
| S-01 | Login | Centred card on tinted background, logo, one field "Employee ID", button "Continue", helper text, error line |
| S-02 | Home | Two-column card grid (Section 4) |
| S-03 | Meetings | Toggle Calendar / List, filters (type, status), month grid with meeting chips, list with status badges; ExComm: "New meeting", "Templates" |
| S-04 | Meeting detail | Section 6 |
| S-05 | Create/edit meeting | Single column form in sections: Basics, Date and time, Location, Roles for this meeting (checklist with counts, add custom role), Agenda file, footer buttons Save draft / Open for roles |
| S-06 | Templates | Tabs: Recurring templates, Meeting types, Role catalog, Project timings. Each a table with add/edit dialog |
| S-07 | My tasks | Grouped list by due (Today, This week, Later), each with title, context, action button |
| S-08 | Notifications | Reverse chronological list, unread dot, mark all read, filter All / Unread |
| S-09 | My progress | Header with pathway and level ring; tabs Projects, Levels; button "Log completion" |
| S-10 | Club progress | Table of members (pathway, level, projects, roles taken, last active), filter "Inactive"; VPE sees a "Verification queue" tab |
| S-11 | Members | Table with search, status filter, "Add member" dialog, row menu (Edit, Deactivate, Remove) |
| S-12 | Member profile | Profile card, roles history, progress summary; edit for self and ExComm |
| S-13 | Positions | Seven position cards, each with holder and "Change"; "Name next President" card |
| S-14 | Votes | List with status; President sees "Start vote" |
| S-15 | Vote | Title, description, options as radio cards, "Cast vote" confirm dialog, turnout bar while open, result bars after close |
| S-16 | Audit log | Table with filters (actor, action, date), expandable before/after |
| S-17 | Export | Three cards (Roles, Meeting history, Progress), each with date range and "Download CSV" |
| S-18 | Settings | Profile fields, notification toggles (locked ones shown as "Always on") |
| G-05 | Access denied | Centred message |

---

## 8. Component list (maps to `src/components/`)

`AppShell`, `Sidebar`, `BottomTabBar`, `TopBar`, `BellMenu`, `ToastHost`, `AvatarMenu`, `PageHeader`, `StatusBadge`, `PositionBadge`, `Avatar`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `FileUpload`, `MeetingCard`, `MeetingCalendar`, `LifecycleStepper`, `MeetingTabs`, `AgendaPanel`, `RoleBoard`, `RoleSlot`, `SpeakerForm`, `AssignDialog`, `SwapDialog`, `WithdrawDialog`, `TimerForm`, `AhCounterForm`, `GrammarianForm`, `SummaryForm`, `ConsolidatedReport`, `TaskList`, `LogCompletionDialog`, `ProgressTable`, `VerifyQueue`, `MembersTable`, `MemberForm`, `PositionCard`, `VoteForm`, `Ballot`, `TurnoutBar`, `ResultPanel`, `AuditTable`, `ExportCard`.

Build on shadcn/ui: Button, Input, Textarea, Select, Checkbox, RadioGroup, Switch, Tabs, Dialog, Sheet, DropdownMenu, Popover, Calendar, Table, Badge, Skeleton, Sonner (toasts), Tooltip.

---

## 9. Stitch prompts (one per screen)

Paste Section 1 first. Then use these one at a time. After each, save the export to `design/stitch-exports/<ID>/`.

**S-01 Login.** "Login screen. Centred card 400 px wide on a light blue-grey background. Club logo placeholder and title 'Club Hub'. One text field labelled 'Employee ID' with helper text 'Use the ID on your company badge'. Primary button 'Continue'. Show an inline error state 'We could not find that employee ID' and a loading state. No password field. Small footer 'Trouble signing in? Contact your club VPE'."

**S-02 Home (member).** "Home dashboard for a club member on desktop with left sidebar (Home, Meetings, My tasks, My progress). Top: greeting 'Good evening, Priya'. Big card: next meeting 'Regular Meeting, Fri 2 Oct, 4:00 PM IST', theme, word of the day, 'Your role: Timer'. Cards: My tasks (2 items with buttons), Open roles I can take (3 rows with 'Take this role'), My upcoming roles, My progress (level ring 2 of 5). Bell icon with badge 3 at top right."

**S-02 Home (ExComm/President).** "Same dashboard for a club officer with extra sidebar group 'Manage'. Add cards: Next meeting status with progress bar '9 of 12 roles filled' and buttons 'Assign role', 'Finalize'; Pending approvals (1 late withdrawal request, Approve/Reject); Quick actions (Create meeting, Add member, Templates); Votes needing me (1 open vote)."

**S-03 Meetings.** "Meetings page with segmented toggle Calendar / List. Filters for type and status. Calendar month view with meeting chips coloured by status badge; list view rows with date, title, type, status badge, roles filled '9/12'. Officers see buttons 'New meeting' and 'Templates'."

**S-04 Meeting detail.** "Meeting detail with header (title, status badge, date, venue), lifecycle stepper Draft > Open > Finalized > Completed, and tabs Overview, Agenda, Roles, Reports. Show the Roles tab: grouped role board with rows of role name, holder avatar and name or an amber 'Open' chip with 'Take this role' button; speaker rows expandable with project, title, time limit '5 to 7 min' and assigned evaluator. Include a pending withdrawal banner on one row."

**S-04 Reports tab.** "Reports tab after the meeting ended. Timer report form: table rows per speaker with name, allowed time '5:00 to 7:00', time input mm:ss and a live coloured pill (Green, Yellow, Red, DQ) with text. Below, Submit report button and a status 'Draft saved'. Second view: consolidated report with timer table, ah-counter totals, grammarian notes."

**S-05 Create/edit meeting.** "Long form page with sections Basics, Date and time, Location, Roles for this meeting (checkbox list of roles with count steppers and 'Add custom role'), Agenda file upload (drag and drop, PDF DOCX PNG JPG up to 10 MB). Sticky footer with 'Save draft' and 'Open for roles'."

**S-06 Templates.** "Tabs: Recurring templates, Meeting types, Role catalog, Project timings. Show the Recurring templates table (name, day, time, type, weeks ahead, active toggle) and an 'Add template' dialog."

**S-07 My tasks.** "Task list grouped Today / This week / Later. Each task: icon, title 'Submit your Timer report', context 'Regular Meeting, 25 Sep', action button. Show an empty state."

**S-08 Notifications.** "Notification list with unread dots, title, short text, relative time, filter All / Unread, 'Mark all read'. Also show the bell dropdown variant with 5 items and 'View all'."

**S-09 My progress.** "Header with pathway name and level ring 2 of 5. Tabs Projects and Levels with table of completions and status badges (Counted, Pending, Verified, Rejected). 'Log completion' dialog with type (project or level), pathway, level, project name, date, optional proof upload."

**S-10 Club progress.** "Table of members with pathway, level, projects done, roles taken, last active; filter chip 'Inactive 60+ days'. A second tab 'Verification queue' with rows and Verify / Reject buttons (reject asks for a reason)."

**S-11 Members and S-12 Profile.** "Members table with search, status filter, 'Add member' button. Add member dialog fields: Employee ID, Name, Email, Toastmasters ID, Pathway, Level. Profile page with details card, roles history list and progress summary."

**S-13 Positions.** "Seven cards in a grid (President, VPE, VPM, VPPR, Secretary, Treasurer, SAA), each with holder avatar or 'Vacant' and a 'Change' button opening a member picker. Separate card 'Next President' with picker and a warning that handover makes you a regular member."

**S-14 and S-15 Votes.** "Votes list with status badges and 'Start vote' (President). Vote page: title, description, three radio cards Yes / No / Abstain, 'Cast vote' button with confirm dialog 'Votes are final and secret'. While open show turnout bar '4 of 7 voted' and no results. Show a closed variant with result bars and counts."

**S-16 Audit log.** "Table with time, actor, action chip, target and an expandable row showing before and after values. Filters for actor, action, date range."

**S-17 Export.** "Three cards: Roles, Meeting history, Progress. Each has a date range picker and 'Download CSV'."

**S-18 Settings.** "Profile form and a list of notification toggles by type. Some rows show 'Always on' with a lock icon."

**G-05 Access denied.** "Centred lock icon, 'You do not have access to this page', button 'Back to Home'."

**Phone variants.** After the desktop screens are accepted, ask Stitch: "Create the 390 px phone version of this screen with a bottom tab bar (Home, Meetings, Tasks, Progress, More); tables become stacked cards; dialogs become bottom sheets."

---

## 10. Design QA checklist (before handing to Claude Code)

- [ ] Every screen S-01 to S-18 and G-05 exists on desktop and phone.
- [ ] Every screen shows loading, empty, error and normal states, or the state is documented in a note.
- [ ] Nothing is coloured only (timer cards and badges carry text).
- [ ] Input borders use `--border-input`.
- [ ] Only one primary button per view.
- [ ] Voting screen shows no results while open.
- [ ] Member role sees no officer-only items in the navigation.

---

## 11. Open design items

| # | Item | Default until you decide |
| --- | --- | --- |
| 1 | Brand colours: Toastmasters International has brand rules. The palette above is inspired by common Toastmasters blue and maroon | Keep as working palette; confirm with the club or corporate branding before public launch |
| 2 | Club logo and name | Text logo "Club Hub" |
| 3 | Dark mode | Not in V1 |
| 4 | Language | English only, IST |
