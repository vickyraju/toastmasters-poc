# implementation_plan.md: Build Order for Claude Code

Status: Draft v1. Phase 1 = frontend with mock data (this plan). Phase 2 = backend, then real authentication (Section 3).
Rule: one milestone at a time. After each, Claude Code stops, runs the checks, and reports: what was built, what is untested, any doc gaps. You review, then say "go to M<n>".

Each milestone lists: **Scope** (screens and rules), **Tasks**, **Done when**. IDs refer to `flow.md`, `schema.md`, `rules.md`.

---

## 1. Before you start (you, not Claude Code)

1. Finish the Stitch designs (design.md section 9) and put exports in `design/stitch-exports/<ID>/`.
2. Create the GitHub repo, add these eight files under `docs/`, add `CLAUDE.md` (rules.md Part C) at the root.
3. Give Claude Code this first message:
   > "Read CLAUDE.md and everything in docs/. Do not write code yet. Summarise the app in 10 lines, list any contradictions or gaps you found between the docs, and propose answers. Then wait."
4. Answer the gaps, record them in `docs/decisions.md`, then start M0.

---

## 2. Phase 1 milestones (frontend + mock)

### M0 Project setup
Scope: tooling only.
Tasks: create Next.js (App Router, TypeScript strict), Tailwind, shadcn/ui, lucide-react, TanStack Query, Zustand, react-hook-form, Zod, date-fns and date-fns-tz, sonner, Vitest and Testing Library, ESLint with a11y plugin, Prettier. Add `.env.example` from architecture.md section 9. Create the folder structure from architecture.md section 4 with placeholder files. Add `tokens.css` from design.md section 2 and wire the Tailwind theme. Add npm scripts (`dev`, `build`, `lint`, `typecheck`, `test`).
Done when: `npm run dev` shows a blank shell; lint, typecheck and test pass on the empty project.

### M1 Domain layer
Scope: `types.ts`, `constants.ts`, `schemas.ts`, `rules/`, `can()`.
Tasks: encode enums and entities from schema.md; implement rules R-01 to R-06, R-11 (level math), R-13 (secrecy helper) as pure functions; unit tests for every example in rules.md and mock-data.md section 5.1 (eligibility cases).
Done when: tests pass; nothing here imports React.

### M2 Mock adapter and services
Scope: service interfaces (schema.md section 9), mock store, seed, mock clock, event functions for tasks and notifications (R-10).
Tasks: build `seed.ts` from mock-data.md exactly (15 members plus one removed, meetings, slots, vote states, completions, notifications, tasks); `now()` clock with jump support; Zustand persisted store `clubhub.mock.v1`; every service method returns a promise with delay and calls `can()`; claim runs atomically; task and notification generators; lifecycle transitions (R-07); audit writes.
Done when: seed scenario 5.1 loads; a Vitest suite exercises claim conflict, withdrawal cutoff at 23 h 59 m and 24 h, swap accept, level verify, vote secrecy, lifecycle transitions.

### M3 App shell, login, access control
Scope: S-01, G-01 to G-05, `/dev` panel.
Tasks: sign-in layer (`src/lib/auth`) using employee ID against the mock store, session in a cookie or localStorage (mock only); `(app)` layout with sidebar, bottom tab bar, top bar, bell, toast host, avatar menu; route guard producing G-05 and an audit note; demo ribbon; dev panel (time jump, reset data, simulate error, send test notification).
Done when: each persona from mock-data.md section 3 signs in and sees only its navigation items (design.md section 3); a Member hitting `/audit` sees G-05; sign-out returns to S-01; the failure cases show the right message.

### M4 Home, tasks, notifications
Scope: S-02, S-07, S-08, bell dropdown, toast behaviour.
Tasks: role-adaptive Home per design.md section 4; tasks list with action buttons that navigate to the linked place; notifications page, mark read, mark all read, unread badge; toast on new notification with click-through.
Done when: mock-data.md section 7 tasks and notifications appear per persona; completing an action removes its task.

### M5 Meetings list and detail (read-only parts)
Scope: S-03, S-04 Overview, Agenda and Roles (read view), lifecycle stepper.
Tasks: calendar and list views with filters; meeting cards and status badges; Draft hidden from Members; detail page with tabs (URL `?tab=`), agenda file viewer and outline; roles board (read).
Done when: all eight seeded meetings render correctly per role; the Cancelled banner and stepper display.

### M6 Role signup and management
Scope: S-04 Roles tab actions, R-02, R-03, R-05, R-06, R-09.
Tasks: take role, withdraw (immediate or request), assign/reassign/remove (ExComm), speaker details form, evaluator claim with eligibility messages, swap request/response dialogs, withdrawal approval banner, add/remove slot for a single meeting, concurrency error UX ("Someone just took this role").
Done when: mock-data.md walkthrough steps 1 to 5 work; component tests for RoleBoard claim/withdraw pass.

### M7 Create and edit meetings, templates
Scope: S-05, S-06, R-07, R-08, R-14.
Tasks: meeting form with role checklist and custom roles, agenda upload; status actions (Open, Finalize, Reopen, Complete with missing-reports warning, Cancel with reason); reschedule notification; templates tabs (recurring, types, role catalog, project timings); N-08 on new type/template; bulk "Open all drafts"; recurring generation function callable from the dev panel.
Done when: ExComm can create a custom meeting, add and delete roles for the day, open and finalize; the 31 Oct contest example can be recreated.

### M8 TMOD tools and reports
Scope: S-04 Overview theme editor, Reports tab, R-04.
Tasks: TMOD publish theme, welcome note, word of the day (N-05); Timer form with live cards; Ah-Counter form with optional breakdown; Grammarian form; Table Topics and General Evaluator summaries; draft/submit states; consolidated report; report tasks appear after meeting end and clear on submit; reports lock at Completed.
Done when: timer card unit tests pass; 25 Sep and 18 Sep seeded reports render in all states.

### M9 Progress
Scope: S-09, S-10, R-11.
Tasks: My progress with level ring, logging dialog (project and level), proof upload; club progress table with inactive filter; VPE verification queue with verify/reject; T-03 and N-09/N-10.
Done when: walkthrough step 5 (verify Ananya) works; only VPE sees Verify buttons; other ExComm see the queue read-only.

### M10 Members, positions, profile
Scope: S-11, S-12, S-13, R-12, R-16.
Tasks: members table with add/edit/deactivate/remove and warnings; profile page; positions grid, assign/replace/remove, next President, transfer with explicit confirm; N-11.
Done when: exactly one President invariant is enforced in tests; removing a member releases future slots with a warning.

### M11 Voting
Scope: S-14, S-15, R-13.
Tasks: start vote (President), ballot form with confirm, turnout while open, results after close, deadline close via clock, tasks T-05, N-12, N-13.
Done when: component test proves no per-option counts render while open and ballots contain no member ID; walkthrough steps 6 and 7 work.

### M12 Audit, export, settings, polish
Scope: S-16, S-17, S-18, remaining states.
Tasks: audit table with filters and before/after; CSV export in the browser from mock data (roles, meeting history, progress); settings page with locked notification toggles; sweep every screen for loading/empty/error states, phone layout and keyboard access; fill README with run instructions and the demo walkthrough.
Done when: the full acceptance walkthrough (mock-data.md section 9) passes end to end; `npm run build`, lint, typecheck and tests pass.

### M13 Deploy the demo (you)
Push to GitHub, import into Vercel, set `NEXT_PUBLIC_DATA_MODE=mock`, `NEXT_PUBLIC_DEMO_MODE=true`, `NEXT_PUBLIC_MOCK_NOW`. **Keep the URL private** (Vercel deployment protection or an unlisted preview) because employee-ID sign-in gives anyone who knows an ID access, including the President demo account. Mock data only.

---

## 3. Phase 2 (after the frontend is accepted)

| Step | Work | Notes |
| --- | --- | --- |
| B1 | Choose database host; create schema with Drizzle from `schema.md`; migrations | Decision D-05 |
| B2 | Implement API adapter and route handlers per `schema.md` section 9 with Zod and `can()` | The UI stays unchanged |
| B3 | Production seed: settings, positions, catalogs, first President (flow.md section 9) | Different from the mock seed |
| B4 | File storage for agenda and proof files (private bucket, signed URLs) | R-14 |
| B5 | Live updates (SSE or realtime, polling fallback) for notifications and role board | architecture.md section 6 |
| B6 | Cron tick with all jobs (architecture.md section 7); check plan limits | D-06 |
| B7 | Switch `NEXT_PUBLIC_DATA_MODE=api`; run the same acceptance walkthrough against the real backend; add Playwright smoke tests | |
| B8 | **Real authentication last**: replace `src/lib/auth` internals (Auth.js or Supabase Auth, or corporate SSO); remove employee-ID-only sign-in; add rate limiting | FR-01 |
| B9 | Teams notifications (FR-41), V1.5 items from the original spec | Later |

---

## 4. Prompt templates for Claude Code

Start of each milestone:
> "Work on milestone M<n> from docs/implementation_plan.md. Re-read the docs it references. List the files you will create or change before coding. Do not touch anything outside this milestone. When finished, run lint, typecheck and tests, then report: built, not tested, doc gaps."

When something looks wrong:
> "Before fixing, tell me which doc says this should behave differently and quote the line. If the docs are silent, propose a default and wait."

Before merging a milestone:
> "Review your own changes against rules.md Part B and the milestone's 'Done when'. List any place you invented behaviour that is not in the docs."

---

## 5. Risks to watch

| Risk | Mitigation |
| --- | --- |
| Claude Code invents features or fields | CLAUDE.md hard rules, milestone-by-milestone review, "which doc says so" prompt |
| Stitch markup leaks into the codebase | Exports are reference only (rules.md B7) |
| Mock and API behaviour drift | Shared domain rules, shared service interface tests run against both adapters in Phase 2 |
| Public demo exposes admin access | D-09; keep URL protected |
| Timer and eligibility rules subtly wrong | Unit tests written first from rules.md examples |
| Cron limits on the hosting plan | Decide the scheduler before B6 |
