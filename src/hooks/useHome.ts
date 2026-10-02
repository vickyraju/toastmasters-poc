"use client";

import { useQuery } from "@tanstack/react-query";
import { useAction } from "./useAction";
import { getServices } from "@/lib/services";
import { now } from "@/lib/time/clock";
import type { MeetingStatus } from "@/lib/domain/types";
import { qk } from "./keys";

/** Current time from the mock clock (or real time in API mode), refreshed each minute. */
export function useNow() {
  return useQuery({
    queryKey: qk.now,
    queryFn: () => {
      getServices(); // the adapter sets the clock source
      return now().toISOString();
    },
    refetchInterval: 60_000,
  });
}

export function useMeetings() {
  return useQuery({
    queryKey: qk.meetings,
    queryFn: () => getServices().meetings.list(),
  });
}

export function useOpenRolesForMe() {
  return useQuery({
    queryKey: qk.openForMe,
    queryFn: () => getServices().roles.openForMe(),
  });
}

export function usePendingWithdrawals(enabled: boolean) {
  return useQuery({
    queryKey: qk.pendingWithdrawals,
    queryFn: () => getServices().roles.pendingWithdrawals(),
    enabled,
  });
}

export function useVerifyQueue(enabled: boolean) {
  return useQuery({
    queryKey: qk.verifyQueue,
    queryFn: () => getServices().progress.verifyQueue(),
    enabled,
  });
}

export function useMyCompletions() {
  return useQuery({
    queryKey: qk.myCompletions,
    queryFn: () => getServices().progress.listMine(),
  });
}

export function useVotes(enabled: boolean) {
  return useQuery({
    queryKey: qk.votes,
    queryFn: () => getServices().votes.list(),
    enabled,
  });
}

export function usePositions(enabled: boolean) {
  return useQuery({
    queryKey: qk.positions,
    queryFn: () => getServices().positions.list(),
    enabled,
  });
}

export const useClaimRole = () =>
  useAction(
    (a: { slotId: string; label: string }) =>
      getServices().roles.claim(a.slotId),
    (a) => `You took ${a.label}.`,
  );

export const useDecideWithdrawal = () =>
  useAction(
    (a: { requestId: string; decision: "approve" | "reject" }) =>
      getServices().roles.decideWithdrawal(a.requestId, a.decision),
    (a) =>
      a.decision === "approve"
        ? "Withdrawal approved. The role is open again."
        : "Withdrawal rejected.",
  );

export const useDecideCompletion = () =>
  useAction(
    (a: { id: string; decision: "verify" | "reject"; reason?: string }) =>
      getServices().progress.decide(a.id, a.decision, a.reason),
    (a) => (a.decision === "verify" ? "Level verified." : "Level rejected."),
  );

export const useSetMeetingStatus = () =>
  useAction(
    (a: { id: string; status: MeetingStatus }) =>
      getServices().meetings.setStatus(a.id, a.status),
    (a) =>
      a.status === "open"
        ? "Meeting opened for roles."
        : a.status === "finalized"
          ? "Meeting finalized."
          : "Status updated.",
  );
