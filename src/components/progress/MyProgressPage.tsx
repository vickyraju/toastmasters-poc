"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QueryBlock } from "@/components/shared/QueryBlock";
import { useNow } from "@/hooks/useHome";
import { useMyCompletions } from "@/hooks/useHome";
import { useCurrentUser } from "@/hooks/useSession";
import type { Completion, CompletionStatus } from "@/lib/domain/types";
import { formatIST } from "@/lib/time/ist";
import { cn } from "@/lib/utils";
import { LevelRing } from "./LevelRing";
import { LogCompletionDialog } from "./LogCompletionDialog";

export const STATUS: Record<
  CompletionStatus,
  { label: string; className: string }
> = {
  counted: { label: "Counted", className: "bg-success-bg text-success" },
  pending: { label: "Pending", className: "bg-warning-bg text-warning" },
  verified: { label: "Verified", className: "bg-success-bg text-success" },
  rejected: { label: "Rejected", className: "bg-danger-bg text-danger" },
};

const day = (d: string) => formatIST(`${d}T06:30:00.000Z`, "d MMM yyyy");

function Status({ c }: { c: Completion }) {
  const s = STATUS[c.status];
  return (
    <div className="space-y-1">
      <span
        className={cn(
          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
          s.className,
        )}
      >
        {s.label}
      </span>
      {c.status === "pending" ? (
        <p className="text-xs text-muted-foreground">Waiting for your VPE</p>
      ) : null}
      {c.status === "rejected" && c.rejectionReason ? (
        <p className="text-xs text-danger">Reason: {c.rejectionReason}</p>
      ) : null}
    </div>
  );
}

/** S-09: pathway and level ring, Projects and Levels tabs, Log completion (J-09). */
export function MyProgressPage() {
  const user = useCurrentUser().data;
  const completions = useMyCompletions();
  const nowQ = useNow();
  const [logging, setLogging] = useState(false);
  if (!user) return null;

  const all = completions.data ?? [];
  const projects = all.filter((c) => c.kind === "project");
  const levels = all.filter((c) => c.kind === "level");

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center gap-5 rounded-lg border border-border bg-card p-5">
        <LevelRing level={user.currentLevel} className="size-24" />
        <div className="min-w-40 flex-1 space-y-1">
          <h2 className="text-xl font-semibold">
            {user.pathway ?? "No pathway set"}
          </h2>
          <p className="text-muted-foreground">
            Level {user.currentLevel} of 5
          </p>
          {!user.pathway ? (
            <p className="text-sm">
              Choose your pathway when you log your first completion, or in
              Settings.
            </p>
          ) : null}
        </div>
        <Button onClick={() => setLogging(true)} disabled={!nowQ.data}>
          Log completion
        </Button>
      </section>

      <QueryBlock
        query={completions}
        label="your progress"
        rows={4}
        isEmpty={(d) => d.length === 0}
        empty="You haven't logged any progress yet"
      >
        {() => (
          <Tabs defaultValue="levels">
            <TabsList className="max-w-full justify-start group-data-horizontal/tabs:h-auto">
              <TabsTrigger
                value="levels"
                className="min-h-9 px-4 max-lg:min-h-11"
              >
                Levels
              </TabsTrigger>
              <TabsTrigger
                value="projects"
                className="min-h-9 px-4 max-lg:min-h-11"
              >
                Projects
              </TabsTrigger>
            </TabsList>
            <TabsContent value="levels" className="pt-4">
              {levels.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No level completions logged yet.
                </p>
              ) : (
                <List
                  rows={levels.map((c) => ({ c, title: `Level ${c.level}` }))}
                />
              )}
            </TabsContent>
            <TabsContent value="projects" className="pt-4">
              {projects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No projects logged yet.
                </p>
              ) : (
                <List
                  rows={projects.map((c) => ({
                    c,
                    title: c.projectName ?? "Project",
                  }))}
                />
              )}
            </TabsContent>
          </Tabs>
        )}
      </QueryBlock>

      {completions.data?.length === 0 ? (
        <Button variant="outline" onClick={() => setLogging(true)}>
          Log completion
        </Button>
      ) : null}

      {logging && nowQ.data ? (
        <LogCompletionDialog
          user={user}
          nowIso={nowQ.data}
          onClose={() => setLogging(false)}
        />
      ) : null}
    </div>
  );
}

/** A table from md; stacked cards below. */
function List({ rows }: { rows: { c: Completion; title: string }[] }) {
  return (
    <>
      <table className="hidden w-full overflow-hidden rounded-lg border border-border bg-card text-left text-sm md:table">
        <thead className="bg-background text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2 font-medium">
              Item
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Pathway
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Completed on
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(({ c, title }) => (
            <tr key={c.id}>
              <td className="px-4 py-3 font-medium">{title}</td>
              <td className="px-4 py-3">{c.pathway}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                {day(c.completedOn)}
              </td>
              <td className="px-4 py-3">
                <Status c={c} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="space-y-3 md:hidden">
        {rows.map(({ c, title }) => (
          <li
            key={c.id}
            className="space-y-1 rounded-lg border border-border bg-card p-4"
          >
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">
              {c.pathway} · {day(c.completedOn)}
            </p>
            <Status c={c} />
          </li>
        ))}
      </ul>
    </>
  );
}
