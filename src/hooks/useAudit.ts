"use client";

import { useEffect, useRef } from "react";
import { getServices } from "@/lib/services";

/** G-05: log the denied path once per visit. */
export function useRecordDenied(path: string) {
  const logged = useRef<string | null>(null);
  useEffect(() => {
    if (logged.current === path) return;
    logged.current = path;
    void getServices().audit.recordDenied(path);
  }, [path]);
}
