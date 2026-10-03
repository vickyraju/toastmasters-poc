"use client";

import { useQuery } from "@tanstack/react-query";
import { getServices } from "@/lib/services";
import { useAction } from "./useAction";
import { qk } from "./keys";

export function useMeetingTypes() {
  return useQuery({
    queryKey: qk.meetingTypes,
    queryFn: () => getServices().templates.meetingTypes(),
  });
}

export function useRecurring() {
  return useQuery({
    queryKey: qk.recurring,
    queryFn: () => getServices().templates.recurring(),
  });
}

type Save<I> = { id: string | null; input: I };

export const useSaveMeetingType = () =>
  useAction(
    (
      a: Save<
        Parameters<
          ReturnType<typeof getServices>["templates"]["saveMeetingType"]
        >[1]
      >,
    ) => getServices().templates.saveMeetingType(a.id, a.input),
    (a) =>
      a.id
        ? "Meeting type saved."
        : "Meeting type added. All members notified.",
  );

export const useSaveRoleTemplate = () =>
  useAction(
    (
      a: Save<
        Parameters<
          ReturnType<typeof getServices>["templates"]["saveRoleTemplate"]
        >[1]
      >,
    ) => getServices().templates.saveRoleTemplate(a.id, a.input),
    (a) => (a.id ? "Role saved." : "Role added. All members notified."),
  );

export const useSaveProject = () =>
  useAction(
    (
      a: Save<
        Parameters<
          ReturnType<typeof getServices>["templates"]["saveProject"]
        >[1]
      >,
    ) => getServices().templates.saveProject(a.id, a.input),
    () => "Project timing saved.",
  );

export const useSaveRecurring = () =>
  useAction(
    (
      a: Save<
        Parameters<
          ReturnType<typeof getServices>["templates"]["saveRecurring"]
        >[1]
      > & { applyToDrafts?: boolean },
    ) => getServices().templates.saveRecurring(a.id, a.input, a.applyToDrafts),
    (a) =>
      a.id
        ? "Template saved. Changes apply to future meetings."
        : "Template added. All members notified.",
  );

export const useGenerateRecurring = () =>
  useAction(
    () => getServices().templates.generateRecurring(),
    (_a, r) =>
      r.created
        ? `${r.created} draft ${r.created === 1 ? "meeting" : "meetings"} created.`
        : "Nothing new to create.",
  );

export const useOpenAllDrafts = () =>
  useAction(
    () => getServices().meetings.openAllDrafts(),
    (_a, r) =>
      r.opened
        ? `${r.opened} ${r.opened === 1 ? "meeting" : "meetings"} opened for roles.${r.skipped ? ` ${r.skipped} skipped: each needs a venue or link, or has already ended.` : ""}`
        : r.skipped
          ? `Nothing opened. ${r.skipped} ${r.skipped === 1 ? "draft needs" : "drafts need"} a venue or link, or already ${r.skipped === 1 ? "has" : "have"} ended.`
          : "There are no drafts to open.",
  );
