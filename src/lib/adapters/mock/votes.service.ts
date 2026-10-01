import { AppError } from "../../services/errors";
import type {
  VoteDetail,
  VoteSummary,
  VotesService,
} from "../../services/interfaces";
import { can } from "../../permissions/can";
import { makeBallot, voteView } from "../../domain/rules/ballot";
import { startVoteInput } from "../../domain/schemas";
import * as ev from "../../domain/events";
import { newId } from "../../domain/ids";
import { now } from "../../time/clock";
import type { Vote } from "../../domain/types";
import { assertCan, me, mutate, type Ctx } from "./runtime";
import { log, touch } from "./helpers";
import { closeVote } from "./tick";
import type { MockData } from "./state";

const turnout = (d: MockData, voteId: string) => ({
  cast: d.voteParticipation.filter((p) => p.voteId === voteId).length,
  eligible: d.voteEligible.filter((e) => e.voteId === voteId).length,
});

const summary = (d: MockData, v: Vote, memberId: string): VoteSummary => ({
  ...v,
  turnout: turnout(d, v.id),
  iHaveVoted: d.voteParticipation.some(
    (p) => p.voteId === v.id && p.memberId === memberId,
  ),
});

export function votesService({ store, call }: Ctx): VotesService {
  return {
    list: () =>
      call((sid) => {
        const d = store.getState();
        const { actor, member } = me(d, sid);
        assertCan(actor, "vote.view_turnout");
        return d.votes.map((v) => summary(d, v, member.id));
      }),

    get: (id) =>
      call((sid): VoteDetail => {
        const d = store.getState();
        const { actor, member } = me(d, sid);
        assertCan(actor, "vote.view_turnout");
        const v = d.votes.find((x) => x.id === id);
        if (!v) throw new AppError("NOT_FOUND", "Vote not found.");
        const options = d.voteOptions
          .filter((o) => o.voteId === id)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const t = turnout(d, id);
        // Counts are only ever handed to voteView after close and only if can() allows (R-13).
        const showResults = can(actor, "vote.view_result", {
          voteStatus: v.status,
        });
        const view = voteView({
          status: showResults ? v.status : "open",
          options,
          ballots: showResults
            ? d.voteBallots.filter((b) => b.voteId === id)
            : [],
          cast: t.cast,
          eligible: t.eligible,
        });
        return {
          ...summary(d, v, member.id),
          options,
          view,
          isEligible: d.voteEligible.some(
            (e) => e.voteId === id && e.memberId === member.id,
          ),
        };
      }),

    start: (input) =>
      call((sid) =>
        mutate(store, (d): Vote => {
          const { actor } = me(d, sid);
          assertCan(actor, "vote.start");
          const at = now();
          const parsed = startVoteInput(at).safeParse(input);
          if (!parsed.success) {
            const fields = Object.fromEntries(
              parsed.error.issues.map((i) => [
                String(i.path[0] ?? "vote"),
                i.message,
              ]),
            );
            throw new AppError(
              "VALIDATION",
              Object.values(fields)[0] ?? "Check the form.",
              { fields },
            );
          }
          const vote: Vote = {
            id: newId("vote"),
            title: parsed.data.title,
            description: parsed.data.description,
            status: "open",
            createdBy: actor.id,
            deadlineAt: parsed.data.deadlineAt ?? null,
            closedAt: null,
            closedBy: null,
          };
          d.votes.push(vote);
          parsed.data.options.forEach((label, i) =>
            d.voteOptions.push({
              id: `${vote.id}:${i + 1}`,
              voteId: vote.id,
              label,
              sortOrder: i,
            }),
          );
          // Eligible voters are ExComm plus President at this moment and stay fixed (R-13)
          const voters = d.members
            .filter((m) => m.status === "active" && m.accountType !== "member")
            .map((m) => m.id);
          voters.forEach((memberId) =>
            d.voteEligible.push({ voteId: vote.id, memberId }),
          );
          ev.voteStarted(d, at, vote, voters);
          log(d, at, actor.id, "vote.start", "vote", vote.id, null, {
            title: vote.title,
          });
          return { ...vote };
        }),
      ),

    cast: (voteId, optionId) =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor, member } = me(d, sid);
          const v = d.votes.find((x) => x.id === voteId);
          if (!v) throw new AppError("NOT_FOUND", "Vote not found.");
          const at = now();
          if (
            v.status === "closed" ||
            (v.deadlineAt && Date.parse(v.deadlineAt) <= at.getTime())
          )
            throw new AppError("CLOSED", "This vote is closed.");
          const eligible = d.voteEligible.some(
            (e) => e.voteId === voteId && e.memberId === member.id,
          );
          assertCan(actor, "vote.cast", {
            voteStatus: v.status,
            isEligibleVoter: eligible,
          });
          if (
            d.voteParticipation.some(
              (p) => p.voteId === voteId && p.memberId === member.id,
            )
          )
            throw new AppError("ALREADY_VOTED", "You have already voted.");
          if (
            !d.voteOptions.some((o) => o.id === optionId && o.voteId === voteId)
          )
            throw new AppError("VALIDATION", "Choose one of the options.", {
              fields: { optionId: "Choose one of the options." },
            });
          // Participation says that someone voted; the ballot says what, with no member id (FR-44).
          d.voteParticipation.push({
            voteId,
            memberId: member.id,
            castAt: at.toISOString(),
          });
          d.voteBallots.push({
            id: newId("bal"),
            ...makeBallot({ voteId, optionId }),
          });
          ev.closeTasks(
            d,
            at,
            (t) =>
              t.code === "T-05" &&
              t.refId === voteId &&
              t.memberId === member.id,
          );
          touch(d, member.id, at);
        }),
      ),

    close: (voteId) =>
      call((sid) =>
        mutate(store, (d): Vote => {
          const { actor } = me(d, sid);
          assertCan(actor, "vote.close");
          const v = d.votes.find((x) => x.id === voteId);
          if (!v) throw new AppError("NOT_FOUND", "Vote not found.");
          if (v.status === "closed")
            throw new AppError("CLOSED", "This vote is already closed.");
          closeVote(d, now(), voteId, actor.id);
          return { ...v };
        }),
      ),
  };
}
