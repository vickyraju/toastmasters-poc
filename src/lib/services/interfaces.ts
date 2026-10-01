// Service contracts (schema.md section 9). Components and hooks depend on these only; the mock
// adapter implements them now and an API adapter will later. Every method returns a Promise.
import type { LifecycleWarning } from "../domain/rules/lifecycle";
import type { VoteView } from "../domain/rules/ballot";
import type {
  AuditAction,
  AuditEntry,
  Completion,
  FileRecord,
  Meeting,
  MeetingRole,
  MeetingStatus,
  Member,
  Notification,
  Position,
  RoleSwap,
  SpeakerDetails,
  Task,
  Vote,
  VoteOption,
  WithdrawalRequest,
} from "../domain/types";

export type CurrentUser = Member & { position: Position | null };
export interface Page<T> {
  items: T[];
  total: number;
}

export interface DemoAccount {
  employeeId: string;
  name: string;
  position: Position | null;
  status: Member["status"];
}

export interface AuthService {
  signIn(employeeId: string): Promise<CurrentUser>;
  /** Demo personas for the login page; empty unless NEXT_PUBLIC_DEMO_MODE=true (architecture.md section 5). */
  demoAccounts(): Promise<DemoAccount[]>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<CurrentUser | null>;
}

export interface MeetingFilters {
  from?: string;
  to?: string;
  typeId?: string;
  status?: MeetingStatus;
}
export interface MeetingListItem extends Meeting {
  typeName: string;
  filled: number;
  total: number;
  myRoles: string[];
}
export interface MeetingDetail extends Meeting {
  typeName: string;
  agendaFile: FileRecord | null;
}
export interface CreateMeetingInput {
  title: string;
  meetingTypeId: string;
  startsAt: string;
  endsAt: string;
  venue?: string | null;
  meetingLink?: string | null;
  /** Defaults to the meeting type's role list. */
  roles?: { roleTemplateId: string; count: number }[];
}
export interface ThemeInput {
  theme: string | null;
  welcomeNote: string | null;
  wordOfTheDay: string | null;
  wordMeaning: string | null;
}
export interface UploadFile {
  name: string;
  mimeType: string;
  sizeBytes: number;
  url?: string;
}
export interface StatusResult {
  meeting: Meeting;
  warnings: LifecycleWarning[];
}

export interface MeetingsService {
  list(filters?: MeetingFilters): Promise<MeetingListItem[]>;
  get(id: string): Promise<MeetingDetail>;
  create(input: CreateMeetingInput): Promise<Meeting>;
  update(
    id: string,
    patch: Partial<
      Pick<
        Meeting,
        | "title"
        | "startsAt"
        | "endsAt"
        | "venue"
        | "meetingLink"
        | "withdrawalCutoffHours"
      >
    >,
  ): Promise<Meeting>;
  cancel(id: string, reason: string): Promise<Meeting>;
  setStatus(id: string, status: MeetingStatus): Promise<StatusResult>;
  publishTheme(id: string, input: ThemeInput): Promise<Meeting>;
  uploadAgenda(id: string, file: UploadFile): Promise<FileRecord>;
}

export interface RoleSlotView {
  slot: MeetingRole;
  roleCode: string;
  roleName: string;
  category: "main" | "support" | "report";
  holder: { id: string; name: string } | null;
  speaker: SpeakerDetails | null;
  pendingWithdrawal: WithdrawalRequest | null;
  pendingSwap: RoleSwap | null;
}
export type WithdrawOutcome =
  | { outcome: "withdrawn" }
  | { outcome: "requested"; request: WithdrawalRequest };

export interface RolesService {
  listForMeeting(meetingId: string): Promise<RoleSlotView[]>;
  addSlot(
    meetingId: string,
    input: { roleTemplateId: string; label?: string },
  ): Promise<MeetingRole>;
  removeSlot(slotId: string): Promise<void>;
  claim(slotId: string): Promise<MeetingRole>;
  /** ExComm: assign or reassign; `null` clears the slot. */
  assign(slotId: string, memberId: string | null): Promise<MeetingRole>;
  withdraw(slotId: string, reason?: string): Promise<WithdrawOutcome>;
  decideWithdrawal(
    requestId: string,
    decision: "approve" | "reject",
  ): Promise<WithdrawalRequest>;
  requestSwap(requesterSlotId: string, targetSlotId: string): Promise<RoleSwap>;
  /** `cancel` is the requester withdrawing their own request. */
  respondSwap(
    swapId: string,
    decision: "accept" | "decline" | "cancel",
  ): Promise<RoleSwap>;
  saveSpeakerDetails(
    slotId: string,
    data: Partial<Omit<SpeakerDetails, "meetingRoleId">>,
  ): Promise<SpeakerDetails>;
}

export interface TasksService {
  listMine(): Promise<Task[]>;
}

export interface NotificationsService {
  listMine(): Promise<{ items: Notification[]; unread: number }>;
  markRead(ids: string[]): Promise<void>;
  markAllRead(): Promise<void>;
  /** Calls back when a notification arrives for the signed-in member (toast, bell). Returns unsubscribe. */
  subscribe(listener: (n: Notification) => void): () => void;
}

export interface LogCompletionInput {
  kind: "project" | "level";
  pathway: string;
  level: number;
  projectName?: string | null;
  completedOn: string;
  proofFileId?: string | null;
}
export interface ClubProgressRow {
  member: Member;
  projectsCompleted: number;
  rolesTaken: number;
  speeches: number;
  inactive: boolean;
}
export interface VerifyQueueItem extends Completion {
  memberName: string;
}

export interface ProgressService {
  listMine(): Promise<Completion[]>;
  log(input: LogCompletionInput): Promise<Completion>;
  clubTable(): Promise<ClubProgressRow[]>;
  verifyQueue(): Promise<VerifyQueueItem[]>;
  decide(
    completionId: string,
    decision: "verify" | "reject",
    reason?: string,
  ): Promise<Completion>;
}

export interface VoteSummary extends Vote {
  turnout: { cast: number; eligible: number };
  iHaveVoted: boolean;
}
export interface VoteDetail extends VoteSummary {
  options: VoteOption[];
  view: VoteView;
  isEligible: boolean;
}
export interface StartVoteInput {
  title: string;
  description: string;
  options: string[];
  deadlineAt?: string;
}

export interface VotesService {
  list(): Promise<VoteSummary[]>;
  get(id: string): Promise<VoteDetail>;
  start(input: StartVoteInput): Promise<Vote>;
  cast(voteId: string, optionId: string): Promise<void>;
  close(voteId: string): Promise<Vote>;
}

export interface MembersService {
  list(): Promise<Member[]>;
  get(id: string): Promise<Member>;
}

export interface AuditFilters {
  action?: AuditAction;
  actorId?: string;
  from?: string;
  to?: string;
}
export interface AuditService {
  list(filters?: AuditFilters): Promise<AuditEntry[]>;
  /** G-05: log a route the signed-in member was not allowed to open. */
  recordDenied(path: string): Promise<void>;
}

/** Demo-only controls behind the /dev panel (mock-data.md section 1). */
export interface DevService {
  jump(
    to: { ms: number } | "next-meeting-start" | "next-meeting-end",
  ): Promise<void>;
  reset(): Promise<void>;
  setSimulateError(on: boolean): Promise<void>;
  sendTestNotification(): Promise<void>;
  tick(): Promise<void>;
  status(): Promise<{ now: string; simulateError: boolean }>;
}

export interface Services {
  auth: AuthService;
  meetings: MeetingsService;
  roles: RolesService;
  tasks: TasksService;
  notifications: NotificationsService;
  progress: ProgressService;
  votes: VotesService;
  members: MembersService;
  audit: AuditService;
  dev: DevService;
}
