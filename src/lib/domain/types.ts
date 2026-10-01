// Entity types mirroring schema.md section 3 (camelCase). Add a field to schema.md first.
import type {
  ACCOUNT_TYPES,
  AUDIT_ACTIONS,
  CARD,
  COMPLETION_KIND,
  COMPLETION_STATUS,
  ERROR_CODES,
  MEETING_STATUS,
  MEMBER_STATUS,
  NOTIF_CODES,
  POSITIONS,
  REPORT_KIND,
  ROLE_CATEGORY,
  SLOT_STATUS,
  SWAP_STATUS,
  TASK_CODES,
  VOTE_STATUS,
  WITHDRAWAL_STATUS,
} from "./constants";

export type AccountType = (typeof ACCOUNT_TYPES)[number];
export type Position = (typeof POSITIONS)[number];
export type MemberStatus = (typeof MEMBER_STATUS)[number];
export type MeetingStatus = (typeof MEETING_STATUS)[number];
export type RoleCategory = (typeof ROLE_CATEGORY)[number];
export type ReportKind = (typeof REPORT_KIND)[number];
export type SlotStatus = (typeof SLOT_STATUS)[number];
export type WithdrawalStatus = (typeof WITHDRAWAL_STATUS)[number];
export type SwapStatus = (typeof SWAP_STATUS)[number];
export type CompletionKind = (typeof COMPLETION_KIND)[number];
export type CompletionStatus = (typeof COMPLETION_STATUS)[number];
export type Card = (typeof CARD)[number];
export type VoteStatus = (typeof VOTE_STATUS)[number];
export type TaskCode = (typeof TASK_CODES)[number];
export type NotifCode = (typeof NOTIF_CODES)[number];
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type ErrorCode = (typeof ERROR_CODES)[number];

/** Timestamps are ISO-8601 UTC strings; dates are `YYYY-MM-DD`. */
type ISO = string;
type ID = string;

export interface Member {
  id: ID;
  employeeId: string;
  name: string;
  email: string;
  toastmastersId: string | null;
  pathway: string | null;
  currentLevel: number;
  accountType: AccountType;
  status: MemberStatus;
  joinedAt: string | null;
  lastActiveAt: ISO | null;
}

export interface PositionRow {
  id: ID;
  code: Position;
  memberId: ID | null;
  assignedAt: ISO | null;
  assignedBy: ID | null;
}

export interface MeetingType {
  id: ID;
  name: string;
  defaultDurationMinutes: number;
  isActive: boolean;
}

export interface RoleTemplate {
  id: ID;
  code: string;
  name: string;
  category: RoleCategory;
  reportKind: ReportKind | null;
  isSpeaker: boolean;
  isEvaluator: boolean;
  defaultCount: number;
}

export interface MeetingTypeRole {
  meetingTypeId: ID;
  roleTemplateId: ID;
  count: number;
  sortOrder: number;
}

export interface MeetingTypeAgendaItem {
  id: ID;
  meetingTypeId: ID;
  sortOrder: number;
  title: string;
  durationMinutes: number;
  roleTemplateId: ID | null;
}

export interface RecurringTemplate {
  id: ID;
  name: string;
  meetingTypeId: ID;
  weekday: number;
  startTime: string;
  durationMinutes: number;
  venue: string | null;
  meetingLink: string | null;
  weeksAhead: number;
  skipDates: string[];
  isActive: boolean;
}

export interface Meeting {
  id: ID;
  title: string;
  meetingTypeId: ID;
  templateId: ID | null;
  startsAt: ISO;
  endsAt: ISO;
  venue: string | null;
  meetingLink: string | null;
  status: MeetingStatus;
  theme: string | null;
  welcomeNote: string | null;
  wordOfTheDay: string | null;
  wordMeaning: string | null;
  themePublishedAt: ISO | null;
  agendaFileId: ID | null;
  withdrawalCutoffHours: number | null;
  cancelledReason: string | null;
  completedAt: ISO | null;
  createdBy: ID;
}

export interface MeetingRole {
  id: ID;
  meetingId: ID;
  roleTemplateId: ID;
  label: string;
  sortOrder: number;
  memberId: ID | null;
  status: SlotStatus;
  isMain: boolean;
  assignedBy: ID | null;
  assignedAt: ISO | null;
  version: number;
  evaluatesSlotId: ID | null;
}

export interface SpeakerDetails {
  meetingRoleId: ID;
  pathway: string | null;
  level: number | null;
  projectId: ID | null;
  projectName: string | null;
  title: string | null;
  objectives: string | null;
  minSeconds: number | null;
  maxSeconds: number | null;
  evalFormUrl: string | null;
}

export interface PathwaysProject {
  id: ID;
  pathway: string;
  level: number;
  name: string;
  minSeconds: number;
  maxSeconds: number;
  isCustom: boolean;
}

export interface TimerPayload {
  rows: { speakerSlotId: ID; seconds: number; card: Card }[];
}
export interface AhCounterPayload {
  rows: { memberId: ID; total: number; breakdown?: Record<string, number> }[];
}
export interface GrammarianPayload {
  wordOfDayUsage: { memberId: ID; count: number }[];
  goodLanguage: string;
  improvements: string;
}
export interface SummaryPayload {
  summary: string;
}
export type ReportPayload =
  TimerPayload | AhCounterPayload | GrammarianPayload | SummaryPayload;

export interface MeetingReport {
  id: ID;
  meetingId: ID;
  meetingRoleId: ID;
  kind: ReportKind;
  submittedBy: ID;
  submittedAt: ISO | null;
  payload: ReportPayload;
}

export interface Completion {
  id: ID;
  memberId: ID;
  kind: CompletionKind;
  pathway: string;
  level: number;
  projectName: string | null;
  completedOn: string;
  proofFileId: ID | null;
  status: CompletionStatus;
  verifiedBy: ID | null;
  verifiedAt: ISO | null;
  rejectionReason: string | null;
}

export interface RoleSwap {
  id: ID;
  meetingId: ID;
  requesterRoleId: ID;
  targetRoleId: ID;
  requesterId: ID;
  targetId: ID;
  status: SwapStatus;
  createdAt: ISO;
  decidedAt: ISO | null;
}

export interface WithdrawalRequest {
  id: ID;
  meetingRoleId: ID;
  memberId: ID;
  reason: string | null;
  status: WithdrawalStatus;
  decidedBy: ID | null;
  decidedAt: ISO | null;
  createdAt: ISO;
}

export interface ClubSettings {
  id: 1;
  clubName: string;
  withdrawalCutoffHours: number;
  proofRequired: boolean;
  consecutiveRepeatLimit: number | null;
  timerGraceSeconds: number;
  nextPresidentId: ID | null;
  inactiveAfterDays: number;
  generateWeeksAhead: number;
}

export interface Notification {
  id: ID;
  memberId: ID;
  code: NotifCode;
  title: string;
  body: string | null;
  link: string;
  readAt: ISO | null;
  createdAt: ISO;
  dedupeKey: string | null;
}

export interface Task {
  id: ID;
  memberId: ID;
  code: TaskCode;
  title: string;
  link: string;
  refType: string;
  refId: ID;
  dueAt: ISO | null;
  doneAt: ISO | null;
  dedupeKey: string;
}

export interface NotificationPref {
  memberId: ID;
  code: NotifCode;
  enabled: boolean;
}

export interface Vote {
  id: ID;
  title: string;
  description: string;
  status: VoteStatus;
  createdBy: ID;
  deadlineAt: ISO | null;
  closedAt: ISO | null;
  closedBy: ID | null;
}
export interface VoteOption {
  id: ID;
  voteId: ID;
  label: string;
  sortOrder: number;
}
export interface VoteParticipation {
  voteId: ID;
  memberId: ID;
  castAt: ISO;
}
/** Secret ballot: deliberately has no member reference (FR-44, R-13). */
export interface VoteBallot {
  id: ID;
  voteId: ID;
  optionId: ID;
  createdAt?: ISO;
}

export interface FileRecord {
  id: ID;
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: ID;
  createdAt: ISO;
}

export interface AuditEntry {
  id: ID;
  actorId: ID | null;
  action: AuditAction;
  entityType: string;
  entityId: ID;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: ISO;
}

/** Error body shape shared by mock and API (schema.md section 8). */
export interface AppErrorBody {
  error: { code: ErrorCode; message: string; fields?: Record<string, string> };
}
