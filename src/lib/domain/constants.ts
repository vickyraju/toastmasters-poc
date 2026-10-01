// Enums and fixed names from schema.md section 2 and 8. Import these; never hard-code strings.
export const ACCOUNT_TYPES = ["member", "excomm", "president"] as const;
export const POSITIONS = [
  "president",
  "vpe",
  "vpm",
  "vppr",
  "secretary",
  "treasurer",
  "saa",
] as const;
export const MEMBER_STATUS = ["active", "inactive", "removed"] as const;
export const MEETING_STATUS = [
  "draft",
  "open",
  "finalized",
  "completed",
  "cancelled",
] as const;
export const ROLE_CATEGORY = ["main", "support", "report"] as const;
export const REPORT_KIND = [
  "timer",
  "ah_counter",
  "grammarian",
  "table_topics",
  "general_evaluator",
] as const;
export const SLOT_STATUS = ["open", "filled"] as const;
export const WITHDRAWAL_STATUS = ["pending", "approved", "rejected"] as const;
export const SWAP_STATUS = [
  "pending",
  "accepted",
  "declined",
  "cancelled",
] as const;
export const COMPLETION_KIND = ["project", "level"] as const;
export const COMPLETION_STATUS = [
  "counted",
  "pending",
  "verified",
  "rejected",
] as const;
export const CARD = ["green", "yellow", "red", "disqualified", "none"] as const;
export const VOTE_STATUS = ["open", "closed"] as const;
export const TASK_CODES = [
  "T-01",
  "T-02",
  "T-03",
  "T-04",
  "T-05",
  "T-06",
  "T-07",
  "T-08",
] as const;
export const NOTIF_CODES = [
  "N-01",
  "N-02",
  "N-03",
  "N-04",
  "N-05",
  "N-06",
  "N-07",
  "N-08",
  "N-09",
  "N-10",
  "N-11",
  "N-12",
  "N-13",
  "N-14",
  "N-15",
  "N-16",
  "N-17",
] as const;
export const AUDIT_ACTIONS = [
  "role.assign",
  "role.reassign",
  "role.override",
  "role.withdraw",
  "role.withdraw_request",
  "role.withdraw_decision",
  "role.swap",
  "meeting.create",
  "meeting.update",
  "meeting.reschedule",
  "meeting.cancel",
  "meeting.status",
  "member.add",
  "member.update",
  "member.remove",
  "position.assign",
  "position.remove",
  "president.transfer",
  "level.verify",
  "level.reject",
  "vote.start",
  "vote.close",
  "template.change",
  "settings.change",
] as const;

export const ERROR_CODES = [
  "VALIDATION",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "SLOT_TAKEN",
  "ALREADY_HAS_MAIN_ROLE",
  "ALREADY_VOTED",
  "STALE",
  "INVALID_STATE",
  "NOT_ELIGIBLE",
  "INSIDE_CUTOFF",
  "CLOSED",
  "INTERNAL",
] as const;

/** Display names use the abbreviations the docs use (design.md S-13). */
export const POSITION_LABELS: Record<(typeof POSITIONS)[number], string> = {
  president: "President",
  vpe: "VPE",
  vpm: "VPM",
  vppr: "VPPR",
  secretary: "Secretary",
  treasurer: "Treasurer",
  saa: "SAA",
};

/** Notifications that cannot be switched off (FR-40, R-10). */
export const LOCKED_NOTIF_CODES = [
  "N-03",
  "N-04",
  "N-07",
  "N-14",
  "N-17",
] as const;

export const MAX_LEVEL = 5;
export const DEFAULT_WITHDRAWAL_CUTOFF_HOURS = 24;
export const DEFAULT_TIMER_GRACE_SECONDS = 30;
export const CLUB_TIMEZONE = "Asia/Kolkata";
