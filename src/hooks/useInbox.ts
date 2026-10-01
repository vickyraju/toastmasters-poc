"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
              void getServices().notifications.markRead([n.id]);
              router.push(n.link);
            },
          },
        });
      }),
    [qc, router],
  );
}
