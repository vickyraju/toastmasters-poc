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
