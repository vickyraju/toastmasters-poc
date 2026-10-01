import type { MeetingStatus, RoleCategory } from "../types";
import { evaluatorEligibility } from "./evaluatorEligibility";
import { checkRoleLimits } from "./roleLimits";

interface SwapSide {
  slotId: string;
  holderId: string | null;
  meetingId: string;
}

export type SwapRequestResult =
  | { ok: true }
  | { ok: false; code: "INVALID_STATE" | "SELF" | "DUPLICATE_PENDING" };

/** R-06 request-time checks. The requester must hold a role; the target holds another in the same meeting. */
export function validateSwapRequest(input: {
  meetingStatus: MeetingStatus;
  requester: SwapSide;
  target: SwapSide;
  hasPendingSwap: boolean;
}): SwapRequestResult {
  const { meetingStatus, requester, target } = input;
  if (meetingStatus !== "open" && meetingStatus !== "finalized")
    return { ok: false, code: "INVALID_STATE" };
  if (requester.meetingId !== target.meetingId)
    return { ok: false, code: "INVALID_STATE" };
  if (!requester.holderId || !target.holderId)
    return { ok: false, code: "INVALID_STATE" };
  if (requester.holderId === target.holderId)
    return { ok: false, code: "SELF" };
  if (input.hasPendingSwap) return { ok: false, code: "DUPLICATE_PENDING" };
  return { ok: true };
}

interface ReceivedSlot {
  isMain: boolean;
  category: RoleCategory;
  label: string;
  /** Set on evaluator slots that point at a speaker. */
  evaluates?: { id: string; level: number };
}

interface SwapParty {
  member: { id: string; currentLevel: number };
  receiving: ReceivedSlot;
  /** The member's other slots in this meeting, excluding the one they give away. */
  keeping: { isMain: boolean; category: RoleCategory; label: string }[];
}

export type SwapAcceptResult =
  | { ok: true }
  | {
      ok: false;
      code:
        "ALREADY_HAS_MAIN_ROLE" | "ALREADY_HAS_SUPPORT_ROLE" | "NOT_ELIGIBLE";
      memberId: string;
    };

/** R-06 accept-time checks: both members must still satisfy R-02 and R-03 after the swap. */
export function validateSwapAccept(input: {
  a: SwapParty;
  b: SwapParty;
}): SwapAcceptResult {
  for (const party of [input.a, input.b]) {
    const limits = checkRoleLimits(party.keeping, party.receiving);
    if (!limits.ok)
      return { ok: false, code: limits.code, memberId: party.member.id };
    if (party.receiving.evaluates) {
      const e = evaluatorEligibility(party.member, party.receiving.evaluates);
      if (!e.ok)
        return { ok: false, code: "NOT_ELIGIBLE", memberId: party.member.id };
    }
  }
  return { ok: true };
}
