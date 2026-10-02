"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/** A write that can change any card: refetch everything after it, show errors as toasts (design.md section 5). */
export function useAction<A, R = unknown>(
  fn: (args: A) => Promise<R>,
  success?: (args: A, result: R) => string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result, args) => {
      if (success) toast.success(success(args, result));
    },
    onError: (e) => toast.error(e.message),
    onSettled: () => qc.invalidateQueries(),
  });
}
