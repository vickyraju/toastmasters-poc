"use client";

import { useQuery } from "@tanstack/react-query";
import { getServices, type StartVoteInput } from "@/lib/services";
import { useAction } from "./useAction";
import { qk } from "./keys";

export function useVote(id: string) {
  return useQuery({
    queryKey: qk.vote(id),
    queryFn: () => getServices().votes.get(id),
  });
}

export const useStartVote = () =>
  useAction(
    (input: StartVoteInput) => getServices().votes.start(input),
    () => "Vote started. Eligible voters are notified.",
  );

export const useCastVote = () =>
  useAction(
    (a: { voteId: string; optionId: string }) =>
      getServices().votes.cast(a.voteId, a.optionId),
    () => "Your vote is in.",
  );

export const useCloseVote = () =>
  useAction(
    (voteId: string) => getServices().votes.close(voteId),
    () => "Vote closed. Results are open to eligible voters.",
  );
