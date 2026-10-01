# S-04 — Meeting detail: Reports tab

**Route:** `/meetings/[id]?tab=reports` · **Purpose:** submission forms for report roles (Timer,
Ah-Counter, Grammarian, Table Topics, General Evaluator), and the consolidated report once the
meeting is Completed (FR-24 to FR-27, R-04). **Who sees it:** everyone; forms are editable only by
the assigned holder, before Completed.

This tab has **three distinct states depending on meeting lifecycle** — build all three as
separate frames, all sharing the same header/stepper/tab-bar.

## State A — before the meeting ends (`mtg-2026-10-02`, Open, 2 Oct hasn't happened yet)
Single centred message card: "Reports open after the meeting ends." No forms.

## State B — after end, before Completed (`mtg-2026-09-25`, Finalized, ended, reports partially in)
Exact seeded data: Timer (Aditya Kulkarni) — **Not started**; Ah-Counter (Rahul Verma) —
**Submitted**; Grammarian (Sneha Iyer) — **Draft**; Table Topics Master (Suresh Babu) — summary
**Submitted**; General Evaluator (Karthik Subramanian) — **Not started**.
- Each report role shows as its own card with a status pill (Not started / Draft / Submitted) and
  an action button ("Start report" / "Continue draft" / "View" for submitted-and-not-yours).
- **Timer form** (open this one expanded as the example): one row per speaker slot — Speaker A
  (limit 5:00–7:00) time input `mm:ss`, live coloured card pill computed as the value changes, and
  a read-only helper line "Green from 5:00, yellow from 6:00, red from 7:00. Qualifies from 4:30 to
  7:30." Card pill always shows the word (Green/Yellow/Red/DQ) next to the colour swatch, never
  colour alone.
- Draft/Submit buttons at the bottom of each form; ExComm sees who has and hasn't submitted in an
  "Outstanding reports" summary line at the top of the tab.

## State C — Completed, consolidated report (`mtg-2026-09-18`, all reports in)
Read-only consolidated report visible to everyone:
- **Timer table:** 4 speaker rows with coloured card pills and time — one each of Green (5:20 vs
  5:00–7:00), Yellow (6:10), Red (7:05, within grace), Disqualified (7:45, over max+30s, labelled
  "DQ").
- **Ah-Counter:** total 31 filler words, breakdown "um" 14, "so" 9, "like" 5, other 3, shown as a
  small bar or table.
- **Grammarian:** word of the day used 6 times by 4 people; good language: "Nailed it", "Wearing
  many hats", "Turn the page"; improvements: "Avoid 'basically' as a filler", "Use 'fewer' with
  countable nouns".
- **Table Topics / General Evaluator:** short text summaries.
- Note: one evaluator on this historical meeting was the now-**removed** member `IL1099 Old
  Member` — show their name plainly in the report (removed members' names still appear on past
  reports, per FR-03).

## Interactions and states
Loading: skeleton report cards. Empty: N/A within State B/C (always has role rows); State A itself
is the "not yet" empty state. Error: inline retry replacing the tab content. Reports remain
editable by their author until the meeting is marked Completed, then the whole tab locks read-only.

## Components used
TimerForm, AhCounterForm, GrammarianForm, SummaryForm, ConsolidatedReport, StatusBadge (report
status pill), Button (Start/Continue/Submit), Banner (outstanding reports summary for ExComm).

## Check result
- [ ] All three states (before end / after end-not-completed / Completed-consolidated) are shown
      as separate frames sharing the same header and tabs.
- [ ] Timer card pills always print the word (Green/Yellow/Red/DQ), never rely on colour alone.
- [ ] The removed member's name still appears correctly in the Completed consolidated report.
- [ ] "Not started" vs "Draft" vs "Submitted" pills are visually distinct, not just differently coloured text.
- [ ] Outstanding-reports summary line is visible only to ExComm/President in State B.

---

## Paste-ready Stitch prompt

```
Context: Club Hub, a Toastmasters club web app. This is the Reports tab of the Meeting detail
screen, reusing the same header/stepper/tab-bar. Produce THREE frames for three different
meetings/states.

Frame 1 (meeting not yet ended): a centred card, muted icon, text "Reports open after the meeting
ends." Frame 2 (meeting ended, Finalized, reports coming in — "25 Sep Regular Meeting"): a row of
5 small cards, one per report role, each with the role name, holder name, and a status pill —
"Not started" (grey), "Draft" (amber), "Submitted" (green) — and an action button matching the
status; below that an expanded Timer report form: a table with speaker name, allowed time "5:00 to
7:00", an mm:ss time input, and a live coloured pill (green/yellow/red/DQ) with the word printed
next to the colour, plus a muted helper line "Green from 5:00, yellow from 6:00, red from 7:00.
Qualifies from 4:30 to 7:30." and a primary "Submit report" button. Frame 3 (Completed meeting,
consolidated, read-only, "18 Sep Regular Meeting"): a Timer results table with 4 rows showing
green/yellow/red/DQ pills with words, an Ah-Counter summary card "Total filler words: 31" with a
small breakdown list (um 14, so 9, like 5, other 3), and a Grammarian card listing 3 good-language
phrases and 2 improvement notes as bullet lists.
```
