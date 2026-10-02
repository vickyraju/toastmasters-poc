import { AppError } from "../../services/errors";
import type {
  ClubProgressRow,
  ProgressService,
  VerifyQueueItem,
} from "../../services/interfaces";
import { nextLevelOnVerify, validateLevelLog } from "../../domain/rules/levels";
import * as ev from "../../domain/events";
import { newId } from "../../domain/ids";
import { now } from "../../time/clock";
import { istDate } from "../../time/ist";
import type { Completion } from "../../domain/types";
import { assertCan, me, mutate, type Ctx } from "./runtime";
import { log, memberName, touch, validateUpload } from "./helpers";

const invalid = (field: string, message: string) =>
  new AppError("VALIDATION", message, { fields: { [field]: message } });

export function progressService({ store, call }: Ctx): ProgressService {
  return {
    listMine: () =>
      call((sid) => {
        const d = store.getState();
        const { member } = me(d, sid);
        return d.completions
          .filter((c) => c.memberId === member.id)
          .sort((a, b) => b.completedOn.localeCompare(a.completedOn));
      }),

    uploadProof: (file) =>
      call((sid) =>
        mutate(store, (d) => {
          const { member } = me(d, sid);
          const safe = validateUpload(file);
          const rec = {
            id: newId("file"),
            storageKey: file.url ?? `mock/proof/${safe}`,
            originalName: safe,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            uploadedBy: member.id,
            createdAt: now().toISOString(),
          };
          d.files.push(rec);
          return rec;
        }),
      ),

    log: (input) =>
      call((sid) =>
        mutate(store, (d): Completion => {
          const { actor, member } = me(d, sid);
          assertCan(actor, "completion.log", { ownerId: member.id });
          const at = now();
          if (input.kind === "project" && !input.projectName?.trim())
            throw invalid("projectName", "Enter the project name.");
          if (!input.pathway.trim())
            throw invalid("pathway", "Choose a pathway.");
          if (input.proofFileId) {
            const proof = d.files.find((f) => f.id === input.proofFileId);
            if (!proof || proof.uploadedBy !== member.id)
              throw invalid("proof", "Attach a file you uploaded.");
          }
          const check = validateLevelLog({
            currentLevel: member.currentLevel,
            level: input.level,
            completedOn: input.completedOn,
            today: istDate(at),
            hasPendingForLevel:
              input.kind === "level" &&
              d.completions.some(
                (c) =>
                  c.memberId === member.id &&
                  c.kind === "level" &&
                  c.level === input.level &&
                  c.status === "pending",
              ),
            proofRequired: d.settings.proofRequired,
            hasProof: !!input.proofFileId,
          });
          if (!check.ok) {
            const text = {
              LEVEL_ABOVE_CURRENT: [
                "level",
                `You are at level ${member.currentLevel}. You cannot log a higher level yet.`,
              ],
              DUPLICATE_PENDING: [
                "level",
                "You already have this level waiting for verification.",
              ],
              FUTURE_DATE: [
                "completedOn",
                "The completion date cannot be in the future.",
              ],
              PROOF_REQUIRED: ["proof", "Attach proof of completion."],
            }[check.code];
            throw invalid(text[0], text[1]);
          }
          const c: Completion = {
            id: newId("cmp"),
            memberId: member.id,
            kind: input.kind,
            pathway: input.pathway.trim(),
            level: input.level,
            projectName:
              input.kind === "project" ? input.projectName!.trim() : null,
            completedOn: input.completedOn,
            proofFileId: input.proofFileId ?? null,
            status: input.kind === "project" ? "counted" : "pending",
            verifiedBy: null,
            verifiedAt: null,
            rejectionReason: null,
          };
          d.completions.push(c);
          touch(d, member.id, at);
          if (c.kind === "level")
            ev.levelLogged(d, at, {
              id: c.id,
              memberName: member.name,
              level: c.level,
            });
          return c;
        }),
      ),

    clubTable: () =>
      call((sid) => {
        const d = store.getState();
        assertCan(me(d, sid).actor, "club_progress.view");
        const cutoff =
          now().getTime() - d.settings.inactiveAfterDays * 86_400_000;
        const done = new Set(
          d.meetings.filter((m) => m.status === "completed").map((m) => m.id),
        );
        return d.members
          .filter((m) => m.status !== "removed")
          .map((member): ClubProgressRow => {
            const mine = d.meetingRoles.filter(
              (s) => s.memberId === member.id && done.has(s.meetingId),
            );
            const speaker = mine.filter(
              (s) =>
                d.roleTemplates.find((t) => t.id === s.roleTemplateId)
                  ?.isSpeaker,
            );
            return {
              member,
              projectsCompleted: d.completions.filter(
                (c) =>
                  c.memberId === member.id &&
                  c.kind === "project" &&
                  c.status === "counted",
              ).length,
              rolesTaken: mine.length,
              speeches: speaker.filter((s) =>
                d.reports.some(
                  (r) =>
                    r.kind === "timer" &&
                    r.submittedAt &&
                    r.meetingId === s.meetingId &&
                    (
                      r.payload as { rows: { speakerSlotId: string }[] }
                    ).rows.some((x) => x.speakerSlotId === s.id),
                ),
              ).length,
              // never active counts as inactive
              inactive:
                !member.lastActiveAt ||
                Date.parse(member.lastActiveAt) < cutoff,
            };
          });
      }),

    verifyQueue: () =>
      call((sid) => {
        const d = store.getState();
        assertCan(me(d, sid).actor, "club_progress.view");
        return d.completions
          .filter((c) => c.status === "pending")
          .sort((a, b) => a.completedOn.localeCompare(b.completedOn))
          .map((c): VerifyQueueItem => ({
            ...c,
            memberName: memberName(d, c.memberId),
            proofName:
              d.files.find((f) => f.id === c.proofFileId)?.originalName ?? null,
          }));
      }),

    decide: (completionId, decision, reason) =>
      call((sid) =>
        mutate(store, (d): Completion => {
          const { actor } = me(d, sid);
          assertCan(actor, "completion.verify");
          const c = d.completions.find((x) => x.id === completionId);
          if (!c) throw new AppError("NOT_FOUND", "Completion not found.");
          if (c.status !== "pending")
            throw new AppError(
              "INVALID_STATE",
              "This completion was already decided.",
            );
          if (decision === "reject" && !reason?.trim())
            throw invalid("reason", "Give a reason for rejecting.");
          const at = now();
          const verified = decision === "verify";
          c.status = verified ? "verified" : "rejected";
          c.verifiedBy = actor.id;
          c.verifiedAt = at.toISOString();
          c.rejectionReason = verified ? null : reason!.trim();
          const member = d.members.find((m) => m.id === c.memberId)!;
          const before = member.currentLevel;
          if (verified)
            member.currentLevel = nextLevelOnVerify(
              member.currentLevel,
              c.level,
            );
          ev.closeTasks(d, at, (t) => t.code === "T-03" && t.refId === c.id);
          ev.n10LevelDecided(d, at, {
            id: c.id,
            memberId: c.memberId,
            level: c.level,
            verified,
            reason: c.rejectionReason,
          });
          log(
            d,
            at,
            actor.id,
            verified ? "level.verify" : "level.reject",
            "completion",
            c.id,
            { status: "pending", currentLevel: before },
            {
              status: c.status,
              currentLevel: member.currentLevel,
              ...(c.rejectionReason
                ? { rejectionReason: c.rejectionReason }
                : {}),
            },
          );
          return { ...c };
        }),
      ),
  };
}
