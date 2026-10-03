"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/** A write that can change any card: refetch everything after it, errors become toasts in the query client (src/lib/query/client.ts). */
export function useAction<A, R = unknown>(
  fn: (args: A) => Promise<R>,
  success?: (args: A, result: R) => string,
  opts?: { silent?: boolean },
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    meta: { silent: opts?.silent },
    onSuccess: (result, args) => {
      if (success) toast.success(success(args, result));
    },
    onSettled: () => qc.invalidateQueries(),
  });
}
