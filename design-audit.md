# Design audit (2 Oct 2026)

Scope: screenshots of every route as Member (IL1009), ExComm (IL1003) and President (IL1001) at 1440, 768 and 390 px, reviewed against design.md. I looked closely at Login, Home (President, Member phone), Meetings calendar, Meeting detail (Roles, Reports), Club progress, Vote, Positions. The other captures were taken but not reviewed one by one. Not done: screen-reader test (needs a person), real-device touch testing, motion review beyond reading the primitives. In-app navigation is not guarded against unsaved input (Next has no supported hook).

## Fixed
- **S-04 Roles board (Major).** Officers saw up to four buttons per row, two of them red outlines repeated on every row. Now "Remove holder" and "Delete role" live in a "More actions" menu (labelled per role, 44 px on phone). Primary actions (Take this role, Assign/Reassign, Withdraw, Swap, Edit speech details) stay visible. Both destructive actions still open the existing confirm dialogs.

- **Buttons (all screens).** Red outline buttons (Cancel meeting, Reject, Make vacant, Close vote) kept red on hover instead of turning blue-grey. Approve and Verify are green outlines. See decisions.md D-DP1.
- **Forms (S-18, S-11, S-05, theme editor).** Save is disabled until something changed, with Discard and an unsaved-changes note. See D-DP2.
- **Guideline sweep.** Explicit transitions, autocomplete and spellcheck defaults, tabular figures, balanced headings, overscroll containment, placeholder wording. See D-DP3.

- **S-07 Tasks.** Overdue tasks sat in "Today" with no signal; they now carry a red "Overdue" tag.
- **S-17 Export.** The three cards' date rows did not line up; fixed.
- **S-12 Profile.** Progress statuses were plain grey text; now the same badges as My progress.
- **All screens.** Skip-to-main-content link (keyboard-tested: first Tab shows it, Enter moves focus to main); focused fields are not hidden behind the fixed footer or bottom bar; native selects set their own text colour.
- **Create forms (S-05, S-11).** Closing the tab with typed input asks for confirmation.

## Reviewed, no change needed
S-08 Notifications, S-11 Members list, S-06 Templates, S-16 Audit, S-18 Settings, tablet Home and Roles.

## Deferred (Minor)
- S-13 Positions: "Make vacant" red outline repeats on six cards. Same pattern as above; left because there is one per card.
- S-03 Meetings: Type and Status filters are native selects and look different from the shadcn controls.
- S-04 Roles: on desktop the actions sit under the holder name rather than at the row's right edge (design.md section 6 says actions are on the row). Needs a layout decision.
- S-15 Vote: the card is 560 px wide in the middle of a wide empty page; fine for content, flagged for taste only.

## Already fine
Tokens match design.md; focus ring, 150-200 ms transitions, `prefers-reduced-motion` handling and press feedback (`active:translate-y-px`) exist in the primitives; skeleton loaders match layout; empty and error states present.
