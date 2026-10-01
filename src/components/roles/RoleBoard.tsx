"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Avatar } from "@/components/shared/Avatar";
import type { RoleSlotView } from "@/lib/services";
import { formatSeconds } from "@/lib/time/ist";
import { cn } from "@/lib/utils";
import { safeHttpUrl } from "@/components/meetings/safeUrl";

/**
 * Main roles first, each speaker followed by its evaluators; support roles after (design.md section 6).
 * Read view only: take, withdraw, swap and assign actions come in M6.
 */
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
    if (r.speaker !== null || r.roleCode === "speaker")
      for (const e of evaluatorsOf(r.slot.id))
        main.push({ row: e, nested: true });
  }
  return { main, support: sorted.filter((x) => x.category !== "main") };
}

export function RoleBoard({ roles }: { roles: RoleSlotView[] }) {
  const { main, support } = groupRoles(roles);
  const labelOf = (slotId: string | null) =>
    roles.find((r) => r.slot.id === slotId)?.slot.label ?? null;
  const holderOf = (slotId: string) =>
    roles.find((r) => r.slot.id === slotId)?.holder?.name ?? null;

  return (
    <div className="space-y-4">
      <section
        aria-labelledby="main-roles"
        className="rounded-lg border border-border bg-card p-5"
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
              evaluatorOf={(id) =>
                roles
                  .filter((r) => r.slot.evaluatesSlotId === id)
                  .map((r) => r.holder?.name ?? `${r.slot.label} (open)`)
              }
              swapWith={(id) => ({ label: labelOf(id), holder: holderOf(id) })}
            />
          ))}
        </ul>
      </section>
      {support.length ? (
        <section
          aria-labelledby="support-roles"
          className="rounded-lg border border-border bg-card p-5"
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
                evaluatorOf={() => []}
                swapWith={(id) => ({
                  label: labelOf(id),
                  holder: holderOf(id),
                })}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function RoleRow({
  row,
  nested,
  evaluatesLabel,
  evaluatorOf,
  swapWith,
}: {
  row: RoleSlotView;
  nested: boolean;
  evaluatesLabel: string | null;
  evaluatorOf: (speakerSlotId: string) => string[];
  swapWith: (slotId: string) => { label: string | null; holder: string | null };
}) {
  const [open, setOpen] = useState(false);
  const isSpeaker = row.roleCode === "speaker";
  const detailsId = `details-${row.slot.id}`;
  const swap = row.pendingSwap;
  const otherSlot = swap
    ? swap.requesterRoleId === row.slot.id
      ? swap.targetRoleId
      : swap.requesterRoleId
    : null;
  const other = otherSlot ? swapWith(otherSlot) : null;
  const sp = row.speaker;
  const evalForm = safeHttpUrl(sp?.evalFormUrl);

  return (
    <li className={cn("py-3", nested && "pl-6 sm:pl-10")}>
      <div className="flex flex-wrap items-center gap-3">
        {isSpeaker ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => setOpen((o) => !o)}
            className="-ml-1 inline-flex size-9 items-center justify-center rounded-md hover:bg-primary-soft max-lg:size-11"
          >
            {open ? (
              <ChevronDown className="size-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="size-4" aria-hidden="true" />
            )}
            <span className="sr-only">
              {open ? "Hide" : "Show"} speech details for {row.slot.label}
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
            <span>{row.holder.name}</span>
          </span>
        ) : (
          <span className="rounded-full border border-warning px-2.5 py-0.5 text-xs font-medium text-warning">
            Open
          </span>
        )}
      </div>

      {row.pendingWithdrawal ? (
        <p className="mt-2 rounded-md bg-warning-bg px-3 py-2 text-sm text-warning">
          Withdrawal requested
          {row.pendingWithdrawal.reason
            ? `: “${row.pendingWithdrawal.reason}”`
            : ""}
          . Waiting for ExComm.
        </p>
      ) : null}
      {swap && other ? (
        <p className="mt-2 rounded-md bg-info-bg px-3 py-2 text-sm text-info">
          Swap requested with {other.holder ?? "another member"} ({other.label}
          ). Waiting for an answer.
        </p>
      ) : null}

      {isSpeaker && open ? (
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
            {evaluatorOf(row.slot.id).join(", ") || "None"}
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
