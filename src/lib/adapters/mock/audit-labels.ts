import { POSITION_LABELS } from "../../domain/constants";
import type { AuditEntry, Position } from "../../domain/types";
import { formatIST } from "../../time/ist";
import type { MockData } from "./state";

const day = (iso: string) => formatIST(iso, "EEE d MMM");

/** What an audit row was done to, in words. Falls back to the raw id if the record is gone. */
export function describeTarget(d: MockData, a: AuditEntry): string {
  const id = a.entityId;
  const meetingOfSlot = (slotId: string) => {
    const slot = d.meetingRoles.find((s) => s.id === slotId);
    const m = slot && d.meetings.find((x) => x.id === slot.meetingId);
    return slot && m ? `${slot.label}, ${day(m.startsAt)}` : null;
  };
  switch (a.entityType) {
    case "meeting": {
      const m = d.meetings.find((x) => x.id === id);
      return m ? `${m.title}, ${day(m.startsAt)}` : id;
    }
    case "meeting_role":
      return meetingOfSlot(id) ?? id;
    case "withdrawal_request": {
      const w = d.withdrawals.find((x) => x.id === id);
      return (w && meetingOfSlot(w.meetingRoleId)) ?? id;
    }
    case "role_swap": {
      const w = d.swaps.find((x) => x.id === id);
      const mine = w && d.meetingRoles.find((s) => s.id === w.requesterRoleId);
      const theirs = w && d.meetingRoles.find((s) => s.id === w.targetRoleId);
      const m = w && d.meetings.find((x) => x.id === w.meetingId);
      return mine && theirs && m
        ? `${mine.label} and ${theirs.label}, ${day(m.startsAt)}`
        : id;
    }
    case "completion": {
      const c = d.completions.find((x) => x.id === id);
      const who = c && d.members.find((m) => m.id === c.memberId)?.name;
      return c && who
        ? `${who}, ${c.kind === "level" ? `Level ${c.level}` : (c.projectName ?? "Project")}`
        : id;
    }
    case "vote":
      return d.votes.find((v) => v.id === id)?.title ?? id;
    case "member": {
      const m = d.members.find((x) => x.id === id);
      return m ? `${m.name} (${m.employeeId})` : id;
    }
    case "position":
      return POSITION_LABELS[id as Position] ?? id;
    case "club_settings":
      return id === "next_president" ? "Next President" : "Club settings";
    case "meeting_type":
      return d.meetingTypes.find((t) => t.id === id)?.name ?? id;
    case "role_template":
      return d.roleTemplates.find((t) => t.id === id)?.name ?? id;
    case "project":
      return d.projects.find((p) => p.id === id)?.name ?? id;
    case "recurring_template":
      return d.recurringTemplates.find((t) => t.id === id)?.name ?? id;
    default:
      return id; // "route": the path itself
  }
}
