import type {
  AuditEntry,
  ClubSettings,
  Completion,
  FileRecord,
  Meeting,
  MeetingReport,
  MeetingRole,
  MeetingType,
  MeetingTypeAgendaItem,
  MeetingTypeRole,
  Member,
  Notification,
  NotificationPref,
  PathwaysProject,
  PositionRow,
  RecurringTemplate,
  RoleSwap,
  RoleTemplate,
  SpeakerDetails,
  Task,
  Vote,
  VoteBallot,
  VoteOption,
  VoteParticipation,
  WithdrawalRequest,
} from "../../domain/types";

/** Everything the mock store holds: the schema.md tables plus session and dev settings. */
export interface MockData {
  members: Member[];
  positions: PositionRow[];
  meetingTypes: MeetingType[];
  roleTemplates: RoleTemplate[];
  meetingTypeRoles: MeetingTypeRole[];
  agendaItems: MeetingTypeAgendaItem[];
  recurringTemplates: RecurringTemplate[];
  meetings: Meeting[];
  meetingRoles: MeetingRole[];
  speakerDetails: SpeakerDetails[];
  projects: PathwaysProject[];
  reports: MeetingReport[];
  completions: Completion[];
  swaps: RoleSwap[];
  withdrawals: WithdrawalRequest[];
  settings: ClubSettings;
  notifications: Notification[];
  tasks: Task[];
  notifPrefs: NotificationPref[];
  votes: Vote[];
  voteOptions: VoteOption[];
  voteParticipation: VoteParticipation[];
  /** Secret ballots: no member reference (R-13). */
  voteBallots: VoteBallot[];
  voteEligible: { voteId: string; memberId: string }[];
  files: FileRecord[];
  audit: AuditEntry[];
  session: { memberId: string | null };
  dev: { simulateError: boolean; clockJumpMs: number };
}
