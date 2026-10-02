# Club Hub

A Toastmasters club management web app: meetings and role signup, reports, Pathways progress, members,
positions, voting, audit and CSV export.

**Phase 1 is a frontend with mock data** behind service interfaces. There is no backend yet, and sign-in
is by employee ID only. **Do not put real member data on a public URL** until real authentication exists
(decision D-09, `architecture.md` section 5). Every person, ID and email in the demo is fictional.

## Run it

Needs Node 20.9 or newer (developed on Node 24).

```bash
npm install
cp .env.example .env.local      # then fill in the demo values below
npm run dev                     # http://localhost:3000
```

Demo values for `.env.local` (names and meanings are in `.env.example` and `architecture.md` section 9):

```
NEXT_PUBLIC_DATA_MODE=mock
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_MOCK_NOW=2026-10-01T18:00:00+05:30
NEXT_PUBLIC_CLUB_NAME=Inception Labs Toastmasters (demo)
```

`NEXT_PUBLIC_DEMO_MODE=true` shows the **Demo accounts** list on the sign-in page, the Demo ribbon, and the
hidden `/dev` panel. Turn it off for anything public.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app |
| `npm run build` | Production build |
| `npm run lint` | ESLint, including accessibility rules |
| `npm run typecheck` | TypeScript, strict |
| `npm test` | All tests (Vitest) |

## The mock clock and your data

The app clock starts at **Thu 1 Oct 2026, 6:00 PM IST** and then runs in real time. All times are stored in
UTC and shown in IST.

Data lives in your browser (`localStorage`, key `clubhub.mock.v1`) and survives reloads. **Reset it** from
the `/dev` panel ("Reset data"), or clear the key. `/dev` also jumps the clock (+1 hour, +1 day, next
meeting start or end), simulates service errors, sends a test notification and generates recurring meetings.
It is reachable only by typing the URL, and only in demo mode.

## Sign in

Use any ID from the Demo accounts list. The ones the walkthrough uses:

| ID | Person | Why |
| --- | --- | --- |
| IL1001 | Arjun Mehta | President |
| IL1002 | Priya Raman | VPE (verifies levels) |
| IL1003 | Karthik Subramanian | VPM (ExComm) |
| IL1004 | Divya Krishnan | VPPR, has not voted yet |
| IL1009 | Mohammed Faisal | Member, Speaker 1 on 2 Oct |
| IL1010 | Lakshmi Narayanan | Member, Speaker 2 |
| IL1012 | Meera Joshi | Member, Speaker 3 with no title yet |
| IL1013 | Aditya Kulkarni | Member with a swap to answer |

Unknown, inactive (IL1015) and removed (IL1099) IDs all get the same message: "We could not find that
employee ID."

## Demo walkthrough

This is `mock-data.md` section 9, and it is also an automated test
(`src/lib/adapters/mock/walkthrough.test.ts`). Start from a freshly reset demo.

1. **IL1013**: Home shows two tasks, the 2 Oct meeting with "Your role: Ah-Counter" and a bell badge of 3.
   Open the meeting's Roles tab and accept Vikram's swap. Both roles change.
2. **IL1012**: open the task "Add speech project and title", fill it in. The task goes.
3. **IL1010**: on 2 Oct, Evaluator 2 is her own speech: the button is disabled and says why.
4. **IL1009**: Evaluator 3 needs level 3 (blocked). Evaluator 2 is refused because he already holds Speaker 1
   (one main role per meeting). A level-2 member with no main role, such as **IL1005**, can take it.
5. **IL1002**: Home, Pending approvals: verify Ananya's Level 3 (she becomes level 4) and approve Nisha's
   withdrawal (the slot opens).
6. **IL1004**: Votes, open the budget vote, choose an option and confirm. Turnout becomes 5 of 7 and no
   results are shown.
7. **IL1001**: close the vote (results appear), open Positions, name the next President.
8. **IL1003**: on 25 Sep choose Mark completed and read the list of missing reports; add a member; cancel
   the 16 Oct draft.
9. `/dev`: jump to the next meeting's end. 2 Oct's role holders get report tasks and notifications.
10. As any Member, open `/audit`: "You do not have access to this page".

## How it is built

- Next.js (App Router), React, TypeScript strict, Tailwind with the design tokens in
  `src/styles/tokens.css`, shadcn/ui on Radix, TanStack Query, react-hook-form with Zod, date-fns-tz.
- **Layers:** components, then hooks (`src/hooks`), then service interfaces (`src/lib/services`), then the
  mock adapter (`src/lib/adapters/mock`). Components never import an adapter, so a real API adapter can
  replace the mock later without touching the UI.
- **Rules are pure functions** in `src/lib/domain/rules` with tests; **permissions** are one function,
  `can()` in `src/lib/permissions/can.ts`, used by every service and by the UI.
- **Time** comes from `now()` (`src/lib/time`); no feature reads the system clock.
- **Secret ballots:** a ballot stores only the vote and the option, never a member. Results are hidden until
  the vote closes, for everyone including the President.

## Where decisions live

- The docs at the repo root (`prd-toast.md`, `flow.md`, `schema.md`, `design.md`, `architecture.md`,
  `rules.md`, `mock-data.md`, `implementation_plan-toast.md`). If two disagree, the order in `rules.md` wins.
- **`decisions.md`** records every call made where the docs were silent or in conflict, with what it costs if
  wrong. Read it before changing behaviour.
- `design/stitch-prompts/` and `design/` hold earlier design-prompt work; they are reference only.

## Not built yet

- The backend, real authentication and file storage (Phase 2, `implementation_plan-toast.md` section 3).
- CSV import of members (`flow.md` J-10), club-level settings screen, Teams notifications.
- Uploaded files (agendas, proofs) exist only for the browser session in mock mode.
