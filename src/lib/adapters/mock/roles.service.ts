import { AppError } from "../../services/errors";
import type {
  OpenRoleItem,
  PendingWithdrawalItem,
  RoleSlotView,
  RolesService,
  WithdrawOutcome,
} from "../../services/interfaces";
import { can, type Actor } from "../../permissions/can";
import { evaluatorEligibility } from "../../domain/rules/evaluatorEligibility";
import {
  checkRoleLimits,
  consecutiveRepeat,
} from "../../domain/rules/roleLimits";
import {
  validateSwapAccept,
  validateSwapRequest,
} from "../../domain/rules/swap";
import { withdrawalCutoff } from "../../domain/rules/withdrawalCutoff";
import * as ev from "../../domain/events";
import { newId } from "../../domain/ids";
import { now } from "../../time/clock";
import type {
  MeetingRole,
  RoleSwap,
  SpeakerDetails,
  WithdrawalRequest,
} from "../../domain/types";
import type { MockData } from "./state";
import { me, mutate, type Ctx } from "./runtime";
import {
  assertEditable,
  expireSlotRequests,
  log,
  meetingOf,
  memberName,
  slotOf,
  tmplOf,
  touch,
} from "./helpers";

const isOfficer = (a: Actor) => a.accountType !== "member";

/** R-02 and R-03 for `memberId` taking `slot`. Officers waive the level check only (audited as override). */
function checkTake(
  d: MockData,
  slot: MeetingRole,
  memberId: string,
  officer: boolean,
): { override: boolean } {
  const member = d.members.find((m) => m.id === memberId)!;
  const tpl = tmplOf(d, slot);
  let override = false;
  if (tpl.isEvaluator && slot.evaluatesSlotId) {
    const speakerSlot = slotOf(d, slot.evaluatesSlotId);
    const details = d.speakerDetails.find(
      (x) => x.meetingRoleId === speakerSlot.id,
    );
    const speaker = speakerSlot.memberId
      ? d.members.find((m) => m.id === speakerSlot.memberId)
      : null;
    const level = details?.level ?? speaker?.currentLevel ?? null;
    if (speakerSlot.memberId === memberId)
      throw new AppError(
        "NOT_ELIGIBLE",
        "You cannot evaluate your own speech.",
        { reason: "SELF" },
      );
    if (speaker && level !== null) {
      const r = evaluatorEligibility(member, { id: speaker.id, level });
      if (!r.ok && r.reason === "LEVEL") {
        if (!officer)
          throw new AppError(
            "NOT_ELIGIBLE",
            `You need to be at level ${r.required} or higher to evaluate this speech.`,
            { reason: "LEVEL", required: r.required },
          );
        override = true;
      }
    } else if (!speaker && details?.level != null) {
      const r = evaluatorEligibility(member, { id: "", level: details.level });
      if (!r.ok && r.reason === "LEVEL") {
        if (!officer)
          throw new AppError(
            "NOT_ELIGIBLE",
            `You need to be at level ${r.required} or higher to evaluate this speech.`,
            { reason: "LEVEL", required: r.required },
          );
        override = true;
      }
    }
  }
  const held = d.meetingRoles
    .filter(
      (s) =>
        s.meetingId === slot.meetingId &&
        s.memberId === memberId &&
        s.id !== slot.id,
    )
    .map((s) => ({
      label: s.label,
      isMain: s.isMain,
      category: tmplOf(d, s).category,
    }));
  const limits = checkRoleLimits(held, {
    isMain: slot.isMain,
    category: tpl.category,
  });
  if (!limits.ok) {
    throw new AppError(
      limits.code,
      limits.code === "ALREADY_HAS_MAIN_ROLE"
        ? `You already have a main role in this meeting (${limits.existingLabel}). Withdraw from it first.`
        : `You already have a support role in this meeting (${limits.existingLabel}).`,
    );
  }
  const limit = d.settings.consecutiveRepeatLimit;
  if (limit !== null) {
    const m = meetingOf(d, slot.meetingId);
    const history = d.meetings
      .filter(
        (x) =>
          x.id !== m.id &&
          x.startsAt < m.startsAt &&
          x.status !== "cancelled" &&
          x.status !== "draft",
      )
      .sort((a, b) => b.startsAt.localeCompare(a.startsAt))
      .map((x) =>
        d.meetingRoles
          .filter((s) => s.meetingId === x.id && s.memberId === memberId)
          .map((s) => tmplOf(d, s).code),
      );
    const rep = consecutiveRepeat(limit, tpl.code, history);
    if (!rep.ok)
      throw new AppError(
        "INVALID_STATE",
        `You have taken this role ${rep.run} meetings in a row. Let someone else have a turn.`,
      );
  }
  return { override };
}

function fill(
  d: MockData,
  slot: MeetingRole,
  memberId: string | null,
  byId: string,
  at: Date,
) {
  slot.memberId = memberId;
  slot.status = memberId ? "filled" : "open";
  slot.version += 1;
  slot.assignedBy = memberId ? byId : null;
  slot.assignedAt = memberId ? at.toISOString() : null;
  if (memberId) touch(d, memberId, at);
  expireSlotRequests(d, slot.id, at, byId);
}

/** Both sides of a swap, ready for validateSwapAccept (R-06). */
function swapParties(d: MockData, a: MeetingRole, b: MeetingRole) {
  const party = (giving: MeetingRole, receiving: MeetingRole) => {
    const member = d.members.find((m) => m.id === giving.memberId)!;
    const rt = tmplOf(d, receiving);
    const speakerSlot = receiving.evaluatesSlotId
      ? d.meetingRoles.find((s) => s.id === receiving.evaluatesSlotId)
      : null;
    const spk = speakerSlot?.memberId
      ? d.members.find((m) => m.id === speakerSlot.memberId)
      : null;
    const level =
      d.speakerDetails.find((x) => x.meetingRoleId === speakerSlot?.id)
        ?.level ?? spk?.currentLevel;
    return {
      member: { id: member.id, currentLevel: member.currentLevel },
      receiving: {
        isMain: receiving.isMain,
        category: rt.category,
        label: receiving.label,
        ...(spk && level != null ? { evaluates: { id: spk.id, level } } : {}),
      },
      keeping: d.meetingRoles
        .filter(
          (s) =>
            s.meetingId === giving.meetingId &&
            s.memberId === member.id &&
            s.id !== giving.id,
        )
        .map((s) => ({
          isMain: s.isMain,
          category: tmplOf(d, s).category,
          label: s.label,
        })),
    };
  };
  return { a: party(a, b), b: party(b, a) };
}

const swapError = (code: string) =>
  new AppError(
    code === "NOT_ELIGIBLE"
      ? "NOT_ELIGIBLE"
      : code === "ALREADY_HAS_SUPPORT_ROLE"
        ? "ALREADY_HAS_SUPPORT_ROLE"
        : "ALREADY_HAS_MAIN_ROLE",
    code === "NOT_ELIGIBLE"
      ? "One of you would not be eligible for the role you would receive."
      : "This swap would give one of you two roles of the same kind in this meeting.",
  );

export function rolesService({ store, call }: Ctx): RolesService {
  return {
    openForMe: () =>
      call((sid) => {
        const d = store.getState();
        const { member } = me(d, sid);
        const at = now().toISOString();
        const items: OpenRoleItem[] = [];
        const upcoming = d.meetings
          .filter(
            (m) =>
              (m.status === "open" || m.status === "finalized") &&
              m.startsAt > at,
          )
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
        for (const m of upcoming) {
          const open = d.meetingRoles
            .filter((s) => s.meetingId === m.id && !s.memberId)
            .sort((a, b) => a.sortOrder - b.sortOrder);
          for (const slot of open) {
            try {
              // Member rules even for officers: "I can take" means without an override.
              checkTake(d, slot, member.id, false);
              items.push({
                meetingId: m.id,
                meetingTitle: m.title,
                startsAt: m.startsAt,
                slotId: slot.id,
                label: slot.label,
              });
            } catch (e) {
              if (!(e instanceof AppError)) throw e;
            }
          }
        }
        return items;
      }),

    pendingWithdrawals: () =>
      call((sid) => {
        const d = store.getState();
        const { actor } = me(d, sid);
        if (!can(actor, "role.withdraw.decide"))
          throw new AppError("FORBIDDEN", "You do not have access to this.");
        return d.withdrawals
          .filter((w) => w.status === "pending")
          .map((w): PendingWithdrawalItem => {
            const slot = slotOf(d, w.meetingRoleId);
            const m = meetingOf(d, slot.meetingId);
            return {
              request: w,
              memberName: memberName(d, w.memberId),
              label: slot.label,
              meetingId: m.id,
              startsAt: m.startsAt,
            };
          })
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      }),

    listForMeeting: (meetingId) =>
      call((sid) => {
        const d = store.getState();
        const { actor } = me(d, sid);
        const m = meetingOf(d, meetingId);
        if (!can(actor, "meeting.view", { meetingStatus: m.status }))
          throw new AppError("FORBIDDEN", "You do not have access to this.");
        return d.meetingRoles
          .filter((s) => s.meetingId === meetingId)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((slot): RoleSlotView => {
            const tpl = tmplOf(d, slot);
            return {
              slot,
              roleCode: tpl.code,
              roleName: tpl.name,
              category: tpl.category,
              holder: slot.memberId
                ? { id: slot.memberId, name: memberName(d, slot.memberId) }
                : null,
              speaker:
                d.speakerDetails.find((x) => x.meetingRoleId === slot.id) ??
                null,
              pendingWithdrawal:
                d.withdrawals.find(
                  (w) => w.meetingRoleId === slot.id && w.status === "pending",
                ) ?? null,
              pendingSwap:
                d.swaps.find(
                  (s) =>
                    s.status === "pending" &&
                    (s.requesterRoleId === slot.id ||
                      s.targetRoleId === slot.id),
                ) ?? null,
            };
          });
      }),

    addSlot: (meetingId, input) =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor } = me(d, sid);
          if (!can(actor, "meeting.update"))
            throw new AppError("FORBIDDEN", "You do not have access to this.");
          const m = meetingOf(d, meetingId);
          assertEditable(m);
          const tpl = d.roleTemplates.find(
            (t) => t.id === input.roleTemplateId,
          );
          if (!tpl)
            throw new AppError("NOT_FOUND", "Role not found in the catalog.");
          const same = d.meetingRoles.filter(
            (s) => s.meetingId === meetingId && s.roleTemplateId === tpl.id,
          ).length;
          const slots = d.meetingRoles.filter((s) => s.meetingId === meetingId);
          const slot: MeetingRole = {
            id: `${meetingId}:${tpl.code.replace(/_/g, "-")}-${same + 1}-${newId("x").slice(2)}`,
            meetingId,
            roleTemplateId: tpl.id,
            label:
              input.label?.trim() ||
              (same ? `${tpl.name} ${same + 1}` : tpl.name),
            sortOrder: Math.max(-1, ...slots.map((s) => s.sortOrder)) + 1,
            memberId: null,
            status: "open",
            isMain: tpl.category === "main",
            assignedBy: null,
            assignedAt: null,
            version: 0,
            evaluatesSlotId: null,
          };
          if (tpl.isEvaluator) {
            const taken = new Set(slots.map((s) => s.evaluatesSlotId));
            slot.evaluatesSlotId =
              slots.find((s) => tmplOf(d, s).isSpeaker && !taken.has(s.id))
                ?.id ?? null;
          }
          d.meetingRoles.push(slot);
          log(
            d,
            now(),
            actor.id,
            "meeting.update",
            "meeting",
            meetingId,
            null,
            { addedRole: slot.label },
          );
          return slot;
        }),
      ),

    removeSlot: (slotId) =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor } = me(d, sid);
          if (!can(actor, "meeting.update"))
            throw new AppError("FORBIDDEN", "You do not have access to this.");
          const slot = slotOf(d, slotId);
          const m = meetingOf(d, slot.meetingId);
          assertEditable(m);
          const at = now();
          if (slot.memberId)
            ev.n07RoleChanged(
              d,
              at,
              slot.memberId,
              `Your ${slot.label} role for ${m.startsAt.slice(0, 10)} was removed`,
              m,
              slot.id,
            );
          expireSlotRequests(d, slot.id, at, actor.id);
          d.meetingRoles = d.meetingRoles
            .filter((s) => s.id !== slotId)
            .map((s) =>
              s.evaluatesSlotId === slotId
                ? { ...s, evaluatesSlotId: null }
                : s,
            );
          d.speakerDetails = d.speakerDetails.filter(
            (x) => x.meetingRoleId !== slotId,
          );
          log(
            d,
            at,
            actor.id,
            "meeting.update",
            "meeting",
            m.id,
            { role: slot.label, holder: slot.memberId },
            null,
          );
        }),
      ),

    // R-09: the whole claim runs inside one synchronous store update, so only one caller can win.
    claim: (slotId) =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor, member } = me(d, sid);
          const slot = slotOf(d, slotId);
          const m = meetingOf(d, slot.meetingId);
          if (!can(actor, "meeting.view", { meetingStatus: m.status }))
            throw new AppError("FORBIDDEN", "You do not have access to this.");
          if (m.status !== "open" && m.status !== "finalized")
            throw new AppError(
              "INVALID_STATE",
              "Roles can only be taken while the meeting is open for roles.",
            );
          if (slot.memberId)
            throw new AppError("SLOT_TAKEN", "Someone just took this role.");
          const { override } = checkTake(d, slot, member.id, isOfficer(actor));
          const at = now();
          fill(d, slot, member.id, member.id, at);
          log(
            d,
            at,
            member.id,
            override ? "role.override" : "role.assign",
            "meeting_role",
            slot.id,
            { memberId: null },
            { memberId: member.id },
          );
          return { ...slot };
        }),
      ),

    assign: (slotId, memberId) =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor } = me(d, sid);
          if (!can(actor, "role.assign"))
            throw new AppError("FORBIDDEN", "You do not have access to this.");
          const slot = slotOf(d, slotId);
          const m = meetingOf(d, slot.meetingId);
          assertEditable(m);
          if (slot.memberId === memberId) return { ...slot };
          let override = false;
          if (memberId) {
            const target = d.members.find((x) => x.id === memberId);
            if (!target || target.status !== "active")
              throw new AppError("NOT_FOUND", "Member not found.");
            override = checkTake(d, slot, memberId, true).override;
          }
          const at = now();
          const previous = slot.memberId;
          fill(d, slot, memberId, actor.id, at);
          if (previous)
            ev.n07RoleChanged(
              d,
              at,
              previous,
              memberId
                ? `Your ${slot.label} role was changed by ExComm`
                : `Your ${slot.label} role was removed by ExComm`,
              m,
              slot.id,
            );
          if (memberId)
            ev.n07RoleChanged(
              d,
              at,
              memberId,
              `You were assigned ${slot.label}`,
              m,
              slot.id,
            );
          log(
            d,
            at,
            actor.id,
            override
              ? "role.override"
              : previous || !memberId
                ? "role.reassign"
                : "role.assign",
            "meeting_role",
            slot.id,
            { memberId: previous },
            { memberId },
          );
          return { ...slot };
        }),
      ),

    withdraw: (slotId, reason) =>
      call((sid) =>
        mutate(store, (d): WithdrawOutcome => {
          const { actor, member } = me(d, sid);
          const slot = slotOf(d, slotId);
          const m = meetingOf(d, slot.meetingId);
          if (!can(actor, "role.withdraw", { roleHolderId: slot.memberId }))
            throw new AppError("FORBIDDEN", "You do not have access to this.");
          assertEditable(m);
          const at = now();
          const decision = withdrawalCutoff({
            startsAt: new Date(m.startsAt),
            now: at,
            cutoffHours: m.withdrawalCutoffHours,
            clubDefaultHours: d.settings.withdrawalCutoffHours,
            hasPendingRequest: d.withdrawals.some(
              (w) => w.meetingRoleId === slotId && w.status === "pending",
            ),
            isExComm: isOfficer(actor),
          });
          if (decision.kind === "blocked")
            throw new AppError(
              "INVALID_STATE",
              "The meeting has started. Ask ExComm to remove you from this role.",
            );
          if (decision.kind === "duplicate")
            throw new AppError(
              "INVALID_STATE",
              "A withdrawal request is already pending for this role.",
            );
          if (decision.kind === "immediate") {
            fill(d, slot, null, member.id, at);
            log(
              d,
              at,
              member.id,
              "role.withdraw",
              "meeting_role",
              slot.id,
              { memberId: member.id },
              { memberId: null },
            );
            return { outcome: "withdrawn" };
          }
          const request: WithdrawalRequest = {
            id: newId("wdr"),
            meetingRoleId: slotId,
            memberId: member.id,
            reason: reason?.trim() || null,
            status: "pending",
            decidedBy: null,
            decidedAt: null,
            createdAt: at.toISOString(),
          };
          d.withdrawals.push(request);
          ev.withdrawalRequested(
            d,
            { id: request.id, memberName: member.name, label: slot.label },
            m,
            slot.id,
          );
          log(
            d,
            at,
            member.id,
            "role.withdraw_request",
            "withdrawal_request",
            request.id,
            null,
            { status: "pending" },
          );
          return { outcome: "requested", request };
        }),
      ),

    decideWithdrawal: (requestId, decision) =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor } = me(d, sid);
          if (!can(actor, "role.withdraw.decide"))
            throw new AppError("FORBIDDEN", "You do not have access to this.");
          const w = d.withdrawals.find((x) => x.id === requestId);
          if (!w) throw new AppError("NOT_FOUND", "Request not found.");
          if (w.status !== "pending")
            throw new AppError(
              "INVALID_STATE",
              "This request was already decided.",
            );
          const slot = slotOf(d, w.meetingRoleId);
          const m = meetingOf(d, slot.meetingId);
          const at = now();
          const approved = decision === "approve";
          if (approved && slot.memberId === w.memberId)
            fill(d, slot, null, actor.id, at);
          w.status = approved ? "approved" : "rejected";
          w.decidedBy = actor.id;
          w.decidedAt = at.toISOString();
          ev.closeTasks(d, at, (t) => t.code === "T-02" && t.refId === w.id);
          ev.n17WithdrawalDecided(
            d,
            at,
            { id: w.id, memberId: w.memberId, label: slot.label, approved },
            m,
            slot.id,
          );
          log(
            d,
            at,
            actor.id,
            "role.withdraw_decision",
            "withdrawal_request",
            w.id,
            { status: "pending" },
            { status: w.status },
          );
          return { ...w };
        }),
      ),

    requestSwap: (requesterSlotId, targetSlotId) =>
      call((sid) =>
        mutate(store, (d): RoleSwap => {
          const { actor, member } = me(d, sid);
          const mine = slotOf(d, requesterSlotId);
          const theirs = slotOf(d, targetSlotId);
          if (
            !can(actor, "role.swap.request", {
              holdsRoleInMeeting: mine.memberId === member.id,
            })
          )
            throw new AppError(
              "FORBIDDEN",
              "You can only swap a role you hold.",
            );
          const m = meetingOf(d, mine.meetingId);
          const v = validateSwapRequest({
            meetingStatus: m.status,
            requester: {
              slotId: mine.id,
              holderId: mine.memberId,
              meetingId: mine.meetingId,
            },
            target: {
              slotId: theirs.id,
              holderId: theirs.memberId,
              meetingId: theirs.meetingId,
            },
            hasPendingSwap: d.swaps.some(
              (s) =>
                s.status === "pending" &&
                [s.requesterRoleId, s.targetRoleId].some(
                  (x) => x === mine.id || x === theirs.id,
                ),
            ),
          });
          if (!v.ok)
            throw new AppError(
              v.code === "DUPLICATE_PENDING"
                ? "INVALID_STATE"
                : v.code === "SELF"
                  ? "VALIDATION"
                  : "INVALID_STATE",
              v.code === "SELF"
                ? "You cannot swap with yourself."
                : v.code === "DUPLICATE_PENDING"
                  ? "A swap is already pending for one of these roles."
                  : "A swap is not possible right now.",
            );
          const ok = validateSwapAccept(swapParties(d, mine, theirs));
          if (!ok.ok) throw swapError(ok.code);
          const at = now();
          const swap: RoleSwap = {
            id: newId("swp"),
            meetingId: m.id,
            requesterRoleId: mine.id,
            targetRoleId: theirs.id,
            requesterId: member.id,
            targetId: theirs.memberId!,
            status: "pending",
            createdAt: at.toISOString(),
            decidedAt: null,
          };
          d.swaps.push(swap);
          ev.swapRequested(
            d,
            {
              id: swap.id,
              requesterName: member.name,
              targetId: swap.targetId,
            },
            m,
            theirs.id,
          );
          ev.n16Swap(
            d,
            at,
            swap.id,
            swap.targetId,
            `${member.name} asked to swap ${mine.label} with your ${theirs.label} role`,
            "requested",
            m,
          );
          return swap;
        }),
      ),

    respondSwap: (swapId, decision) =>
      call((sid) =>
        mutate(store, (d): RoleSwap => {
          const { actor, member } = me(d, sid);
          const swap = d.swaps.find((x) => x.id === swapId);
          if (!swap) throw new AppError("NOT_FOUND", "Swap request not found.");
          if (swap.status !== "pending")
            throw new AppError(
              "INVALID_STATE",
              "This swap was already closed.",
            );
          const mine = slotOf(d, swap.requesterRoleId);
          const theirs = slotOf(d, swap.targetRoleId);
          const m = meetingOf(d, swap.meetingId);
          const at = now();
          const close = (s: RoleSwap["status"]) => {
            swap.status = s;
            swap.decidedAt = at.toISOString();
            ev.closeTasks(
              d,
              at,
              (t) => t.code === "T-04" && t.refId === swap.id,
            );
          };
          if (decision === "cancel") {
            if (swap.requesterId !== member.id)
              throw new AppError(
                "FORBIDDEN",
                "Only the requester can cancel a swap.",
              );
            close("cancelled");
            return { ...swap };
          }
          if (
            !can(actor, "role.swap.respond", { targetMemberId: swap.targetId })
          )
            throw new AppError(
              "FORBIDDEN",
              "Only the member who was asked can answer.",
            );
          if (decision === "decline") {
            close("declined");
            ev.n16Swap(
              d,
              at,
              swap.id,
              swap.requesterId,
              `${member.name} declined your swap`,
              "declined",
              m,
            );
            return { ...swap };
          }
          if (m.status !== "open" && m.status !== "finalized")
            throw new AppError(
              "INVALID_STATE",
              "A swap is not possible right now.",
            );
          if (
            mine.memberId !== swap.requesterId ||
            theirs.memberId !== swap.targetId
          ) {
            close("cancelled");
            throw new AppError(
              "INVALID_STATE",
              "One of the roles changed hands, so the swap no longer applies.",
            );
          }
          const ok = validateSwapAccept(swapParties(d, mine, theirs));
          if (!ok.ok) throw swapError(ok.code);
          mine.memberId = swap.targetId;
          theirs.memberId = swap.requesterId;
          mine.version += 1;
          theirs.version += 1;
          close("accepted");
          ev.n16Swap(
            d,
            at,
            swap.id,
            swap.requesterId,
            `${member.name} accepted your swap`,
            "accepted",
            m,
          );
          ev.n16Swap(
            d,
            at,
            swap.id,
            swap.targetId,
            `You swapped with ${memberName(d, swap.requesterId)}`,
            "accepted",
            m,
          );
          log(
            d,
            at,
            member.id,
            "role.swap",
            "role_swap",
            swap.id,
            { [mine.id]: swap.requesterId, [theirs.id]: swap.targetId },
            { [mine.id]: swap.targetId, [theirs.id]: swap.requesterId },
          );
          return { ...swap };
        }),
      ),

    saveSpeakerDetails: (slotId, data) =>
      call((sid) =>
        mutate(store, (d): SpeakerDetails => {
          const { actor } = me(d, sid);
          const slot = slotOf(d, slotId);
          if (!tmplOf(d, slot).isSpeaker)
            throw new AppError(
              "INVALID_STATE",
              "Only speaker roles have speech details.",
            );
          if (
            !can(actor, "speaker.details.edit", { roleHolderId: slot.memberId })
          )
            throw new AppError("FORBIDDEN", "You do not have access to this.");
          assertEditable(meetingOf(d, slot.meetingId));
          if (data.title && data.title.trim().length > 120)
            throw new AppError(
              "VALIDATION",
              "The title can be at most 120 characters.",
              { fields: { title: "The title can be at most 120 characters." } },
            );
          let row = d.speakerDetails.find((x) => x.meetingRoleId === slotId);
          if (!row) {
            row = {
              meetingRoleId: slotId,
              pathway: null,
              level: null,
              projectId: null,
              projectName: null,
              title: null,
              objectives: null,
              minSeconds: null,
              maxSeconds: null,
              evalFormUrl: null,
            };
            d.speakerDetails.push(row);
          }
          Object.assign(
            row,
            data,
            data.title !== undefined
              ? { title: data.title?.trim() || null }
              : {},
          );
          const project = data.projectId
            ? d.projects.find((p) => p.id === data.projectId)
            : null;
          if (project)
            Object.assign(row, {
              projectName: data.projectName ?? project.name,
              minSeconds: data.minSeconds ?? project.minSeconds,
              maxSeconds: data.maxSeconds ?? project.maxSeconds,
            });
          if (row.title && (row.projectId || row.projectName))
            ev.closeTasks(
              d,
              now(),
              (t) => t.code === "T-06" && t.refId === slotId,
            );
          return { ...row };
        }),
      ),
  };
}
