# S-04 — Meeting detail: Overview tab

**Route:** `/meetings/[id]?tab=overview` · **Purpose:** meeting summary, theme/welcome
note/word-of-the-day, roles-filled bar (FR-09, FR-21). **Who sees it:** everyone (non-Draft
meetings); TMOD of this meeting gets edit controls, ExComm/President always get them.

## Layout
Header (shared across all S-04 tabs): title, status badge, date/time (IST), venue or link, action
bar (ExComm: Edit, Open for roles/Finalize/Reopen/Mark Completed, Cancel). Below it a lifecycle
stepper: Draft → Open → Finalized → Completed, current step highlighted (Cancelled replaces the
stepper with a red banner + reason). Below that, 4 tabs: Overview, Agenda, Roles, Reports
(Overview active here). Tab content: theme block, venue/type summary, my-role summary, roles
filled bar.

## Exact content
Meeting `mtg-2026-10-02`, "Regular Meeting", status "Open for roles", Fri 2 Oct 4:00 PM IST,
venue "Conference Room B, Chennai" + link `https://teams.example.com/meet/club`.
- Theme: "New beginnings", welcome note present (one short paragraph, e.g. "Welcome back after the
  festival break — let's start strong."), word of the day "Embark", meaning "to begin a course of
  action" — all already published.
- TMOD (Ananya Das) and ExComm see an "Edit theme" button and a "Publish" action even though it's
  already published (still editable); everyone else sees the fields read-only.
- Roles filled bar: "9 of 12 roles filled".
- My-role summary line, persona-dependent: e.g. for Mohammed Faisal, "Your role: Speaker 1".

## Interactions and states
- **Loading:** header + tab skeleton, content skeleton blocks for theme card and roles bar.
- **Empty:** if theme/word-of-the-day not yet set (use 9 Oct meeting as the empty example): "Theme
  not set yet" placeholder text instead of blank space, with an "Set theme" button for the TMOD/ExComm.
- **Error:** inline retry card in place of the tab content; header still renders.
- **Cancelled variant:** show the red cancelled banner with reason "Public holiday event" (11 Sep
  meeting) replacing the stepper; Overview tab content becomes read-only for everyone.
- Publish action: after TMOD saves, a confirmation toast "Theme published" appears and (per flow)
  all members get notified (N-05) — show the toast in one frame.

## Components used
PageHeader, StatusBadge, LifecycleStepper, MeetingTabs, ProgressBar (roles filled), EditableField
(theme/welcome note/word of day), Button (Edit theme / Publish), EmptyState, ErrorState, Toast.

## Check result
- [ ] Lifecycle stepper shows "Open" as the current highlighted step for this meeting.
- [ ] "Edit theme" control is visible only for the TMOD-of-this-meeting persona and ExComm/President.
- [ ] Word of the day shows both the word AND its meaning, not just the word.
- [ ] Cancelled-meeting variant shows the red banner + reason replacing the stepper, not alongside it.
- [ ] Roles-filled bar reads "9 of 12", matching the seeded data.

---

## Paste-ready Stitch prompt

```
Context: Club Hub, a Toastmasters club web app. This is the Overview tab of the Meeting detail
screen for "Regular Meeting, Fri 2 Oct 4:00 PM IST", status Open for roles.

Design a meeting-detail page. Header: title "Regular Meeting", status badge "Open for roles"
(blue), date/time "Fri 2 Oct, 4:00 PM IST", venue "Conference Room B, Chennai",
action buttons "Edit", "Finalize", "Cancel" (outline, red text) top right. Below the header, a
horizontal lifecycle stepper with 4 steps — Draft, Open, Finalized, Completed — with "Open"
highlighted in primary blue and a filled dot, the rest grey. Below that, a tab bar with 4 tabs:
Overview (active, primary underline), Agenda, Roles, Reports. Tab content: a card titled "Theme"
showing "New beginnings", a welcome note paragraph, and "Word of the day: Embark — to begin a
course of action", with an outline "Edit theme" button top-right of the card (only for TMOD/
officers). Below it, a thin horizontal progress bar labelled "9 of 12 roles filled". Below that a
line "Your role: Speaker 1". Show a second frame: same page but Cancelled — stepper replaced by a
red banner "This meeting was cancelled: Public holiday event", content below greyed out/read-only.
```
