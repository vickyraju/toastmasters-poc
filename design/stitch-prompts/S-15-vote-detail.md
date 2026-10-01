# S-15 — Vote detail

**Route:** `/votes/[id]` · **Purpose:** cast a ballot, see turnout while open, see results after
close (FR-44, R-13). **Who sees it:** ExComm, President (eligible voters only). **Hard rule: never
show per-option results while the vote is open, to anyone, including the President.**

## Layout
Centred card: title, description, options as radio cards, primary "Cast vote" button. While open:
a turnout bar below the options instead of results. After close: result bars with counts replace
the turnout bar, options become read-only (no radios).

## Exact content — Open vote (`vote-001`)
Title "Approve club anniversary budget", description (one short paragraph about the budget ask),
3 options as radio cards: Yes, No, Abstain. Turnout bar: "4 of 7 voted" with a filled progress
bar — no names, no per-option split. Persona **Divya Krishnan**, who has **not yet voted** — shows
the active ballot form + a confirm dialog on submit: "Cast your vote? Votes are final and secret."

## Exact content — Closed vote (`vote-000`)
Title "Move meetings to 5 PM?", status Closed 12 Sep 2026. Result bars: Yes 4, No 2, Abstain 1 —
shown as horizontal bars with counts and percentages, no voter names anywhere.

## Interactions and states
- **Loading:** skeleton card. **Error:** inline retry card.
- **Already voted (open vote, different persona, e.g. Arjun who already cast):** options become
  read-only, a small note "You voted. Results are hidden until the vote closes." replaces the
  ballot form, turnout bar still shows.
- **Cast confirm dialog:** exact wording "Votes are final and secret." must appear.
- **President-only "Close vote" button** appears on the open-vote frame in addition to voting, with
  its own confirm: "Close this vote now? Results become visible to eligible voters immediately."

## Components used
VoteForm/Ballot (radio cards), TurnoutBar, ResultPanel (bars + counts, closed only), ConfirmDialog
(cast, close), Button ("Cast vote", "Close vote" President-only), Badge (Open/Closed).

## Check result
- [ ] Open-vote frame shows ZERO result numbers or bars anywhere — turnout count only.
- [ ] "Votes are final and secret" text appears verbatim in the cast-confirmation dialog.
- [ ] Closed-vote frame shows counts AND percentages, no voter names anywhere on the page.
- [ ] "Already voted" state replaces the ballot form with a note, not just disabling the radios silently.
- [ ] "Close vote" button appears only for the President, only on an open vote.

---

## Paste-ready Stitch prompt

```
Context: Club Hub, a Toastmasters club web app. This is the Vote detail screen. Produce TWO
frames: one for an open vote (persona "Divya Krishnan", has not voted), one for a closed vote.

Frame 1 (open): centred card, max 560px wide. Title "Approve club anniversary budget", a short
description paragraph, three radio-card options stacked vertically — "Yes", "No", "Abstain" —
each a bordered card with a radio button, selectable with a primary-blue highlight when chosen.
Below the options, a horizontal progress bar labelled "4 of 7 voted" — no numbers or bars for
individual options anywhere on this frame. Primary button "Cast vote" full width below the bar.
Show the cast-confirmation dialog open alongside: title "Cast your vote?", body text "Votes are
final and secret.", Cancel/Confirm buttons. Frame 2 (closed): same card shape, title "Move
meetings to 5 PM?", a grey "Closed" badge and "Closed 12 Sep 2026" muted subtext, then three
horizontal result bars with labels and counts — "Yes — 4 (57%)", "No — 2 (29%)", "Abstain — 1
(14%)" — bars filled proportionally in primary blue, no voter names shown anywhere.
```
