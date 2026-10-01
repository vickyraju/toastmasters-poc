import type { VoteBallot, VoteStatus } from "../types";

const ALLOWED_BALLOT_KEYS = new Set(["id", "voteId", "optionId", "createdAt"]);

/** R-13: a ballot is `{ voteId, optionId }` and nothing else, even if the input object carries more. */
export function makeBallot(input: {
  voteId: string;
  optionId: string;
}): Pick<VoteBallot, "voteId" | "optionId"> {
  return { voteId: input.voteId, optionId: input.optionId };
}

/** Throws if a stored ballot carries anything that could identify a voter. */
export function assertBallotAnonymous(ballot: object): void {
  const extra = Object.keys(ballot).filter((k) => !ALLOWED_BALLOT_KEYS.has(k));
  if (extra.length > 0)
    throw new Error(`Ballot must not carry: ${extra.join(", ")}`);
}

export type VoteView =
  | { status: "open"; turnout: { cast: number; eligible: number } }
  | {
      status: "closed";
      turnout: { cast: number; eligible: number };
      results: {
        optionId: string;
        label: string;
        count: number;
        percent: number;
      }[];
      tie: boolean;
    };

/** The only place counts are computed. While open it returns turnout and nothing else. */
export function voteView(input: {
  status: VoteStatus;
  options: { id: string; label: string }[];
  ballots: VoteBallot[];
  cast: number;
  eligible: number;
}): VoteView {
  const turnout = { cast: input.cast, eligible: input.eligible };
  if (input.status === "open") return { status: "open", turnout };
  input.ballots.forEach(assertBallotAnonymous);
  const total = input.ballots.length;
  const results = input.options.map((o) => {
    const count = input.ballots.filter((b) => b.optionId === o.id).length;
    return {
      optionId: o.id,
      label: o.label,
      count,
      percent: total ? Math.round((count / total) * 100) : 0,
    };
  });
  const top = Math.max(...results.map((r) => r.count));
  const tie = total > 0 && results.filter((r) => r.count === top).length > 1;
  return { status: "closed", turnout, results, tie };
}
