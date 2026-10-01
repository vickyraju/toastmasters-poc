"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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

/** A write that can change any card: refetch everything after it, show errors as toasts (design.md section 5). */
function useAction<A>(
  fn: (args: A) => Promise<unknown>,
  success?: (args: A) => string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_r, args) => {
      if (success) toast.success(success(args));
    },
    onError: (e) => toast.error(e.message),
    onSettled: () => qc.invalidateQueries(),
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
