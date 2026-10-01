import type {
  AccountType,
  MeetingStatus,
  Position,
  VoteStatus,
} from "../domain/types";

export interface Actor {
  id: string;
  accountType: AccountType;
  position: Position | null;
}

/** Every action in the schema.md section 6 matrix. */
export type Action =
  | "meeting.view"
  | "meeting.create"
  | "meeting.update"
  | "meeting.cancel"
  | "meeting.status"
  | "meeting.complete"
  | "meeting.theme.edit"
  | "meeting.agenda.upload"
  | "role.claim"
  | "role.assign"
  | "role.reassign"
  | "role.override"
  | "role.withdraw"
  | "role.withdraw.decide"
  | "role.swap.request"
  | "role.swap.respond"
  | "speaker.details.edit"
  | "evaluator.claim"
  | "report.submit"
  | "report.edit"
  | "report.view"
  | "template.edit"
  | "meeting_type.edit"
  | "member.add"
  | "member.update"
  | "member.remove"
  | "member.view_directory"
  | "member.edit_self"
  | "position.assign"
  | "position.remove"
  | "president.transfer"
  | "completion.log"
  | "completion.verify"
  | "club_progress.view"
  | "vote.start"
  | "vote.close"
  | "vote.cast"
  | "vote.view_turnout"
  | "vote.view_result"
  | "audit.view"
  | "export.run"
  | "settings.club.edit";

/** Context the matrix needs for contextual rows. Callers pass only what they know. */
export interface Resource {
  meetingStatus?: MeetingStatus;
  /** Holder of the TMOD slot in the meeting being acted on. */
  tmodHolderId?: string | null;
  /** Holder of the role slot being acted on. */
  roleHolderId?: string | null;
  /** Owner of the record (own profile, own completion). */
  ownerId?: string;
  targetMemberId?: string;
  holdsRoleInMeeting?: boolean;
  /** Result of evaluatorEligibility() for the slot, computed by the caller. */
  evaluatorEligible?: boolean;
  voteStatus?: VoteStatus;
  isEligibleVoter?: boolean;
}

const isOfficer = (a: Actor) =>
  a.accountType === "excomm" || a.accountType === "president";
const isPresident = (a: Actor) => a.accountType === "president";
const live = (s?: MeetingStatus) => s !== "completed" && s !== "cancelled";

/** R-01: the single permission check (schema.md section 6). Services call it first; the UI uses the same function. */
export function can(actor: Actor, action: Action, res: Resource = {}): boolean {
  const officer = isOfficer(actor);
  switch (action) {
    case "meeting.view":
      return res.meetingStatus === "draft" ? officer : true;
    case "meeting.create":
    case "meeting.update":
    case "meeting.cancel":
    case "meeting.status":
    case "meeting.complete":
    case "meeting.agenda.upload":
    case "role.assign":
    case "role.reassign":
    case "role.override":
    case "role.withdraw.decide":
    case "template.edit":
    case "meeting_type.edit":
    case "member.add":
    case "member.update":
    case "member.remove":
    case "member.view_directory":
    case "club_progress.view":
    case "vote.view_turnout":
    case "audit.view":
    case "export.run":
      return officer;
    case "meeting.theme.edit":
      return (
        officer || (res.tmodHolderId === actor.id && live(res.meetingStatus))
      );
    case "role.claim":
      return res.meetingStatus === "open" || res.meetingStatus === "finalized";
    case "evaluator.claim":
      if (officer) return true;
      return (
        (res.meetingStatus === "open" || res.meetingStatus === "finalized") &&
        res.evaluatorEligible === true
      );
    case "role.withdraw":
      return res.roleHolderId === actor.id;
    case "role.swap.request":
      return res.holdsRoleInMeeting === true;
    case "role.swap.respond":
      return res.targetMemberId === actor.id;
    case "speaker.details.edit":
      return officer || res.roleHolderId === actor.id;
    case "report.submit":
    case "report.edit":
      return res.roleHolderId === actor.id && live(res.meetingStatus);
    case "report.view":
      return (
        res.meetingStatus === "completed" ||
        officer ||
        res.roleHolderId === actor.id
      );
    case "member.edit_self":
    case "completion.log":
      return res.ownerId === actor.id;
    case "position.assign":
    case "position.remove":
    case "president.transfer":
    case "vote.start":
    case "vote.close":
    case "settings.club.edit":
      return isPresident(actor);
    case "completion.verify":
      return actor.position === "vpe";
    case "vote.cast":
      return (
        officer && res.isEligibleVoter === true && res.voteStatus === "open"
      );
    case "vote.view_result":
      return officer && res.voteStatus === "closed";
  }
}
