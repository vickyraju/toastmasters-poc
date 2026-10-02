# decisions.md

Accepted defaults and rulings, newest last. Each: what was decided, why, cost if wrong.

## M0 (2026-10-01)

- **Docs stay at the repo root, not `docs/`.** They were already there; CLAUDE.md points at root paths. Cost if wrong: a `git mv` and a path update in CLAUDE.md.
- **design.md `--accent` (#772432) is named `--brand-accent` in code** (`bg-brand-accent`). shadcn components use `--accent` for hover backgrounds; that now maps to `--primary-soft`. Cost if wrong: one rename.
- **The design.md shadow is named `--elevation` in tokens.css** and exposed as `shadow-overlay`. Cost if wrong: one rename.
- **`globals.css` stays at `src/app/globals.css`** (where shadcn expects it), not `src/styles/globals.css`. `src/styles/tokens.css` holds the tokens and is imported from it. Cost if wrong: a move plus an update to `components.json`.
- **shadcn preset is `radix-nova`** (Radix base, lucide icons). It is restyled through tokens. The default Button hover now uses `--primary-hover`. Cost if wrong: re-run init with another preset.
- **Light theme only.** design.md defines no dark palette, so the shadcn dark block was removed. Cost if wrong: add a `.dark` block later.
- **`@types/node` is ^24**, not ^20, to match vitest 5's peer range and local Node 24. Cost if wrong: none expected.
- **Empty folders from architecture.md section 4 are held with `.gitkeep`**, not placeholder source files. `src/lib/utils/` was dropped because shadcn's `src/lib/utils.ts` already fills that role. Cost if wrong: none; files arrive with their milestone.
- **Work happens on `main`** (no commits yet, nothing committed by Claude). Cost if wrong: branch before the first commit.

## M1 (2026-10-01)

- **Zod v3 API** (`zod@^3.25` is installed): `z.string().email()`, `z.string().datetime()`. Cost if wrong: swap to `zod/v4` imports and adjust 3 calls.
- **Schemas that depend on time take `now: Date`** (`meetingInput(now)`, `startVoteInput(now)`); the mock clock arrives in M2. Cost if wrong: none.
- **R-02 consecutive-repeat** takes the member's earlier role codes per meeting, most recent first, from the caller; rules.md does not say which meetings count. Cost if wrong: change what the service passes in.
- **`can()` does not compute evaluator eligibility**; the caller passes `evaluatorEligible` from `evaluatorEligibility()`. Cost if wrong: none.
- **Swap into a speaker slot while evaluating that speaker** is not checked; the docs only require R-02 and R-03 after a swap. Cost if wrong: one extra rule in `swap.ts`.

## M2 (2026-10-01)

- **Session is captured when a call is sent**, not when it runs, so concurrent callers in tests (and two tabs) behave like separate requests. Cost if wrong: none.
- **Seed tasks and notifications come from the real event functions** plus `tick()`, not hand-written rows, so they cannot drift from R-10. N-05/N-07 and N-12 (for voters) start read; N-01 starts read for the personas whose unread counts the walkthrough names. Cost if wrong: edit the read list in `seed.ts`.
- **"3 days before" means exactly 72 h**: T-06/T-07 for 9 Oct appear from Tue 6 Oct 4:00 PM IST, not at 10 AM. mock-data.md says only "jump to Tue 6 Oct". Cost if wrong: change the 72 in `tick.ts`.
- **Notifications skip inactive members**, so N-01 and N-05 reach 14 people, not 15. Cost if wrong: one filter in `events.ts`.
- **Contest meeting has 9 slots** (TMOD, Timer, Ah-Counter, Chief Judge, 4 Contestants, Sergeant-at-Arms) from mock-data.md 4.2 and 5.5. Cost if wrong: edit the seed.
- **18 Sep has 4 speakers and 4 evaluators** so each timer card appears once (5.3 asks for four cards; 4.2 says 12 slots). Cost if wrong: drop a speaker.
- **Officers waive only the level check** when claiming an evaluator slot (audited `role.override`); R-02 and the self-evaluation block still apply. Cost if wrong: one branch in `roles.service.ts`.
- **Swap request is validated at request and again at accept.** Cost if wrong: none.
- **Expired slot requests**: when a slot changes hands, its pending swap is cancelled and its pending withdrawal is rejected, with their tasks closed (R-06 "swaps expire"). Cost if wrong: one helper.
- **Vote results are fetched only through `voteView`** and only when `can(vote.view_result)` holds; list/get require officer rights. Cost if wrong: none.

## M3 (2026-10-01)

- **One sign-in refusal for unknown, inactive and removed IDs**: "We could not find that employee ID." flow.md J-01 (precedence over mock-data.md, which lists a separate "not active" message) says the message must not reveal which IDs exist. Cost if wrong: one branch in `core.service.ts`.
- **Login button says "Sign in"** (flow.md J-01) not "Continue" (design.md S-01 prompt); flow.md wins on precedence. Cost if wrong: one word.
- **G-05 renders in place inside the shell** (URL kept, top bar and Sign out still there) instead of a separate `/access-denied` route outside the shell (architecture.md section 4). Same component serves R-18 (Draft meeting links). Cost if wrong: one redirect.
- **`permission.denied` added to AUDIT_ACTIONS**: schema.md section 6 requires the note but section 2's enum omitted it. Logged through a new `audit.recordDenied(path)`.
- **Service additions** not in schema.md section 9: `auth.demoAccounts()` (architecture.md section 5 demo list; empty unless demo mode) and `dev.status()` (mock clock and simulate-error state for /dev).
- **Session calls ignore "Simulate error"** (`getCurrentUser`, `signOut`, `demoAccounts`, `recordDenied`, all dev actions) so the dev panel and Sign out cannot be locked out. "Reset data" keeps the signed-in member.
- **Root font stays 16px**; body text is 14px. With `html { font-size: 14px }` every rem size shrank 12.5% (buttons came out 35px). Buttons are 40px desktop, 44px below lg (touch targets).
- **Avatar tints** use four token pairs (primary, success, warning, info); design.md asks for "colour from name hash" without a palette. Danger is excluded so no one's avatar reads as an error.
- **Bell is a link to /notifications** for now; the dropdown (G-02) and toast click-through polish are M4. Toasts on new notifications (G-03) are already wired so the dev panel's test notification is visible.
- **Unbuilt screens share one placeholder** (`(app)/[...slug]`), replaced as each real page lands; delete it in M12. Unknown URLs show it instead of a 404 until then.
- **No idle session expiry**: flow.md J-01 mentions it with no duration. Default: none in mock mode. Rate limiting and sign-in logging are MVP/API-mode items (architecture.md section 5), not mock.
- **/dev is reachable only by typing the URL** ("hidden", mock-data.md section 1); no link to it.

## M4 (2026-10-01)

- **Tasks carry a due date** so S-07 can group them: T-01 is due at the meeting end that created it; T-02, T-04, T-06, T-07 and T-08 at the meeting start; T-05 at the vote deadline; T-03 has none (no deadline in the docs) and sits under Later. Groups: Today = overdue or due by end of today IST; This week = within 7 days; Later = further or undated.
- **Task buttons are named per type** ("Submit report", "Review request", "Verify", "Answer swap", "Cast vote", "Add details", "Set theme", "Fill roles") and link to the task's place. The Accept/Decline swap buttons from my Stitch prompt are not on S-07: the docs say a task is done by the action itself, which happens on the S-04 Roles tab (M6).
- **"Open roles I can take" applies member rules to everyone**, officers included (no override), and lists only slots in upcoming Open or Finalized meetings. New service method `roles.openForMe()`.
- **Home "Pending approvals"** uses a new `roles.pendingWithdrawals()` (ExComm) and the existing `progress.verifyQueue()` (VPE only). Rejecting a level needs a reason in a dialog (R-11); rejecting a withdrawal has no reason field (none in the docs).
- **Positions summary** uses a new `positions.list()` (President only); the rest of the positions service lands in M10.
- **Quick actions** follow design.md section 4 (Create meeting, Add member, Templates) plus flow.md J-02's President extras (Manage positions, Start vote). flow.md's "Assign role" quick action is the button on the Next meeting status card instead. Links point at screens built in later milestones.
- **`isEligible` moved to `VoteSummary`** so Home can find open votes that need this member.
- **Finalize from Home** asks for confirmation when roles are still open (R-07 "warn, allow anyway").

## M5 (2026-10-01)

- **Agenda outline times are derived from durations**; Prepared speeches is seeded at **22 min** (accepted 2026-10-02) so the times match mock-data.md 4.2 (4:30, 4:45, 5:00, 5:10). Original note: (the schema stores durations only), so 2 Oct reads 4:00, 4:05, 4:08, 4:29, 4:44, 4:59, 5:09. mock-data.md 4.2 lists 4:30, 4:45, 5:00, 5:10, which needs 22 minutes for Prepared speeches, not 21. Cost if wrong: change one seed duration, or add a start time to `meeting_type_agenda_items`.
- **New service method `meetings.agendaOutline(id)`**: the meeting type's agenda items timed from the meeting start, with the holders of each linked role. Types other than Regular have no seeded outline and show "This meeting type has no agenda outline."
- **Placeholder agenda** `public/mock/agenda-sample.pdf` is generated (one page, the outline text) per R-14. PDFs are embedded with an iframe, images shown inline, DOCX offered as a download.
- **Calendar weeks start on Monday**; the docs do not say. Below md the calendar becomes a list of that month's meetings (99-phone-variants). The calendar opens on the mock clock's month.
- **S-03 type filter options come from the meetings themselves** (no meeting-types service until M7).
- **S-04 header action bar (Edit, status changes, Cancel), the TMOD theme editor, agenda upload and all role actions are not on the page yet**; they belong to M6 to M8. Reports tab shows "Reports open after the meeting ends." before the end and the placeholder after it (M8).
- **Meeting links render only if http(s)** (`safeHttpUrl`), so a stored `javascript:` link can never become clickable.
- **Speaker details show Project and Level on separate rows.** "Set project timings" appears when a speaker has no min/max (R-04).

## M6 (2026-10-02)

- **Doc conflict, walkthrough step 4:** mock-data.md section 9 says Mohammed (Speaker 1 on 2 Oct) takes Evaluator 2 successfully. Evaluator is a main role, and R-02 (flow.md J-04, schema.md's unique index) blocks a second main role, so in this build he is refused with "You already have a main role in this meeting (Speaker 1)". flow.md and schema.md outrank mock-data.md. To make step 4 pass, either make Evaluator a support role or have step 4 use a member with no main role. **Needs your call.**
- **Eligibility is checked before the main-role rule**, so a member failing both sees the level message (matches walkthrough step 4's "blocked (level)").
- **New `roles.myActions(meetingId)`** returns, for the signed-in member, whether each open slot can be taken (or would be an officer override) and how each of their own slots would withdraw now (immediate, request, pending, started). The UI uses it so buttons and messages match the service rules exactly.
- **Live board:** `roles.subscribe()` fires on any store change; in mock mode that includes other tabs (the persisted store rehydrates on the `storage` event). The board refetches on it.
- **Minimal `templates` service** (`roleTemplates()`, `projects()`) for the Add role and speech-details forms; S-06 editing extends it in M7.
- **Store writes that change nothing are skipped** (`mutate` compares before and after). Without this, reading tasks ran the time-based jobs, which wrote the store, which woke the live-update listener, which refetched tasks: an endless loop that kept the board from refreshing after a click. Found in the browser; covered by a "store churn" test.

## M7 (2026-10-02)

- **Seeded Friday meetings all carry `template_id = tpl-friday`** (2, 9, 16, 23 Oct and the earlier Fridays), so R-08 generation recognises existing ones and never duplicates. The 31 Oct contest has none.
- **`recurringDates` (R-08)**: IST weekdays from today through `weeksAhead` weeks, minus skip dates, minus times already past. "Apply to Draft meetings" updates only generated Draft meetings with nobody in a role, and never touches Open or later ones.
- **N-08 fires once per new meeting type, role or recurring template**, to every active member; edits do not notify. Link: `/meetings`.
- **Custom roles on a new meeting are added to the role catalog** (mock-data.md 4.2 lists Chief Judge, Contestant and Sergeant-at-Arms there). A name that already exists reuses that role.
- **Open all drafts is a service method** (`meetings.openAllDrafts`), but the plan's "bulk Open all drafts" has no button in design.md. I put it on the services only; no button yet. **Needs your call** whether S-03 gets one.
- **Cancel's confirm shows its effect in one sentence and needs a reason** (R-07). Status changes show their warnings (open roles, missing reports) from a dry run (`meetings.statusPreview`) before you confirm.
- **Edit mode changes basics, date and location only.** Roles are managed on the Roles tab; the meeting type cannot change after creation. Saving a changed time notifies role holders (N-03).
- **Agenda files in mock mode are object URLs for the session** (R-14); they disappear on a full reload. The service still validates type and size, and sanitises the file name.
- **A form and its service parse the same values twice**, so the schemas are idempotent (`optionalText` and the link field accept `null`). Found when the template form saved a parsed `null` venue and the service rejected it.
- **"Open for roles" on the form saves and opens in one step**; the intent is held in a ref because the click and the submit happen in one event, before React re-renders. Found by a test: the button used to save a draft only.
- **Dev panel gained "Generate recurring meetings"** (plan: "callable from the dev panel"); the same button is on S-06 as "Generate meetings now" for ExComm.

## M8 (2026-10-02)

- **Timer cards are always computed by the service** (R-04) from the slot's limits and `timer_grace_seconds`; whatever card the client sends is ignored. A speaker with no limits gets "No card" and the time is kept, with "Set project timings" guidance.
- **Who sees which report (schema.md section 6):** holders and ExComm/President see a meeting's reports from its end; every member sees the consolidated report once Completed. A member with no report role before Completed sees a pointer to the consolidated report. Report roles are the roles whose catalog entry has a report kind (Timer, Ah-Counter, Grammarian, Table Topics Master, General Evaluator).
- **Editing:** a draft may be empty; submit needs content (summary text for the two summary roles). The author can resubmit until the meeting is Completed (A7), after which every save returns `CLOSED` and the forms are read-only.
- **Ah-Counter and Grammarian rows are the meeting's speakers** (the docs say "per speaker"). The Ah-Counter breakdown is typed as `um 4, so 2`; the consolidated report sums breakdowns across speakers and shows any remainder as "other" (mock-data.md 8: um 14, so 9, like 5, other 3 = 31).
- **Report tasks (T-01) already come from the clock job**; submitting closes them. Reports remain submittable only after `ends_at` (J-08 step 1).
- **Theme editor** sets theme, welcome note, word of the day and meaning for TMOD (own meeting, not once Completed or Cancelled) and ExComm. Length caps are mine (120, 1000, 60, 200); the docs give none. Publishing sends N-05 to all active members and clears T-07 once both theme and word are set.
- **Seeded reports** from mock-data.md 5.2 and 8 are in the seed; the 18 Sep timer card list is green, yellow, red, DQ computed by the same rule.
- **Test timeout raised to 15 s** project-wide: component tests sign in, wait on the 150-400 ms mock delay and walk several steps; 5 s was flaky for the longest one.

## M9 (2026-10-02)

- **S-09 shows only what is stored.** My Stitch prompt listed "Level 2 and Level 1: verified, earlier" for Ananya and illustrative Projects rows; mock-data.md seeds none of those (only Ananya's pending Level 3, Suresh and Priya's verified levels and Ganesh's rejected one, and no project completions). I did not invent history, so Ananya's Levels tab has one row, and every Projects tab starts empty until someone logs one. Home's "0 projects done" and S-10's "Projects done" column read the same data. **Needs your call** if you want seeded history for a richer demo.
- **Proof upload is its own service call** (`progress.uploadProof`) that shares the agenda file rules (R-14: PDF, DOCX, PNG or JPG, up to 10 MB); a proof must belong to the member logging it. In mock mode proofs are object URLs for the session, like agendas. Proof is optional unless `club_settings.proof_required` (off in the seed), in which case logging a level without one is refused with "Attach proof of completion."
- **Log completion dialog**: the type toggle defaults to Level; the pathway is pre-filled from the profile and editable text; the level select defaults to the member's current level; the date picker's max is today in IST. Errors show inline after the first submit, using the same R-11 check the service runs (level above current, future date). A project needs a name.
- **Resubmit after a rejection** is just logging that level again: R-11 only blocks a second *pending* one. The rejected row keeps its reason on S-09.
- **S-10 columns** follow flow.md J-09: Name, Pathway, Level, Projects done, Roles taken, Speeches, Last active. "Roles taken" and "Speeches" count Completed meetings only (schema.md section 10). "Inactive 60+ days" uses the club setting (60 days), so the label should follow it if the setting changes; **it is hard-coded text for now**.
- **Verification queue is visible to all ExComm** (`club_progress.view`); only the VPE sees Verify and Reject. Others see "Pending VPE review". Verify confirms with the effect in one sentence; Reject needs a reason.
- **`?tab=queue`** selects the queue, because every N-09 and T-03 link points at `/progress/club?tab=queue`.
- **Shared pieces:** `LevelRing` moved out of the Home card for reuse; agenda upload validation moved to `helpers.validateUpload` and is used by both agendas and proofs.

## M10 (2026-10-02)

- **Removing a member who holds future roles:** flow.md J-10 says reassign or release before confirming; rules.md R-16 says release to Open with a warning. Both are met: the dialog lists every future role (Draft, Open or Finalized meetings that have not ended) and any position, and **confirming releases them**. The member gets no notification (schema.md section 5); a pending swap on a released slot is cancelled and a pending withdrawal rejected, with their tasks closed. Past roles and reports stay.
- **Removing or deactivating a position holder vacates the seat** (audited `position.remove`). The docs forbid only removing yourself or the President (R-16), and S-11's own example removes Vikram, who is SAA. A removed member who was named next President clears that setting.
- **Deactivate and Remove behave the same** except Deactivate can be undone (Reactivate); Remove is final. A reactivated member does not get a position back.
- **Level is not editable.** FR-35 says it changes only when a level completion is verified, so the edit form has name, email, Toastmasters ID and pathway only; Add member sets a starting level (default 1). The employee ID is fixed after creation. A member editing themselves cannot change the Toastmasters ID (S-18).
- **S-13 President card has no Change button**: R-12 says the presidency moves only through "name the next President, then Transfer now". The Next President card holds the picker, Clear and the danger-toned **Transfer presidency now** with the exact warning wording from the spec. Transfer vacates the new President's old seat, makes the outgoing President a plain Member with no position, clears the next-President setting, notifies both (N-11) and audits `president.transfer`. The service refuses to finish if there would not be exactly one President.
- **A member holds one position** (R-12 default): picking someone who already holds a seat is hidden in the picker and refused by the service with "Remove that position first." **Make vacant** is the explicit remove.
- **Replacing the VPE** closes the old VPE's verification tasks and creates T-03 for the new VPE for every pending completion. Losing any seat closes that person's officer tasks (T-02, T-03, T-05, T-08). A newly named officer does not get T-02 for requests that already exist; they appear for new ones.
- **`members.list` now returns removed members too** (S-11 has a Removed filter); the assign dialogs already filter to active. The default status filter on S-11 is Active.
- **CSV import** (flow.md J-10 step 1) is not in the M10 plan or in design.md's S-11, so it is **not built**. **Needs your call** if you want it.
- **No idle timeout and no "View history" on removed rows**: removed members have no menu; their name is a link to their profile, which still shows their history.

## M11 (2026-10-02)

- **Every cast is audited, without the choice** (flow.md J-12 step 7). schema.md section 7 lists only vote start and close, so I added `vote.cast` to the audit actions. The row names the voter and the vote; `before` and `after` are empty. Participation already says who voted and when, never what.
- **Ballots are inserted at a random position**, so the ballot order cannot be matched to the participation order to work out who chose what. R-13 only requires that ballots hold no member id (they hold `id`, `voteId`, `optionId`). Cost if wrong: one line.
- **Results go to eligible voters only** (R-13, J-12 step 6). The service previously checked only "officer"; an officer appointed after the vote started sees turnout and "Results are visible to the eligible voters", never counts. They also cannot cast ("You were not an eligible voter when this vote started").
- **Deadlines close votes on the next read** (list or detail) as well as on the 60-second tick, and send N-13 to every eligible voter. A cast after the deadline returns `CLOSED`.
- **S-15 states:** can vote (radio cards plus Cast vote, disabled until you choose); already voted (a note replaces the form: "You voted. Results are hidden until the vote closes."); not eligible (note); closed (result bars with counts and percentages, plus turnout; a tie is shown as a tie, no decision made). Cast confirms with "Votes are final and secret. You are voting “X”." Close vote (President, open votes only) confirms with "Results become visible to eligible voters immediately."
- **The start-vote form** has a title (3 to 120), description (up to 1000), 2 to 6 distinct options defaulting to Yes, No and Abstain, and an optional deadline as an IST date and time together. A past deadline is refused by the service and shown under the deadline fields.
- **S-14 sorts open votes first (soonest deadline), then closed (newest first)**, and flags "Your vote is needed" for eligible voters who have not voted. The list shows turnout as a count only.
- **Percentages are rounded to whole numbers** (4 of 7 = 57%), so they can add up to 99 or 101 (R-13 gives no rule).
