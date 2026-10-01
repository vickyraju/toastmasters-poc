## Project: Toastmasters Club Hub (working title) — planning-stage POC

Currently **docs-only**: no code, no package.json, nothing scaffolded yet. Repo root has 8 markdown
spec files only (`prd-toast.md`, `flow.md`, `architecture.md`, `design.md`, `schema.md`, `rules.md`,
`implementation_plan-toast.md`, `mock-data.md`). Future code goes under `src/` per the layout in
`mem:tech_stack`. Do not assume any app code exists — check before referencing files.

Web app for a corporate Toastmasters club: meeting scheduling, role signup board, role reports
(Timer/Ah-Counter/Grammarian), Pathways progress tracking, ExComm voting. One club, 20-60 members.

## Doc precedence (when docs disagree)
`prd-toast.md` (what) > `flow.md` (behaviour) > `schema.md` (data/API) > `design.md` (look) >
`architecture.md` (structure) > `rules.md` (implementation details). If a doc is silent: **ask, do
not invent** — this is a hard project rule, not a suggestion.

## Cross-doc ID system (never rename/reinvent these)
- `S-xx` = screen (defined in `flow.md` §2, reused by `design.md`/`architecture.md`)
- `G-xx` = global UI element (nav, bell, toast, sign-out, access-denied)
- `J-xx` = user journey (`flow.md` §5)
- `T-xx` = system-generated task type (`flow.md` §6)
- `N-xx` = notification trigger (`flow.md` §7)
- `R-xx` = business rule, implemented as pure fn in `src/lib/domain/rules/` (`rules.md` Part A)
- `FR-xx` = functional requirement (`prd-toast.md`)
- `D-xx` = architecture decision log entry (`architecture.md` §12)
- `A#` = flow.md assumption needing confirmation (`flow.md` §10)
Commit messages must reference these IDs, e.g. `feat(S-04): role board claim and withdraw`.

## Build approach (decided, see architecture.md D-01/D-02)
Frontend-first against **mock data** behind service interfaces; backend + real auth come later
with zero UI changes. UI designed in Google Stitch, built by Claude Code. See `mem:tech_stack` for
stack/layers, `mem:conventions` for coding rules, `mem:task_completion` for definition of done.

## Domain specifics worth knowing before touching business logic
See `mem:domain/business_rules` for the non-obvious rule set (R-01..R-18: permissions, one-main-role,
evaluator eligibility, timer card colours, withdrawal cutoff, swaps, meeting lifecycle, secret voting,
etc.) and `mem:domain/data_model` for schema/naming conventions and API error codes.

## Security note (do not lose this)
MVP sign-in is employee-ID-only, no password — anyone who knows an ID can act as that person,
**including the President** (admin). Real auth is explicitly the *last* build item (FR-01). Until
then: never put real member data on a public Vercel URL; mock data only, or use deployment
protection (architecture.md §5, D-09).

Run `serena memories check` from the project root to sanity-check memory references.
