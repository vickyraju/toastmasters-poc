"use client";

import { useState } from "react";
import Link from "next/link";
import type { UseQueryResult } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/shared/Card";
import { QueryBlock } from "@/components/shared/QueryBlock";
import {
  useDecideCompletion,
  useDecideWithdrawal,
  usePendingWithdrawals,
  usePositions,
  useSetMeetingStatus,
  useVerifyQueue,
  useVotes,
} from "@/hooks/useHome";
import { formatIST } from "@/lib/time/ist";
import type { MeetingListItem } from "@/lib/services";

type Upcoming = UseQueryResult<MeetingListItem[]>;
const shortDate = (iso: string) => formatIST(iso, "EEE d MMM");
const linkClass =
  "text-sm font-medium text-primary underline-offset-4 hover:underline";
const rowButton = "h-9 max-lg:h-11";
const dangerButton = `${rowButton} border-danger text-danger`;

export function MeetingStatusCard({
  upcoming,
  className,
}: {
  upcoming: Upcoming;
  className?: string;
}) {
  const setStatus = useSetMeetingStatus();
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <Card title="Next meeting status" className={className}>
      <QueryBlock
        query={upcoming}
        label="the next meeting"
        isEmpty={(d) => d.length === 0}
        empty="No upcoming meetings"
      >
        {([m]) => {
          const open = m.total - m.filled;
          const next =
            m.status === "draft"
              ? "open"
              : m.status === "open"
                ? "finalized"
                : null;
          const run = () => setStatus.mutate({ id: m.id, status: next! });
          return (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {shortDate(m.startsAt)}
              </p>
              <p className="font-medium">
                {m.filled} of {m.total} roles filled
              </p>
              <div
                role="progressbar"
                aria-label="Roles filled"
                aria-valuemin={0}
                aria-valuemax={m.total}
                aria-valuenow={m.filled}
                className="h-2 overflow-hidden rounded-full bg-primary-soft"
              >
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${m.total ? (m.filled / m.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <Link href={`/meetings/${m.id}?tab=roles`}>Assign role</Link>
                </Button>
                {next ? (
                  <Button
                    variant="outline"
                    disabled={setStatus.isPending}
                    onClick={() =>
                      next === "finalized" && open > 0
                        ? setConfirmOpen(true)
                        : run()
                    }
                  >
                    {setStatus.isPending ? (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    ) : null}
                    {next === "open" ? "Open for roles" : "Finalize"}
                  </Button>
                ) : null}
              </div>
              <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Finalize this meeting?</DialogTitle>
                    <DialogDescription>
                      {open} {open === 1 ? "role is" : "roles are"} still open.
                      Role holders will be notified.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setConfirmOpen(false)}
                    >
                      Keep open
                    </Button>
                    <Button
                      onClick={() => {
                        setConfirmOpen(false);
                        run();
                      }}
                    >
                      Finalize
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          );
        }}
      </QueryBlock>
    </Card>
  );
}

/** Late withdrawals for all ExComm; level verifications for the VPE only (design.md section 4). */
export function ApprovalsCard({
  isVpe,
  className,
}: {
  isVpe: boolean;
  className?: string;
}) {
  const withdrawals = usePendingWithdrawals(true);
  const queue = useVerifyQueue(isVpe);
  const decideW = useDecideWithdrawal();
  const decideC = useDecideCompletion();
  const [rejecting, setRejecting] = useState<{
    id: string;
    name: string;
    level: number;
  } | null>(null);
  const [reason, setReason] = useState("");
  const busy = decideW.isPending || decideC.isPending;

  return (
    <Card title="Pending approvals" className={className}>
      <QueryBlock
        query={withdrawals}
        label="pending approvals"
        isEmpty={(d) => d.length === 0 && (!isVpe || queue.data?.length === 0)}
        empty="Nothing is waiting for you."
      >
        {(w) => (
          <ul className="divide-y divide-border">
            {w.map((x) => (
              <li key={x.request.id} className="space-y-2 py-3">
                <p className="text-sm">
                  <span className="font-medium">{x.memberName}</span> wants to
                  withdraw from {x.label}, {shortDate(x.startsAt)}
                </p>
                {x.request.reason ? (
                  <p className="text-sm text-muted-foreground">
                    &ldquo;{x.request.reason}&rdquo;
                  </p>
                ) : null}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className={rowButton}
                    disabled={busy}
                    onClick={() =>
                      decideW.mutate({
                        requestId: x.request.id,
                        decision: "approve",
                      })
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className={dangerButton}
                    disabled={busy}
                    onClick={() =>
                      decideW.mutate({
                        requestId: x.request.id,
                        decision: "reject",
                      })
                    }
                  >
                    Reject
                  </Button>
                </div>
              </li>
            ))}
            {isVpe
              ? (queue.data ?? []).map((c) => (
                  <li key={c.id} className="space-y-2 py-3">
                    <p className="text-sm">
                      <span className="font-medium">{c.memberName}</span> logged
                      Level {c.level} on{" "}
                      {formatIST(`${c.completedOn}T12:00:00Z`, "d MMM")}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className={rowButton}
                        disabled={busy}
                        onClick={() =>
                          decideC.mutate({ id: c.id, decision: "verify" })
                        }
                      >
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={dangerButton}
                        disabled={busy}
                        onClick={() => {
                          setReason("");
                          setRejecting({
                            id: c.id,
                            name: c.memberName,
                            level: c.level,
                          });
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </li>
                ))
              : null}
            {isVpe && queue.isError ? (
              <li className="py-3 text-sm text-danger">
                Could not load level verifications. Try again
              </li>
            ) : null}
          </ul>
        )}
      </QueryBlock>
      <Dialog
        open={rejecting !== null}
        onOpenChange={(o) => !o && setRejecting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Level {rejecting?.level}?</DialogTitle>
            <DialogDescription>
              {rejecting?.name} will be notified with your reason and can
              resubmit.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!rejecting || !reason.trim()) return;
              decideC.mutate(
                { id: rejecting.id, decision: "reject", reason },
                { onSuccess: () => setRejecting(null) },
              );
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="reject-reason">Reason (required)</Label>
              <Textarea
                id="reject-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="text-base"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRejecting(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!reason.trim() || decideC.isPending}
              >
                Reject level
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export function QuickActionsCard({
  isPresident,
  className,
}: {
  isPresident: boolean;
  className?: string;
}) {
  const actions = [
    { href: "/meetings/new", label: "Create meeting" },
    { href: "/members", label: "Add member" },
    { href: "/meetings/templates", label: "Templates" },
    ...(isPresident
      ? [
          { href: "/positions", label: "Manage positions" },
          { href: "/votes", label: "Start vote" },
        ]
      : []),
  ];
  return (
    <Card title="Quick actions" className={className}>
      <div className="flex flex-wrap gap-2">
        {actions.map((a) => (
          <Button key={a.label} asChild variant="outline">
            <Link href={a.href}>{a.label}</Link>
          </Button>
        ))}
      </div>
    </Card>
  );
}

export function VotesCard({ className }: { className?: string }) {
  const votes = useVotes(true);
  return (
    <Card title="Votes needing me" className={className}>
      <QueryBlock
        query={votes}
        label="votes"
        isEmpty={(d) =>
          !d.some((v) => v.status === "open" && v.isEligible && !v.iHaveVoted)
        }
        empty="No votes need you right now."
      >
        {(d) => (
          <ul className="divide-y divide-border">
            {d
              .filter(
                (v) => v.status === "open" && v.isEligible && !v.iHaveVoted,
              )
              .map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-center gap-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{v.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {v.turnout.cast} of {v.turnout.eligible} voted
                    </p>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className={rowButton}
                  >
                    <Link href={`/votes/${v.id}`}>Cast vote</Link>
                  </Button>
                </li>
              ))}
          </ul>
        )}
      </QueryBlock>
    </Card>
  );
}

export function PositionsCard({ className }: { className?: string }) {
  const positions = usePositions(true);
  return (
    <Card title="Positions" className={className}>
      <QueryBlock query={positions} label="positions" rows={2}>
        {(p) => (
          <div className="space-y-1 text-sm">
            <p className="font-medium">
              {p.items.filter((i) => i.memberId).length} of {p.items.length}{" "}
              positions filled
            </p>
            <p className="text-muted-foreground">
              Next President: {p.nextPresidentName ?? "Not set"}
            </p>
            <Link href="/positions" className={linkClass}>
              {p.nextPresidentId
                ? "Change next President"
                : "Set next President"}
            </Link>
          </div>
        )}
      </QueryBlock>
    </Card>
  );
}
