"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getServices } from "@/lib/services";
import { qk } from "./keys";

export function useMyTasks() {
  return useQuery({
    queryKey: qk.tasks,
    queryFn: () => getServices().tasks.listMine(),
  });
}

export function useMyNotifications() {
  return useQuery({
    queryKey: qk.notifications,
    queryFn: () => getServices().notifications.listMine(),
  });
}

/** G-03: a toast for each notification that arrives while the app is open; "View" goes to the action. */
export function useNotificationToasts() {
  const qc = useQueryClient();
  const router = useRouter();
  useEffect(
    () =>
      getServices().notifications.subscribe((n) => {
        void qc.invalidateQueries({ queryKey: qk.notifications });
        void qc.invalidateQueries({ queryKey: qk.tasks });
        toast(n.title, {
          description: n.body ?? undefined,
          action: {
            label: "View",
            onClick: () => {
              void getServices()
                .notifications.markRead([n.id])
                .then(() =>
                  qc.invalidateQueries({ queryKey: qk.notifications }),
                );
              router.push(n.link);
            },
          },
        });
      }),
    [qc, router],
  );
}

/** Opening a notification marks it read (flow.md J-13 step 4). */
export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => getServices().notifications.markRead(ids),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => getServices().notifications.markAllRead(),
    onError: (e) => toast.error(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.notifications }),
  });
}
