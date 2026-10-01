"use client";

import type { UseQueryResult } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The four states every data view needs (rules.md Part B rule 9): skeleton while loading,
 * "Could not load X. Try again" on error, a one-line empty message, then the content.
 */
export function QueryBlock<T>({
  query,
  label,
  isEmpty,
  empty,
  rows = 3,
  children,
}: {
  query: Pick<
    UseQueryResult<T>,
    "data" | "isPending" | "isError" | "refetch" | "isFetching"
  >;
  label: string;
  isEmpty?: (data: T) => boolean;
  empty?: string;
  rows?: number;
  children: (data: T) => React.ReactNode;
}) {
  if (query.isPending)
    return (
      <div
        className="space-y-2"
        aria-busy="true"
        aria-label={`Loading ${label}`}
      >
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  if (query.isError || query.data === undefined)
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center gap-3 rounded-lg border border-danger/30 bg-danger-bg p-3 text-sm text-danger"
      >
        <span className="flex-1">Could not load {label}. Try again</span>
        <Button
          variant="outline"
          size="sm"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          Retry
        </Button>
      </div>
    );
  if (isEmpty?.(query.data))
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  return <>{children(query.data)}</>;
}
