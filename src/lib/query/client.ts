import { MutationCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppError } from "@/lib/services";

declare module "@tanstack/react-query" {
  interface Register {
    mutationMeta: { silent?: boolean };
  }
}

/**
 * Every failed write shows an error toast (design.md section 5), so no screen can swallow one by forgetting
 * an onError. A mutation that explains the failure itself (inline form error, its own message) sets `meta.silent`.
 */
export function makeQueryClient(retryQueries = true) {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        if (mutation.meta?.silent) return;
        toast.error(
          error instanceof Error && error.message
            ? error.message
            : "Something went wrong. Try again.",
        );
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Retry only unexpected failures; a 4xx answer will not change on retry.
        retry: retryQueries
          ? (count, err) =>
              count < 2 && !(err instanceof AppError && err.status < 500)
          : false,
      },
    },
  });
}
