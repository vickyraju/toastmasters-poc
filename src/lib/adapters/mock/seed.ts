// Seed built from mock-data.md. Fixed readable ids (section 2). Workflow tasks and notifications
// are produced by the real event functions, then caught up to the mock clock by tick().
import { istToUtcIso } from "../../time/ist";
import { timerCard } from "../../domain/rules/timerCard";
import * as ev from "../../domain/events";
import type {
  AuditAction,
  Card,
  Meeting,
  MeetingRole,
  MeetingStatus,
  Member,
  MemberStatus,
  Position,
  ReportKind,
  RoleTemplate,
  SpeakerDetails,
} from "../../domain/types";
import type { MockData } from "./state";
import { tick } from "./tick";

const iso = (d: string, t: string) => istToUtcIso(d, t);
const mem = (n: number) => `mem-${n}`;

// ---- Members (mock-data.md section 3) ----
const MEMBER_ROWS: [
  number,
  string,
  string,
  Position | null,
  string,
  number,
  MemberStatus,
][] = [
  [
    1001,
    "Arjun Mehta",
    "arjun.mehta",
    "president",
    "Dynamic Leadership",
    4,
    "active",
  ],
  [
    1002,
    "Priya Raman",
    "priya.raman",
    "vpe",
    "Presentation Mastery",
    5,
    "active",
  ],
  [
    1003,
    "Karthik Subramanian",
    "karthik.subramanian",
    "vpm",
    "Leadership Development",
    3,
    "active",
  ],
  [
    1004,
    "Divya Krishnan",
    "divya.krishnan",
    "vppr",
    "Engaging Humor",
    3,
    "active",
  ],
  [
    1005,
    "Rahul Verma",
    "rahul.verma",
    "secretary",
    "Effective Coaching",
    2,
    "active",
  ],
  [
    1006,
    "Sneha Iyer",
    "sneha.iyer",
    "treasurer",
    "Motivational Strategies",
    4,
    "active",
  ],
  [
    1007,
    "Vikram Rao",
    "vikram.rao",
    "saa",
    "Persuasive Influence",
    2,
    "active",
  ],
  [1008, "Ananya Das", "ananya.das", null, "Presentation Mastery", 3, "active"],
  [
    1009,
    "Mohammed Faisal",
    "mohammed.faisal",
    null,
    "Dynamic Leadership",
    2,
    "active",
  ],
  [
    1010,
    "Lakshmi Narayanan",
    "lakshmi.narayanan",
    null,
    "Presentation Mastery",
    1,
    "active",
  ],
  [
    1011,
    "Suresh Babu",
    "suresh.babu",
    null,
    "Strategic Relationships",
    4,
    "active",
  ],
  [
    1012,
    "Meera Joshi",
    "meera.joshi",
    null,
    "Innovative Planning",
    2,
    "active",
  ],
  [
    1013,
    "Aditya Kulkarni",
    "aditya.kulkarni",
    null,
    "Visionary Communication",
    1,
    "active",
  ],
  [
    1014,
    "Nisha Pillai",
    "nisha.pillai",
    null,
    "Team Collaboration",
    3,
    "active",
  ],
  [
    1015,
    "Ganesh Kumar",
    "ganesh.kumar",
    null,
    "Persuasive Influence",
    2,
    "inactive",
  ],
];

function members(nowMs: number): Member[] {
  const day = 86_400_000;
  const recent = (daysAgo: number) =>
    new Date(nowMs - daysAgo * day).toISOString();
  const rows = MEMBER_ROWS.map(
    ([n, name, email, pos, pathway, level, status], i): Member => ({
      id: mem(n),
      employeeId: `IL${n}`,
      name,
      email: `${email}@example.com`,
      toastmastersId: null,
      pathway,
      currentLevel: level,
      status,
      joinedAt: null,
      accountType:
        pos === "president" ? "president" : pos ? "excomm" : "member",
      // everyone within the last 3 weeks except Ganesh (about 100 days ago)
      lastActiveAt: n === 1015 ? recent(100) : recent(1 + (i % 20)),
    }),
  );
  rows.push({
    id: mem(1099),
    employeeId: "IL1099",
    name: "Old Member",
    email: "old.member@example.com",
    toastmastersId: null,
    pathway: null,
    currentLevel: 1,
    accountType: "member",
    status: "removed",
    joinedAt: null,
    lastActiveAt: recent(60),
  });
  return rows;
}

// ---- Catalog (section 4) ----
const RT = (
  code: string,
  name: string,
  category: RoleTemplate["category"],
  reportKind: ReportKind | null,
  isSpeaker: boolean,
  isEvaluator: boolean,
  defaultCount: number,
): RoleTemplate => ({
  id: `rt-${code}`,
  code,
  name,
  category,
  reportKind,
  isSpeaker,
  isEvaluator,
  defaultCount,
});

const ROLE_TEMPLATES: RoleTemplate[] = [
  RT("tmod", "Toastmaster of the Day", "main", null, false, false, 1),
  RT(
    "general_evaluator",
    "General Evaluator",
    "main",
    "general_evaluator",
    false,
    false,
    1,
  ),
  RT(
    "table_topics_master",
    "Table Topics Master",
    "main",
    "table_topics",
    false,
    false,
    1,
  ),
  RT("speaker", "Speaker", "main", null, true, false, 3),
  RT("evaluator", "Evaluator", "main", null, false, true, 3),
  RT("timer", "Timer", "support", "timer", false, false, 1),
  RT("ah_counter", "Ah-Counter", "support", "ah_counter", false, false, 1),
  RT("grammarian", "Grammarian", "support", "grammarian", false, false, 1),
  RT("hark_master", "Hark Master", "support", null, false, false, 0),
  // custom roles for the contest (section 4.2 and 5.5)
  RT("chief_judge", "Chief Judge", "main", null, false, false, 1),
  RT("contestant", "Contestant", "main", null, false, false, 4),
  RT("sergeant_at_arms", "Sergeant-at-Arms", "support", null, false, false, 1),
];

const REGULAR_ROLES: [string, number][] = [
  ["tmod", 1],
  ["general_evaluator", 1],
  ["table_topics_master", 1],
  ["speaker", 3],
  ["evaluator", 3],
  ["timer", 1],
  ["ah_counter", 1],
  ["grammarian", 1],
];
const SMALL_ROLES: [string, number][] = [
  ["tmod", 1],
  ["timer", 1],
  ["ah_counter", 1],
];

// ---- Meetings (section 5) ----
const VENUE = "Conference Room B, Inception Labs, Chennai";
const LINK = "https://teams.example.com/meet/club";

type Filled = Record<string, number>; // slot key -> member number
interface MeetingSpec {
  date: string;
  time: string;
  minutes: number;
  status: MeetingStatus;
  type: string;
  title?: string;
  theme?: string;
  filled?: Filled;
  speakers?: number;
  reason?: string;
}

const MEETINGS: MeetingSpec[] = [
  {
    date: "2026-09-11",
    time: "16:00",
    minutes: 90,
    status: "cancelled",
    type: "regular",
    reason: "Public holiday event",
  },
  {
    date: "2026-09-18",
    time: "16:00",
    minutes: 90,
    status: "completed",
    type: "regular",
    theme: "Growth mindset",
    speakers: 4,
    // 4 speakers and 4 evaluators so each timer card appears once (section 5.3)
    filled: {
      tmod: 1003,
      ge: 1011,
      ttm: 1008,
      "speaker-1": 1012,
      "speaker-2": 1009,
      "speaker-3": 1007,
      "speaker-4": 1004,
      "evaluator-1": 1002,
      "evaluator-2": 1001,
      "evaluator-3": 1014,
      "evaluator-4": 1099,
      timer: 1013,
      "ah-counter": 1010,
      grammarian: 1006,
    },
  },
  {
    date: "2026-09-25",
    time: "16:00",
    minutes: 90,
    status: "finalized",
    type: "regular",
    theme: "Resilience",
    filled: {
      tmod: 1008,
      ge: 1003,
      ttm: 1011,
      "speaker-1": 1007,
      "speaker-2": 1012,
      "speaker-3": 1009,
      "evaluator-1": 1002,
      "evaluator-2": 1001,
      "evaluator-3": 1014,
      timer: 1013,
      "ah-counter": 1005,
      grammarian: 1006,
    },
  },
  {
    date: "2026-10-02",
    time: "16:00",
    minutes: 90,
    status: "open",
    type: "regular",
    theme: "New beginnings",
    filled: {
      tmod: 1008,
      ge: 1011,
      ttm: 1004,
      "speaker-1": 1009,
      "speaker-2": 1010,
      "speaker-3": 1012,
      "evaluator-1": 1014,
      timer: 1007,
      "ah-counter": 1013,
    },
  },
  {
    date: "2026-10-09",
    time: "16:00",
    minutes: 90,
    status: "open",
    type: "regular",
    filled: { tmod: 1006, "speaker-1": 1004, timer: 1005 },
  },
  {
    date: "2026-10-16",
    time: "16:00",
    minutes: 90,
    status: "draft",
    type: "regular",
  },
  {
    date: "2026-10-23",
    time: "16:00",
    minutes: 90,
    status: "draft",
    type: "regular",
  },
  {
    date: "2026-10-31",
    time: "10:00",
    minutes: 150,
    status: "draft",
    type: "contest",
    title: "Area Speech Contest",
  },
];

const meetingId = (date: string) => `mtg-${date}`;
const TYPE_ID: Record<string, string> = {
  regular: "mt-regular",
  contest: "mt-contest",
};
const label = (code: string, i: number, total: number) =>
  (
    ({
      tmod: "Toastmaster of the Day",
      general_evaluator: "General Evaluator",
      table_topics_master: "Table Topics Master",
      speaker: `Speaker ${i}`,
      evaluator: `Evaluator ${i}`,
      timer: "Timer",
      ah_counter: "Ah-Counter",
      grammarian: "Grammarian",
      chief_judge: "Chief Judge",
      contestant: total > 1 ? `Contestant ${i}` : "Contestant",
      sergeant_at_arms: "Sergeant-at-Arms",
    }) as Record<string, string>
  )[code];
const slotKey = (code: string, i: number, total: number) => {
  const base =
    (
      {
        general_evaluator: "ge",
        table_topics_master: "ttm",
        ah_counter: "ah-counter",
      } as Record<string, string>
    )[code] ?? code.replace(/_/g, "-");
  return total > 1 ? `${base}-${i}` : base;
};

function buildMeetings(
  createdBy: string,
  filled: (spec: MeetingSpec) => Filled,
  nowMs: number,
) {
  const meetings: Meeting[] = [];
  const slots: MeetingRole[] = [];
  for (const s of MEETINGS) {
    const id = meetingId(s.date);
    const startsAt = iso(s.date, s.time);
    const endsAt = new Date(
      Date.parse(startsAt) + s.minutes * 60_000,
    ).toISOString();
    const isRegular = s.type === "regular";
    const published = s.theme
      ? new Date(Date.parse(startsAt) - 8 * 86_400_000).toISOString()
      : null;
    meetings.push({
      id,
      title: s.title ?? (isRegular ? "Regular Meeting" : "Speech Contest"),
      meetingTypeId: TYPE_ID[s.type],
      // Every Friday Regular Meeting came from the template, so generation recognises them.
      templateId: isRegular ? "tpl-friday" : null,
      startsAt,
      endsAt,
      venue: VENUE,
      meetingLink: LINK,
      status: s.status,
      theme: s.theme ?? null,
      welcomeNote:
        s.date === "2026-10-02"
          ? "Welcome, everyone. Tonight is about starting something new."
          : null,
      wordOfTheDay: s.date === "2026-10-02" ? "Embark" : null,
      wordMeaning:
        s.date === "2026-10-02" ? "to begin a course of action" : null,
      themePublishedAt: s.date === "2026-10-02" ? published : null,
      agendaFileId: s.date === "2026-10-02" ? "file-agenda-2026-10-02" : null,
      withdrawalCutoffHours: null,
      cancelledReason: s.reason ?? null,
      completedAt:
        s.status === "completed"
          ? new Date(Date.parse(endsAt) + 30 * 60_000).toISOString()
          : null,
      createdBy,
    });
    // Slots: Regular roles, contest = small list + custom roles added for the day (5.5)
    const plan: [string, number][] = isRegular
      ? REGULAR_ROLES.map(([c, n]) => [
          c,
          c === "speaker" || c === "evaluator" ? (s.speakers ?? n) : n,
        ])
      : [
          ...SMALL_ROLES,
          ["chief_judge", 1],
          ["contestant", 4],
          ["sergeant_at_arms", 1],
        ];
    const f = filled(s);
    let order = 0;
    for (const [code, total] of plan) {
      const tpl = ROLE_TEMPLATES.find((r) => r.code === code)!;
      for (let i = 1; i <= total; i++) {
        const key = slotKey(code, i, total);
        const holder = f[key];
        slots.push({
          id: `${id}:${key}`,
          meetingId: id,
          roleTemplateId: tpl.id,
          label: label(code, i, total),
          sortOrder: order++,
          memberId: holder ? mem(holder) : null,
          status: holder ? "filled" : "open",
          isMain: tpl.category === "main",
          assignedBy: holder ? mem(holder) : null,
          assignedAt: holder
            ? new Date(nowMs - 5 * 86_400_000).toISOString()
            : null,
          version: 0,
          evaluatesSlotId: code === "evaluator" ? `${id}:speaker-${i}` : null,
        });
      }
    }
  }
  return { meetings, slots };
}

const sd = (slotId: string, o: Partial<SpeakerDetails>): SpeakerDetails => ({
  meetingRoleId: slotId,
  pathway: null,
  level: null,
  projectId: null,
  projectName: null,
  title: null,
  objectives: null,
  minSeconds: null,
  maxSeconds: null,
  evalFormUrl: null,
  ...o,
});
const L2 = {
  projectId: "prj-l2",
  projectName: "Level 2 speech (generic)",
  minSeconds: 300,
  maxSeconds: 420,
  level: 2,
};

const audit = (
  n: number,
  actor: string | null,
  action: AuditAction,
  type: string,
  id: string,
  at: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
) => ({
  id: `aud-${n}`,
  actorId: actor,
  action,
  entityType: type,
  entityId: id,
  before,
  after,
  createdAt: at,
});

const vpeId = mem(1002);
/** Verified earlier levels and counted projects. Names are illustrative, like the rest of the Pathways data. */
function sampleHistory(): MockData["completions"] {
  let n = 100;
  const level = (who: number, pathway: string, lv: number, on: string) => ({
    id: `cmp-${++n}`,
    memberId: mem(who),
    kind: "level" as const,
    pathway,
    level: lv,
    projectName: null,
    completedOn: on,
    proofFileId: null,
    status: "verified" as const,
    verifiedBy: vpeId,
    verifiedAt: iso(on, "12:00"),
    rejectionReason: null,
  });
  const project = (
    who: number,
    pathway: string,
    lv: number,
    name: string,
    on: string,
  ) => ({
    id: `cmp-${++n}`,
    memberId: mem(who),
    kind: "project" as const,
    pathway,
    level: lv,
    projectName: name,
    completedOn: on,
    proofFileId: null,
    status: "counted" as const,
    verifiedBy: null,
    verifiedAt: null,
    rejectionReason: null,
  });
  return [
    level(1008, "Presentation Mastery", 1, "2026-03-12"),
    level(1008, "Presentation Mastery", 2, "2026-06-18"),
    project(1008, "Presentation Mastery", 1, "Ice Breaker", "2026-02-20"),
    project(
      1008,
      "Presentation Mastery",
      2,
      "Level 2 speech (generic)",
      "2026-05-29",
    ),
    level(1011, "Strategic Relationships", 1, "2026-02-14"),
    level(1011, "Strategic Relationships", 2, "2026-05-22"),
    project(1011, "Strategic Relationships", 1, "Ice Breaker", "2026-01-30"),
    project(
      1011,
      "Strategic Relationships",
      2,
      "Level 2 speech (generic)",
      "2026-04-17",
    ),
    project(
      1011,
      "Strategic Relationships",
      3,
      "Level 3 speech (generic)",
      "2026-08-21",
    ),
    level(1009, "Dynamic Leadership", 1, "2026-05-08"),
    project(1009, "Dynamic Leadership", 1, "Ice Breaker", "2026-04-24"),
    project(
      1009,
      "Dynamic Leadership",
      2,
      "Level 2 speech (generic)",
      "2026-09-04",
    ),
    level(1002, "Presentation Mastery", 4, "2026-02-03"),
    project(1006, "Motivational Strategies", 1, "Ice Breaker", "2026-03-27"),
    project(1014, "Team Collaboration", 1, "Ice Breaker", "2026-06-05"),
  ];
}

/** Builds the full mock dataset as of `nowMs` (the mock clock's start). */
export function createSeed(nowMs: number): MockData {
  const at = (date: string, time: string) => iso(date, time);
  const { meetings, slots } = buildMeetings(
    mem(1001),
    (s) => s.filled ?? {},
    nowMs,
  );

  const data: MockData = {
    members: members(nowMs),
    positions: (
      [
        "president",
        "vpe",
        "vpm",
        "vppr",
        "secretary",
        "treasurer",
        "saa",
      ] as Position[]
    ).map((code, i) => ({
      id: `pos-${code}`,
      code,
      memberId: mem(1001 + i),
      assignedAt: at("2026-01-02", "10:00"),
      assignedBy: code === "president" ? null : mem(1001),
    })),
    meetingTypes: [
      {
        id: "mt-regular",
        name: "Regular Meeting",
        defaultDurationMinutes: 90,
        isActive: true,
      },
      {
        id: "mt-contest",
        name: "Speech Contest",
        defaultDurationMinutes: 150,
        isActive: true,
      },
      {
        id: "mt-workshop",
        name: "Workshop",
        defaultDurationMinutes: 90,
        isActive: true,
      },
      {
        id: "mt-joint",
        name: "Joint Session",
        defaultDurationMinutes: 120,
        isActive: true,
      },
    ],
    roleTemplates: ROLE_TEMPLATES,
    meetingTypeRoles: [
      ...REGULAR_ROLES.map(([c, count], i) => ({
        meetingTypeId: "mt-regular",
        roleTemplateId: `rt-${c}`,
        count,
        sortOrder: i,
      })),
      ...["mt-contest", "mt-workshop", "mt-joint"].flatMap((t) =>
        SMALL_ROLES.map(([c, count], i) => ({
          meetingTypeId: t,
          roleTemplateId: `rt-${c}`,
          count,
          sortOrder: i,
        })),
      ),
    ],
    agendaItems: (
      [
        ["Opening and TMOD intro", 5, "tmod"],
        ["Word of the day", 3, null],
        ["Prepared speeches", 22, "speaker"],
        ["Table Topics", 15, "table_topics_master"],
        ["Evaluations", 15, "evaluator"],
        ["Reports", 10, null],
        ["Close", 5, null],
      ] as [string, number, string | null][]
    ).map(([title, durationMinutes, code], i) => ({
      id: `agi-${i + 1}`,
      meetingTypeId: "mt-regular",
      sortOrder: i,
      title,
      durationMinutes,
      roleTemplateId: code ? `rt-${code}` : null,
    })),
    recurringTemplates: [
      {
        id: "tpl-friday",
        name: "Friday Regular Meeting",
        meetingTypeId: "mt-regular",
        weekday: 5,
        startTime: "16:00",
        durationMinutes: 90,
        venue: VENUE,
        meetingLink: LINK,
        weeksAhead: 4,
        skipDates: [],
        isActive: true,
      },
    ],
    meetings,
    meetingRoles: slots,
    speakerDetails: [
      // 2 Oct
      sd("mtg-2026-10-02:speaker-1", {
        ...L2,
        pathway: "Dynamic Leadership",
        title: "Lessons from a Failed Launch",
        objectives: "Tell a project story with one clear lesson.",
      }),
      sd("mtg-2026-10-02:speaker-2", {
        pathway: "Presentation Mastery",
        level: 1,
        projectId: "prj-l1",
        projectName: "Ice Breaker",
        minSeconds: 240,
        maxSeconds: 360,
        title: "My Journey to Chennai",
        objectives: "Introduce yourself to the club.",
      }),
      sd("mtg-2026-10-02:speaker-3", { ...L2, pathway: "Innovative Planning" }), // title and objectives empty -> T-06
      // 25 Sep
      sd("mtg-2026-09-25:speaker-1", {
        ...L2,
        pathway: "Persuasive Influence",
        title: "Making the Case",
      }),
      sd("mtg-2026-09-25:speaker-2", {
        ...L2,
        pathway: "Innovative Planning",
        title: "Planning Under Pressure",
      }),
      sd("mtg-2026-09-25:speaker-3", {
        ...L2,
        pathway: "Dynamic Leadership",
        title: "Leading Without Authority",
      }),
      // 18 Sep
      ...[
        ["1", "Meera"],
        ["2", "Mohammed"],
        ["3", "Vikram"],
        ["4", "Divya"],
      ].map(([n, who]) =>
        sd(`mtg-2026-09-18:speaker-${n}`, { ...L2, title: `${who}'s speech` }),
      ),
      // 9 Oct
      sd("mtg-2026-10-09:speaker-1", { ...L2, pathway: "Engaging Humor" }),
    ],
    projects: [
      {
        id: "prj-l1",
        pathway: "Any",
        level: 1,
        name: "Ice Breaker",
        minSeconds: 240,
        maxSeconds: 360,
        isCustom: false,
      },
      ...[2, 3, 4, 5].map((l) => ({
        id: l === 2 ? "prj-l2" : `prj-l${l}`,
        pathway: "Any",
        level: l,
        name: `Level ${l} speech (generic)`,
        minSeconds: 300,
        maxSeconds: 420,
        isCustom: false,
      })),
      {
        id: "prj-tt",
        pathway: "n/a",
        level: 0,
        name: "Table Topics response",
        minSeconds: 60,
        maxSeconds: 120,
        isCustom: false,
      },
      {
        id: "prj-eval",
        pathway: "n/a",
        level: 0,
        name: "Evaluation",
        minSeconds: 120,
        maxSeconds: 180,
        isCustom: false,
      },
      {
        id: "prj-custom",
        pathway: "n/a",
        level: 0,
        name: "Workshop demo",
        minSeconds: 480,
        maxSeconds: 600,
        isCustom: true,
      },
    ],
    reports: [],
    completions: [
      {
        id: "cmp-001",
        memberId: mem(1008),
        kind: "level",
        pathway: "Presentation Mastery",
        level: 3,
        projectName: null,
        completedOn: "2026-09-28",
        proofFileId: null,
        status: "pending",
        verifiedBy: null,
        verifiedAt: null,
        rejectionReason: null,
      },
      {
        id: "cmp-002",
        memberId: mem(1011),
        kind: "level",
        pathway: "Strategic Relationships",
        level: 3,
        projectName: null,
        completedOn: "2026-08-30",
        proofFileId: null,
        status: "verified",
        verifiedBy: mem(1002),
        verifiedAt: at("2026-09-01", "11:00"),
        rejectionReason: null,
      },
      {
        id: "cmp-003",
        memberId: mem(1002),
        kind: "level",
        pathway: "Presentation Mastery",
        level: 5,
        projectName: null,
        completedOn: "2026-06-10",
        proofFileId: null,
        status: "verified",
        verifiedBy: mem(1002),
        verifiedAt: at("2026-06-12", "11:00"),
        rejectionReason: null,
      },
      {
        id: "cmp-004",
        memberId: mem(1015),
        kind: "level",
        pathway: "Persuasive Influence",
        level: 2,
        projectName: null,
        completedOn: "2026-08-08",
        proofFileId: null,
        status: "rejected",
        verifiedBy: mem(1002),
        verifiedAt: at("2026-08-10", "11:00"),
        rejectionReason: "Evaluation form missing",
      },
      // Sample history so profiles and progress screens look lived-in (added 2026-10-02, see mock-data.md 6a).
      ...sampleHistory(),
    ],
    swaps: [
      {
        id: "swp-001",
        meetingId: "mtg-2026-10-02",
        requesterRoleId: "mtg-2026-10-02:timer",
        targetRoleId: "mtg-2026-10-02:ah-counter",
        requesterId: mem(1007),
        targetId: mem(1013),
        status: "pending",
        createdAt: at("2026-10-01", "17:30"),
        decidedAt: null,
      },
    ],
    withdrawals: [
      {
        id: "wdr-001",
        meetingRoleId: "mtg-2026-10-02:evaluator-1",
        memberId: mem(1014),
        reason: "Client call at 4 PM",
        status: "pending",
        decidedBy: null,
        decidedAt: null,
        createdAt: at("2026-10-01", "17:00"),
      },
    ],
    settings: {
      id: 1,
      clubName: "Inception Labs Toastmasters (demo)",
      withdrawalCutoffHours: 24,
      proofRequired: false,
      consecutiveRepeatLimit: null,
      timerGraceSeconds: 30,
      nextPresidentId: null,
      inactiveAfterDays: 60,
      generateWeeksAhead: 4,
    },
    notifications: [],
    tasks: [],
    notifPrefs: [],
    votes: [
      {
        id: "vote-000",
        title: "Move meetings to 5 PM?",
        description: "",
        status: "closed",
        createdBy: mem(1001),
        deadlineAt: null,
        closedAt: at("2026-09-12", "18:00"),
        closedBy: mem(1001),
      },
      {
        id: "vote-001",
        title: "Approve club anniversary budget",
        description: "",
        status: "open",
        createdBy: mem(1001),
        deadlineAt: at("2026-10-04", "18:00"),
        closedAt: null,
        closedBy: null,
      },
    ],
    voteOptions: [
      ...["vote-000", "vote-001"].flatMap((v) =>
        ["Yes", "No", "Abstain"].map((l, i) => ({
          id: `${v}:${l.toLowerCase()}`,
          voteId: v,
          label: l,
          sortOrder: i,
        })),
      ),
    ],
    voteParticipation: [
      ...[1001, 1002, 1003, 1004, 1005, 1006, 1007].map((n) => ({
        voteId: "vote-000",
        memberId: mem(n),
        castAt: at("2026-09-11", "12:00"),
      })),
      ...[1001, 1002, 1003, 1006].map((n) => ({
        voteId: "vote-001",
        memberId: mem(n),
        castAt: at("2026-09-30", "20:00"),
      })),
    ],
    // Ballots hold { voteId, optionId } only; vote-000 is Yes 4, No 2, Abstain 1
    voteBallots: [
      ...["yes", "yes", "yes", "yes", "no", "no", "abstain"].map((o, i) => ({
        id: `bal-0${i}`,
        voteId: "vote-000",
        optionId: `vote-000:${o}`,
      })),
      ...["yes", "yes", "no", "abstain"].map((o, i) => ({
        id: `bal-1${i}`,
        voteId: "vote-001",
        optionId: `vote-001:${o}`,
      })),
    ],
    voteEligible: ["vote-000", "vote-001"].flatMap((v) =>
      [1001, 1002, 1003, 1004, 1005, 1006, 1007].map((n) => ({
        voteId: v,
        memberId: mem(n),
      })),
    ),
    files: [
      {
        id: "file-agenda-2026-10-02",
        storageKey: "mock/agenda-sample.pdf",
        originalName: "agenda-2026-10-02.pdf",
        mimeType: "application/pdf",
        sizeBytes: 48_000,
        uploadedBy: mem(1001),
        createdAt: at("2026-09-28", "10:00"),
      },
    ],
    audit: [
      audit(
        1,
        mem(1001),
        "meeting.cancel",
        "meeting",
        "mtg-2026-09-11",
        at("2026-09-04", "10:00"),
        { status: "open" },
        { status: "cancelled", cancelledReason: "Public holiday event" },
      ),
      audit(
        2,
        mem(1002),
        "level.reject",
        "completion",
        "cmp-004",
        at("2026-08-10", "11:00"),
        { status: "pending" },
        { status: "rejected", rejectionReason: "Evaluation form missing" },
      ),
      audit(
        3,
        mem(1002),
        "level.verify",
        "completion",
        "cmp-002",
        at("2026-09-01", "11:00"),
        { status: "pending" },
        { status: "verified" },
      ),
      audit(
        4,
        mem(1001),
        "vote.start",
        "vote",
        "vote-000",
        at("2026-09-10", "18:00"),
        null,
        { status: "open" },
      ),
      audit(
        5,
        mem(1001),
        "vote.close",
        "vote",
        "vote-000",
        at("2026-09-12", "18:00"),
        { status: "open" },
        { status: "closed" },
      ),
      audit(
        6,
        mem(1001),
        "vote.start",
        "vote",
        "vote-001",
        at("2026-09-30", "18:00"),
        null,
        { status: "open" },
      ),
      audit(
        7,
        mem(1014),
        "role.withdraw_request",
        "withdrawal_request",
        "wdr-001",
        at("2026-10-01", "17:00"),
        null,
        { status: "pending" },
      ),
    ],
    session: { memberId: null },
    dev: { simulateError: false, clockJumpMs: 0 },
  };

  // Reports (sections 5.2, 5.3 and 8)
  const rep = (
    slot: string,
    kind: ReportKind,
    by: number,
    submitted: string | null,
    payload: unknown,
  ) => ({
    id: `rpt-${data.reports.length + 1}`,
    meetingId: slot.split(":")[0],
    meetingRoleId: slot,
    kind,
    submittedBy: mem(by),
    submittedAt: submitted,
    payload: payload as never,
  });
  const secs: [string, number][] = [
    ["speaker-1", 320],
    ["speaker-2", 370],
    ["speaker-3", 425],
    ["speaker-4", 465],
  ];
  const card = (s: number): Card => timerCard(s, 300, 420);
  data.reports.push(
    rep("mtg-2026-09-18:timer", "timer", 1013, at("2026-09-18", "17:40"), {
      rows: secs.map(([k, s]) => ({
        speakerSlotId: `mtg-2026-09-18:${k}`,
        seconds: s,
        card: card(s),
      })),
    }),
    rep(
      "mtg-2026-09-18:ah-counter",
      "ah_counter",
      1010,
      at("2026-09-18", "17:40"),
      {
        rows: [
          {
            memberId: mem(1012),
            total: 8,
            breakdown: { um: 4, so: 2, like: 1, other: 1 },
          },
          {
            memberId: mem(1009),
            total: 6,
            breakdown: { um: 3, so: 2, like: 1 },
          },
          {
            memberId: mem(1007),
            total: 9,
            breakdown: { um: 4, so: 3, like: 1, other: 1 },
          },
          {
            memberId: mem(1004),
            total: 8,
            breakdown: { um: 3, so: 2, like: 2, other: 1 },
          },
        ],
      },
    ),
    rep(
      "mtg-2026-09-18:grammarian",
      "grammarian",
      1006,
      at("2026-09-18", "17:40"),
      {
        wordOfDayUsage: [
          { memberId: mem(1012), count: 2 },
          { memberId: mem(1009), count: 2 },
          { memberId: mem(1007), count: 1 },
          { memberId: mem(1004), count: 1 },
        ],
        goodLanguage: "Nailed it; Wearing many hats; Turn the page",
        improvements:
          "Avoid 'basically' as a filler; Use 'fewer' with countable nouns",
      },
    ),
    rep("mtg-2026-09-18:ttm", "table_topics", 1008, at("2026-09-18", "17:40"), {
      summary: "Lively round; every response stayed within time.",
    }),
    rep(
      "mtg-2026-09-18:ge",
      "general_evaluator",
      1011,
      at("2026-09-18", "17:40"),
      { summary: "Strong openings; work on closing the loop on feedback." },
    ),
    rep(
      "mtg-2026-09-25:ah-counter",
      "ah_counter",
      1005,
      at("2026-09-25", "17:40"),
      {
        rows: [
          { memberId: mem(1007), total: 5 },
          { memberId: mem(1012), total: 3 },
          { memberId: mem(1009), total: 4 },
        ],
      },
    ),
    rep("mtg-2026-09-25:grammarian", "grammarian", 1006, null, {
      wordOfDayUsage: [],
      goodLanguage: "",
      improvements: "",
    }),
    rep("mtg-2026-09-25:ttm", "table_topics", 1011, at("2026-09-25", "17:40"), {
      summary: "Good variety of topics; two responses ran short.",
    }),
  );

  // Workflow tasks and notifications come from the real event functions (R-10) ...
  const m2 = {
    id: "mtg-2026-10-02",
    startsAt: meetings.find((m) => m.id === "mtg-2026-10-02")!.startsAt,
  };
  const m9 = {
    id: "mtg-2026-10-09",
    startsAt: meetings.find((m) => m.id === "mtg-2026-10-09")!.startsAt,
  };
  const name = (n: number) => data.members.find((m) => m.id === mem(n))!.name;
  const voters = [1001, 1002, 1003, 1004, 1005, 1006, 1007].map(mem);

  // N-05 for every active member (read), as for 2 Oct; N-07 for Ananya's TMOD assignment (read)
  ev.n05ThemePublished(
    data,
    new Date(at("2026-09-25", "12:00")),
    m2,
    "New beginnings",
    "Embark",
  );
  ev.n07RoleChanged(
    data,
    new Date(at("2026-09-26", "09:00")),
    mem(1008),
    "You were assigned TMOD for 2 Oct",
    m2,
    "mtg-2026-10-02:tmod",
  );
  ev.n01MeetingOpened(data, new Date(at("2026-09-30", "10:00")), m9);
  ev.voteStarted(
    data,
    new Date(at("2026-09-30", "18:00")),
    data.votes[1],
    voters,
  );
  ev.levelLogged(data, new Date(at("2026-09-28", "10:00")), {
    id: "cmp-001",
    memberName: name(1008),
    level: 3,
  });
  ev.withdrawalRequested(
    data,
    { id: "wdr-001", memberName: name(1014), label: "Evaluator 1" },
    m2,
    "mtg-2026-10-02:evaluator-1",
  );
  ev.swapRequested(
    data,
    { id: "swp-001", requesterName: name(1007), targetId: mem(1013) },
    m2,
    "mtg-2026-10-02:ah-counter",
  );
  ev.n16Swap(
    data,
    new Date(at("2026-10-01", "17:30")),
    "swp-001",
    mem(1013),
    `${name(1007)} asked to swap Timer with your Ah-Counter role`,
    "requested",
    m2,
  );
  // ... then everything time-based is caught up to the mock clock: T-01, N-06, N-14, T-06, T-08, N-15
  tick(data, new Date(nowMs));

  // Read state per mock-data.md section 7: N-05, N-07 and N-12 (for those who voted) read; N-01 read for the
  // personas whose unread counts the walkthrough names; everything else unread.
  const readAt = new Date(nowMs).toISOString();
  const voted = new Set(
    data.voteParticipation
      .filter((p) => p.voteId === "vote-001")
      .map((p) => p.memberId),
  );
  const readN01 = new Set([1002, 1008, 1010, 1012, 1013, 1014].map(mem));
  for (const n of data.notifications) {
    if (n.code === "N-05" || n.code === "N-07") n.readAt = readAt;
    if (n.code === "N-12" && voted.has(n.memberId)) n.readAt = readAt;
    if (n.code === "N-01" && readN01.has(n.memberId)) n.readAt = readAt;
  }
  // Voters who already cast have no T-05 (section 7)
  data.tasks = data.tasks.filter(
    (t) => !(t.code === "T-05" && voted.has(t.memberId)),
  );
  return data;
}
