# S-13 — Positions

**Route:** `/positions` · **Purpose:** assign/replace ExComm positions and name the next President
(FR-04, R-12). **Who sees it:** President only — anyone else opening this URL gets `G-05`.

## Layout
Grid of 7 position cards (President + 6 ExComm positions), each with the current holder and a
"Change" button. A separate "Next President" card sits below or beside the grid.

## Exact content
All 7 positions filled per the seed:
| Position | Holder |
| --- | --- |
| President | Arjun Mehta |
| VPE | Priya Raman |
| VPM | Karthik Subramanian |
| VPPR | Divya Krishnan |
| Secretary | Rahul Verma |
| Treasurer | Sneha Iyer |
| SAA | Vikram Rao |
"Next President" card: currently unset — shows "Not set" with a "Set next President" button
opening a member picker.
"Change" on any card opens a member-picker dialog, then a confirm dialog: "Replace VPE? Karthik
Subramanian will become a plain Member." (pattern repeats per position, substituting the name).

## Interactions and states
- **Loading:** skeleton cards. **Empty:** not applicable to the 7 fixed position cards (always
  render, "Vacant" state used instead — see below); Next President card's real empty state is
  "Not set".
- **Vacant position (design the pattern even though the seed has none vacant):** card shows
  "Vacant" instead of a holder name/avatar, with an "Assign" button instead of "Change".
- **Error:** inline retry card.
- Transfer-presidency flow (separate from "Next President"): a distinct, more strongly-worded
  confirm dialog on the President card itself: "Transfer now? You will become a plain Member and
  [name] will become President immediately. This cannot be undone from here." — this is the
  higher-stakes action per R-12, keep it visually distinct (danger-toned) from a routine "Change" swap.

## Components used
PositionCard (avatar, name, "Change"/"Assign" button), MemberPickerDialog, ConfirmDialog (routine
change), ConfirmDialog (danger-toned, presidency transfer), StatusBadge/PositionBadge, EmptyState
(Vacant), ErrorState.

## Check result
- [ ] Grid shows exactly 7 cards (President + 6 positions), matching the seed one-to-one.
- [ ] "Next President" card is visually separate from the 7-card grid, not mistaken for an 8th position.
- [ ] Presidency-transfer confirm dialog is visually distinct (danger tone) from a routine position-change confirm.
- [ ] "Vacant" card pattern (Assign button, no holder) is designed even though not present in the current seed.
- [ ] This screen renders G-05 for anyone other than the President — annotate that this frame is President-only.

---

## Paste-ready Stitch prompt

```
Context: Club Hub, a Toastmasters club web app. This is the Positions screen, visible only to the
President, persona "Arjun Mehta".

Design a grid of 7 cards (2-3 per row on desktop), one per position: President (Arjun Mehta,
maroon "President" pill), VPE (Priya Raman), VPM (Karthik Subramanian), VPPR (Divya Krishnan),
Secretary (Rahul Verma), Treasurer (Sneha Iyer), SAA (Vikram Rao) — each card has an avatar,
holder name, position label, and an outline "Change" button. Below the grid, a distinct card
titled "Next President" with muted text "Not set" and a primary button "Set next President".
Show two dialogs as separate frames: (1) a routine confirm dialog for changing the VPE — title
"Replace VPE?", body "Karthik Subramanian will become a plain Member.", Cancel/Confirm buttons;
(2) a danger-toned confirm dialog for the presidency itself — red-tinted header bar, title
"Transfer the presidency?", body "You will become a plain Member and Priya Raman will become
President immediately. This cannot be undone from here.", Cancel (outline) and "Transfer now"
(filled red) buttons.
```
