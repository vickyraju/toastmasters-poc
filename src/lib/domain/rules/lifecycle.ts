import type { MeetingStatus } from "../types";

export type LifecycleWarning = "OPEN_ROLES" | "MISSING_REPORTS";
export type LifecycleResult =
  | { ok: true; warnings: LifecycleWarning[] }
  | {
      ok: false;
      reason:
        | "NOT_ALLOWED"
        | "NO_VENUE_OR_LINK"
        | "NO_ROLES"
        | "NOT_ENDED"
        | "REASON_REQUIRED";
    };

const ALLOWED: Record<MeetingStatus, MeetingStatus[]> = {
  draft: ["open", "cancelled"],
  open: ["finalized", "cancelled"],
  finalized: ["open", "completed", "cancelled"],
  completed: [],
  cancelled: [],
};

/** R-07 transition table and its conditions. Warnings never block; the UI shows them before confirming. */
export function lifecycleCheck(input: {
  from: MeetingStatus;
  to: MeetingStatus;
  hasVenueOrLink: boolean;
  slotCount: number;
  openSlots: number;
  endsAt: Date;
  now: Date;
  missingReports: number;
  reason?: string | null;
}): LifecycleResult {
  const { from, to } = input;
  if (!ALLOWED[from].includes(to)) return { ok: false, reason: "NOT_ALLOWED" };
  const warnings: LifecycleWarning[] = [];
  if (from === "draft" && to === "open") {
    if (!input.hasVenueOrLink) return { ok: false, reason: "NO_VENUE_OR_LINK" };
    if (input.slotCount === 0) return { ok: false, reason: "NO_ROLES" };
  }
  if (to === "finalized" && input.openSlots > 0) warnings.push("OPEN_ROLES");
  if (to === "completed") {
    if (input.now.getTime() < input.endsAt.getTime())
      return { ok: false, reason: "NOT_ENDED" };
    if (input.missingReports > 0) warnings.push("MISSING_REPORTS");
  }
  if (to === "cancelled" && !input.reason?.trim())
    return { ok: false, reason: "REASON_REQUIRED" };
  return { ok: true, warnings };
}
