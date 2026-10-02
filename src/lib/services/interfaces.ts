// Service contracts (schema.md section 9). Components and hooks depend on these only; the mock
// adapter implements them now and an API adapter will later. Every method returns a Promise.
import type { LifecycleWarning } from "../domain/rules/lifecycle";
import type { VoteView } from "../domain/rules/ballot";
import type {
  MeetingTypeValues,
  ProjectValues,
  RecurringValues,
  RoleTemplateValues,
} from "../domain/schemas";
import type {
  AuditAction,
  PathwaysProject,
  MeetingType,
  MeetingTypeAgendaItem,
  RecurringTemplate,
  RoleTemplate,
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
export interface CustomRoleInput {
  name: string;
  category: "main" | "support";
  count: number;
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
  /** Roles made up for this meeting; each is also added to the role catalog. */
  customRoles?: CustomRoleInput[];
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
  /** Dry run of setStatus: the warnings the change would raise, or the reason it is not allowed. Writes nothing. */
  statusPreview(
    id: string,
    status: MeetingStatus,
    reason?: string,
  ): Promise<
    { ok: true; warnings: LifecycleWarning[] } | { ok: false; message: string }
  >;
  publishTheme(id: string, input: ThemeInput): Promise<Meeting>;
  uploadAgenda(id: string, file: UploadFile): Promise<FileRecord>;
  /** Template agenda for the meeting's type, timed from its start (meeting_type_agenda_items). */
  agendaOutline(id: string): Promise<AgendaOutlineRow[]>;
  /** One action, one N-01 per meeting (R-07). */
  openAllDrafts(): Promise<{ opened: number; skipped: number }>;
}

export interface AgendaOutlineRow {
  id: string;
  startsAt: string;
  title: string;
  durationMinutes: number;
  /** Holders of the linked role in this meeting, in slot order. */
  holders: string[];
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

export interface OpenRoleItem {
  meetingId: string;
  meetingTitle: string;
  startsAt: string;
  slotId: string;
  label: string;
}
export interface PendingWithdrawalItem {
  request: WithdrawalRequest;
  memberName: string;
  label: string;
  meetingId: string;
  startsAt: string;
}

export type TakeCheck =
  { ok: true; override: boolean } | { ok: false; message: string };
export type WithdrawMode = "immediate" | "request" | "pending" | "started";

/** What the signed-in member may do on a meeting's board (S-04 Roles), computed with the same rules as the actions. */
export interface MyBoardActions {
  /** Open slots only: can I take it, and would it be an officer override? */
  take: Record<string, TakeCheck>;
  /** My own slots: how a withdrawal would go right now (R-05). */
  withdraw: Record<string, WithdrawMode>;
}

export interface RolesService {
  listForMeeting(meetingId: string): Promise<RoleSlotView[]>;
  myActions(meetingId: string): Promise<MyBoardActions>;
  /** Fires after any data change, including other tabs (architecture.md section 6). Returns unsubscribe. */
  subscribe(listener: () => void): () => void;
  /** Open slots in upcoming Open or Finalized meetings the signed-in member could take now (R-02, R-03). Home card. */
  openForMe(): Promise<OpenRoleItem[]>;
  /** ExComm: every pending late-withdrawal request (Home "Pending approvals"). */
  pendingWithdrawals(): Promise<PendingWithdrawalItem[]>;
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
  isEligible: boolean;
}
export interface VoteDetail extends VoteSummary {
  options: VoteOption[];
  view: VoteView;
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

export interface MeetingTypeView extends MeetingType {
  roles: { roleTemplateId: string; roleName: string; count: number }[];
  agendaItems: MeetingTypeAgendaItem[];
}
export interface RecurringView extends RecurringTemplate {
  typeName: string;
}

/** Templates, meeting types, role catalog, project timings and recurring generation (S-06, R-08). */
export interface TemplatesService {
  roleTemplates(): Promise<RoleTemplate[]>;
  projects(): Promise<PathwaysProject[]>;
  meetingTypes(): Promise<MeetingTypeView[]>;
  recurring(): Promise<RecurringView[]>;
  /** Creating or changing a type, role or recurring template notifies all members (N-08) when it is new. */
  saveMeetingType(
    id: string | null,
    input: MeetingTypeValues,
  ): Promise<MeetingType>;
  saveRoleTemplate(
    id: string | null,
    input: RoleTemplateValues,
  ): Promise<RoleTemplate>;
  saveProject(
    id: string | null,
    input: ProjectValues,
  ): Promise<PathwaysProject>;
  /** `applyToDrafts` also updates meetings generated from it that are still Draft and have no holders (R-08). */
  saveRecurring(
    id: string | null,
    input: RecurringValues,
    applyToDrafts?: boolean,
  ): Promise<RecurringTemplate>;
  /** Creates the Draft meetings every active template is missing; safe to repeat (R-08). */
  generateRecurring(): Promise<{ created: number }>;
}

export interface PositionsSummary {
  items: {
    code: Position;
    memberId: string | null;
    memberName: string | null;
  }[];
  nextPresidentId: string | null;
  nextPresidentName: string | null;
}

export interface PositionsService {
  list(): Promise<PositionsSummary>;
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
  positions: PositionsService;
  templates: TemplatesService;
  audit: AuditService;
  dev: DevService;
}
