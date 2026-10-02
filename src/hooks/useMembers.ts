"use client";

import { useQuery } from "@tanstack/react-query";
import { getServices } from "@/lib/services";
import type { MemberAddValues, MemberEditValues } from "@/lib/domain/schemas";
import { useAction } from "./useAction";
import { qk } from "./keys";

export function useMemberProfile(id: string) {
  return useQuery({
    queryKey: qk.profile(id),
    queryFn: () => getServices().members.profile(id),
  });
}

export function useRemovalImpact(id: string | null) {
  return useQuery({
    queryKey: qk.impact(id ?? ""),
    queryFn: () => getServices().members.impact(id!),
    enabled: id !== null,
    gcTime: 0, // always fresh: it decides what a destructive action does
  });
}

export const useAddMember = () =>
  useAction(
    (input: MemberAddValues) => getServices().members.add(input),
    (i) => `${i.name.trim()} added.`,
  );

export const useUpdateMember = () =>
  useAction(
    (a: { id: string; patch: Partial<MemberEditValues> }) =>
      getServices().members.update(a.id, a.patch),
    () => "Member saved.",
  );

export const useSetMemberActive = () =>
  useAction(
    (a: { id: string; name: string; active: boolean }) =>
      getServices().members.setActive(a.id, a.active),
    (a, r) =>
      a.active
        ? `${a.name} reactivated.`
        : `${a.name} deactivated.${r.released ? ` ${r.released} ${r.released === 1 ? "role" : "roles"} released.` : ""}`,
  );

export const useRemoveMember = () =>
  useAction(
    (a: { id: string; name: string }) => getServices().members.remove(a.id),
    (a, r) =>
      `${a.name} removed.${r.released ? ` ${r.released} ${r.released === 1 ? "role" : "roles"} released.` : ""}`,
  );

export const useAssignPosition = () =>
  useAction(
    (a: {
      code: Parameters<
        ReturnType<typeof getServices>["positions"]["assign"]
      >[0];
      memberId: string | null;
      label: string;
    }) => getServices().positions.assign(a.code, a.memberId),
    (a) => (a.memberId ? `${a.label} assigned.` : `${a.label} is now vacant.`),
  );

export const useSetNextPresident = () =>
  useAction(
    (memberId: string | null) =>
      getServices().positions.setNextPresident(memberId),
    (id) => (id ? "Next President named." : "Next President cleared."),
  );

export const useTransferPresidency = () =>
  useAction(
    () => getServices().positions.transfer(),
    () => "Presidency transferred.",
  );

export const useImportMembers = () =>
  useAction(
    (a: {
      rows: Parameters<
        ReturnType<typeof getServices>["members"]["importCsv"]
      >[0];
      commit: boolean;
    }) => getServices().members.importCsv(a.rows, a.commit),
  );
