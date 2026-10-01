# S-02 — Home (ExComm / President view)

**Route:** `/home` · **Purpose:** same dashboard as `S-02-home-member.md` with extra officer
widgets layered in (FR-28, FR-29). **Who sees it:** ExComm positions (VPE, VPM, VPPR, Secretary,
Treasurer, SAA) and the President. **President sees 2 extra cards not shown to plain ExComm** —
called out below, do not give ExComm the Positions summary card or the "Start vote"/"Manage
positions" quick actions.

## Layout
Same two-column shell as the member view, with these ExComm-only cards added into the main
column, and a Positions-summary card added to the side column for President only.

## Exact content
Use **Priya Raman (IL1002), VPE** as the base officer frame, greeting "Good evening, Priya".
Includes every card from `S-02-home-member.md` (next meeting, my tasks, open roles I can take, my
upcoming roles, my progress) **plus**:
- **Next-meeting status card:** "9 of 12 roles filled" progress bar for the 2 Oct meeting, buttons
  "Assign role" and "Finalize".
- **Pending approvals card:** "1 late withdrawal request" (Nisha Pillai, Evaluator 1, reason
  "Client call at 4 PM") with Approve/Reject buttons; because this frame is the VPE, also show
  "1 pending level verification" (Ananya Das, Level 3) — this row is VPE-only, other ExComm
  positions see the withdrawal row only.
- **Quick actions card:** "Create meeting", "Add member", "Templates".
- **Votes needing me card:** "1 open vote — Approve club anniversary budget, turnout 4 of 7",
  button "Cast vote".
- **President-only additions (annotate as a separate labelled variant, persona Arjun Mehta,
  IL1001, President):** a "Positions summary" card in the side column — "7 of 7 positions filled",
  "Next President: not set" with a "Set next President" link; and two extra quick-action buttons,
  "Manage positions" and "Start vote", alongside the ExComm quick actions.

## Interactions and states
Same 4-state rule as the member view, applied per card independently. Additional state: the
level-verification row in Pending approvals only renders for the VPE position — for other ExComm
positions that row is simply absent (not disabled, not shown greyed out).

## Components used
Same as `S-02-home-member.md` plus: ProgressBar (roles filled), ConfirmDialog (approve/reject),
QuickActionButton, VoteCard.

## Check result
- [ ] Positions summary card and "Manage positions"/"Start vote" actions appear ONLY in the
      President variant, never for plain ExComm.
- [ ] Level-verification row in Pending approvals appears only for the VPE persona.
- [ ] Sidebar shows the "Manage" group (Club progress, Members, Votes, Audit log, Export) in
      addition to "My club"; President frame also shows "Admin" (Positions).
- [ ] "9 of 12 roles filled" bar and Assign role/Finalize buttons are visible and match the 2 Oct
      seeded meeting.
- [ ] Nothing here duplicates or contradicts the member-only cards from `S-02-home-member.md`.

---

## Paste-ready Stitch prompt

```
Context: Club Hub, a Toastmasters club web app. This is the Home dashboard for a club officer
(VPE persona "Priya Raman"), an extended version of the member dashboard with extra management
cards and the "Manage" sidebar group.

Design the same two-column home dashboard as the member version, but with left sidebar now also
showing a "Manage" group (Club progress, Members, Votes, Audit log, Export) below "My club".
Greeting "Good evening, Priya". Keep the next-meeting card, open-roles card and my-progress card
from the member layout. Add: a "Next meeting status" card with a horizontal progress bar reading
"9 of 12 roles filled" and two outline buttons "Assign role" and "Finalize"; a "Pending approvals"
card with two rows — a late withdrawal request (Nisha Pillai, Evaluator 1, "Client call at 4 PM",
Approve/Reject buttons) and a pending level verification (Ananya Das, Level 3, Verify/Reject
buttons); a "Quick actions" card with three outline buttons "Create meeting", "Add member",
"Templates"; a "Votes needing me" card showing one open vote "Approve club anniversary budget",
turnout "4 of 7 voted", button "Cast vote". Use the same card style (white surface, thin border,
8px radius) as the rest of the app. Also produce a second frame for the President (persona "Arjun
Mehta"): same layout plus a "Positions summary" card ("7 of 7 filled", link "Set next President")
and two extra quick-action buttons "Manage positions" and "Start vote".
```
