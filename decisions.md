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
