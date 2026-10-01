# S-04 — Meeting detail: Agenda tab

**Route:** `/meetings/[id]?tab=agenda` · **Purpose:** view/upload the agenda file, and see the
template agenda outline (FR-45). **Who sees it:** everyone reads it; only ExComm/President can
upload/replace.

## Layout
Same shared header + lifecycle stepper + 4-tab bar as `S-04-overview.md`, Agenda tab active.
Content: uploaded-file viewer/preview card at top, "Upload / Replace" button (ExComm only), then
the template agenda outline as a simple table below it.

## Exact content
Meeting `mtg-2026-10-02` has an uploaded agenda file `agenda-2026-10-02.pdf` (placeholder PDF).
Show it as an embedded PDF viewer card with a filename label "agenda-2026-10-02.pdf" and a
download icon button.
Agenda outline table below (from the Regular Meeting template, `meeting_type_agenda_items`):
| Time | Item | Duration |
| --- | --- | --- |
| 4:00 PM | Opening and TMOD intro | 5 min |
| 4:05 PM | Word of the day | 3 min |
| 4:08 PM | Prepared speeches | 21 min |
| 4:30 PM | Table Topics | 15 min |
| 4:45 PM | Evaluations | 15 min |
| 5:00 PM | Reports | 10 min |
| 5:10 PM | Close | 5 min |

## Interactions and states
- **Loading:** skeleton for the file viewer card and skeleton table rows.
- **Empty (no file uploaded):** use the 9 Oct meeting as the example — file card shows "No agenda
  uploaded yet" placeholder with a document icon, "Upload agenda" button for ExComm/President,
  nothing for Members; agenda outline table still shows (comes from the template regardless).
- **Error:** inline retry card in place of the file viewer.
- **Upload interaction:** drag-and-drop zone plus a browse button, accepted types "PDF, DOCX, PNG,
  JPG, up to 10 MB" printed under the drop zone; validation error example: "File must be under
  10 MB" in danger colour if exceeded.
- PNG/JPG uploads show an inline image preview instead of the PDF viewer; DOCX shows a
  generic-document icon with a "Download" button instead of an inline preview.

## Components used
FileUpload (drag-drop + browse), embedded PDF/image viewer, AgendaTable, Button ("Upload/Replace",
"Download"), EmptyState, ErrorState.

## Check result
- [ ] Upload/Replace control appears only for ExComm/President, never for Members.
- [ ] File-type/size rule text ("PDF, DOCX, PNG, JPG, up to 10 MB") is visible near the upload control.
- [ ] Agenda outline table is present even when no file has been uploaded (empty-file state).
- [ ] PDF preview and the outline table are visually distinct sections, not merged into one card.
- [ ] Shared header/stepper/tabs match `S-04-overview.md` exactly (same meeting, same "Open" step).

---

## Paste-ready Stitch prompt

```
Context: Club Hub, a Toastmasters club web app. This is the Agenda tab of the Meeting detail
screen for "Regular Meeting, Fri 2 Oct 4:00 PM IST" — reuse the same header, lifecycle stepper and
4-tab bar (Overview, Agenda active, Roles, Reports) from the Overview tab design.

Design the Agenda tab content: a card at the top titled "Agenda file" containing an embedded PDF
preview area with filename "agenda-2026-10-02.pdf" shown above it and a small download icon
button; for officers only, an outline button "Replace" top-right of that card. Below it a second
card titled "Agenda outline" containing a simple table with columns Time, Item, Duration and 7
rows: 4:00 PM Opening and TMOD intro (5 min), 4:05 PM Word of the day (3 min), 4:08 PM Prepared
speeches (21 min), 4:30 PM Table Topics (15 min), 4:45 PM Evaluations (15 min), 5:00 PM Reports
(10 min), 5:10 PM Close (5 min). Also design an empty-file variant of the top card: dashed-border
drop zone with a document icon, text "No agenda uploaded yet", a muted line "PDF, DOCX, PNG, JPG,
up to 10 MB", and a primary button "Upload agenda" (officer view only; Member view shows just the
empty message, no button).
```
