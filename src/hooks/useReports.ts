"use client";

import { useQuery } from "@tanstack/react-query";
import { getServices, type ReportInput } from "@/lib/services";
import { useAction } from "./useAction";
import { qk } from "./keys";

export function useMeetingReports(meetingId: string) {
  return useQuery({
    queryKey: qk.reports(meetingId),
    queryFn: () => getServices().reports.forMeeting(meetingId),
  });
}

export const useSaveReport = () =>
  useAction(
    (a: { slotId: string; payload: ReportInput }) =>
      getServices().reports.save(a.slotId, a.payload),
    () => "Draft saved.",
  );

export const useSubmitReport = () =>
  useAction(
    (a: { slotId: string; payload: ReportInput }) =>
      getServices().reports.submit(a.slotId, a.payload),
    () => "Report submitted.",
  );

export const usePublishTheme = () =>
  useAction(
    (a: {
      id: string;
      input: Parameters<
        ReturnType<typeof getServices>["meetings"]["publishTheme"]
      >[1];
    }) => getServices().meetings.publishTheme(a.id, a.input),
    () => "Theme published",
  );
