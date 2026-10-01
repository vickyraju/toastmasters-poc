# S-18 — Settings

**Route:** `/settings` · **Purpose:** own profile fields + notification preferences (FR-40).
**Who sees it:** everyone, own settings only.

## Layout
Two sections stacked: Profile form (top), Notification preferences list (below). Save action per
section or one combined save — use one combined sticky "Save changes" bar for simplicity.

## Exact content
Persona **Mohammed Faisal (IL1009)**.
- **Profile fields:** Name (editable), Email (editable), Pathway (editable, select/text with
  suggestions), employee ID shown read-only "IL1009", Toastmasters ID read-only unless ExComm.
- **Notification toggles**, one row per type, switch control:
  - Meeting opened for roles (N-01) — toggle, on
  - Theme/word of the day published (N-05) — toggle, on
  - Report due (N-06) — toggle, on
  - New meeting type/template added (N-08) — toggle, off (example of an opted-out non-critical type)
  - **Locked rows (always on, shown with a lock icon instead of a toggle, per FR-40):** "Meeting
    rescheduled" (N-03), "Meeting cancelled" (N-04), "Role assigned/changed by ExComm" (N-07),
    "Reminders for your own roles" (N-14), "Withdrawal request decided" (N-17) — each row shows
    "Always on" text next to a small lock icon instead of an interactive switch.

## Interactions and states
- **Loading:** skeleton form + skeleton toggle rows. **Error:** inline retry card, or a save-error
  toast if the update fails.
- Locked rows are not merely disabled-looking toggles — they must visibly read "Always on" with a
  lock icon so it's clear these are not misconfigured switches.
- Save bar shows a brief loading spinner then a success toast "Settings saved."

## Components used
ProfileForm (Name, Email, Pathway inputs), ReadOnlyField (Employee ID), NotificationToggleList
(Switch rows + locked "Always on" rows), StickyFooter ("Save changes"), Toast.

## Check result
- [ ] Employee ID field is visibly read-only (greyed/no cursor), not just non-functional.
- [ ] Locked notification rows show "Always on" + lock icon, never a plain disabled switch with no explanation.
- [ ] At least one toggle is shown in the "off" state to prove opt-out is possible for non-critical types.
- [ ] The exact 5 locked codes (N-03, N-04, N-07, N-14, N-17) are represented, not a different subset.
- [ ] Save action gives clear feedback (spinner then toast), not a silent save.

---

## Paste-ready Stitch prompt

```
Context: Club Hub, a Toastmasters club web app. This is the Settings screen, persona "Mohammed
Faisal" — own profile fields plus notification preferences.

Design a settings page in two card sections. Card 1 "Profile": Name input "Mohammed Faisal", Email
input "mohammed.faisal@example.com", Pathway input "Dynamic Leadership", and a read-only, greyed
Employee ID field "IL1009" with a small lock icon. Card 2 "Notifications": a list of toggle rows,
each with a title on the left and a switch on the right — "Meeting opened for roles" (on), "Theme
or word of the day published" (on), "Report due" (on), "New meeting type or template added" (off).
Below those, a visual divider and 5 more rows that are NOT switches — instead each shows the title
on the left and, on the right, a small lock icon plus muted text "Always on": "Meeting
rescheduled", "Meeting cancelled", "Role assigned or changed by ExComm", "Reminders for your own
roles", "Withdrawal request decided". Sticky footer bar at the bottom with a primary "Save
changes" button.
```
