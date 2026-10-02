"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getServices, type WithdrawOutcome } from "@/lib/services";
import type { SpeakerDetails } from "@/lib/domain/types";
import { useAction } from "./useAction";
import { qk } from "./keys";

export function useMyBoardActions(meetingId: string) {
  return useQuery({
    queryKey: qk.myBoard(meetingId),
    queryFn: () => getServices().roles.myActions(meetingId),
  });
}

/** Refetch everything when data changes elsewhere (another tab, a background tick). */
export function useLiveUpdates() {
  const qc = useQueryClient();
  useEffect(
    () => getServices().roles.subscribe(() => void qc.invalidateQueries()),
    [qc],
  );
}

export function useRoleTemplates() {
  return useQuery({
    queryKey: qk.roleTemplates,
    queryFn: () => getServices().templates.roleTemplates(),
  });
}

export function useProjects() {
  return useQuery({
    queryKey: qk.projects,
    queryFn: () => getServices().templates.projects(),
  });
}

export function useMembers(enabled = true) {
  return useQuery({
    queryKey: qk.members,
    queryFn: () => getServices().members.list(),
    enabled,
  });
}

export const useAssignRole = () =>
  useAction(
    (a: {
      slotId: string;
      memberId: string | null;
      label: string;
      name?: string;
    }) => getServices().roles.assign(a.slotId, a.memberId),
    (a) =>
      a.memberId
        ? `${a.name ?? "Member"} assigned to ${a.label}.`
        : `${a.label} is open again.`,
  );

export const useWithdraw = () =>
  useAction(
    (a: { slotId: string; label: string; reason?: string }) =>
      getServices().roles.withdraw(a.slotId, a.reason),
    (a, r: WithdrawOutcome) =>
      r.outcome === "withdrawn"
        ? `You withdrew from ${a.label}.`
        : "Request sent. You keep the role until ExComm decides.",
  );

export const useRequestSwap = () =>
  useAction(
    (a: { mySlotId: string; targetSlotId: string }) =>
      getServices().roles.requestSwap(a.mySlotId, a.targetSlotId),
    () => "Swap requested.",
  );

export const useRespondSwap = () =>
  useAction(
    (a: { swapId: string; decision: "accept" | "decline" | "cancel" }) =>
      getServices().roles.respondSwap(a.swapId, a.decision),
    (a) =>
      a.decision === "accept"
        ? "Swap accepted. Your roles have changed."
        : a.decision === "decline"
          ? "Swap declined."
          : "Swap request cancelled.",
  );

export const useSaveSpeakerDetails = () =>
  useAction(
    (a: {
      slotId: string;
      data: Partial<Omit<SpeakerDetails, "meetingRoleId">>;
    }) => getServices().roles.saveSpeakerDetails(a.slotId, a.data),
    () => "Speech details saved.",
  );

export const useAddSlot = () =>
  useAction(
    (a: { meetingId: string; roleTemplateId: string; label?: string }) =>
      getServices().roles.addSlot(a.meetingId, {
        roleTemplateId: a.roleTemplateId,
        label: a.label,
      }),
    () => "Role added.",
  );

export const useRemoveSlot = () =>
  useAction(
    (a: { slotId: string; label: string }) =>
      getServices().roles.removeSlot(a.slotId),
    (a) => `${a.label} removed.`,
  );
