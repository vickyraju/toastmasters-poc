"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useSetMeetingStatus } from "@/hooks/useHome";
import { useCancelMeeting, useStatusPreview } from "@/hooks/useMeetingActions";
import { useCan } from "@/hooks/useSession";
import type { MeetingStatus } from "@/lib/domain/types";
import type { LifecycleWarning } from "@/lib/domain/rules/lifecycle";

type Pending =
  | {
      to: MeetingStatus;
      warnings: LifecycleWarning[];
      openRoles: string[];
      missingReports: string[];
    }
  | "cancel"
  | null;

const TEXT: Record<
  "open" | "reopen" | "finalized" | "completed",
  { title: string; body: string; confirm: string }
> = {
  open: {
    title: "Open this meeting for roles?",
    body: "All members are notified and can take roles.",
    confirm: "Open for roles",
  },
  reopen: {
    title: "Reopen for role changes?",
    body: "Nobody is notified unless roles change.",
    confirm: "Reopen",
  },
  finalized: {
    title: "Finalize this meeting?",
    body: "Role holders are notified with the confirmed agenda.",
    confirm: "Finalize",
  },
  completed: {
    title: "Mark this meeting completed?",
    body: "Reports lock and the consolidated report opens to every member. This cannot be undone.",
    confirm: "Mark completed",
  },
};

const WARNING_TEXT: Record<LifecycleWarning, string> = {
  OPEN_ROLES: "Some roles are still open. You can still finalize.",
  MISSING_REPORTS:
    "Some required reports have not been submitted. You can still complete the meeting.",
};

/** S-04 header actions for ExComm (J-07): Edit, the next status step, and Cancel, each confirmed in a sentence. */
export function MeetingActions({
  id,
  status,
}: {
  id: string;
  status: MeetingStatus;
}) {
  const canManage = useCan("meeting.status");
  const setStatus = useSetMeetingStatus();
  const preview = useStatusPreview();
  const cancel = useCancelMeeting();
  const [pending, setPending] = useState<Pending>(null);
  const [reason, setReason] = useState("");

  if (!canManage || status === "completed" || status === "cancelled")
    return null;

  const ask = (to: MeetingStatus) =>
    preview.mutate(
      { id, status: to },
      {
        onSuccess: (r) =>
          r.ok
            ? setPending({
                to,
                warnings: r.warnings,
                openRoles: r.openRoles,
                missingReports: r.missingReports,
              })
            : toast.error(r.message),
        onError: (e) => toast.error(e.message),
      },
    );

  const kind =
    pending && pending !== "cancel"
      ? pending.to === "open" && status === "finalized"
        ? "reopen"
        : (pending.to as keyof typeof TEXT)
      : null;
  const text = kind ? TEXT[kind] : null;
  const busy = preview.isPending || setStatus.isPending;

  return (
    <div className="flex flex-wrap gap-2">
      <Button asChild variant="outline">
        <Link href={`/meetings/${id}/edit`}>Edit</Link>
      </Button>
      {status === "draft" ? (
        <Button disabled={busy} onClick={() => ask("open")}>
          Open for roles
        </Button>
      ) : null}
      {status === "open" ? (
        <Button disabled={busy} onClick={() => ask("finalized")}>
          Finalize
        </Button>
      ) : null}
      {status === "finalized" ? (
        <>
          <Button variant="outline" disabled={busy} onClick={() => ask("open")}>
            Reopen
          </Button>
          <Button disabled={busy} onClick={() => ask("completed")}>
            Mark completed
          </Button>
        </>
      ) : null}
      <Button
        variant="danger"
        onClick={() => {
          setReason("");
          setPending("cancel");
        }}
      >
        Cancel meeting
      </Button>

      {text && pending && pending !== "cancel" ? (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setPending(null)}
          title={text.title}
          description={text.body}
          confirmLabel={text.confirm}
          busy={setStatus.isPending}
          onConfirm={() =>
            setStatus.mutate(
              { id, status: pending.to },
              { onSuccess: () => setPending(null) },
            )
          }
        >
          {pending.warnings.map((w) => (
            <div
              key={w}
              className="space-y-1 rounded-md bg-warning-bg px-3 py-2 text-sm text-warning"
            >
              <p>{WARNING_TEXT[w]}</p>
              <ul className="list-disc pl-5">
                {(w === "OPEN_ROLES"
                  ? pending.openRoles
                  : pending.missingReports
                ).map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ))}
        </ConfirmDialog>
      ) : null}

      {pending === "cancel" ? (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setPending(null)}
          title="Cancel this meeting?"
          description="Role holders are notified and open tasks for this meeting are removed. This cannot be undone."
          confirmLabel="Cancel meeting"
          destructive
          busy={cancel.isPending || !reason.trim()}
          onConfirm={() =>
            cancel.mutate({ id, reason }, { onSuccess: () => setPending(null) })
          }
        >
          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason">Reason (required)</Label>
            <Textarea
              id="cancel-reason"
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
              className="text-base"
            />
          </div>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
