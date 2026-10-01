# 00 — Master brief (paste first, top of a new Stitch session)

Paste everything in the fenced block below into Stitch before any screen prompt. Every screen
prompt file in this folder repeats its own short "Context" line, but this brief is what keeps
colours, type, spacing and navigation identical across all 23 screens.

---

```
Design a clean, calm, professional web app called "Club Hub" for a corporate Toastmasters club
(Inception Labs Toastmasters, about 30 to 60 members). Desktop-first at 1440px wide, with a fully
usable phone layout at 390px. Members use it weekly to sign up for meeting roles, submit meeting
reports, and log Pathways progress; club officers (ExComm and President) also manage meetings,
members and votes.

STYLE: modern SaaS, lots of white space, one strong primary blue, rounded corners (8px), thin
borders instead of heavy shadows, 14-16px body text, clear status badges. Left sidebar navigation
on desktop, bottom tab bar on phone. No illustrations except empty states. Friendly but not
playful. Personality: trustworthy, organised, encouraging. Avoid: gamified, neon, dark-by-default.
Use realistic Indian names and IST times everywhere (e.g. "Fri, 2 Oct, 4:00 PM IST").

COLOUR TOKENS (hex):
- Primary #004165 (buttons, active nav, links); primary hover #00304B; primary-soft #E6EEF3
  (selected rows, active nav background); on-primary #FFFFFF
- Accent #772432 (sparing: President badge, destructive-adjacent highlights)
- Background #F7F9FB (app background); Surface #FFFFFF (cards, dialogs)
- Text #15212B (body); Text-muted #4A5866 (secondary text)
- Border #D5DBE3 (card/table dividers, decorative only — do NOT use for inputs)
- Border-input #758195 (input/checkbox/select outlines — always use this on inputs, not the
  lighter card border)
- Focus ring #1A73E8, 2px with 2px offset
- Success #1E7B34 / success-bg #E6F4EA (filled, verified, green timer card)
- Warning #8A5A00 / warning-bg #FFF4D6 (pending, yellow timer card)
- Danger #B3261E / danger-bg #FCE8E6 (errors, cancel, red timer card)
- Info #0B5CAD / info-bg #E8F1FB (neutral notices)
- Timer card swatches (fixed, only on Timer report/consolidated report): green #1E8E3E,
  yellow #F2C200 (dark text on it), red #C62828, disqualified #3C4043 with a "DQ" label. Never
  rely on colour alone — always print the word Green / Yellow / Red / DQ next to the swatch.

TYPOGRAPHY: Inter (system-ui fallback). Sizes 12 (caption), 14 (body, table text), 16 (default
input, mobile body), 20 (card title), 24 (page title), 32 (home greeting). Weights 400/500/600.
Line height 1.5 body, 1.25 headings. Inputs are 16px on phone to prevent iOS zoom.

SPACING/RADIUS: 4px grid. Page padding 24px desktop, 16px phone. Card padding 20px, gap between
cards 16px. Radius 8px on inputs/buttons/cards, 12px on dialogs, 999px (pill) on badges.
Elevation: cards use a border only, no shadow; dialogs and dropdowns use one soft shadow
0 8px 24px rgba(21,33,43,.12).

BREAKPOINTS: sm 640, md 768, lg 1024, xl 1280. Sidebar is 248px wide from lg up; below lg it
collapses to a bottom tab bar (max 5 items) plus a "More" sheet. Content max width 1200px,
centred. Tables become stacked cards below md. Touch targets at least 44px on phone.

MOTION: 150ms ease-out for hover/dropdowns, 200ms for dialogs. Respect prefers-reduced-motion.
Toast slides in from the top right and stays 6s, pausing on hover.

NAVIGATION (left sidebar desktop / bottom bar phone), grouped "My club" then "Manage" then
"Admin", icons from lucide-react:
- My club (everyone): Home (house icon, /home), Meetings (calendar, /meetings), My tasks
  (list-checks, /tasks, badge shows open-task count), My progress (trending-up, /progress)
- Manage (ExComm + President only): Club progress (users-round, /progress/club), Members (users,
  /members), Votes (vote icon, /votes), Audit log (scroll-text, /audit), Export (download, /export)
- Admin (President only): Positions (badge-check, /positions)
- A "Templates" button lives inside the Meetings screen for ExComm/President, NOT in the sidebar.
- Notifications page opens only from the bell's "View all" link, not from the sidebar.
- Settings and Sign out live in the avatar menu at the top right, not the sidebar.
- Active nav item: primary-soft background, primary text, 3px solid left bar in primary.
- Phone bottom bar (everyone): Home, Meetings, Tasks, Progress, More. "More" is a sheet listing
  whichever Manage/Admin items this account can see, plus Settings and Sign out.

TOP BAR (every signed-in screen): page title on the left. On the right: a bell icon with an
unread-count badge (opens a dropdown of the latest notifications, "View all" goes to the
Notifications page), then an avatar menu (initials on a tinted circle — colour derived from the
name, never a photo — plus name, a small position-badge pill if the person holds a position:
maroon fill for "President", blue outline for other positions, then Settings and Sign out). Show
a slim "Demo mode" ribbon under the top bar.

SHARED PATTERNS, repeat identically on every screen that needs them:
- Status badges — Meeting: Draft (grey), Open for roles (blue), Finalized (green), Completed
  (dark grey), Cancelled (red, with the date shown struck through). Role slot: Open (amber
  outline chip, text "Open"), Filled (avatar + name). Level/completion: Pending (amber),
  Verified (green), Rejected (red). Vote: Open (blue), Closed (grey).
- Buttons — exactly one primary (filled, primary colour) per view; secondary buttons are
  outlined; destructive actions are a red outline button that opens a confirm dialog. Buttons
  doing a data action show a spinner and disable while working.
- Forms — label above the field, helper text below it, error text in danger colour with a small
  icon, validated inline on blur and again on submit with the first error auto-focused. Required
  fields are marked "(required)" in text, never by colour alone.
- Dialogs — used for confirm/assign/swap/log-completion/withdrawal-reason actions. Escape closes,
  focus is trapped, primary action sits bottom right. On phone a dialog becomes a bottom sheet.
- Confirm dialogs state the effect in one plain sentence, e.g. "Cancel this meeting? 8 role
  holders will be notified."
- Tables — sticky header row, sortable columns marked with a small icon, row hover highlight, a
  dedicated empty-state row, 20 rows per page.
- Toasts — notification title, one line of body text, a "View" action that opens the related
  screen; action errors also surface as toasts, with a Retry button where safe to retry.
- Every list/detail screen must show FOUR states: loading (skeleton shapes matching the final
  layout, never a full-page spinner), empty (one short sentence plus the primary action if the
  signed-in person may take it), error (an inline card: "Could not load X. Try again" with a
  Retry button), and normal (the real content).
- Access denied — centred lock icon, "You do not have access to this page", one button "Back to
  Home".
- Dates always show the weekday and "IST", e.g. "Fri, 2 Oct, 4:00 PM IST"; relative phrasing like
  "in 2 days" is secondary text only, never the only date shown.
- Keyboard and accessibility — everything reachable by keyboard with a visible focus ring,
  dialogs are labelled, every badge carries text (never colour alone), toasts announce via
  aria-live="polite". Contrast: body text at least 4.5:1, input borders/icons/focus rings at
  least 3:1.
```

---

Every screen prompt in this folder (`S-01-login.md` … `S-18-settings.md`, `G-05-access-denied.md`)
assumes the above has already been pasted once in this Stitch session. Each screen file still
opens with its own one-line "Context" restating the essentials, since Stitch's context window is
limited and may not hold the whole brief by the time you reach screen 15.
