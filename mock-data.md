# mock-data.md: Seed Data and Mock Clock for the Frontend-First Build

Status: Draft v1. All people, IDs and emails are **fictional**. Project names and titles are illustrative and must be replaced with real Pathways data later. Pathways timings are **not verified**: the VPE must check them before real use.

Purpose: the UI must look "alive" and every state in `flow.md` must be reachable without a backend. Claude Code builds `src/lib/adapters/mock/seed.ts` from this file. Entities and field names follow `schema.md`.

---

## 1. Mock clock

| Setting | Value |
| --- | --- |
| `NEXT_PUBLIC_MOCK_NOW` | `2026-10-01T18:00:00+05:30` (Thursday 1 Oct 2026, 6:00 PM IST) |
| Behaviour | Clock starts at this instant when the app loads and advances in real time. A hidden dev panel (`/dev`, only when `NEXT_PUBLIC_DEMO_MODE=true`) lets you jump: +1 hour, +1 day, next meeting start, next meeting end, reset data |
| Why this instant | The 2 Oct meeting is 22 hours away, so it is **inside the 24 h withdrawal cutoff**; the 25 Sep meeting has ended but is not yet marked Completed, so **report tasks are due**; roles are unfilled 48 h out, so **ExComm alerts exist** |

All code reads time from `now()` in `src/lib/time`, never `new Date()` directly.

Persistence: the mock store is a Zustand store persisted to `localStorage` under key `clubhub.mock.v1`. The dev panel "Reset data" reloads the seed. Bump the key suffix when the seed shape changes.

---

## 2. ID scheme

Readable fixed IDs in the seed: members `mem-1001`, meetings `mtg-2026-10-02`, slots `mtg-2026-10-02:tmod`, `...:speaker-1`, votes `vote-001`, completions `cmp-001`. In API mode real UUIDs are used; the UI must treat IDs as opaque strings.

---

## 3. Members (15) and sign-in personas

Sign in with the employee ID only. Emails use `example.com`.

| Employee ID | Name | Position | Account type | Pathway | Level | Status | Use this persona to test |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IL1001 | Arjun Mehta | President | president | Dynamic Leadership | 4 | active | Positions (S-13), start vote, everything ExComm can do |
| IL1002 | Priya Raman | VPE | excomm | Presentation Mastery | 5 | active | Level verification queue (T-03), approve withdrawal (T-02) |
| IL1003 | Karthik Subramanian | VPM | excomm | Leadership Development | 3 | active | Members admin (S-11), add member |
| IL1004 | Divya Krishnan | VPPR | excomm | Engaging Humor | 3 | active | Table Topics Master on 2 Oct, open vote to cast (T-05) |
| IL1005 | Rahul Verma | Secretary | excomm | Effective Coaching | 2 | active | Open vote to cast (T-05), audit log |
| IL1006 | Sneha Iyer | Treasurer | excomm | Motivational Strategies | 4 | active | Already voted; export CSV |
| IL1007 | Vikram Rao | SAA | excomm | Persuasive Influence | 2 | active | Timer on 2 Oct with a pending swap request he made |
| IL1008 | Ananya Das | none | member | Presentation Mastery | 3 | active | TMOD on 2 Oct (theme editing), level completion pending |
| IL1009 | Mohammed Faisal | none | member | Dynamic Leadership | 2 | active | Speaker 1 on 2 Oct |
| IL1010 | Lakshmi Narayanan | none | member | Presentation Mastery | 1 | active | Speaker 2 on 2 Oct; new member, sparse data |
| IL1011 | Suresh Babu | none | member | Strategic Relationships | 4 | active | General Evaluator on 2 Oct |
| IL1012 | Meera Joshi | none | member | Innovative Planning | 2 | active | Speaker 3 with missing title (T-06) |
| IL1013 | Aditya Kulkarni | none | member | Visionary Communication | 1 | active | Unsubmitted Timer report (T-01), swap to answer (T-04) |
| IL1014 | Nisha Pillai | none | member | Team Collaboration | 3 | active | Evaluator 1 with a pending late withdrawal |
| IL1015 | Ganesh Kumar | none | member | Persuasive Influence | 2 | inactive | Appears in "Inactive 60+ days" filter; sign-in should say the account is inactive |

Also seed one **removed** member `IL1099 Old Member` (status removed) to prove sign-in is blocked and history is kept (shows on the 18 Sep report as a past speaker).

`last_active_at`: everyone within the last 3 weeks except Ganesh (about 100 days ago).

Sign-in failure cases to support: unknown ID ("We could not find that employee ID"), inactive/removed ("This account is not active. Contact your VPE"), empty field.

---

## 4. Catalog seed

### 4.1 Meeting types
Regular Meeting (90 min), Speech Contest (150 min), Workshop (90 min), Joint Session (120 min).

### 4.2 Role catalog and Regular Meeting template
| Code | Name | Category | Report kind | Speaker | Evaluator | Default count |
| --- | --- | --- | --- | --- | --- | --- |
| tmod | Toastmaster of the Day | main | none | no | no | 1 |
| general_evaluator | General Evaluator | main | general_evaluator | no | no | 1 |
| table_topics_master | Table Topics Master | main | table_topics | no | no | 1 |
| speaker | Speaker | main | none | yes | no | 3 |
| evaluator | Evaluator | main | none | no | yes | 3 |
| timer | Timer | support | timer | no | no | 1 |
| ah_counter | Ah-Counter | support | ah_counter | no | no | 1 |
| grammarian | Grammarian | support | grammarian | no | no | 1 |
| hark_master | Hark Master | support | none | no | no | 0 (optional, added per meeting) |

Regular Meeting = 12 slots: TMOD, GE, TTM, Speaker x3, Evaluator x3, Timer, Ah-Counter, Grammarian. Speech Contest and Workshop have small role lists (TMOD, Timer, Ah-Counter, plus contest-specific "Chief Judge", "Contestant" as custom roles in the catalog).

Agenda outline for Regular Meeting (seed `meeting_type_agenda_items`): 4:00 Opening and TMOD intro (5), 4:05 Word of the day (3), 4:08 Prepared speeches (21), 4:30 Table Topics (15), 4:45 Evaluations (15), 5:00 Reports (10), 5:10 Close (5).

### 4.3 Recurring template
"Friday Regular Meeting": type Regular, weekday 5, start 16:00, 90 min, venue "Conference Room B, Chennai", link "https://teams.example.com/meet/club", weeks_ahead 4, skip_dates empty (so the 16 Oct and 23 Oct drafts are generated).

### 4.4 Project timings (illustrative, VERIFY with VPE)
| Pathway | Level | Project (illustrative) | Min | Max |
| --- | --- | --- | --- | --- |
| Any | 1 | Ice Breaker | 4:00 | 6:00 |
| Any | 2 | Level 2 speech (generic) | 5:00 | 7:00 |
| Any | 3 | Level 3 speech (generic) | 5:00 | 7:00 |
| Any | 4 | Level 4 speech (generic) | 5:00 | 7:00 |
| Any | 5 | Level 5 speech (generic) | 5:00 | 7:00 |
| n/a | n/a | Table Topics response | 1:00 | 2:00 |
| n/a | n/a | Evaluation | 2:00 | 3:00 |

Also one custom row "Workshop demo, 8:00 to 10:00" with `is_custom = true`.

### 4.5 Club settings
Defaults from `schema.md` 3.14: withdrawal cutoff 24 h, proof not required, repeat limit off, grace 30 s, inactive after 60 days, generate 4 weeks ahead. Club name "Toastmasters Club (demo)".

---

## 5. Meetings and role slots

All times IST.

| ID | Date | Title | Type | Status | Purpose |
| --- | --- | --- | --- | --- | --- |
| `mtg-2026-09-11` | Fri 11 Sep 4:00 PM | Regular Meeting | Regular | **Cancelled** ("Public holiday event") | Cancelled banner and audit |
| `mtg-2026-09-18` | Fri 18 Sep 4:00 PM | Regular Meeting | Regular | **Completed** | Consolidated report with every section filled |
| `mtg-2026-09-25` | Fri 25 Sep 4:00 PM | Regular Meeting | Regular | **Finalized** (ended, not yet completed) | Reports due, T-01, partially submitted |
| `mtg-2026-10-02` | Fri 2 Oct 4:00 PM | Regular Meeting | Regular | **Open** | Main demo meeting, see 5.1 |
| `mtg-2026-10-09` | Fri 9 Oct 4:00 PM | Regular Meeting | Regular | **Open** | Mostly open roles, 3 of 12 filled |
| `mtg-2026-10-16` | Fri 16 Oct 4:00 PM | Regular Meeting | Regular | **Draft** (generated) | Draft visible to ExComm only |
| `mtg-2026-10-23` | Fri 23 Oct 4:00 PM | Regular Meeting | Regular | **Draft** (generated) | |
| `mtg-2026-10-31` | Sat 31 Oct 10:00 AM | Area Speech Contest (custom) | Speech Contest | **Draft** | Custom meeting with custom roles |

Venue for all: "Conference Room B, Chennai"; link `https://teams.example.com/meet/club`. Theme examples: 18 Sep "Growth mindset", 25 Sep "Resilience", 2 Oct "New beginnings", 9 Oct none yet.

### 5.1 Main demo meeting `mtg-2026-10-02` (9 of 12 filled)
Theme "New beginnings", word of the day "Embark" (meaning "to begin a course of action"), published, welcome note present, agenda file `agenda-2026-10-02.pdf` (a placeholder PDF at `public/mock/agenda-sample.pdf`).

| Slot | Holder | Details |
| --- | --- | --- |
| TMOD | Ananya Das (IL1008) | Can edit theme (already published; edit still allowed) |
| General Evaluator | Suresh Babu (IL1011) | |
| Table Topics Master | Divya Krishnan (IL1004) | |
| Speaker 1 | Mohammed Faisal (IL1009) | Level 2; title "Lessons from a Failed Launch"; 5:00 to 7:00 |
| Speaker 2 | Lakshmi Narayanan (IL1010) | Level 1 Ice Breaker; title "My Journey to Chennai"; 4:00 to 6:00 |
| Speaker 3 | Meera Joshi (IL1012) | Level 2; **title and objectives empty** (drives T-06) |
| Evaluator 1 (for Speaker 1) | Nisha Pillai (IL1014, level 3) | Eligible (needs level >= 3). **Pending withdrawal request** (inside cutoff) |
| Evaluator 2 (for Speaker 2) | **Open** | Needs level >= 2 |
| Evaluator 3 (for Speaker 3) | **Open** | Needs level >= 3 |
| Timer | Vikram Rao (IL1007) | **Pending swap request** with Aditya's Ah-Counter role |
| Ah-Counter | Aditya Kulkarni (IL1013) | Has T-04 to answer |
| Grammarian | **Open** | |

Eligibility examples to cover in tests: Aditya (level 1) trying Evaluator 2 fails (needs 2); Mohammed (level 2) succeeds for Evaluator 2; Mohammed for Evaluator 3 fails (needs 3); Lakshmi cannot take Evaluator 2 for her own speech (conflict: evaluator cannot evaluate self, see rules.md R-03).

### 5.2 `mtg-2026-09-25` (ended, reports due)
All 12 slots filled. Timer Aditya Kulkarni: **not started** (T-01 open). Ah-Counter Rahul Verma: **submitted**. Grammarian Sneha Iyer: **draft**. Table Topics Master Suresh: summary submitted. General Evaluator Karthik: not started. Speakers: Vikram, Meera, Mohammed. This gives ExComm a realistic "waiting on reports" picture and the Reports tab all three states.

### 5.3 `mtg-2026-09-18` (Completed)
All slots filled, all reports submitted. Include one speaker at each timer card: green, yellow, red, and one disqualified (over max plus grace), plus the removed member `IL1099` as a past evaluator. Ah-counter totals with a word breakdown ("um" 6, "so" 4, "like" 3). Grammarian: three good phrases and two improvements.

### 5.4 `mtg-2026-10-09`
Filled: TMOD Sneha Iyer, Speaker 1 Divya Krishnan, Timer Rahul Verma. Everything else open. Gives the "Open roles I can take" card plenty of rows.

### 5.5 `mtg-2026-10-31` (custom contest)
Custom roles added for the day: Chief Judge, Contestant x4, Sergeant-at-Arms. None filled. Demonstrates add/delete role for a single meeting.

---

## 6. Workflow states seeded

| Item | Detail | Task or notification it drives |
| --- | --- | --- |
| Pending withdrawal | Nisha withdrawing from Evaluator 1 on 2 Oct, reason "Client call at 4 PM" | T-02 for Priya, Arjun, and all ExComm; N-17 pending on decision |
| Pending swap | Vikram (Timer) requested to swap with Aditya (Ah-Counter) on 2 Oct | T-04 for Aditya; N-16 |
| Pending level completion | Ananya logged **Level 3 completion** dated 28 Sep, status pending, proof absent | T-03 and N-09 for Priya (VPE only) |
| Verified completion (history) | Suresh Level 3 verified 1 Sep by Priya; Priya Level 5 verified earlier | Shows Verified and progress history |
| Rejected completion | Ganesh Level 2 completion rejected 10 Aug, reason "Evaluation form missing" | Shows Rejected state |
| Open vote | `vote-001` "Approve club anniversary budget", options Yes / No / Abstain, deadline Sun 4 Oct 6:00 PM, started by Arjun. Eligible voters 7 (Arjun + six ExComm). Cast: Arjun, Priya, Karthik, Sneha (4 of 7). Pending: Divya, Rahul, Vikram | T-05 for the three who have not voted; N-12; turnout bar 4/7; **no result shown** |
| Closed vote | `vote-000` "Move meetings to 5 PM?" closed 12 Sep, result Yes 4, No 2, Abstain 1 | Results view. Ballots hold no member IDs |
| Missing speech details | Meera on 2 Oct | T-06 for Meera |
| Unfilled roles alert | 2 Oct has 3 open roles inside 48 h | T-08 and N-15 for ExComm |
| Theme missing | 9 Oct theme empty, more than 3 days away, so no T-07 yet. Dev panel jump to Tue 6 Oct shows T-07 for the TMOD (Sneha) | Time travel demo |
| Positions | All seven filled per Section 3. "Next President" unset | S-13 empty next-president card |

---

### 6a. Sample progress history (added 2026-10-02)

So profiles and progress screens look lived-in. Names are illustrative, like the Pathways data in 4.4. All levels are verified by Priya; all projects are counted.

| Member | Levels verified | Projects counted |
| --- | --- | --- |
| Ananya Das | 1 (12 Mar), 2 (18 Jun) | Ice Breaker, Level 2 speech (generic) |
| Suresh Babu | 1 (14 Feb), 2 (22 May) and the existing 3 | Ice Breaker, Level 2 and Level 3 speech (generic) |
| Mohammed Faisal | 1 (8 May) | Ice Breaker, Level 2 speech (generic) |
| Priya Raman | 4 (3 Feb), and the existing 5 | none |
| Sneha Iyer, Nisha Pillai | none | Ice Breaker each |

Lakshmi Narayanan, Meera Joshi, Aditya Kulkarni and the others stay empty, so S-09's empty state and "sparse data" examples still exist.

## 7. Tasks and notifications by persona (initial state)

Open tasks:

| Persona | Tasks |
| --- | --- |
| Aditya (IL1013) | T-01 Submit Timer report (25 Sep); T-04 Answer swap request from Vikram |
| Meera (IL1012) | T-06 Add speech project and title (2 Oct) |
| Priya (IL1002) | T-03 Verify Ananya's Level 3; T-02 Nisha's withdrawal; T-08 Fill open roles (2 Oct); T-05 not needed (already voted) |
| Other ExComm (Karthik, Divya, Rahul, Vikram, Sneha, Arjun) | T-02, T-08; Divya, Rahul, Vikram also T-05 |
| Rahul (IL1005) | T-01 not needed (submitted) |
| Sneha (IL1006) | T-01 Grammarian report (draft) for 25 Sep |
| Suresh (IL1011) | T-01 not needed |
| Karthik (IL1003) | T-01 General Evaluator report (25 Sep) |

Notifications (initial, newest first). Every notification stores a `link` that lands on the action (flow.md).

| To | Code | Title | Read? |
| --- | --- | --- | --- |
| Aditya | N-16 | Vikram Rao asked to swap Timer with your Ah-Counter role | unread |
| Aditya | N-06 | Your Timer report for 25 Sep is due | unread |
| Aditya | N-14 | Reminder: you are Ah-Counter tomorrow, 4:00 PM | unread |
| Aditya | N-05 | Theme for 2 Oct published: New beginnings | read |
| Meera | N-14 | Reminder: you are Speaker 3 tomorrow | unread |
| Meera | N-05 | Theme for 2 Oct published | read |
| Priya | N-09 | Ananya Das logged a Level 3 completion | unread |
| Priya | N-15 | 3 roles still open for 2 Oct | unread |
| Priya | N-12 | Vote started: Approve club anniversary budget | read |
| Nisha | N-14 | Reminder: you are Evaluator 1 tomorrow | unread |
| Ananya | N-07 | You were assigned TMOD for 2 Oct | read |
| Ananya | N-14 | Reminder: you are TMOD tomorrow | unread |
| All members | N-01 | Roles open for 9 Oct | mix |

Toast demo: the dev panel has "Send test notification" which pushes an N-07 to the current user so G-03 can be seen live.

---

## 8. Reports seed detail (`mtg-2026-09-18`)

Timer rows: Speaker A (5:00 to 7:00) took 5:20, green; Speaker B took 6:10, yellow; Speaker C took 7:05, red (within grace); Speaker D took 7:45, disqualified (over max + 30 s). Ah-counter total 31, breakdown "um" 14, "so" 9, "like" 5, other 3. Grammarian: word of the day used 6 times by 4 people; good language "Nailed it", "Wearing many hats", "Turn the page"; improvements "Avoid 'basically' as a filler", "Use 'fewer' with countable nouns".

---

## 9. Demo walkthrough (acceptance for mock mode)

1. Sign in as **IL1013**: Home shows T-01 and T-04, next meeting card for 2 Oct with "Your role: Ah-Counter", two unread notifications, bell badge 3. Answer the swap (accept): both roles change, Vikram gets N-16, task T-04 disappears.
2. Sign in as **IL1012**: fill in the speech title; T-06 disappears.
3. Sign in as **IL1010** and try Evaluator 2 for own speech: blocked with an explanation.
4. Sign in as **IL1009**: Evaluator 3 is blocked (needs level 3) and Evaluator 2 is refused because he already holds Speaker 1 (one main role per meeting, R-02). Sign in as **IL1005** (Rahul, level 2, no main role on 2 Oct) and take Evaluator 2: succeeds. *(Changed 2026-10-02; the earlier version had IL1009 taking Evaluator 2, which R-02 forbids.)*
5. Sign in as **IL1002** (VPE): verify Ananya's Level 3, her level becomes 4 and she gets N-10; approve Nisha's withdrawal, slot opens and Nisha gets N-17.
6. Sign in as **IL1004**: cast a vote, turnout becomes 5/7, results not shown.
7. Sign in as **IL1001**: close the vote, results appear for voters; open S-13 and see Positions; name the next President.
8. Sign in as **IL1003**: mark 25 Sep Completed while reports are missing, see the warning listing missing reports; add a member; cancel the 16 Oct draft.
9. Use the dev panel to jump to 2 Oct 4:00 PM plus 90 minutes: report tasks appear for 2 Oct role holders (T-01, N-06).
10. Try a Member visiting `/audit`: G-05 access denied.
