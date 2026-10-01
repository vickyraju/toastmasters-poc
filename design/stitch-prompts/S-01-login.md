# S-01 — Login

**Route:** `/login` · **Purpose:** the only entry point to the app; MVP sign-in is employee ID
only, no password (FR-01). **Who sees it:** signed-out visitors only.

## Layout
Single centred card (400px wide) on a tinted background. No sidebar, no top bar, no nav — this
screen exists outside the app shell entirely.

## Exact content
- Club logo placeholder (text mark "Club Hub") and title.
- One text field, label "Employee ID", helper text "Use the ID on your company badge".
- Primary button "Continue".
- Footer line, small and muted: "Trouble signing in? Contact your club VPE".
- Example valid IDs to reference for realism (do not print them on the real login form — these
  are just for Stitch's placeholder/demo state): IL1001 Arjun Mehta (President), IL1002 Priya
  Raman (VPE), IL1008 Ananya Das (member).

## Interactions and states
- **Loading:** button shows a spinner and disables after Continue is clicked.
- **Empty/initial:** field empty, button enabled, no error shown.
- **Error — unknown ID:** inline error under the field, exact text "We could not find that
  employee ID." (Deliberately generic — must not reveal whether the ID format itself is wrong.)
- **Error — inactive/removed account:** inline error "This account is not active. Contact your
  VPE."
- **Error — empty submit:** inline error "Enter your employee ID."
- No role-specific variants — this screen is identical for everyone since no one is signed in yet.

## Components used
Card, Input, Button (primary, with loading state), inline form error text.

## Check result
- [ ] No password field anywhere on the screen.
- [ ] Error text is generic and doesn't hint whether the ID exists.
- [ ] Helper text and footer line are both present and legible (contrast 4.5:1+).
- [ ] Card is centred and works at both 1440px and 390px without horizontal scroll.
- [ ] Focus ring visible on the input and the button.

---

## Paste-ready Stitch prompt

```
Context: Club Hub, a Toastmasters club web app. This is the sign-in screen — the only entry point,
shown to signed-out users. MVP sign-in is a single employee ID field, no password.

Design a login screen: centred card, 400px wide, on a light blue-grey tinted background
(#F7F9FB). No sidebar or top bar. Inside the card: a small text-mark logo "Club Hub" at the top,
then the page title "Sign in". One text field labelled "Employee ID" with helper text below it,
"Use the ID on your company badge", input border in #758195, 8px radius. Primary button below the
field, full width, label "Continue", filled #004165 with white text, 8px radius. Below the button
a small muted footer line: "Trouble signing in? Contact your club VPE." Show three states as
separate frames: (1) normal/empty, (2) loading — button has a spinner and is disabled, (3) error —
a red inline message under the field reading "We could not find that employee ID." with a small
warning icon, input border turns to the danger colour. Typography: Inter, 24px title, 16px input
text, 14px helper and footer text. No illustrations, no password field anywhere.
```
