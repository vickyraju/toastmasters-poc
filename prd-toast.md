# PRD: Toastmasters Club Hub (Working Title)

30 Sep 2026 · Vignesh

Status: Updated to match `flow.md` draft v1. This file is the source of truth for scope and requirements. Later documents (`flow.md`, `architecture.md`, `design.md`, `schema.md`, `rules.md`, `implementation_plan.md`) must not contradict it.

## Summary

Club Hub is a responsive, desktop-first webapp that moves a corporate Toastmasters club's scheduling, role signup, role reports and Pathways tracking out of spreadsheets and chat threads and into one place. V1 covers the nine areas in the original feature list; attendance, awards, contests and guest management are held for V1.5 and V2.

Assumptions made where the brief was silent:

- One club of roughly 20 to 60 members that meets weekly. The data model is club-scoped so more clubs can be added later without a rewrite.
- "Club Hub" is a working title.
- In the MVP, members sign in by entering their employee ID, with no password. Real authentication is built last.
- Notifications are in-app only in the MVP. Teams is added later; email is not planned yet.
- The app is desktop-first, since about 95% of use is expected on the web, and stays responsive so it still works on a phone. All times are in IST, and there is no native app.
- The President is the club admin and sits above ExComm: only the President assigns ExComm positions and names the next President. The first President is set once at setup.
- ExComm voting is needed in V1, but its scope is not yet defined (see Open questions).
- V1 does not track attendance. Reports and role history are based on who held each role.

## Problem statement

A weekly Toastmasters meeting needs around a dozen roles filled: Toastmaster of the Day, speakers, evaluators, Timer, Ah-Counter, Grammarian, Table Topics Master and General Evaluator. Today the VPE fills them by chasing members over email and chat and tracking the answers in a spreadsheet. Withdrawals surface late, unfilled roles are discovered the day before, and the same few volunteers end up carrying the load. The Timer, Ah-Counter and Grammarian record their observations on paper or in personal notes, so the reports are rarely shared and are lost within weeks. Members are busy professionals working at their desks, so anything that needs a hunt through old threads or spreadsheets goes unread.

The second gap is visibility. Each member's Pathways progress sits in their own records, so ExComm has no single view of who is advancing, who has gone quiet and who has never taken a given role. The VPE builds that picture by asking around. The result is uneven participation, no searchable history of past meetings, and ExComm time spent on coordination rather than on club quality. These pain points are inferred from the feature list and should be confirmed with ExComm before build starts (see Open questions).

## Goals and non-goals

V1 succeeds if the club runs a full meeting cycle, from scheduling to reports, without a spreadsheet.

**Goals**

- Cut the VPE's manual coordination: roles fill through self-service, with reminders sent automatically.
- Make open roles visible to every member in the app, so more roles are filled before meeting day.
- Keep every meeting's agenda, roles and role reports in one searchable record.
- Give ExComm a club-wide view of participation and Pathways progress.
- Keep member data inside the company's controls: minimal personal data, role-based access and an audit trail for role changes.

**Non-goals for V1**

- Attendance, RSVP and QR check-in, including guests and visitor follow-up.
- Voting on awards, contests and leaderboards. (ExComm voting is in scope; see FR-44.)
- Live in-app timer and counter tools (Timer and Ah-Counter enter results after the fact).
- Calendar sync, email notifications, Teams or Slack bots, and PDF agenda export.
- Automatic role suggestions or fairness scoring.
- Integration with Toastmasters International systems: Pathways progress is self-reported.
- A native mobile app, and multi-club administration screens.

## Users and roles

There are three account types: Member, ExComm and President. The President acts as the admin. Meeting roles add temporary permissions that apply only to the meeting they were assigned for.

| Persona | Who they are | What they need from V1 |
| --- | --- | --- |
| Member | Employee and club member; uses the app mostly in a desktop browser | See the next meeting, take or withdraw a role, prepare a speech, log Pathways progress |
| ExComm | VPE, VPM, VPPR, Secretary, Treasurer, SAA | Create and edit meetings and agenda templates, assign roles, manage members, see participation and pending approvals, take part in ExComm votes; the VPE verifies level completions |
| President (admin) | One member at a time; set once at setup, then named by the outgoing President | Everything ExComm can do, plus assign ExComm positions and name the next President |
| Meeting role holder (contextual) | Any member holding a role in one specific meeting (TMOD, Timer, Ah-Counter, Grammarian, Table Topics Master, General Evaluator, Speaker, Evaluator) | Role-specific tools for that meeting only, such as setting the theme or submitting a report |
| Guest (later) | Visitor invited to a meeting | Not in V1; planned for V1.5 attendance and guest management |

Permissions rule of thumb: ExComm can do anything a member can, plus run meetings, roles and approvals. The President can do everything ExComm can and is the only one who can assign ExComm positions or name the next President. ExComm members cannot change or swap ExComm positions. A role holder's extra rights switch on when the role is assigned and switch off when the meeting is Completed or Cancelled. Apart from the VPE verifying levels, ExComm positions have the same powers in V1.

## User stories

Eight stories cover the core V1 flow. Dashboards, CSV export and the audit log are specified as functional requirements (FR-28 to FR-31) rather than as separate stories. Priorities use MoSCoW: Must, Should, Could, Won't (this release).

### US-1 Sign in with role-based access [Must]

**As a** club member, **I want** to sign in with my employee ID (no password in the MVP; real authentication comes last), **so that** only club members can see club data and signing in is quick.

- **Given** I am on the sign-in page, **when** I enter my employee ID and it is on the roster, **then** I am signed in and land on my home screen, with no password asked.
- **Given** an employee ID that is not on the roster, **when** I enter it, **then** sign-in is refused with a generic message that does not reveal which IDs exist.
- **Given** I am signed in as a Member, **when** I open an ExComm-only page by its URL, **then** I see an access-denied page and the attempt is logged.
- **Given** my session has been idle longer than the expiry period, **when** I return, **then** I am asked to enter my ID again.

### US-2 Manage members and ExComm positions [Must]

**As** ExComm, **I want** to add and remove members and, as President, manage ExComm positions, **so that** access always matches the current club roster.

- **Given** I am ExComm, **when** I add a member with employee ID, name, email and Toastmasters ID, **then** the member can sign in immediately.
- **Given** a member is removed, **when** they try to sign in, **then** access is denied, and their past roles and reports stay in history under their name.
- **Given** a member holds roles in future meetings, **when** I remove them, **then** I see those roles and must reassign or release them before confirming.
- **Given** I am the President, **when** I assign an ExComm position or name the next President, **then** I am asked to confirm, the previous holder returns to plain Member, and the change is logged.
- **Given** I am an ExComm member but not the President, **when** I try to assign or change an ExComm position, **then** the action is not available, and any direct attempt is refused and logged.

### US-3 Create and manage meetings [Must]

**As** ExComm, **I want** recurring templates and the ability to create special meetings, **so that** upcoming meetings exist without manual setup.

- **Given** a template "every Friday, 4:00 PM, Routine", **when** I save it, **then** meetings for the next eight weeks are generated in Draft status with the default role list.
- **Given** a generated meeting, **when** I edit its date, theme or roles, **then** only that meeting changes and the template does not.
- **Given** I save a new agenda template or role list for a meeting type, **when** I create a meeting of that type, **then** it uses my roles, and all members are notified that the template was added.
- **Given** a meeting with assigned roles, **when** I reschedule it, **then** role holders keep their roles and are notified of the new time.
- **Given** a meeting with assigned roles, **when** I cancel it, **then** its status becomes Cancelled, role holders are notified, and it remains in history.

### US-4 Take and withdraw roles on the signup board [Must]

**As a** member, **I want** to see open roles for a meeting and take one, **so that** I can commit quickly without asking ExComm.

- **Given** a meeting is Open for roles, **when** I open its board, **then** every role shows as filled (with the member's name) or open with "Take this role".
- **Given** I already hold a main role in this meeting, **when** I try to take a second main role, **then** I am blocked with a clear explanation.
- **Given** two members tap "Take this role" on the same slot at the same moment, **when** the requests arrive, **then** the first one wins and the second sees "already taken" and the refreshed board.
- **Given** the meeting is more than 24 hours away, **when** I withdraw, **then** the slot reopens immediately and ExComm is notified.
- **Given** the meeting is within 24 hours, **when** I withdraw, **then** the request goes to ExComm and I keep the role until it is approved.

### US-5 Prepare for my role in a specific meeting [Should]

**As a** member holding a role, **I want** tools for that role in that meeting, **so that** I can prepare without asking ExComm to edit things for me.

- **Given** I am the TMOD, **when** I save the theme, welcome note and word of the day, **then** they are published to all members on the meeting page.
- **Given** I am a Speaker, **when** I enter my Pathways project, speech title and objectives, **then** the meeting page shows them with the project's time limit.
- **Given** I have completed the speaker's level or am in the next level, **when** I take the Evaluator role for that speaker, **then** it is allowed and I see the speaker and a link to that project's evaluation form; otherwise the option is disabled with the reason shown.
- **Given** I am not the TMOD of this meeting, **when** I try to edit its theme, **then** I am blocked, even if I was TMOD of an earlier meeting.
- **Given** a meeting is Completed or Cancelled, **when** a role holder opens it, **then** their role-specific edit rights are gone.

### US-6 Submit role reports [Should]

**As a** Timer, Ah-Counter, Grammarian, Table Topics Master or General Evaluator, **I want** a report form for my meeting, **so that** my observations are captured and shared.

- **Given** I am the Timer, **when** I enter a speaker's time, **then** the form flags green, yellow, red or disqualified based on that slot's time limits.
- **Given** I am the Ah-Counter, **when** I record filler words per speaker, **then** I can add totals only or a breakdown by word.
- **Given** I am the Grammarian, **when** I submit, **then** word-of-the-day usage, good language and improvements are saved to the meeting record.
- **Given** a report is submitted, **when** any member opens the meeting after it is Completed, **then** they see the consolidated report.
- **Given** I have not submitted after the meeting, **when** the reminder window passes, **then** I get a reminder, and ExComm can see who is outstanding.

### US-7 Track Pathways progress [Should]

**As a** member, **I want** to log project and level completions and see my progress, **so that** I stay on track and ExComm can help where needed.

- **Given** I finish a project, **when** I log it with a date (and proof if ExComm requires it), **then** it appears on my dashboard immediately.
- **Given** I log a level completion, **when** I submit it, **then** it shows as Pending and the VPE is notified; it counts only after the VPE verifies it.
- **Given** I am the VPE, **when** I verify or reject a pending level completion, **then** the member is notified in-app and, on verification, their current level updates.
- **Given** I am ExComm, **when** I open the club progress table, **then** I see each member's path, level, projects, roles taken, speeches and last activity, and can filter to members inactive for a chosen number of days.
- **Given** I correct or delete an entry, **when** I save, **then** the change is recorded in the audit log.

### US-8 Get reminders and alerts [Must]

**As a** member, **I want** timely reminders about my roles and open roles, **so that** I don't forget commitments and the club doesn't run short.

- **Given** I hold a role, **when** the meeting is 3 days, 1 day and a few hours away, **then** I receive an in-app reminder each time, shown on my home screen and in my notification list.
- **Given** ExComm assigns or changes my role, **when** the change is saved, **then** I get an in-app notification immediately.
- **Given** roles are still unfilled 48 hours before a meeting, **when** that time passes, **then** ExComm is alerted in-app, and ExComm can send the alert to all members.
- **Given** I turn off a non-critical notification type, **when** it would fire, **then** I don't receive it, while critical ones (role changes, cancellations, reminders for my own roles) still arrive.
- **Given** I held a report role in a meeting that has ended, **when** the reminder window opens, **then** I am reminded in-app to submit my report.

## Functional requirements

Requirements are numbered for traceability. Unless marked (Could), all are in V1.

**Access and members**

- **FR-01** In the MVP the system signs members in by employee ID alone, with no password, behind a sign-in layer that can later be replaced by real authentication (password, one-time code or corporate SSO) without changing member accounts. Real authentication is the last item built.
- **FR-02** Three account types exist: Member, ExComm and President (admin). Every permission check runs on the server, never only in the interface.
- **FR-03** ExComm can add, edit, deactivate and remove members. Removal blocks sign-in but keeps the member's historical roles and reports.
- **FR-04** Only the President can assign the ExComm positions (VPE, VPM, VPPR, Secretary, Treasurer, SAA) and name the next President. ExComm members cannot change positions. The first President is set once at setup, and the system keeps a history of who held each position.
- **FR-05** Each member has a profile with employee ID, name, email, Toastmasters ID, pathway and current level. Members edit their own pathway; level changes only through VPE-verified completions. ExComm edits every other field.

**Meetings**

- **FR-06** A calendar view (month and list) shows routine and custom meetings, filterable by type and status.
- **FR-07** ExComm can define recurring templates (day, time, venue or link, type, default roles), and the system auto-generates upcoming meetings a set number of weeks ahead.
- **FR-08** ExComm can create custom meetings (contests, workshops, joint sessions) and edit, reschedule or cancel any meeting.
- **FR-09** Each meeting stores date, time, venue or meeting link, type, theme and status.
- **FR-10** Status moves Draft, Open for roles, Finalized, Completed. Cancelled is allowed from any state before Completed. ExComm marks a meeting Completed manually; nothing completes automatically.
- **FR-11** Each meeting type has an agenda template with pre-populated roles, and ExComm can add or remove roles for an individual meeting. ExComm can also add new templates and role lists, and all members are notified when one is added.
- **FR-12** Editing a template changes future generated meetings only, unless ExComm chooses to apply the change to meetings already generated.

**Roles**

- **FR-13** Each meeting has a signup board that shows every role as filled or open, with a "Take this role" action.
- **FR-14** Members can take an open role for themselves with no approval, and can withdraw. Withdrawal inside a configurable cutoff (default 24 hours) needs ExComm approval.
- **FR-15** ExComm can assign, reassign or override any role at any time.
- **FR-16** A member can hold one main role per meeting. ExComm can optionally limit consecutive repeats of the same role (off by default).
- **FR-17** Unfilled roles are visible on the meeting page and on the member home screen.
- **FR-18** Speaker slots capture Pathways project, speech title and objectives, and show the time limit for that project.
- **FR-19** Role claims are concurrency-safe: when two members claim one slot, exactly one succeeds.

**Role-specific tools**

- **FR-20** Role-holder permissions apply only to the meeting the role was assigned for and end when it is Completed or Cancelled.
- **FR-21** The TMOD can set theme, welcome note and word of the day and publish them to all members, who are notified at once, and can view the full agenda.
- **FR-22** The Toastmaster and General Evaluator can view which evaluator is assigned to which speaker. Evaluators see their speaker and a link to the project's evaluation form.
- **FR-23** Members assign themselves as Evaluator for a speaker if they have completed the speaker's level or are in the next level. ExComm can override.

**Role reports**

- **FR-24** Timer report: per speaker, time taken and a green, yellow, red or disqualified flag calculated from the slot's minimum and maximum time. Common project timings are preloaded, and ExComm can set custom timings.
- **FR-25** Ah-Counter report: per-speaker filler-word total, with an optional breakdown by word.
- **FR-26** Grammarian report: word-of-the-day usage, good language and language improvements.
- **FR-27** (Could) Table Topics Master and General Evaluator submit summaries. All reports attach to the meeting record, and every member can view the consolidated report once the meeting is Completed.

**Dashboards, export and audit**

- **FR-28** Member home shows my upcoming roles, the next meeting, open roles I can take, my progress and my notifications.
- **FR-29** ExComm home shows next-meeting status (roles filled versus open), pending approvals, and quick actions to create a meeting and assign a role.
- **FR-30** An append-only audit log records role assignments, withdrawals, overrides, cancellations, member and position changes, and approvals, each with actor, time and before/after values. ExComm can view it.
- **FR-31** ExComm can export roles, meeting history and progress as CSV.

**Progress tracking**

- **FR-32** Members log Pathways project and level completions with a date and an optional proof upload (ExComm decides whether proof is required).
- **FR-33** The member dashboard shows current path and level, projects done, roles taken, speeches given and upcoming commitments.
- **FR-34** ExComm sees a club-wide progress table and a filter for members with no recent activity.
- **FR-35** Level completions stay Pending until the VPE verifies them. Only the VPE can approve or reject.

**Notifications**

- **FR-36** In-app notifications are sent for: new meeting or roles opened, role assigned or changed, meeting rescheduled or cancelled, and withdrawal requests. A toast also appears when a notification arrives while the member is on the page, and clicking a toast or the bell item opens the related action.
- **FR-37** Reminders go to role holders 3 days, 1 day and a few hours before the meeting.
- **FR-38** ExComm is alerted when roles are unfilled 48 hours before the meeting, and can broadcast the alert to all members.
- **FR-39** Role holders are reminded to submit reports after the meeting, and members are reminded periodically to update progress.
- **FR-40** Members can opt out of non-critical notification types. Role changes, cancellations and reminders for one's own roles cannot be switched off.
- **FR-41** (Could, V1.5) Teams integration delivers the same notifications to a channel or chat.

**Platform**

- **FR-42** The app is designed desktop-first, and every screen stays usable in a phone-width browser with no horizontal scrolling.
- **FR-43** All dates and times are stored in UTC and shown in IST.

**Voting, agenda upload, tasks and swaps**

- **FR-44** ExComm voting: the President starts a vote with a title, description, options (default Yes, No, Abstain) and an optional deadline. ExComm members and the President each cast one final vote. While the vote is open, only turnout is shown and nobody sees results; results are shown to voters after the vote closes at the deadline or when the President closes it. Ballots are secret.
- **FR-45** ExComm can upload an agenda file for each meeting (PDF, DOCX, PNG or JPG, up to 10 MB). Members read it on the Agenda tab of the meeting page.
- **FR-46** A My tasks list, on Home and on its own screen, shows system-generated tasks: submit your report, approve a late withdrawal, verify a level completion, answer a swap request, cast your vote, add speech details, set theme and word of the day, and fill open roles. A task disappears when its action is done.
- **FR-47** A member can request a swap of their meeting role with another member's role in the same meeting. The other member accepts or declines. On acceptance both roles change and ExComm is notified. A swap that would break the one-main-role rule is blocked.

## Non-functional requirements

Targets below are proposals sized for one club of up to 60 members; confirm them with your engineering lead and IT.

| Area | Requirement | Proposed target |
| --- | --- | --- |
| Performance | Page load on a laptop over the office network | Under 3 seconds to interactive; server responses under 500 ms at the 95th percentile |
| Performance | Signup board update after a role is claimed | Visible to other viewers within 5 seconds |
| Accessibility | Standard followed | WCAG 2.1 AA: keyboard navigation, screen-reader labels, colour contrast 4.5:1, tap targets of at least 44 px |
| Accessibility | Timer flags | Never rely on colour alone; show the text label (Green, Yellow, Red) as well |
| Security | Authentication | MVP: employee ID only, so access is limited to the company network or VPN and attempts are rate-limited; replaced by real authentication before wider use |
| Security | Authorization | Role checks enforced server-side; contextual role permissions tied to a specific meeting |
| Security | Data protection | HTTPS everywhere; encryption at rest; uploads limited by file type and size and scanned; no secrets in client code |
| Security | Audit | Role and membership changes logged and not editable from the app |
| Privacy | Personal data | Collect only name, email, Toastmasters ID and activity data; members can view their data; removal request handled within 30 days; retention period agreed with the company (DPDP Act and company policy apply) |
| Scalability | Load | Built for up to 500 members and 10 clubs without a redesign; club-scoped data model from day one |
| Availability | Uptime | 99.5% monthly, which is enough for a weekly-use tool; daily backups with a tested restore |
| Reliability | Notifications | Each in-app notification is created once per event and kept until read |
| Compatibility | Browsers | Current and previous major versions of Chrome, Edge, Safari and Firefox; phone browsers are supported but secondary |
| Observability | Monitoring | Error tracking and uptime alerts to the maintainer; basic usage analytics that avoid personal content |
| Maintainability | Configuration | Cutoff hours, reminder times and time-limit rules are settings, not code |

## Success metrics

The lead metric is the share of meeting roles filled 24 hours before the meeting. No baseline exists yet, so record the last four meetings before launch and revisit every target below once they are known. Launch is day 0.

| Tier | Metric | Target (proposed) | Measured at |
| --- | --- | --- | --- |
| Primary | Roles filled 24 hours before the meeting, as a share of roles on the agenda | 90% or higher | Weekly; judged at day 30, 60 and 90 |
| Primary | Active members: signed in or took an action in the last 30 days | 70% of the roster | Day 30, 60, 90 |
| Primary | Role reports submitted within 24 hours of the meeting, for meetings that have report roles | 80% at day 60; 90% at day 90 | Weekly; judged at day 60 and 90 |
| Secondary | Median time from a meeting opening for roles to 100% filled | Under 4 days | Day 30, 60, 90 |
| Secondary | Members who logged at least one Pathways project or level | 60% of the roster | Day 90 |
| Secondary | ExComm time spent scheduling and chasing roles per week (self-reported by the VPE) | 50% below the pre-launch baseline | Day 30 and day 90 |
| Secondary | Members who set their profile fields (pathway and level) | 90% of the roster | Day 30 |
| Guardrail | Withdrawals inside the 24-hour cutoff | No more than the pre-launch baseline | Weekly, reviewed at day 30, 60, 90 |
| Guardrail | Notification opt-out rate for non-critical types | Under 15% of members | Day 30, 60, 90 |
| Guardrail | Meetings starting with a critical role (TMOD, Timer, General Evaluator) unfilled | 0 | Every meeting |
| Guardrail | Page load and error rate | 95th-percentile load under 3 seconds; server error rate under 1% | Continuous; reviewed weekly during the first 30 days |
| Guardrail | Sign-in failures reported by members | Fewer than 5 per month | Monthly |

## Open questions and dependencies

Items marked Decided come from your answers on 30 September. Anything else keeps its proposed default until you say otherwise.

| # | Question | Why it matters | Answer or default |
| --- | --- | --- | --- |
| 1 | How do members sign in? | Decides the first build and what must be replaced later | Decided: employee ID only, no password, in the MVP; real authentication is the last item built |
| 2 | How is the ID-only MVP kept safe? What do IT rules say on hosting, network access, data residency and retention? | Anyone who knows an ID can act as that person, including the President; IT can also block launch | Open. Hosting is Vercel, which cannot limit access to the company VPN on standard plans. Protect the deployment, or use mock data only, until real authentication is added (see architecture.md) |
| 3 | Do members swap meeting roles (Timer, Speaker and so on) directly with each other, or only through ExComm? | Changes the signup board and audit design | Default agreed: a direct swap needs both members to confirm and ExComm is notified; late withdrawals go through ExComm |
| 4 | Who verifies level completions? | Workflow and trust in progress data | Decided: the VPE verifies every level completion |
| 5 | Do TMOD edit rights apply only to their own meeting? | Core permission rule | Decided: yes (FR-20) |
| 6 | Which notification channel do members watch? | Whether reminders are seen | Decided: in-app first, Teams later; no email in the MVP |
| 7 | How are timer card colours set? | Drives the auto-flag in the Timer report | Decided: common project timings are preloaded and ExComm can set custom timings; 30-second grace is the agreed default |
| 8 | Who takes the Evaluator role for a speaker? | Decides the eligibility logic | Decided: members assign themselves if they have completed the speaker's level or are in the next level; ExComm can override |
| 9 | Are levels compared across different pathways (evaluator on one pathway, speaker on another)? | Needed to code the eligibility rule | Open. Proposed: compare level numbers only, whatever the pathway |
| 10 | Which agenda template and role list applies to each meeting type? | Seed data | Decided: ExComm adds them in the app and all members are notified when one is added |
| 11 | What powers do the President and ExComm positions have? | Permission model | Decided: the President is admin; only the President assigns ExComm positions and names the next President; ExComm cannot change positions; only the VPE verifies levels; otherwise ExComm positions are equal |
| 12 | How is the first President created? | Someone must be set before anyone can be assigned | Decided: the first President is seeded through the database |
| 13 | What does "ExComm voting" cover: electing officers, ExComm decisions, or polls? | New scope that affects the data model and the President's rules | Decided: the President starts a vote and results stay hidden until it closes (FR-44). Topics stay free-form |
| 14 | Should existing members and past roles be imported? | Launch effort | Default agreed: import the roster by CSV; role history starts fresh |
| 15 | How long are records kept? | Privacy and storage | Default agreed: meetings and reports kept; removed members' personal fields deleted after 12 months |
| 16 | Which gap does this fill compared with existing club tools? | Confirms the build is worth it | Default agreed: control and fit to the club's process |
| 17 | What are the team size, budget and timeline? | Delivery plan | Open. The tech stack is recorded in architecture.md. The frontend is built first with mock data, designed in Google Stitch and built with Claude Code; the backend comes later |

**Dependencies**

- **Corporate IT:** approval for hosting and network access for the MVP and, later, for real authentication and SSO.
- **Email delivery service:** not needed in the MVP because notifications are in-app; needed when email is added later.
- **Reference data:** the list of Pathways paths, levels, projects and speech time limits. There is no integration, so someone must enter it and keep it current.
- **ExComm sign-off:** role lists, agenda templates, cutoff hours and reminder timing.
- **Toastmasters brand and forms:** whether the club may use the Toastmasters name, logo and evaluation forms inside an app the club builds itself. Check before choosing the final name.
- **Pilot group:** a few members and one ExComm member to test with before the full club is invited.
- **Teams administrator (V1.5):** permission to register an app or webhook.

## Edge cases to define before development

Each row needs a decision from you or ExComm before the related work is built.

| Area | Edge case | Decision needed |
| --- | --- | --- |
| Roles | A member holding a role is removed or deactivated | Auto-release their roles and alert ExComm, or keep them until ExComm reassigns? |
| Roles | Someone takes a role, then the meeting is rescheduled and they are unavailable | Can they withdraw without the 24-hour rule when the date changes? |
| Roles | A member holds a role and a speaker slot in the same meeting | Which roles count as a "main role" and which can be combined (for example, Speaker plus Timer)? |
| Roles | Two members claim the last open slot together | Proposed rule: first request wins; second sees the refreshed board. Confirm the message wording. |
| Roles | ExComm overrides a role held by a member | Does the member get a notice, and is a reason mandatory in the audit log? |
| Roles | A role is unfilled when the meeting starts | Does it stay on the record as "unfilled", and can the TMOD or ExComm assign someone on the day? |
| Roles | Consecutive-repeat limit is on and only one member is available | Can ExComm override, and is the override logged? |
| Meetings | A meeting is cancelled after roles were assigned | Do role holders get credit for the role in their history? Assumed no. |
| Meetings | A template is edited after meetings were generated | Proposed default: future meetings only. Should ExComm see a preview of which meetings change? |
| Meetings | Two meetings fall on the same date or overlap | Block, warn or allow? |
| Meetings | Public holidays or club breaks | Skip generation for chosen dates, or cancel each meeting manually? |
| Meetings | Hybrid meeting with both a venue and a link | Are both stored and shown? |
| Meetings | A meeting ended but nobody marked it Completed | Auto-complete a set time after the meeting ends, or wait for ExComm? (Decided: ExComm marks it manually; see FR-10.) |
| Meeting roles | The TMOD is replaced after publishing the theme | Does the new TMOD inherit the theme and can they edit it? |
| Speakers | Speaker changes project after the evaluator was assigned | Update the evaluator link automatically and notify them? |
| Speakers | Project has no time limit in the reference data | Block the slot until ExComm adds one, or allow free entry? |
| Reports | A report is submitted, then the role holder needs to change it | Editable until the meeting is Completed, or locked after submit with ExComm unlock? |
| Reports | Someone other than the assigned role holder fills in the report (for example, a substitute) | Allow ExComm to submit on behalf of the assignee? |
| Reports | Speaker times fall exactly on a card boundary | Define inclusive or exclusive boundaries for green, yellow and red |
| Progress | A member logs a level that skips a level or moves backwards | Warn and accept, or block? |
| Progress | The VPE position changes hands while completions are pending | Do pending items go to the new VPE automatically? |
| Progress | A member changes pathway mid-way | Keep old progress under the old pathway, and does it count for club-level totals? |
| Sign-in | A member leaves the company, or an employee ID is reused | How is the account matched and deactivated, and who does it? |
| Sign-in | A member has no employee ID (retiree or contractor) | Are they excluded or given a different sign-in? |
| Notifications | A meeting is created within 3 days of its date | Skip the missed reminders, or send a single combined one? |
| Notifications | A member is on leave | Is there a pause setting that stops non-critical alerts? |
| Notifications | A member never opens the app and so never sees in-app reminders | Flag unread role reminders to ExComm the day before the meeting? |
| Data | A member requests deletion of their data | What is erased and what is kept (role history, audit entries) in anonymised form? |
| Data | Large uploads or unsupported files as proof | File size and type limits, and who can view the proof? |

## Release plan and risks

Build V1 in two increments so the club can start using the core flow early. The V1.5 and V2 split of the later ideas is a proposal, and no dates are set because the brief gave none.

| Phase | Scope | Exit gate |
| --- | --- | --- |
| V1a: core | Employee-ID sign-in, members and President-managed positions, meetings and templates, role signup board, in-app notifications and reminders, audit log | One full weekly meeting runs on the app with roles filled through it |
| V1b: complete V1 | Role-specific tools, role reports, Pathways tracking with VPE verification, dashboards, ExComm voting, CSV export, then real authentication as the last item | Two consecutive meetings with reports submitted in the app; day-30 metrics reviewed |
| V1.5 | Attendance and RSVP with QR check-in, calendar feed (.ics), agenda PDF, Teams and email notifications, unfilled-role nudges, role-rotation suggestions | Day-90 targets met and ExComm confirms the priority order |
| V2 | Voting and awards, feedback history, analytics and Distinguished Club Program progress, resource library, searchable meeting archive, guest management, contest management, digital timer and counter tools, badges, ideas box | Set after V1.5 review |

**Risks**

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Members keep using chat and spreadsheets | Low adoption; roles still chased by hand | Run a pilot, have the VPE post the app link for role calls, and stop maintaining the spreadsheet after launch |
| IT blocks hosting or sign-in choice late | Launch delay | Raise question 2 first; keep the network-only MVP as the fallback |
| ID-only sign-in allows impersonation | Someone could act as another member or as the President | Limit the MVP to the company network or VPN, log every sign-in and role change, and build real authentication before wider use |
| Notification fatigue | Opt-outs and ignored reminders | Keep critical types fixed, everything else optional; review opt-out rate at day 30 |
| Progress logging feels like extra work | Empty dashboards | Two-tap logging, monthly reminder, and no required proof by default |
| Scope creep from the V1.5 and V2 list | V1 slips | Hold to the non-goals; new ideas go to a backlog reviewed at each phase gate |
| Pathways project data goes out of date | Wrong time limits and flags | ExComm-editable reference list with an owner (VPE) |
