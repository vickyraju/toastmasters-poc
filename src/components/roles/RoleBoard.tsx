"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight, MoreHorizontal, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/shared/Avatar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { safeHttpUrl } from "@/components/meetings/safeUrl";
import { useClaimRole, useDecideWithdrawal } from "@/hooks/useHome";
import {
  useAddSlot,
  useAssignRole,
  useRemoveSlot,
  useRequestSwap,
  useRespondSwap,
  useWithdraw,
} from "@/hooks/useRoles";
import type { MeetingStatus } from "@/lib/domain/types";
import type { MyBoardActions, RoleSlotView } from "@/lib/services";
import { formatSeconds } from "@/lib/time/ist";
import { cn } from "@/lib/utils";
import {
  AddRoleDialog,
  AssignDialog,
  SpeakerDialog,
  SwapDialog,
  WithdrawDialog,
} from "./RoleDialogs";

/** Main roles first, each speaker followed by its evaluators; support roles after (design.md section 6). */
export function groupRoles(roles: RoleSlotView[]) {
  const sorted = [...roles].sort((a, b) => a.slot.sortOrder - b.slot.sortOrder);
  const evaluatorsOf = (speakerSlotId: string) =>
    sorted.filter((r) => r.slot.evaluatesSlotId === speakerSlotId);
  const isEvaluatorOfSpeaker = (r: RoleSlotView) =>
    r.slot.evaluatesSlotId !== null &&
    sorted.some((s) => s.slot.id === r.slot.evaluatesSlotId);
  const main: { row: RoleSlotView; nested: boolean }[] = [];
  for (const r of sorted.filter(
    (x) => x.category === "main" && !isEvaluatorOfSpeaker(x),
  )) {
    main.push({ row: r, nested: false });
    if (r.roleCode === "speaker")
      for (const e of evaluatorsOf(r.slot.id))
        main.push({ row: e, nested: true });
  }
  return { main, support: sorted.filter((x) => x.category !== "main") };
}

export interface BoardContext {
  meetingId: string;
  status: MeetingStatus;
  meId: string;
  isOfficer: boolean;
  actions: MyBoardActions | undefined;
  roles: RoleSlotView[];
}

type DialogState =
  | {
      kind: "assign" | "swap" | "speaker" | "clear" | "remove";
      row: RoleSlotView;
    }
  | { kind: "withdraw"; row: RoleSlotView; mode: "immediate" | "request" }
  | { kind: "add" }
  | null;

/** S-04 Roles: the signup board with every action the signed-in member may take (J-04, J-05). */
export function RoleBoard({
  ctx,
  highlight,
}: {
  ctx: BoardContext;
  highlight?: string | null;
}) {
  const { main, support } = groupRoles(ctx.roles);
  const [dialog, setDialog] = useState<DialogState>(null);
  const close = () => setDialog(null);
  const assign = useAssignRole();
  const withdraw = useWithdraw();
  const swap = useRequestSwap();
  const addSlot = useAddSlot();
  const removeSlot = useRemoveSlot();
  const live = ctx.status !== "completed" && ctx.status !== "cancelled";
  const labelOf = (slotId: string | null) =>
    ctx.roles.find((r) => r.slot.id === slotId)?.slot.label ?? null;

  const rowProps = { ctx, highlight, open: setDialog };
  return (
    <div className="space-y-4">
      <section
        aria-labelledby="main-roles"
        className="rounded-lg border border-border bg-card p-5 max-sm:p-4"
      >
        <h2 id="main-roles" className="mb-2 text-xl font-semibold">
          Main roles
        </h2>
        <ul className="divide-y divide-border">
          {main.map(({ row, nested }) => (
            <RoleRow
              key={row.slot.id}
              row={row}
              nested={nested}
              evaluatesLabel={nested ? labelOf(row.slot.evaluatesSlotId) : null}
              {...rowProps}
            />
          ))}
        </ul>
      </section>
      {support.length ? (
        <section
          aria-labelledby="support-roles"
          className="rounded-lg border border-border bg-card p-5 max-sm:p-4"
        >
          <h2 id="support-roles" className="mb-2 text-xl font-semibold">
            Support roles
          </h2>
          <ul className="divide-y divide-border">
            {support.map((row) => (
              <RoleRow
                key={row.slot.id}
                row={row}
                nested={false}
                evaluatesLabel={null}
                {...rowProps}
              />
            ))}
          </ul>
        </section>
      ) : null}
      {ctx.isOfficer && live ? (
        <Button variant="outline" onClick={() => setDialog({ kind: "add" })}>
          <Plus aria-hidden="true" />
          Add role
        </Button>
      ) : null}

      {dialog?.kind === "assign" ? (
        <AssignDialog
          row={dialog.row}
          open
          onOpenChange={(o) => !o && close()}
          busy={assign.isPending}
          onAssign={(memberId, name) =>
            assign.mutate(
              {
                slotId: dialog.row.slot.id,
                memberId,
                name,
                label: dialog.row.slot.label,
              },
              { onSuccess: close },
            )
          }
        />
      ) : null}
      {dialog?.kind === "clear" ? (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && close()}
          title={`Remove ${dialog.row.holder?.name} from ${dialog.row.slot.label}?`}
          description="The role opens for others and the member is notified."
          confirmLabel="Remove holder"
          destructive
          busy={assign.isPending}
          onConfirm={() =>
            assign.mutate(
              {
                slotId: dialog.row.slot.id,
                memberId: null,
                label: dialog.row.slot.label,
              },
              { onSuccess: close },
            )
          }
        />
      ) : null}
      {dialog?.kind === "remove" ? (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && close()}
          title={`Delete the ${dialog.row.slot.label} role from this meeting?`}
          description={
            dialog.row.holder
              ? `${dialog.row.holder.name} holds it and will be notified.`
              : "Nobody holds it yet."
          }
          confirmLabel="Delete role"
          destructive
          busy={removeSlot.isPending}
          onConfirm={() =>
            removeSlot.mutate(
              { slotId: dialog.row.slot.id, label: dialog.row.slot.label },
              { onSuccess: close },
            )
          }
        />
      ) : null}
      {dialog?.kind === "withdraw" ? (
        <WithdrawDialog
          row={dialog.row}
          mode={dialog.mode}
          open
          onOpenChange={(o) => !o && close()}
          busy={withdraw.isPending}
          onWithdraw={(reason) =>
            withdraw.mutate(
              {
                slotId: dialog.row.slot.id,
                label: dialog.row.slot.label,
                reason,
              },
              { onSuccess: close },
            )
          }
        />
      ) : null}
      {dialog?.kind === "swap" ? (
        <SwapDialog
          row={dialog.row}
          roles={ctx.roles}
          open
          onOpenChange={(o) => !o && close()}
          busy={swap.isPending}
          onRequest={(targetSlotId) =>
            swap.mutate(
              { mySlotId: dialog.row.slot.id, targetSlotId },
              { onSuccess: close },
            )
          }
        />
      ) : null}
      {dialog?.kind === "speaker" ? (
        <SpeakerDialog
          row={dialog.row}
          open
          onOpenChange={(o) => !o && close()}
        />
      ) : null}
      {dialog?.kind === "add" ? (
        <AddRoleDialog
          open
          onOpenChange={(o) => !o && close()}
          busy={addSlot.isPending}
          onAdd={(roleTemplateId, label) =>
            addSlot.mutate(
              { meetingId: ctx.meetingId, roleTemplateId, label },
              { onSuccess: close },
            )
          }
        />
      ) : null}
    </div>
  );
}

const small = "h-9 max-lg:h-11";

function RoleRow({
  row,
  nested,
  evaluatesLabel,
  ctx,
  highlight,
  open: openDialog,
}: {
  row: RoleSlotView;
  nested: boolean;
  evaluatesLabel: string | null;
  ctx: BoardContext;
  highlight?: string | null;
  open: (d: DialogState) => void;
}) {
  const [expanded, setExpanded] = useState(
    highlight === row.slot.id && row.roleCode === "speaker",
  );
  const ref = useRef<HTMLLIElement>(null);
  const claim = useClaimRole();
  const respond = useRespondSwap();
  const decide = useDecideWithdrawal();
  const isSpeaker = row.roleCode === "speaker";
  const mine = row.holder?.id === ctx.meId;
  const live = ctx.status !== "completed" && ctx.status !== "cancelled";
  const signup = ctx.status === "open" || ctx.status === "finalized";
  const take = ctx.actions?.take[row.slot.id];
  const withdrawMode = ctx.actions?.withdraw[row.slot.id];
  const swap = row.pendingSwap;
  const otherSlotId = swap
    ? swap.requesterRoleId === row.slot.id
      ? swap.targetRoleId
      : swap.requesterRoleId
    : null;
  const other = ctx.roles.find((r) => r.slot.id === otherSlotId);
  const sp = row.speaker;
  const evalForm = safeHttpUrl(sp?.evalFormUrl);
  const evaluators = ctx.roles.filter(
    (r) => r.slot.evaluatesSlotId === row.slot.id,
  );
  const detailsId = `details-${row.slot.id}`;
  const reasonId = `reason-${row.slot.id}`;

  useEffect(() => {
    if (highlight === row.slot.id)
      ref.current?.scrollIntoView({ block: "center" });
  }, [highlight, row.slot.id]);

  return (
    <li
      ref={ref}
      id={`slot-${row.slot.id}`}
      className={cn(
        "py-3",
        nested && "pl-6 sm:pl-10",
        highlight === row.slot.id && "-mx-2 rounded-lg bg-primary-soft/60 px-2",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {isSpeaker ? (
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={detailsId}
            onClick={() => setExpanded((o) => !o)}
            className="-ml-1 inline-flex size-9 items-center justify-center rounded-md hover:bg-primary-soft max-lg:size-11"
          >
            {expanded ? (
              <ChevronDown className="size-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="size-4" aria-hidden="true" />
            )}
            <span className="sr-only">
              {expanded ? "Hide" : "Show"} speech details for {row.slot.label}
            </span>
          </button>
        ) : null}
        <div className="min-w-40 flex-1">
          <p className="font-medium">{row.slot.label}</p>
          {evaluatesLabel ? (
            <p className="text-xs text-muted-foreground">
              Evaluates {evaluatesLabel}
            </p>
          ) : null}
          {isSpeaker && sp?.title ? (
            <p className="text-xs text-muted-foreground">
              &ldquo;{sp.title}&rdquo;
            </p>
          ) : null}
        </div>
        {row.holder ? (
          <span className="flex items-center gap-2">
            <Avatar name={row.holder.name} />
            <span>
              {row.holder.name}
              {mine ? (
                <span className="text-muted-foreground"> (you)</span>
              ) : null}
            </span>
          </span>
        ) : (
          <span className="rounded-full border border-warning px-2.5 py-0.5 text-xs font-medium text-warning">
            Open
          </span>
        )}
      </div>

      {live ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {!row.holder && signup && take ? (
            <Button
              size="sm"
              className={small}
              disabled={!take.ok || claim.isPending}
              aria-describedby={!take.ok ? reasonId : undefined}
              onClick={() =>
                claim.mutate({ slotId: row.slot.id, label: row.slot.label })
              }
            >
              Take this role
            </Button>
          ) : null}
          {ctx.isOfficer ? (
            <Button
              size="sm"
              variant="outline"
              className={small}
              onClick={() => openDialog({ kind: "assign", row })}
            >
              {row.holder ? "Reassign" : "Assign"}
            </Button>
          ) : null}
          {mine &&
          (withdrawMode === "immediate" || withdrawMode === "request") ? (
            <Button
              size="sm"
              variant="outline"
              className={small}
              onClick={() =>
                openDialog({ kind: "withdraw", row, mode: withdrawMode })
              }
            >
              Withdraw
            </Button>
          ) : null}
          {mine && signup && !swap ? (
            <Button
              size="sm"
              variant="outline"
              className={small}
              onClick={() => openDialog({ kind: "swap", row })}
            >
              Request swap
            </Button>
          ) : null}
          {isSpeaker && row.holder && (mine || ctx.isOfficer) ? (
            <Button
              size="sm"
              variant="outline"
              className={small}
              onClick={() => openDialog({ kind: "speaker", row })}
            >
              Edit speech details
            </Button>
          ) : null}
          {ctx.isOfficer ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`More actions for ${row.slot.label}`}
                className="inline-flex size-9 items-center justify-center rounded-lg border border-border-input text-muted-foreground transition-colors duration-150 hover:bg-primary-soft hover:text-foreground max-lg:size-11"
              >
                <MoreHorizontal className="size-4" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="shadow-[var(--elevation)]"
              >
                {row.holder ? (
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => openDialog({ kind: "clear", row })}
                  >
                    Remove holder
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => openDialog({ kind: "remove", row })}
                >
                  Delete role
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      ) : null}
      {!row.holder && take && !take.ok && live ? (
        <p id={reasonId} className="mt-1 text-sm text-muted-foreground">
          {take.message}
        </p>
      ) : null}
      {!row.holder && take?.ok && take.override ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Below the level for this speech. Taking it is an officer override and
          is logged.
        </p>
      ) : null}
      {mine && withdrawMode === "pending" ? (
        <p className="mt-1 text-sm text-muted-foreground">
          You asked to withdraw. ExComm will decide.
        </p>
      ) : null}

      {row.pendingWithdrawal ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-warning-bg px-3 py-2 text-sm text-warning">
          <span className="flex-1">
            {row.holder?.name ?? "The holder"} asked to withdraw
            {row.pendingWithdrawal.reason
              ? `: “${row.pendingWithdrawal.reason}”`
              : "."}
          </span>
          {ctx.isOfficer && live ? (
            <span className="flex gap-2">
              <Button
                variant="success"
                size="sm"
                className={small}
                disabled={decide.isPending}
                onClick={() =>
                  decide.mutate({
                    requestId: row.pendingWithdrawal!.id,
                    decision: "approve",
                  })
                }
              >
                Approve
              </Button>
              <Button
                size="sm"
                variant="danger"
                className={small}
                disabled={decide.isPending}
                onClick={() =>
                  decide.mutate({
                    requestId: row.pendingWithdrawal!.id,
                    decision: "reject",
                  })
                }
              >
                Reject
              </Button>
            </span>
          ) : null}
        </div>
      ) : null}

      {swap && other ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-info-bg px-3 py-2 text-sm text-info">
          {swap.targetId === ctx.meId && swap.targetRoleId === row.slot.id ? (
            <>
              <span className="flex-1">
                {other.holder?.name} wants to swap {other.slot.label} for your{" "}
                {row.slot.label} role.
              </span>
              <span className="flex gap-2">
                <Button
                  size="sm"
                  className={small}
                  disabled={respond.isPending}
                  onClick={() =>
                    respond.mutate({ swapId: swap.id, decision: "accept" })
                  }
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className={small}
                  disabled={respond.isPending}
                  onClick={() =>
                    respond.mutate({ swapId: swap.id, decision: "decline" })
                  }
                >
                  Decline
                </Button>
              </span>
            </>
          ) : swap.requesterId === ctx.meId &&
            swap.requesterRoleId === row.slot.id ? (
            <>
              <span className="flex-1">
                You asked {other.holder?.name} to swap for {other.slot.label}.
                Waiting for an answer.
              </span>
              <Button
                size="sm"
                variant="outline"
                className={small}
                disabled={respond.isPending}
                onClick={() =>
                  respond.mutate({ swapId: swap.id, decision: "cancel" })
                }
              >
                Cancel request
              </Button>
            </>
          ) : (
            <span>
              Swap requested with {other.holder?.name ?? "another member"} (
              {other.slot.label}). Waiting for an answer.
            </span>
          )}
        </div>
      ) : null}

      {isSpeaker && expanded ? (
        <dl
          id={detailsId}
          className="mt-3 grid gap-x-6 gap-y-1 rounded-md bg-background p-3 text-sm sm:grid-cols-[max-content_1fr]"
        >
          <dt className="text-muted-foreground">Project</dt>
          <dd>{sp?.projectName ?? "Not set"}</dd>
          <dt className="text-muted-foreground">Level</dt>
          <dd>{sp?.level ?? "Not set"}</dd>
          <dt className="text-muted-foreground">Title</dt>
          <dd>{sp?.title ?? "Not set"}</dd>
          <dt className="text-muted-foreground">Objectives</dt>
          <dd>{sp?.objectives ?? "Not set"}</dd>
          <dt className="text-muted-foreground">Time limit</dt>
          <dd>
            {sp?.minSeconds != null && sp?.maxSeconds != null
              ? `${formatSeconds(sp.minSeconds)} to ${formatSeconds(sp.maxSeconds)}`
              : "Set project timings"}
          </dd>
          <dt className="text-muted-foreground">Evaluator</dt>
          <dd>
            {evaluators
              .map((e) => e.holder?.name ?? `${e.slot.label} (open)`)
              .join(", ") || "None"}
            {evalForm ? (
              <>
                {" · "}
                <a
                  href={evalForm}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Evaluation form
                </a>
              </>
            ) : null}
          </dd>
        </dl>
      ) : null}
    </li>
  );
}
