import { AppError } from "../../services/errors";
import type {
  AuditAction,
  Meeting,
  MeetingRole,
  RoleTemplate,
} from "../../domain/types";
import { appendAudit } from "./tick";
import type { MockData } from "./state";

export const meetingOf = (d: MockData, id: string): Meeting => {
  const m = d.meetings.find((x) => x.id === id);
  if (!m) throw new AppError("NOT_FOUND", "Meeting not found.");
  return m;
};

export const slotOf = (d: MockData, id: string): MeetingRole => {
  const s = d.meetingRoles.find((x) => x.id === id);
  if (!s) throw new AppError("NOT_FOUND", "Role not found.");
  return s;
};

export const tmplOf = (d: MockData, slot: MeetingRole): RoleTemplate =>
  d.roleTemplates.find((t) => t.id === slot.roleTemplateId)!;

export const memberName = (d: MockData, id: string | null): string =>
  d.members.find((m) => m.id === id)?.name ?? "A member";

export const isLocked = (m: Meeting) =>
  m.status === "completed" || m.status === "cancelled";

/** Throws INVALID_STATE for Completed and Cancelled meetings (read-only, R-07). */
export function assertEditable(m: Meeting): void {
  if (isLocked(m))
    throw new AppError(
      "INVALID_STATE",
      m.status === "completed"
        ? "This meeting is completed and read-only."
        : "This meeting was cancelled.",
    );
}

export const holdersOf = (d: MockData, meetingId: string): string[] => [
  ...new Set(
    d.meetingRoles
      .filter((s) => s.meetingId === meetingId && s.memberId)
      .map((s) => s.memberId as string),
  ),
];

export const tmodHolder = (d: MockData, meetingId: string): string | null =>
  d.meetingRoles.find(
    (s) =>
      s.meetingId === meetingId &&
      d.roleTemplates.find((t) => t.id === s.roleTemplateId)?.code === "tmod",
  )?.memberId ?? null;

export const log = (
  d: MockData,
  at: Date,
  actorId: string | null,
  action: AuditAction,
  entityType: string,
  entityId: string,
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
) => appendAudit(d, actorId, action, entityType, entityId, at, before, after);

export const touch = (d: MockData, memberId: string, at: Date) => {
  const m = d.members.find((x) => x.id === memberId);
  if (m) m.lastActiveAt = at.toISOString();
};

/** A slot's holder changed: swaps and withdrawal requests on it are moot, and so are their tasks. */
export function expireSlotRequests(
  d: MockData,
  slotId: string,
  at: Date,
  byId: string | null,
): void {
  for (const s of d.swaps) {
    if (
      s.status === "pending" &&
      (s.requesterRoleId === slotId || s.targetRoleId === slotId)
    ) {
      s.status = "cancelled";
      s.decidedAt = at.toISOString();
      for (const t of d.tasks)
        if (!t.doneAt && t.code === "T-04" && t.refId === s.id)
          t.doneAt = at.toISOString();
    }
  }
  for (const w of d.withdrawals) {
    if (w.status === "pending" && w.meetingRoleId === slotId) {
      w.status = "rejected";
      w.decidedBy = byId;
      w.decidedAt = at.toISOString();
      for (const t of d.tasks)
        if (!t.doneAt && t.code === "T-02" && t.refId === w.id)
          t.doneAt = at.toISOString();
    }
  }
}

const ALLOWED_FILES: Record<string, string[]> = {
  "application/pdf": ["pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    "docx",
  ],
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
};
const MAX_BYTES = 10 * 1024 * 1024;

/** R-14: PDF, DOCX, PNG or JPG, up to 10 MB, checked by type and extension. Returns a clean file name. */
export function validateUpload(file: {
  name: string;
  mimeType: string;
  sizeBytes: number;
}): string {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!(ALLOWED_FILES[file.mimeType] ?? []).includes(ext))
    throw new AppError("VALIDATION", "Upload a PDF, DOCX, PNG or JPG file.", {
      fields: { file: "Upload a PDF, DOCX, PNG or JPG file." },
    });
  if (file.sizeBytes > MAX_BYTES)
    throw new AppError("VALIDATION", "The file must be 10 MB or smaller.", {
      fields: { file: "The file must be 10 MB or smaller." },
    });
  return file.name
    .split(/[\\/]/)
    .pop()!
    .replace(/[^A-Za-z0-9._-]/g, "_");
}
