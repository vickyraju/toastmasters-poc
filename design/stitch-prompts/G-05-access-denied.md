# G-05 — Access denied

**Purpose:** shown whenever a signed-in user opens a route they cannot use; the attempt is logged.
**Who sees it:** anyone hitting a route above their permission level (e.g. a Member opening
`/audit`, `/positions`, `/members`, `/progress/club`, `/votes`, `/export`).

## Layout
Centred message, no sidebar/top-bar chrome needed beyond the standard shell (the user is still
signed in, just blocked from this one route) — keep the top bar so Sign out remains reachable, but
the main content area is just the centred block.

## Exact content
Lock icon, heading "You do not have access to this page.", one button "Back to Home".

## Interactions and states
Single static state — no loading/empty/error variants apply here, this screen IS the state. Button
navigates to `/home`.

## Components used
Icon (lock), Heading, Button (primary, "Back to Home").

## Check result
- [ ] Message is exactly "You do not have access to this page." (no route/permission internals leaked).
- [ ] Top bar (bell, avatar menu, sign out) remains present — the user is signed in, just blocked here.
- [ ] Single primary action only ("Back to Home"), no secondary "Request access" or similar invented control.
- [ ] Centred content works cleanly at both 1440px and 390px.
- [ ] Lock icon uses a neutral/muted colour, not danger-red (this is a boundary, not an error).

---

## Paste-ready Stitch prompt

```
Context: Club Hub, a Toastmasters club web app. This is the Access denied screen, shown when a
signed-in Member opens an officer-only route like /audit.

Design a centred content block within the standard app shell (top bar with bell and avatar menu
still visible, sidebar still visible showing only the Member's allowed items). In the main content
area: a large muted lock icon, heading text "You do not have access to this page." at 24px below
it, and a single primary button "Back to Home" centred underneath. Keep the rest of the page
calm and empty — plenty of white space, no illustrations, no secondary actions.
```
