# Stitch prompts — Club Hub

Ready-to-paste prompts for designing every V1 screen in Google Stitch, built from `design.md`,
`flow.md`, `prd-toast.md` and `mock-data.md` at the repo root. No app code is written from this
folder — it only produces design prompts and (once you export) reference images under
`design/stitch-exports/`.

## Run order

1. **Start a new Stitch session.** Paste all of `00-master-brief.md` (the fenced block) as your
   first message. This sets the design brief, tokens, navigation and shared patterns for the
   whole session.
2. **Go through the screen files in ID order**, pasting each one's "Paste-ready Stitch prompt"
   fenced block as a new prompt in the same session (so Stitch can reuse what it already
   generated for sidebar/top bar/badges/etc.):
   `S-01-login` → `S-02-home-member` → `S-02-home-officer` → `S-03-meetings` →
   `S-04-overview` → `S-04-agenda` → `S-04-roles` → `S-04-reports` →
   `S-05-create-edit-meeting` → `S-06-templates` → `S-07-my-tasks` → `S-08-notifications` →
   `S-09-my-progress` → `S-10-club-progress` → `S-11-members` → `S-12-member-profile` →
   `S-13-positions` → `S-14-votes-list` → `S-15-vote-detail` → `S-16-audit-log` →
   `S-17-export` → `S-18-settings` → `G-05-access-denied`.
   Each file also has a "Context" line at the top of its prompt block, so if Stitch's context
   has drifted (or you're resuming in a new session) you can paste that single file's prompt on
   its own and it still stands alone.
3. **After all 23 desktop screens are accepted**, go through `99-phone-variants.md`: paste the
   generic follow-up prompt right after accepting each screen's desktop version (don't batch this
   at the end — do it screen-by-screen so Stitch still has that screen's context loaded), adding
   the screen-specific note from the table where one exists.
4. Use each screen's "Check result" list (in its own file) to review Stitch's output before moving
   to the next screen — catching a contrast or missing-state problem early is cheaper than fixing
   it after 20 more screens have been generated from it.

## Saving exports

Save every accepted export (desktop and phone) to `design/stitch-exports/<ID>/`, e.g.
`design/stitch-exports/S-04-roles/desktop.png` and `design/stitch-exports/S-04-roles/phone.png`.
This matches the layout `architecture.md` §4 already expects (`design/stitch-exports/` is listed
as "raw Stitch output, reference only, never imported" — Claude Code will read these as reference
when building the real screens, never copy their markup).

## Gaps

Things I could not source directly from the docs, and the default I used instead — confirm or
correct before treating any of this as final:

1. **`docs/` path vs root files.** Your original instructions referenced `docs/design.md` etc.,
   but those files currently live at the repo root with no `docs/` folder. I read from the root
   and wrote this output to `design/stitch-prompts/` (also at the root), matching
   `architecture.md`'s existing `design/stitch-exports/` sibling. Say so if you want a `docs/`
   folder created and the source files moved there first.
2. **S-02 split (member/officer, not member/ExComm/President).** `design.md` §4 only meaningfully
   differs between ExComm and President by 2 extra cards (Positions summary, 2 extra quick
   actions). I folded President into `S-02-home-officer.md` as a labelled variant rather than a
   3rd file. If you want a fully separate `S-02-home-president.md`, say so.
3. **S-06 Templates kept as one file, not tab-split like S-04.** `flow.md`/`design.md` treat it as
   one screen with internal tabs, and `design.md`'s own Stitch prompt for it treats it the same
   way. Flag if you'd rather have 4 separate files (`S-06-recurring.md`, `S-06-meeting-types.md`,
   `S-06-role-catalog.md`, `S-06-project-timings.md`).
4. **S-16 Audit log rows are derived, not literal seed data.** `mock-data.md` never lists literal
   audit-log rows. Every row I used in `S-16-audit-log.md` is reconstructed from an event the docs
   explicitly say happened (Nisha's withdrawal request, the Vikram/Aditya swap, Ananya's pending
   Level 3, Suresh's verified Level 3, Ganesh's rejected Level 2, the 11 Sep cancellation, vote
   start/close) — none are invented beyond what's stated, but exact timestamps/actor-of-record for
   a couple of rows (e.g. who exactly cancelled the 11 Sep meeting) are my inference, not sourced.
5. **S-09 proof-upload example.** No seeded proof filename exists anywhere in `mock-data.md` (the
   seed explicitly has `proof_required = false` and Ananya's pending Level 3 has no proof attached).
   The Log completion dialog is described generically ("optional file upload") rather than with a
   specific example file.
6. **S-17 Export has no seeded record counts or date ranges.** `mock-data.md` doesn't specify what
   a CSV export actually contains. I kept all three export cards generic/descriptive, matching how
   `design.md`'s own Stitch prompt for this screen stays generic too.
7. **File naming**: your instructions said `docs/prd.md`; the actual file is `prd-toast.md`. Same
   content, no doc conflict — just noting the name difference for traceability.

Nothing else in these 26 files was invented beyond what `design.md`, `flow.md`, `prd-toast.md` and
`mock-data.md` state or directly imply.
