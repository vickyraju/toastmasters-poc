"use client";

import { useMutation } from "@tanstack/react-query";
import {
  getServices,
  type CreateMeetingInput,
  type UploadFile,
} from "@/lib/services";
import type { MeetingStatus } from "@/lib/domain/types";
import { useAction } from "./useAction";

export const useCreateMeeting = () =>
  useAction((a: { input: CreateMeetingInput; agenda?: UploadFile }) =>
    getServices()
      .meetings.create(a.input)
      .then(async (m) => {
        if (a.agenda) await getServices().meetings.uploadAgenda(m.id, a.agenda);
        return m;
      }),
  );

export const useUpdateMeeting = () =>
  useAction(
    (a: {
      id: string;
      patch: Parameters<
        ReturnType<typeof getServices>["meetings"]["update"]
      >[1];
    }) => getServices().meetings.update(a.id, a.patch),
    () => "Meeting saved.",
  );

export const useCancelMeeting = () =>
  useAction(
    (a: { id: string; reason: string }) =>
      getServices().meetings.cancel(a.id, a.reason),
    () => "Meeting cancelled. Role holders notified.",
  );

export const useUploadAgenda = () =>
  useAction(
    (a: { id: string; file: UploadFile }) =>
      getServices().meetings.uploadAgenda(a.id, a.file),
    () => "Agenda uploaded.",
  );

/** Dry run used by confirm dialogs. */
export const useStatusPreview = () =>
  useMutation({
    mutationFn: (a: { id: string; status: MeetingStatus }) =>
      getServices().meetings.statusPreview(a.id, a.status),
  });
