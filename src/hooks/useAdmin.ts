"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getServices,
  type AuditFilters,
  type ExportKind,
} from "@/lib/services";
import type { NotifCode } from "@/lib/domain/types";
import type { ClubSettingsValues } from "@/lib/domain/schemas";
import { useAction } from "./useAction";
import { qk } from "./keys";

export function useAudit(filters: AuditFilters) {
  return useQuery({
    queryKey: qk.audit(filters),
    queryFn: () => getServices().audit.list(filters),
  });
}

export function useNotifPrefs() {
  return useQuery({
    queryKey: qk.prefs,
    queryFn: () => getServices().settings.notificationPrefs(),
  });
}

export const useSavePrefs = () =>
  useAction((changes: Partial<Record<NotifCode, boolean>>) =>
    getServices().settings.savePrefs(changes),
  );

/** Runs the export. The page decides what to tell the user: nothing to download, or the file name. */
export const useRunExport = () =>
  useAction((a: { kind: ExportKind; from: string; to: string }) =>
    getServices().exports.csv(a.kind, { from: a.from, to: a.to }),
  );

export function useClubSettings() {
  return useQuery({
    queryKey: qk.club,
    queryFn: () => getServices().settings.getClub(),
  });
}

export const useUpdateClub = () =>
  useAction(
    (input: ClubSettingsValues) => getServices().settings.updateClub(input),
    () => "Club settings saved.",
  );
