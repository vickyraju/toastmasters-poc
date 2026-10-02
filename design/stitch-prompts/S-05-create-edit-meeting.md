# S-05 — Create / edit meeting

**Route:** `/meetings/new`, `/meetings/[id]/edit` · **Purpose:** ExComm creates a custom meeting or
edits any meeting's roles/details for that day only (FR-08, R-08). **Who sees it:** ExComm,
President only.

## Layout
Single-column long form, max width ~760px, in clearly labelled sections: Basics, Date and time,
Location, Roles for this meeting, Agenda file. Sticky footer with two buttons: "Save draft" and
"Open for roles".

## Exact content
Use the custom contest meeting as the realistic example, `mtg-2026-10-31`, "Area Speech Contest",
type "Speech Contest", Sat 31 Oct, 10:00 AM, venue "Conference Room B, Chennai".
- **Basics:** Title field (pre-filled "Area Speech Contest"), Meeting type select (options:
  Regular Meeting, Speech Contest, Workshop, Joint Session — Speech Contest selected).
- **Date and time:** date picker (31 Oct 2026), start time (10:00 AM), duration (150 min,
  pre-filled from the type default).
- **Location:** venue text field, meeting link field, helper text "At least one of venue or link
  is required before this meeting can leave Draft."
- **Roles for this meeting:** a checklist of roles from the catalog with count steppers (TMOD ×1,
  Timer ×1, Ah-Counter ×1), plus custom roles added for this meeting only: "Chief Judge" ×1,
  "Contestant" ×4, "Sergeant-at-Arms" ×1 — each with an "Add custom role" affordance at the bottom
  of the list, and a note "Changes here affect only this meeting, not the template."
- **Agenda file:** drag-and-drop upload zone, "PDF, DOCX, PNG, JPG, up to 10 MB".

## Interactions and states
- **Loading (edit mode):** skeleton form fields while the existing meeting loads.
- **Validation errors:** inline, e.g. "Add a venue or a meeting link before opening for roles" if
  both location fields are empty and "Open for roles" is clicked; "End time must be after start
  time" style message if duration is invalid.
- **Empty (create mode):** all fields blank/default except the type-based role checklist, which
  pre-fills from the chosen meeting type the moment it's selected.
- **Error:** inline retry card if the meeting fails to load in edit mode; save errors show as a toast.
- Footer buttons: "Save draft" (secondary/outline) always enabled once the title exists;
  "Open for roles" (primary) validates required fields first.

## Components used
Form sections (Card per section), Input, Select, DatePicker, TimePicker, RoleChecklist (stepper
rows + "Add custom role"), FileUpload, StickyFooter, Button (primary/secondary), inline form errors.

## Check result
- [ ] Role checklist clearly separates catalog roles (with steppers) from custom roles added just
      for this meeting.
- [ ] "At least one of venue or link" validation rule is visible as helper text, not just enforced silently.
- [ ] Sticky footer with Save draft / Open for roles stays visible while scrolling a long form.
- [ ] This screen and its controls are entirely absent from the Member and plain-ExComm-without-permission... 
      (n/a — ExComm can already access; just confirm Members never reach this route, shown as G-05 if they try).
- [ ] Agenda upload shows the same file-type/size rule text as `S-04-agenda.md` for consistency.

---

## Paste-ready Stitch prompt

```
Context: Club Hub, a Toastmasters club web app. This is the Create/edit meeting form, used by club
officers to create a custom meeting or edit an existing one's roles and details for that day only.

Design a single-column form page, max width about 760px, centred, with section cards in this
order: "Basics" (title input pre-filled "Area Speech Contest", meeting-type select showing "Speech
Contest" selected); "Date and time" (date picker "31 Oct 2026", time picker "10:00 AM", duration
input "150 min"); "Location" (venue text field "Conference Room B, Chennai",
meeting-link field, small helper text "At least one of venue or link is required before this
meeting can leave Draft"); "Roles for this meeting" — a checklist with count-stepper rows: TMOD
(x1), Timer (x1), Ah-Counter (x1), then three custom rows with a small "Custom" tag: Chief Judge
(x1), Contestant (x4), Sergeant-at-Arms (x1), and a dashed-border "+ Add custom role" row at the
bottom; "Agenda file" (drag-and-drop zone, muted text "PDF, DOCX, PNG, JPG, up to 10 MB"). Sticky
footer bar at the bottom of the viewport with an outline button "Save draft" and a primary button
"Open for roles". Show a validation-error variant where the Location fields are empty and a red
inline message appears above the Location card: "Add a venue or a meeting link before opening for
roles."
```
