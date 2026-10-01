# S-07 — My tasks

**Route:** `/tasks` · **Purpose:** a system-generated to-do list; a task disappears when its
action is done (FR-46). **Who sees it:** everyone, filtered to their own tasks.

## Layout
Single column, grouped into three sections by due date: Today, This week, Later. Each task is a
row: icon, title, context line, action button.

## Exact content
Use **Aditya Kulkarni (IL1013)** as the example persona — he has 2 open tasks:
- **Today:** "Submit your Timer report" — context "Regular Meeting, 25 Sep" — button "Submit report"
  (opens S-04 Reports tab).
- **Today:** "Answer swap request" — context "Vikram Rao wants to swap Timer for your Ah-Counter
  role, 2 Oct meeting" — buttons "Accept" / "Decline".
Also show, as additional example rows across other personas (label each row's persona in a small
caption for Stitch's reference, not on the real screen): "Verify Ananya's Level 3 completion"
(Priya, VPE), "Fill open roles — 2 Oct meeting, 3 open" (any ExComm), "Cast your vote — Approve
club anniversary budget" (Divya/Rahul/Vikram), "Add speech project and title" (Meera).

## Interactions and states
- **Loading:** skeleton rows in each of the 3 groups.
- **Empty:** "No tasks. You are all caught up." with no action button (use e.g. Rahul's persona,
  who has no open T-01 since he already submitted).
- **Error:** inline retry card.
- Completing a task's action (e.g. clicking Submit report and finishing the form) removes it from
  this list immediately — show a subtle row-removal transition note (fade/collapse), not a hard cut.
- Clicking a task's context/title (not just the button) also navigates to the linked screen.

## Components used
TaskList, grouped section headers (Today/This week/Later), TaskRow (icon, title, context, action
button), EmptyState, ErrorState.

## Check result
- [ ] Tasks are grouped under Today / This week / Later, not a flat list.
- [ ] Each task row's action button matches its task type exactly (Submit report, Accept/Decline,
      Verify, Fill open roles, Cast your vote) rather than a generic "Go" button.
- [ ] Empty state reads exactly "No tasks. You are all caught up." with no leftover action button.
- [ ] Only the signed-in person's own tasks are shown — no cross-member task list visible here.
- [ ] Swap-request task shows both Accept and Decline, not a single button.

---

## Paste-ready Stitch prompt

```
Context: Club Hub, a Toastmasters club web app. This is the My tasks screen — a personal
system-generated to-do list, persona "Aditya Kulkarni".

Design a task list page grouped into three labelled sections: "Today", "This week", "Later". In
"Today", two rows: (1) icon + title "Submit your Timer report", muted context line "Regular
Meeting, 25 Sep", primary button "Submit report" on the right; (2) icon + title "Answer swap
request", context line "Vikram Rao wants to swap Timer for your Ah-Counter role, 2 Oct meeting",
two buttons "Accept" (primary) and "Decline" (outline) on the right. Rows have a white card
background, thin border, 8px radius, comfortable padding, and a subtle hover state. Show "This
week" and "Later" sections as empty (collapsed or with a muted "Nothing here" line) since this
persona has only 2 tasks. Below or as a second frame, show the empty-state variant for a different
persona: a centred message "No tasks. You are all caught up." with a simple checkmark icon, no
action button, no section headers.
```
