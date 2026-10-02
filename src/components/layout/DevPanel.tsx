"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useDevAction, useDevStatus } from "@/hooks/useDev";
import { useGenerateRecurring } from "@/hooks/useTemplates";
import { formatIST } from "@/lib/time/ist";

const HOUR = 3_600_000;

/** /dev: mock clock jumps, reset, simulate error, test notification (mock-data.md section 1, R-10). */
export function DevPanel() {
  const status = useDevStatus();
  const act = useDevAction();
  const generate = useGenerateRecurring();
  const busy = act.isPending;

  return (
    <div className="max-w-xl space-y-6">
      <section className="space-y-3 rounded-lg border border-border bg-card p-5">
        <h2 className="text-xl font-semibold">Mock clock</h2>
        {status.data ? (
          <p className="text-base">
            {formatIST(status.data.now, "EEE d MMM yyyy, h:mm a")}{" "}
            <span className="text-muted-foreground">IST</span>
          </p>
        ) : (
          <Skeleton className="h-6 w-64" />
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => act.mutate({ kind: "jump", to: { ms: HOUR } })}
          >
            +1 hour
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => act.mutate({ kind: "jump", to: { ms: 24 * HOUR } })}
          >
            +1 day
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              act.mutate({ kind: "jump", to: "next-meeting-start" })
            }
          >
            Next meeting start
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => act.mutate({ kind: "jump", to: "next-meeting-end" })}
          >
            Next meeting end
          </Button>
        </div>
        {act.error ? (
          <p role="alert" className="text-sm text-danger">
            {act.error.message}
          </p>
        ) : null}
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-card p-5">
        <h2 className="text-xl font-semibold">Data and errors</h2>
        <div className="flex items-center gap-3">
          <Switch
            id="simulate-error"
            checked={status.data?.simulateError ?? false}
            disabled={busy || !status.data}
            onCheckedChange={(on) => act.mutate({ kind: "simulateError", on })}
          />
          <Label htmlFor="simulate-error">
            Simulate error (service calls fail)
          </Label>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => act.mutate({ kind: "testNotification" })}
          >
            Send test notification
          </Button>
          <Button
            variant="outline"
            disabled={busy || generate.isPending}
            onClick={() => generate.mutate(undefined)}
          >
            Generate recurring meetings
          </Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => {
              if (
                window.confirm(
                  "Reset all demo data? Changes made in this browser are lost.",
                )
              )
                act.mutate({ kind: "reset" });
            }}
          >
            Reset data
          </Button>
          {busy ? (
            <Loader2
              className="size-5 animate-spin self-center text-muted-foreground"
              aria-label="Working"
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}
