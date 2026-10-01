"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getServices, type CurrentUser } from "@/lib/services";
import {
  can,
  type Action,
  type Actor,
  type Resource,
} from "@/lib/permissions/can";
import { qk } from "./keys";

export function useCurrentUser() {
  return useQuery({
    queryKey: qk.me,
    queryFn: () => getServices().auth.getCurrentUser(),
  });
}

export const toActor = (u: CurrentUser): Actor => ({
  id: u.id,
  accountType: u.accountType,
  position: u.position,
});

/** The signed-in member as a permission actor, or null while loading or signed out. */
export function useActor(): Actor | null {
  const { data } = useCurrentUser();
  return data ? toActor(data) : null;
}

/** Same can() the services use, for hiding and disabling UI (rules.md Part B rule 4). */
export function useCan(action: Action, resource?: Resource): boolean {
  const actor = useActor();
  return actor ? can(actor, action, resource) : false;
}

export function useSignIn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (employeeId: string) => getServices().auth.signIn(employeeId),
    onSuccess: (user) => {
      qc.clear();
      qc.setQueryData(qk.me, user);
    },
  });
}

export function useSignOut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => getServices().auth.signOut(),
    onSuccess: () => {
      qc.clear();
      qc.setQueryData(qk.me, null);
    },
  });
}

export function useDemoAccounts() {
  return useQuery({
    queryKey: qk.demoAccounts,
    queryFn: () => getServices().auth.demoAccounts(),
  });
}
