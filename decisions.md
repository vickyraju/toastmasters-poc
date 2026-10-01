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
