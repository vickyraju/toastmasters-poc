"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRecordDenied } from "@/hooks/useAudit";

/** G-05. Rendered in place of the page so the URL and the shell stay; the attempt is logged. */
export function AccessDenied({ path }: { path: string }) {
  useRecordDenied(path);
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <Lock className="size-10 text-muted-foreground" aria-hidden="true" />
      <h2 className="text-2xl font-semibold">
        You do not have access to this page
      </h2>
      <Button asChild>
        <Link href="/home">Back to Home</Link>
      </Button>
    </div>
  );
}
