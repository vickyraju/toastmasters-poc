"use client";

import { useState } from "react";
import Link from "next/link";
import { Ellipsis, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/shared/Avatar";
import { PositionBadge } from "@/components/shared/PositionBadge";
import { QueryBlock } from "@/components/shared/QueryBlock";
import { useMembers } from "@/hooks/useRoles";
import { useSetMemberActive } from "@/hooks/useMembers";
import { useCurrentUser } from "@/hooks/useSession";
import type { MemberRow } from "@/lib/services";
import { cn } from "@/lib/utils";
import {
  AddMemberDialog,
  EditMemberDialog,
  StepDownDialog,
} from "./MemberDialogs";
import { ImportDialog } from "./ImportDialog";

type Dialog =
  | { kind: "add" }
  | { kind: "import" }
  | { kind: "edit" | "remove" | "deactivate"; member: MemberRow }
  | null;
const STATUS_STYLE = {
  active: "bg-success-bg text-success",
  inactive: "bg-warning-bg text-warning",
  removed: "bg-danger-bg text-danger",
} as const;
const selectClass =
  "h-10 rounded-lg border border-border-input bg-card px-3 text-sm max-lg:h-11 max-lg:text-base";

/** S-11: search, status filter, Add member, and a row menu (Edit, Deactivate, Remove). */
export function MembersPage() {
  const members = useMembers(true);
  const me = useCurrentUser().data;
  const reactivate = useSetMemberActive();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | MemberRow["status"]>("active");
  const close = () => setDialog(null);

  const matches = (m: MemberRow) => {
    const t = q.trim().toLowerCase();
    return (
      (!status || m.status === status) &&
      (!t ||
        [m.name, m.employeeId, m.email].some((x) =>
          x.toLowerCase().includes(t),
        ))
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1 space-y-1">
          <Label htmlFor="mem-search">Search</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="mem-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, ID or email"
              className="h-10 pl-9 text-base max-lg:h-11"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="mem-status">Status</Label>
          <select
            id="mem-status"
            className={selectClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="removed">Removed</option>
          </select>
        </div>
        <Button
          variant="outline"
          className="ml-auto"
          onClick={() => setDialog({ kind: "import" })}
        >
          Import CSV
        </Button>
        <Button onClick={() => setDialog({ kind: "add" })}>
          <Plus aria-hidden="true" />
          Add member
        </Button>
      </div>

      <QueryBlock
        query={members}
        label="members"
        rows={6}
        isEmpty={(d) => d.length === 0}
        empty="No members yet"
      >
        {(all) => {
          const rows = all.filter(matches);
          if (rows.length === 0)
            return (
              <p className="text-sm text-muted-foreground">
                No members match your search
              </p>
            );
          const menu = (m: MemberRow) => {
            if (m.status === "removed") return null;
            const isSelf = m.id === me?.id;
            const isPresident = m.position === "president";
            return (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`Actions for ${m.name}`}
                  className="inline-flex size-10 items-center justify-center rounded-lg hover:bg-primary-soft max-lg:size-11"
                >
                  <Ellipsis className="size-5" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-60 shadow-[var(--elevation)]"
                >
                  <DropdownMenuItem
                    onSelect={() => setDialog({ kind: "edit", member: m })}
                  >
                    Edit
                  </DropdownMenuItem>
                  {m.status === "inactive" ? (
                    <DropdownMenuItem
                      onSelect={() =>
                        reactivate.mutate({
                          id: m.id,
                          name: m.name,
                          active: true,
                        })
                      }
                    >
                      Reactivate
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      disabled={isSelf || isPresident}
                      onSelect={() =>
                        setDialog({ kind: "deactivate", member: m })
                      }
                    >
                      Deactivate
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    disabled={isSelf || isPresident}
                    className="text-danger"
                    onSelect={() => setDialog({ kind: "remove", member: m })}
                  >
                    Remove
                  </DropdownMenuItem>
                  {isSelf || isPresident ? (
                    <p className="px-2 py-1.5 text-xs text-muted-foreground">
                      {isSelf
                        ? "You cannot remove yourself."
                        : "Transfer the presidency first."}
                    </p>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          };
          return (
            <>
              <table className="hidden w-full overflow-hidden rounded-lg border border-border bg-card text-left text-sm md:table">
                <thead className="bg-background text-muted-foreground">
                  <tr>
                    {[
                      "Employee ID",
                      "Name",
                      "Position",
                      "Status",
                      "Pathway and level",
                      "",
                    ].map((h, i) => (
                      <th key={i} scope="col" className="px-4 py-2 font-medium">
                        {h || <span className="sr-only">Actions</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((m) => (
                    <tr
                      key={m.id}
                      className={cn(
                        m.status === "removed" && "text-muted-foreground",
                      )}
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        {m.employeeId}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/members/${m.id}`}
                          className="inline-flex items-center gap-2 font-medium text-primary underline-offset-4 hover:underline"
                        >
                          <Avatar name={m.name} />
                          {m.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {m.position ? (
                          <PositionBadge position={m.position} />
                        ) : (
                          "None"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                            STATUS_STYLE[m.status],
                          )}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {m.status === "removed"
                          ? "None"
                          : `${m.pathway ?? "No pathway"} · Level ${m.currentLevel}`}
                      </td>
                      <td className="px-4 py-3 text-right">{menu(m)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="space-y-3 md:hidden">
                {rows.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <Link
                        href={`/members/${m.id}`}
                        className="block font-medium text-primary"
                      >
                        {m.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {m.employeeId}
                      </p>
                      <p className="flex flex-wrap items-center gap-2 text-sm">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                            STATUS_STYLE[m.status],
                          )}
                        >
                          {m.status}
                        </span>
                        {m.position ? (
                          <PositionBadge position={m.position} />
                        ) : null}
                      </p>
                      {m.status !== "removed" ? (
                        <p className="text-sm text-muted-foreground">
                          {m.pathway ?? "No pathway"} · Level {m.currentLevel}
                        </p>
                      ) : null}
                    </div>
                    {menu(m)}
                  </li>
                ))}
              </ul>
            </>
          );
        }}
      </QueryBlock>

      {dialog?.kind === "add" ? <AddMemberDialog onClose={close} /> : null}
      {dialog?.kind === "import" ? <ImportDialog onClose={close} /> : null}
      {dialog?.kind === "edit" ? (
        <EditMemberDialog
          member={dialog.member}
          asSelf={false}
          onClose={close}
        />
      ) : null}
      {dialog?.kind === "remove" || dialog?.kind === "deactivate" ? (
        <StepDownDialog
          member={dialog.member}
          mode={dialog.kind}
          onClose={close}
        />
      ) : null}
    </div>
  );
}
