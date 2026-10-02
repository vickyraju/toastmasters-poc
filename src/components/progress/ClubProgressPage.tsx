"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { formatDistanceStrict } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { QueryBlock } from "@/components/shared/QueryBlock";
import { useDecideCompletion, useNow, useVerifyQueue } from "@/hooks/useHome";
import { useClubProgress } from "@/hooks/useProgress";
import { useCan } from "@/hooks/useSession";
import type { VerifyQueueItem } from "@/lib/services";
import { formatIST } from "@/lib/time/ist";
import { cn } from "@/lib/utils";

const ago = (iso: string | null, nowIso: string) =>
  iso
    ? `${formatDistanceStrict(new Date(iso), new Date(nowIso))} ago`
    : "Never";

/** S-10: club-wide table with an Inactive filter, and the verification queue (VPE decides, others read). */
export function ClubProgressPage() {
  const router = useRouter();
  const pathname = usePathname();
  const tab = useSearchParams().get("tab") === "queue" ? "queue" : "members";
  const queue = useVerifyQueue(true);
  return (
    <Tabs
      value={tab}
      onValueChange={(v) =>
        router.replace(`${pathname}?tab=${v}`, { scroll: false })
      }
    >
      <TabsList className="max-w-full justify-start group-data-horizontal/tabs:h-auto">
        <TabsTrigger value="members" className="min-h-9 px-4 max-lg:min-h-11">
          Members
        </TabsTrigger>
        <TabsTrigger value="queue" className="min-h-9 px-4 max-lg:min-h-11">
          Verification queue
          {queue.data?.length ? ` (${queue.data.length})` : ""}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="members" className="pt-4">
        <MembersTable />
      </TabsContent>
      <TabsContent value="queue" className="pt-4">
        <Queue />
      </TabsContent>
    </Tabs>
  );
}

function MembersTable() {
  const table = useClubProgress();
  const nowQ = useNow();
  const [inactiveOnly, setInactiveOnly] = useState(false);
  const query = { ...table, isPending: table.isPending || nowQ.isPending };
  return (
    <div className="space-y-3">
      <button
        type="button"
        aria-pressed={inactiveOnly}
        onClick={() => setInactiveOnly((v) => !v)}
        className={cn(
          "min-h-9 rounded-full border px-4 text-sm font-medium max-lg:min-h-11",
          inactiveOnly
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border-input hover:bg-primary-soft",
        )}
      >
        Inactive 60+ days
      </button>
      <QueryBlock
        query={query}
        label="club progress"
        rows={6}
        isEmpty={(d) => d.length === 0}
        empty="No members yet"
      >
        {(rows) => {
          const shown = inactiveOnly ? rows.filter((r) => r.inactive) : rows;
          if (shown.length === 0)
            return (
              <p className="text-sm text-muted-foreground">
                No members match this filter.
              </p>
            );
          return (
            <>
              <table className="hidden w-full overflow-hidden rounded-lg border border-border bg-card text-left text-sm md:table">
                <thead className="bg-background text-muted-foreground">
                  <tr>
                    {[
                      "Name",
                      "Pathway",
                      "Level",
                      "Projects done",
                      "Roles taken",
                      "Speeches",
                      "Last active",
                    ].map((h) => (
                      <th key={h} scope="col" className="px-4 py-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {shown.map((r) => (
                    <tr key={r.member.id}>
                      <td className="px-4 py-3 font-medium">{r.member.name}</td>
                      <td className="px-4 py-3">
                        {r.member.pathway ?? "Not set"}
                      </td>
                      <td className="px-4 py-3">{r.member.currentLevel}</td>
                      <td className="px-4 py-3">{r.projectsCompleted}</td>
                      <td className="px-4 py-3">{r.rolesTaken}</td>
                      <td className="px-4 py-3">{r.speeches}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {ago(r.member.lastActiveAt, nowQ.data!)}
                        {r.inactive ? (
                          <span className="ml-2 rounded-full bg-warning-bg px-2 py-0.5 text-xs text-warning">
                            Inactive
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="space-y-3 md:hidden">
                {shown.map((r) => (
                  <li
                    key={r.member.id}
                    className="space-y-1 rounded-lg border border-border bg-card p-4"
                  >
                    <p className="font-medium">
                      {r.member.name}
                      {r.inactive ? (
                        <span className="ml-2 rounded-full bg-warning-bg px-2 py-0.5 text-xs text-warning">
                          Inactive
                        </span>
                      ) : null}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {r.member.pathway ?? "No pathway"} · Level{" "}
                      {r.member.currentLevel}
                    </p>
                    <p className="text-sm">
                      {r.projectsCompleted} projects · {r.rolesTaken} roles ·{" "}
                      {r.speeches} speeches
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Last active {ago(r.member.lastActiveAt, nowQ.data!)}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          );
        }}
      </QueryBlock>
    </div>
  );
}

type Decision = { kind: "verify" | "reject"; item: VerifyQueueItem } | null;

function Queue() {
  const queue = useVerifyQueue(true);
  const isVpe = useCan("completion.verify");
  const decide = useDecideCompletion();
  const [dialog, setDialog] = useState<Decision>(null);
  const [reason, setReason] = useState("");
  const close = () => {
    setDialog(null);
    setReason("");
  };
  return (
    <>
      <QueryBlock
        query={queue}
        label="the verification queue"
        rows={3}
        isEmpty={(d) => d.length === 0}
        empty="No pending verifications"
      >
        {(rows) => (
          <ul className="space-y-3">
            {rows.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4"
              >
                <div className="min-w-48 flex-1 space-y-0.5">
                  <p className="font-medium">
                    {c.memberName} · Level {c.level}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {c.pathway} · logged{" "}
                    {formatIST(`${c.completedOn}T06:30:00.000Z`, "d MMM yyyy")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {c.proofName
                      ? `Proof: ${c.proofName}`
                      : "No proof attached"}
                  </p>
                </div>
                {isVpe ? (
                  <div className="flex gap-2">
                    <Button
                      className="h-9 max-lg:h-11"
                      onClick={() => setDialog({ kind: "verify", item: c })}
                    >
                      Verify
                    </Button>
                    <Button
                      variant="outline"
                      className="h-9 border-danger text-danger max-lg:h-11"
                      onClick={() => setDialog({ kind: "reject", item: c })}
                    >
                      Reject
                    </Button>
                  </div>
                ) : (
                  <span className="rounded-full bg-warning-bg px-3 py-1 text-sm text-warning">
                    Pending VPE review
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </QueryBlock>

      {dialog?.kind === "verify" ? (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && close()}
          title={`Verify ${dialog.item.memberName}'s Level ${dialog.item.level} completion?`}
          description={`Their level will advance to ${Math.min(dialog.item.level + 1, 5)}. They are notified.`}
          confirmLabel="Verify"
          busy={decide.isPending}
          onConfirm={() =>
            decide.mutate(
              { id: dialog.item.id, decision: "verify" },
              { onSuccess: close },
            )
          }
        />
      ) : null}
      {dialog?.kind === "reject" ? (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && close()}
          title={`Reject ${dialog.item.memberName}'s Level ${dialog.item.level}?`}
          description="They are notified with your reason and can log it again."
          confirmLabel="Reject level"
          destructive
          busy={decide.isPending || !reason.trim()}
          onConfirm={() =>
            decide.mutate(
              { id: dialog.item.id, decision: "reject", reason },
              { onSuccess: close },
            )
          }
        >
          <div className="space-y-1.5">
            <Label htmlFor="q-reason">Reason (required)</Label>
            <Textarea
              id="q-reason"
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
              className="text-base"
            />
          </div>
        </ConfirmDialog>
      ) : null}
    </>
  );
}
