import { AppError } from "../../services/errors";
import type {
  MeetingReportsView,
  ReportInput,
  ReportItem,
  ReportsService,
  SpeakerLine,
} from "../../services/interfaces";
import {
  ahCounterPayload,
  grammarianPayload,
  summaryPayload,
  timerInput,
  REPORT_SUMMARY_REQUIRED,
} from "../../domain/schemas";
import { timerCard } from "../../domain/rules/timerCard";
import { can } from "../../permissions/can";
import * as ev from "../../domain/events";
import { now } from "../../time/clock";
import type {
  MeetingReport,
  MeetingRole,
  ReportKind,
  ReportPayload,
  TimerPayload,
} from "../../domain/types";
import type { ZodType, ZodTypeDef } from "zod";
import { me, mutate, runTick, type Ctx } from "./runtime";
import { meetingOf, memberName, slotOf, tmplOf, touch } from "./helpers";
import type { MockData } from "./state";

function parse<T>(schema: ZodType<T, ZodTypeDef, unknown>, value: unknown): T {
  const r = schema.safeParse(value);
  if (r.success) return r.data;
  const fields = Object.fromEntries(
    r.error.issues.map((i) => [
      String(i.path.join(".") || "report"),
      i.message,
    ]),
  );
  throw new AppError("VALIDATION", "Check the numbers you entered.", {
    fields,
  });
}

const isSpeaker = (d: MockData, s: MeetingRole) => tmplOf(d, s).isSpeaker;

function speakerLines(d: MockData, meetingId: string): SpeakerLine[] {
  return d.meetingRoles
    .filter((s) => s.meetingId === meetingId && isSpeaker(d, s))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => {
      const sp = d.speakerDetails.find((x) => x.meetingRoleId === s.id);
      return {
        slotId: s.id,
        label: s.label,
        memberId: s.memberId,
        name: s.memberId ? memberName(d, s.memberId) : null,
        title: sp?.title ?? null,
        minSeconds: sp?.minSeconds ?? null,
        maxSeconds: sp?.maxSeconds ?? null,
      };
    });
}

/** Validate a payload for its kind and, for the timer, compute every card from the slot limits (R-04). */
function normalise(
  d: MockData,
  slot: MeetingRole,
  kind: ReportKind,
  input: ReportInput,
  submitting: boolean,
): ReportPayload {
  switch (kind) {
    case "timer": {
      const { rows } = parse(timerInput, input);
      const grace = d.settings.timerGraceSeconds;
      const lines = new Map(
        speakerLines(d, slot.meetingId).map((l) => [l.slotId, l]),
      );
      const out: TimerPayload = {
        rows: rows.map((r) => {
          const line = lines.get(r.speakerSlotId);
          if (!line)
            throw new AppError(
              "VALIDATION",
              "That speaker is not in this meeting.",
            );
          // Speakers without limits cannot be scored: the time is kept, the card is "none" (R-04).
          const card =
            line.minSeconds != null && line.maxSeconds != null
              ? timerCard(r.seconds, line.minSeconds, line.maxSeconds, grace)
              : "none";
          return { speakerSlotId: r.speakerSlotId, seconds: r.seconds, card };
        }),
      };
      return out;
    }
    case "ah_counter":
      return parse(ahCounterPayload, input);
    case "grammarian":
      return parse(grammarianPayload, input);
    default: {
      const p = parse(summaryPayload, input);
      if (submitting && !p.summary.trim())
        throw new AppError("VALIDATION", REPORT_SUMMARY_REQUIRED, {
          fields: { summary: REPORT_SUMMARY_REQUIRED },
        });
      return { summary: p.summary.trim() };
    }
  }
}

function itemOf(d: MockData, slot: MeetingRole, viewer: string): ReportItem {
  const tpl = tmplOf(d, slot);
  const rep = d.reports.find((r) => r.meetingRoleId === slot.id);
  return {
    slotId: slot.id,
    roleName: tpl.name,
    kind: tpl.reportKind!,
    holder: slot.memberId
      ? { id: slot.memberId, name: memberName(d, slot.memberId) }
      : null,
    status: !rep ? "not_started" : rep.submittedAt ? "submitted" : "draft",
    submittedAt: rep?.submittedAt ?? null,
    payload: rep?.payload ?? null,
    mine: slot.memberId === viewer,
  };
}

function ids(payload: ReportPayload | null): string[] {
  if (!payload) return [];
  if ("rows" in payload)
    return payload.rows.flatMap((r) => ("memberId" in r ? [r.memberId] : []));
  if ("wordOfDayUsage" in payload)
    return payload.wordOfDayUsage.map((u) => u.memberId);
  return [];
}

export function reportsService({ store, call }: Ctx): ReportsService {
  /** Shared by save and submit. */
  const write = (
    slotId: string,
    input: ReportInput,
    submitting: boolean,
    sid: string | null,
  ) =>
    mutate(store, (d): ReportItem => {
      const { actor, member } = me(d, sid);
      const slot = slotOf(d, slotId);
      const tpl = tmplOf(d, slot);
      if (!tpl.reportKind)
        throw new AppError("INVALID_STATE", "This role has no report.");
      const m = meetingOf(d, slot.meetingId);
      if (m.status === "completed")
        throw new AppError(
          "CLOSED",
          "This meeting is completed. Reports are locked.",
        );
      if (m.status === "cancelled")
        throw new AppError("INVALID_STATE", "This meeting was cancelled.");
      if (
        !can(actor, "report.submit", {
          meetingStatus: m.status,
          roleHolderId: slot.memberId,
        })
      )
        throw new AppError(
          "FORBIDDEN",
          "Only the person with this role can write this report.",
        );
      const at = now();
      if (at.getTime() < Date.parse(m.endsAt))
        throw new AppError(
          "INVALID_STATE",
          "Reports open after the meeting ends.",
        );
      const payload = normalise(d, slot, tpl.reportKind, input, submitting);
      let rep = d.reports.find((r) => r.meetingRoleId === slot.id);
      if (!rep) {
        rep = {
          id: `rpt-${d.reports.length + 1}-${slot.id}`,
          meetingId: m.id,
          meetingRoleId: slot.id,
          kind: tpl.reportKind,
          submittedBy: member.id,
          submittedAt: null,
          payload,
        };
        d.reports.push(rep);
      }
      (rep as MeetingReport).payload = payload;
      if (submitting) {
        rep.submittedAt = at.toISOString();
        ev.closeTasks(d, at, (t) => t.code === "T-01" && t.refId === slot.id);
      }
      touch(d, member.id, at);
      return itemOf(d, slot, member.id);
    });

  return {
    forMeeting: (meetingId) =>
      call((sid): MeetingReportsView => {
        runTick(store);
        const d = store.getState();
        const { actor, member } = me(d, sid);
        const m = meetingOf(d, meetingId);
        if (!can(actor, "meeting.view", { meetingStatus: m.status }))
          throw new AppError("FORBIDDEN", "You do not have access to this.");
        const at = now().getTime();
        const phase =
          m.status === "cancelled"
            ? "cancelled"
            : m.status === "completed"
              ? "completed"
              : at < Date.parse(m.endsAt)
                ? "before_end"
                : "open";
        const reportSlots = d.meetingRoles
          .filter((s) => s.meetingId === meetingId && tmplOf(d, s).reportKind)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const visible =
          phase === "before_end" || phase === "cancelled"
            ? []
            : reportSlots.filter((s) =>
                can(actor, "report.view", {
                  meetingStatus: m.status,
                  roleHolderId: s.memberId,
                }),
              );
        const items = visible.map((s) => itemOf(d, s, member.id));
        const officer = can(actor, "meeting.update");
        const names: Record<string, string> = {};
        for (const i of items)
          for (const id of ids(i.payload)) names[id] = memberName(d, id);
        return {
          phase,
          items,
          speakers: speakerLines(d, meetingId),
          graceSeconds: d.settings.timerGraceSeconds,
          outstanding:
            officer && phase === "open"
              ? reportSlots.filter(
                  (s) =>
                    !d.reports.some(
                      (r) => r.meetingRoleId === s.id && r.submittedAt,
                    ),
                ).length
              : null,
          wordOfTheDay: m.wordOfTheDay,
          names,
        };
      }),
    save: (slotId, payload) =>
      call((sid) => write(slotId, payload, false, sid)),
    submit: (slotId, payload) =>
      call((sid) => write(slotId, payload, true, sid)),
  };
}
