# Club Hub: instructions for Claude Code

Read these before writing code, in this order: prd-toast.md, flow.md, schema.md, design.md, architecture.md, rules.md, mock-data.md, implementation_plan-toast.md.

## What we are building
A Toastmasters club management web app (desktop-first, responsive). Phase 1 is a frontend with mock data behind service interfaces. Backend and real authentication come later, without changing the UI.

## Hard rules
- Build only what the docs describe. If something is missing or ambiguous, ask before coding. Do not invent screens, fields, roles or libraries.
- Work through implementation_plan-toast.md one milestone at a time. Stop after each milestone and summarise what changed, what is untested, and any doc gaps.
- Names of screens (S-xx), tasks (T-xx), notifications (N-xx) and rules (R-xx) must match the docs exactly and appear in commit messages.
- UI code talks only to hooks and service interfaces. Never import from src/lib/adapters in components.
- All permission checks go through can(). Business rules live in src/lib/domain/rules and have unit tests.
- Time comes from now() (mock clock). Display in IST.
- Use design tokens from design.md. Stitch exports in design/stitch-exports are reference only.
- Every data view has loading, empty, error and normal states.
- Secret-ballot voting: never store or read a member ID on a ballot.
- TypeScript strict, Zod for validation, no any.

## Commands
npm run dev, npm run build, npm run lint, npm run typecheck, npm test

## When unsure
Ask one short question, offering your best default. Record accepted defaults in decisions.md.

@AGENTS.md
