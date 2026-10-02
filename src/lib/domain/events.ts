// R-10: tasks (T-xx) and notifications (N-xx) are created only here, one function per trigger,
// following flow.md sections 6 and 7. Functions mutate the data they are given (a draft copy).
import { LOCKED_NOTIF_CODES } from "./constants";
import { newId } from "./ids";
import type {
  Member,
  Notification,
  NotificationPref,
  NotifCode,
  PositionRow,
  Task,
  TaskCode,
} from "./types";
import { formatIST } from "../time/ist";

export interface EventData {
  members: Member[];
  positions: PositionRow[];
  tasks: Task[];
  notifications: Notification[];
  notifPrefs: NotificationPref[];
}

interface NotifInput {
  memberId: string;
  code: NotifCode;
  title: string;
  body?: string | null;
  link: string;
  dedupeKey?: string | null;
}

interface TaskInput {
  memberId: string;
  code: TaskCode;
  title: string;
  link: string;
  refType: string;
  refId: string;
  dueAt?: string | null;
  dedupeKey: string;
}

const active = (d: EventData) => d.members.filter((m) => m.status === "active");
const officers = (d: EventData) =>
  active(d).filter((m) => m.accountType !== "member");
const vpe = (d: EventData) => {
  const id = d.positions.find((p) => p.code === "vpe")?.memberId;
  return d.members.find((m) => m.id === id && m.status === "active");
};

/** Create a notification. Skips inactive recipients, opted-out non-locked codes, and duplicates. */
export function notify(
  d: EventData,
  at: Date,
  n: NotifInput,
): Notification | null {
  const to = d.members.find((m) => m.id === n.memberId);
  if (!to || to.status !== "active") return null;
  const optedOut = d.notifPrefs.some(
    (p) => p.memberId === n.memberId && p.code === n.code && !p.enabled,
  );
  if (optedOut && !(LOCKED_NOTIF_CODES as readonly string[]).includes(n.code))
    return null;
  if (
    n.dedupeKey &&
    d.notifications.some(
      (x) => x.memberId === n.memberId && x.dedupeKey === n.dedupeKey,
    )
  )
    return null;
  const row: Notification = {
    id: newId("ntf"),
    memberId: n.memberId,
    code: n.code,
    title: n.title,
    body: n.body ?? null,
    link: n.link,
    readAt: null,
    createdAt: at.toISOString(),
    dedupeKey: n.dedupeKey ?? null,
  };
  d.notifications.push(row);
  return row;
}

export function addTask(d: EventData, t: TaskInput): Task | null {
  if (
    d.tasks.some(
      (x) => x.memberId === t.memberId && x.dedupeKey === t.dedupeKey,
    )
  )
    return null;
  const row: Task = {
    id: newId("tsk"),
    memberId: t.memberId,
    code: t.code,
    title: t.title,
    link: t.link,
    refType: t.refType,
    refId: t.refId,
    dueAt: t.dueAt ?? null,
    doneAt: null,
    dedupeKey: t.dedupeKey,
  };
  d.tasks.push(row);
  return row;
}

/** A task is done by the action itself, never by opening the link (R-10). */
export function closeTasks(
  d: EventData,
  at: Date,
  match: (t: Task) => boolean,
): void {
  for (const t of d.tasks)
    if (!t.doneAt && match(t)) t.doneAt = at.toISOString();
}

/** Removes open tasks outright (cancelled meetings: "pending tasks for that meeting are removed"). */
export function removeTasks(d: EventData, match: (t: Task) => boolean): void {
  d.tasks = d.tasks.filter((t) => t.doneAt || !match(t));
}

const day = (iso: string) => formatIST(iso, "d MMM");
const rolesLink = (meetingId: string, slotId?: string) =>
  `/meetings/${meetingId}?tab=roles${slotId ? `&slot=${slotId}` : ""}`;

interface MeetingRef {
  id: string;
  startsAt: string;
}

// ---- Notifications ----
export const n01MeetingOpened = (d: EventData, at: Date, m: MeetingRef) =>
  active(d).forEach((p) =>
    notify(d, at, {
      memberId: p.id,
      code: "N-01",
      title: `Roles open for ${day(m.startsAt)}`,
      link: rolesLink(m.id),
      dedupeKey: `N-01:${m.id}`,
    }),
  );

export const n02Finalized = (
  d: EventData,
  at: Date,
  m: MeetingRef,
  holderIds: string[],
) =>
  holderIds.forEach((id) =>
    notify(d, at, {
      memberId: id,
      code: "N-02",
      title: `Meeting on ${day(m.startsAt)} is finalized`,
      link: `/meetings/${m.id}?tab=agenda`,
      dedupeKey: `N-02:${m.id}:${at.getTime()}`,
    }),
  );

export const n03Rescheduled = (
  d: EventData,
  at: Date,
  m: MeetingRef,
  holderIds: string[],
) =>
  holderIds.forEach((id) =>
    notify(d, at, {
      memberId: id,
      code: "N-03",
      title: `Meeting moved to ${formatIST(m.startsAt, "EEE d MMM, h:mm a")}`,
      link: `/meetings/${m.id}`,
      dedupeKey: `N-03:${m.id}:${m.startsAt}`,
    }),
  );

export const n04Cancelled = (
  d: EventData,
  at: Date,
  m: MeetingRef,
  holderIds: string[],
) =>
  holderIds.forEach((id) =>
    notify(d, at, {
      memberId: id,
      code: "N-04",
      title: `Meeting on ${day(m.startsAt)} was cancelled`,
      link: `/meetings/${m.id}`,
      dedupeKey: `N-04:${m.id}`,
    }),
  );

export const n05ThemePublished = (
  d: EventData,
  at: Date,
  m: MeetingRef,
  theme: string | null,
  word: string | null,
) =>
  active(d).forEach((p) =>
    notify(d, at, {
      memberId: p.id,
      code: "N-05",
      title: `Theme for ${day(m.startsAt)} published${theme ? `: ${theme}` : ""}`,
      link: `/meetings/${m.id}`,
      dedupeKey: `N-05:${m.id}:${theme ?? ""}|${word ?? ""}`,
    }),
  );

/** N-06 plus T-01 for one report role holder once the meeting has ended. */
export function reportDue(
  d: EventData,
  at: Date,
  m: MeetingRef,
  slot: { id: string; memberId: string; roleName: string },
) {
  const link = `/meetings/${m.id}?tab=reports&slot=${slot.id}`;
  notify(d, at, {
    memberId: slot.memberId,
    code: "N-06",
    title: `Your ${slot.roleName} report for ${day(m.startsAt)} is due`,
    link,
    dedupeKey: `N-06:${slot.id}`,
  });
  addTask(d, {
    memberId: slot.memberId,
    code: "T-01",
    title: `Submit ${slot.roleName} report (${day(m.startsAt)})`,
    link,
    refType: "meeting_role",
    refId: slot.id,
    dueAt: at.toISOString(), // the meeting end that made it due
    dedupeKey: `T-01:${slot.id}`,
  });
}

export const n07RoleChanged = (
  d: EventData,
  at: Date,
  memberId: string,
  text: string,
  m: MeetingRef,
  slotId: string,
) =>
  notify(d, at, {
    memberId,
    code: "N-07",
    title: text,
    link: rolesLink(m.id, slotId),
    dedupeKey: `N-07:${slotId}:${at.getTime()}:${memberId}`,
  });

/** N-09 plus T-03 for the VPE when a level completion is logged. */
export function levelLogged(
  d: EventData,
  at: Date,
  c: { id: string; memberName: string; level: number },
) {
  const v = vpe(d);
  if (!v) return;
  const link = "/progress/club?tab=queue";
  notify(d, at, {
    memberId: v.id,
    code: "N-09",
    title: `${c.memberName} logged a Level ${c.level} completion`,
    link,
    dedupeKey: `N-09:${c.id}`,
  });
  addTask(d, {
    memberId: v.id,
    code: "T-03",
    title: `Verify ${c.memberName}'s Level ${c.level}`,
    link,
    refType: "completion",
    refId: c.id,
    dedupeKey: `T-03:${c.id}`,
  });
}

export const n10LevelDecided = (
  d: EventData,
  at: Date,
  c: {
    id: string;
    memberId: string;
    level: number;
    verified: boolean;
    reason?: string | null;
  },
) =>
  notify(d, at, {
    memberId: c.memberId,
    code: "N-10",
    link: "/progress",
    dedupeKey: `N-10:${c.id}:${c.verified ? "v" : "r"}`,
    title: c.verified
      ? `Your Level ${c.level} completion was verified`
      : `Your Level ${c.level} completion was rejected`,
    body: c.verified ? null : (c.reason ?? null),
  });

/** N-12 plus T-05 for every eligible voter when a vote starts. */
export function voteStarted(
  d: EventData,
  at: Date,
  v: { id: string; title: string; deadlineAt: string | null },
  voterIds: string[],
) {
  for (const id of voterIds) {
    notify(d, at, {
      memberId: id,
      code: "N-12",
      title: `Vote started: ${v.title}`,
      link: `/votes/${v.id}`,
      dedupeKey: `N-12:${v.id}`,
    });
    addTask(d, {
      memberId: id,
      code: "T-05",
      title: `Cast your vote: ${v.title}`,
      link: `/votes/${v.id}`,
      refType: "vote",
      refId: v.id,
      dueAt: v.deadlineAt,
      dedupeKey: `T-05:${v.id}`,
    });
  }
}

export function voteClosed(
  d: EventData,
  at: Date,
  v: { id: string; title: string },
  voterIds: string[],
) {
  for (const id of voterIds)
    notify(d, at, {
      memberId: id,
      code: "N-13",
      title: `Vote closed: ${v.title}`,
      link: `/votes/${v.id}`,
      dedupeKey: `N-13:${v.id}`,
    });
  closeTasks(d, at, (t) => t.code === "T-05" && t.refId === v.id);
}

/** N-14 reminder for one role holder. `when` is the threshold that just passed. */
export function reminder(
  d: EventData,
  at: Date,
  m: MeetingRef,
  slot: { id: string; memberId: string; label: string },
  when: "3d" | "1d" | "3h",
) {
  const time = formatIST(m.startsAt, "h:mm a");
  const phrase =
    when === "1d"
      ? `tomorrow, ${time}`
      : when === "3h"
        ? `today, ${time}`
        : `on ${formatIST(m.startsAt, "EEE d MMM")}, ${time}`;
  notify(d, at, {
    memberId: slot.memberId,
    code: "N-14",
    title: `Reminder: you are ${slot.label} ${phrase}`,
    link: rolesLink(m.id, slot.id),
    dedupeKey: `N-14:${slot.id}:${new Date(m.startsAt).getTime()}:${when}`,
  });
}

/** N-15 plus T-08 for ExComm when roles are still open 48 hours out. */
export function unfilledRoles(
  d: EventData,
  at: Date,
  m: MeetingRef,
  openCount: number,
) {
  for (const o of officers(d)) {
    notify(d, at, {
      memberId: o.id,
      code: "N-15",
      title: `${openCount} ${openCount === 1 ? "role" : "roles"} still open for ${day(m.startsAt)}`,
      link: rolesLink(m.id),
      dedupeKey: `N-15:${m.id}:${new Date(m.startsAt).getTime()}`,
    });
    addTask(d, {
      memberId: o.id,
      code: "T-08",
      title: `Fill open roles (${day(m.startsAt)})`,
      link: rolesLink(m.id),
      refType: "meeting",
      refId: m.id,
      dueAt: m.startsAt,
      dedupeKey: `T-08:${m.id}:${new Date(m.startsAt).getTime()}`,
    });
  }
}

export const n16Swap = (
  d: EventData,
  at: Date,
  swapId: string,
  toId: string,
  title: string,
  state: "requested" | "accepted" | "declined",
  m: MeetingRef,
) =>
  notify(d, at, {
    memberId: toId,
    code: "N-16",
    title,
    link: rolesLink(m.id),
    dedupeKey: `N-16:${swapId}:${state}:${toId}`,
  });

export const n17WithdrawalDecided = (
  d: EventData,
  at: Date,
  w: { id: string; memberId: string; label: string; approved: boolean },
  m: MeetingRef,
  slotId: string,
) =>
  notify(d, at, {
    memberId: w.memberId,
    code: "N-17",
    title: `Your withdrawal request for ${w.label} on ${day(m.startsAt)} was ${w.approved ? "approved" : "rejected"}`,
    link: rolesLink(m.id, slotId),
    dedupeKey: `N-17:${w.id}`,
  });

// ---- Tasks ----
/** T-02 for every ExComm member when a withdrawal request is created inside the cutoff. */
export const withdrawalRequested = (
  d: EventData,
  w: { id: string; memberName: string; label: string },
  m: MeetingRef,
  slotId: string,
) =>
  officers(d).forEach((o) =>
    addTask(d, {
      memberId: o.id,
      code: "T-02",
      title: `Approve or reject ${w.memberName}'s withdrawal (${w.label}, ${day(m.startsAt)})`,
      link: rolesLink(m.id, slotId),
      refType: "withdrawal",
      refId: w.id,
      dueAt: m.startsAt,
      dedupeKey: `T-02:${w.id}`,
    }),
  );

export const swapRequested = (
  d: EventData,
  s: { id: string; requesterName: string; targetId: string },
  m: MeetingRef,
  slotId: string,
) =>
  addTask(d, {
    memberId: s.targetId,
    code: "T-04",
    title: `Answer swap request from ${s.requesterName}`,
    link: rolesLink(m.id, slotId),
    refType: "swap",
    refId: s.id,
    dueAt: m.startsAt,
    dedupeKey: `T-04:${s.id}`,
  });

export const speechDetailsMissing = (
  d: EventData,
  m: MeetingRef,
  slot: { id: string; memberId: string },
) =>
  addTask(d, {
    memberId: slot.memberId,
    code: "T-06",
    title: `Add speech project and title (${day(m.startsAt)})`,
    link: rolesLink(m.id, slot.id),
    refType: "meeting_role",
    refId: slot.id,
    dueAt: m.startsAt,
    dedupeKey: `T-06:${slot.id}`,
  });

export const themeMissing = (d: EventData, m: MeetingRef, tmodId: string) =>
  addTask(d, {
    memberId: tmodId,
    code: "T-07",
    title: `Set theme and word of the day (${day(m.startsAt)})`,
    link: `/meetings/${m.id}?tab=overview`,
    refType: "meeting",
    refId: m.id,
    dueAt: m.startsAt,
    dedupeKey: `T-07:${m.id}`,
  });

/** N-08: a new meeting type, agenda template or role list was added. */
export const n08TemplateAdded = (
  d: EventData,
  at: Date,
  key: string,
  title: string,
) =>
  active(d).forEach((p) =>
    notify(d, at, {
      memberId: p.id,
      code: "N-08",
      title,
      link: "/meetings",
      dedupeKey: `N-08:${key}`,
    }),
  );
