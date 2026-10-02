"use client";

import { useQuery } from "@tanstack/react-query";
import { getServices } from "@/lib/services";
import { qk } from "./keys";

export function useMeeting(id: string, enabled = true) {
  return useQuery({
    queryKey: qk.meeting(id),
    queryFn: () => getServices().meetings.get(id),
    enabled,
  });
}

export function useMeetingRoles(id: string, enabled = true) {
  return useQuery({
    queryKey: qk.meetingRoles(id),
    queryFn: () => getServices().roles.listForMeeting(id),
    enabled,
  });
}

export function useAgendaOutline(id: string) {
  return useQuery({
    queryKey: qk.agendaOutline(id),
    queryFn: () => getServices().meetings.agendaOutline(id),
  });
}
