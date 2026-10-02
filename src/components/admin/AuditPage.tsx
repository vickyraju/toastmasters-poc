"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { QueryBlock } from "@/components/shared/QueryBlock";
import { useAudit } from "@/hooks/useAdmin";
import { useMembers } from "@/hooks/useRoles";
import { AUDIT_ACTIONS, AUDIT_ACTION_LABELS } from "@/lib/domain/constants";
import type { AuditAction } from "@/lib/domain/types";
import type { AuditRow } from "@/lib/services";
import { formatIST } from "@/lib/time/ist";
import { cn } from "@/lib/utils";

const PAGE = 20;
const field =
  "h-10 w-full rounded-lg border border-border-input bg-card px-3 text-sm max-lg:h-11 max-lg:text-base";

const show = (v: unknown) =>
  v === null || v === undefined
    ? "none"
    : typeof v === "object"
      ? JSON.stringify(v)
      : String(v);

/** Before and after as a small table of changed fields, never a raw JSON dump. */
function Diff({ row }: { row: AuditRow }) {
  const keys = [
    ...new Set([
      ...Object.keys(row.before ?? {}),
      ...Object.keys(row.after ?? {}),
    ]),
  ];
  if (keys.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        No before and after values were recorded for this action.
      </p>
    );
  return (
    <table className="w-full max-w-xl text-left text-sm">
      <thead className="text-muted-foreground">
        <tr>
          <th scope="col" className="py-1 pr-4 font-medium">
            Field
          </th>
          <th scope="col" className="py-1 pr-4 font-medium">
            Before
          </th>
          <th scope="col" className="py-1 font-medium">
            After
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {keys.map((k) => (
          <tr key={k}>
            <th scope="row" className="py-1 pr-4 font-mono text-xs font-normal">
              {k}
            </th>
            <td className="py-1 pr-4">{show(row.before?.[k])}</td>
            <td className="py-1 font-medium">{show(row.after?.[k])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** S-16: append-only history with actor, action, target and time (IST); filters and expandable diffs. */
export function AuditPage() {
  const members = useMembers(true);
  const [actorId, setActor] = useState("");
  const [action, setAction] = useState<AuditAction | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const filters = {
    ...(actorId && { actorId }),
    ...(action && { action }),
    ...(from && { from }),
    ...(to && { to }),
  };
  const log = useAudit(filters);
  const filtered = Boolean(actorId || action || from || to);
  const reset = (fn: () => void) => () => {
    fn();
    setPage(0);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <div className="space-y-1">
          <Label htmlFor="au-actor">Actor</Label>
          <select
            id="au-actor"
            className={field}
            value={actorId}
            onChange={(e) => {
              setActor(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Everyone</option>
            {(members.data ?? []).map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="au-action">Action</Label>
          <select
            id="au-action"
            className={field}
            value={action}
            onChange={(e) => {
              setAction(e.target.value as AuditAction | "");
              setPage(0);
            }}
          >
            <option value="">All actions</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {AUDIT_ACTION_LABELS[a]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="au-from">From</Label>
          <input
            id="au-from"
            type="date"
            className={field}
            value={from}
            max={to || undefined}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="au-to">To</Label>
          <input
            id="au-to"
            type="date"
            className={field}
            value={to}
            min={from || undefined}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(0);
            }}
          />
        </div>
        <Button
          variant="outline"
          disabled={!filtered}
          onClick={reset(() => {
            setActor("");
            setAction("");
            setFrom("");
            setTo("");
          })}
        >
          Clear filters
        </Button>
      </div>

      <QueryBlock
        query={log}
        label="the audit log"
        rows={6}
        isEmpty={(d) => d.length === 0}
        empty={
          filtered
            ? "No audit entries match these filters"
            : "No audit entries yet"
        }
      >
        {(rows) => {
          const pages = Math.ceil(rows.length / PAGE);
          const shown = rows.slice(page * PAGE, page * PAGE + PAGE);
          return (
            <div className="space-y-3">
              <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                {shown.map((r) => {
                  const expanded = open === r.id;
                  return (
                    <li key={r.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <button
                          type="button"
                          aria-expanded={expanded}
                          aria-controls={`diff-${r.id}`}
                          onClick={() => setOpen(expanded ? null : r.id)}
                          className="-ml-2 inline-flex size-9 items-center justify-center rounded-md hover:bg-primary-soft max-lg:size-11"
                        >
                          {expanded ? (
                            <ChevronDown
                              className="size-4"
                              aria-hidden="true"
                            />
                          ) : (
                            <ChevronRight
                              className="size-4"
                              aria-hidden="true"
                            />
                          )}
                          <span className="sr-only">
                            {expanded ? "Hide" : "Show"} before and after for{" "}
                            {AUDIT_ACTION_LABELS[r.action]}, {r.target}
                          </span>
                        </button>
                        <span className="w-44 text-sm whitespace-nowrap text-muted-foreground">
                          {formatIST(r.createdAt, "d MMM yyyy, h:mm a")} IST
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            r.action === "level.reject" ||
                              r.action === "permission.denied" ||
                              r.action === "meeting.cancel" ||
                              r.action === "member.remove"
                              ? "bg-danger-bg text-danger"
                              : "bg-primary-soft text-primary",
                          )}
                        >
                          {AUDIT_ACTION_LABELS[r.action]}
                        </span>
                        <span className="min-w-40 flex-1">
                          <span className="font-medium">
                            {r.actorName ?? "System"}
                          </span>
                          <span className="text-muted-foreground">
                            {" "}
                            · {r.target}
                          </span>
                        </span>
                      </div>
                      {expanded ? (
                        <div
                          id={`diff-${r.id}`}
                          className="mt-3 rounded-md bg-background p-3"
                        >
                          <Diff row={r} />
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              {pages > 1 ? (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Page {page + 1} of {pages} · {rows.length} entries
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      disabled={page >= pages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        }}
      </QueryBlock>
    </div>
  );
}
