"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getServices, type DevService } from "@/lib/services";
import { qk } from "./keys";

const TICK_MS = 60_000;

/** Mock mode: run the time-based jobs once a minute (architecture.md section 7). */
export function useMockTick() {
  const qc = useQueryClient();
  useEffect(() => {
    const id = setInterval(async () => {
      await getServices().dev.tick();
      void qc.invalidateQueries({ queryKey: qk.tasks });
      void qc.invalidateQueries({ queryKey: qk.notifications });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [qc]);
}

export function useDevStatus() {
  return useQuery({
    queryKey: qk.devStatus,
    queryFn: () => getServices().dev.status(),
    refetchInterval: 30_000,
  });
}

type DevAction =
  | { kind: "jump"; to: Parameters<DevService["jump"]>[0] }
  | { kind: "reset" }
  | { kind: "simulateError"; on: boolean }
  | { kind: "testNotification" };

/** Every dev action changes data under the app, so all queries refetch afterwards. */
export function useDevAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (a: DevAction) => {
      const dev = getServices().dev;
      if (a.kind === "jump") return dev.jump(a.to);
      if (a.kind === "reset") return dev.reset();
      if (a.kind === "simulateError") return dev.setSimulateError(a.on);
      return dev.sendTestNotification();
    },
    onSettled: () => qc.invalidateQueries(),
  });
}
