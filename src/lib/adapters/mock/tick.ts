// Time-based rules from architecture.md section 7, run against the mock clock. Idempotent through
// dedupe keys, so calling it on every load or clock jump is safe.
import * as ev from "../../domain/events";
import { newId } from "../../domain/ids";
import type { MockData } from "./state";

const HOUR = 3_600_000;

export function appendAudit(
  d: MockData,
  actorId: string | null,
  action: import("../../domain/types").AuditAction,
  entityType: string,
  entityId: string,
  at: Date,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
) {
  d.audit.push({
    id: newId("aud"),
    actorId,
    action,
    entityType,
    entityId,
    before,
    after,
    createdAt: at.toISOString(),
  });
}

/** Close a vote (R-13): by the President's action or by the deadline job (closedBy null). */
export function closeVote(
  d: MockData,
  at: Date,
  voteId: string,
  closedBy: string | null,
) {
  const v = d.votes.find((x) => x.id === voteId);
  if (!v || v.status === "closed") return;
  v.status = "closed";
  v.closedAt = at.toISOString();
  v.closedBy = closedBy;
  const voters = d.voteEligible
    .filter((e) => e.voteId === voteId)
    .map((e) => e.memberId);
  ev.voteClosed(d, at, v, voters);
  appendAudit(
    d,
    closedBy,
    "vote.close",
    "vote",
    voteId,
    at,
    { status: "open" },
    { status: "closed" },
  );
}

export function tick(d: MockData, now: Date): void {
  const nowMs = now.getTime();
  const tmplOf = (id: string) => d.roleTemplates.find((t) => t.id === id)!;

  for (const m of d.meetings) {
    if (m.status !== "open" && m.status !== "finalized") continue;
    const start = Date.parse(m.startsAt);
    const end = Date.parse(m.endsAt);
    const slots = d.meetingRoles.filter((s) => s.meetingId === m.id);

    // T-01 and N-06: meeting has ended and a report role has no submitted report
    if (end <= nowMs) {
      for (const s of slots) {
        const tpl = tmplOf(s.roleTemplateId);
        if (!tpl.reportKind || !s.memberId) continue;
        if (d.reports.some((r) => r.meetingRoleId === s.id && r.submittedAt))
          continue;
        ev.reportDue(d, new Date(end), m, {
          id: s.id,
          memberId: s.memberId,
          roleName: tpl.name,
        });
      }
      continue;
    }

    const until = start - nowMs;
    if (until <= 0) continue;

    // N-14: the tightest reminder threshold that has passed (3 days, 1 day, 3 hours)
    const when =
      until <= 3 * HOUR
        ? "3h"
        : until <= 24 * HOUR
          ? "1d"
          : until <= 72 * HOUR
            ? "3d"
            : null;
    if (when) {
      const lead = { "3h": 3 * HOUR, "1d": 24 * HOUR, "3d": 72 * HOUR }[when];
      for (const s of slots)
        if (s.memberId)
          ev.reminder(
            d,
            new Date(start - lead),
            m,
            { id: s.id, memberId: s.memberId, label: s.label },
            when,
          );
    }

    // T-06 and T-07: 3 days before
    if (until <= 72 * HOUR) {
      for (const s of slots) {
        const tpl = tmplOf(s.roleTemplateId);
        if (tpl.isSpeaker && s.memberId) {
          const sd = d.speakerDetails.find((x) => x.meetingRoleId === s.id);
          if (!sd?.title || (!sd.projectId && !sd.projectName))
            ev.speechDetailsMissing(d, m, { id: s.id, memberId: s.memberId });
        }
        if (tpl.code === "tmod" && s.memberId && (!m.theme || !m.wordOfTheDay))
          ev.themeMissing(d, m, s.memberId);
      }
    }

    // T-08 and N-15: 48 hours before with unfilled roles
    const open = slots.filter((s) => s.status === "open").length;
    if (until <= 48 * HOUR && open > 0)
      ev.unfilledRoles(d, new Date(start - 48 * HOUR), m, open);
  }

  // Vote deadlines
  for (const v of d.votes)
    if (
      v.status === "open" &&
      v.deadlineAt &&
      Date.parse(v.deadlineAt) <= nowMs
    )
      closeVote(d, new Date(v.deadlineAt), v.id, null);
}
