"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryBlock } from "@/components/shared/QueryBlock";
import { useMeetingReports } from "@/hooks/useReports";
import type { ReportItem, MeetingReportsView } from "@/lib/services";
import { cn } from "@/lib/utils";
import { ConsolidatedReport } from "./ConsolidatedReport";
import {
  AhCounterForm,
  GrammarianForm,
  SummaryForm,
  TimerForm,
} from "./ReportForms";

const PILL: Record<ReportItem["status"], { label: string; className: string }> =
  {
    not_started: {
      label: "Not started",
      className: "border border-border-input text-muted-foreground",
    },
    draft: { label: "Draft", className: "bg-warning-bg text-warning" },
    submitted: { label: "Submitted", className: "bg-success-bg text-success" },
  };

const Muted = ({ children }: { children: React.ReactNode }) => (
  <p className="text-muted-foreground">{children}</p>
);

/** S-04 Reports in its three states: before the end, forms after it, the consolidated report once Completed. */
export function ReportsTab({
  meetingId,
  slot,
}: {
  meetingId: string;
  slot?: string | null;
}) {
  const reports = useMeetingReports(meetingId);
  return (
    <QueryBlock query={reports} label="reports" rows={4}>
      {(v) => {
        if (v.phase === "cancelled")
          return (
            <Muted>This meeting was cancelled, so there are no reports.</Muted>
          );
        if (v.phase === "before_end")
          return <Muted>Reports open after the meeting ends.</Muted>;
        if (v.phase === "completed") return <ConsolidatedReport view={v} />;
        return <Forms view={v} slot={slot} />;
      }}
    </QueryBlock>
  );
}

function Forms({
  view,
  slot,
}: {
  view: MeetingReportsView;
  slot?: string | null;
}) {
  const [open, setOpen] = useState<string | null>(
    slot ?? view.items.find((i) => i.mine)?.slotId ?? null,
  );
  if (view.items.length === 0)
    return (
      <Muted>
        You have no report role in this meeting. The consolidated report opens
        to everyone when the meeting is completed.
      </Muted>
    );
  return (
    <div className="space-y-4">
      {view.outstanding !== null ? (
        <p
          role="status"
          className={cn(
            "rounded-md px-3 py-2 text-sm",
            view.outstanding
              ? "bg-warning-bg text-warning"
              : "bg-success-bg text-success",
          )}
        >
          {view.outstanding === 0
            ? "Every report has been submitted."
            : `Outstanding reports: ${view.outstanding} of ${view.items.length} not yet submitted.`}
        </p>
      ) : null}
      <ul className="space-y-3">
        {view.items.map((item) => {
          const pill = PILL[item.status];
          const expanded = open === item.slotId;
          const canEdit = item.mine;
          const props = {
            item,
            speakers: view.speakers,
            names: view.names,
            graceSeconds: view.graceSeconds,
            wordOfTheDay: view.wordOfTheDay,
            locked: !canEdit,
          };
          return (
            <li
              key={item.slotId}
              id={`report-${item.slotId}`}
              className="rounded-lg border border-border bg-card p-5 max-sm:p-4"
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-40 flex-1">
                  <h3 className="text-xl font-semibold">{item.roleName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.holder
                      ? `${item.holder.name}${item.mine ? " (you)" : ""}`
                      : "Nobody holds this role"}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-medium",
                    pill.className,
                  )}
                >
                  {pill.label}
                </span>
                <Button
                  variant="outline"
                  aria-expanded={expanded}
                  aria-controls={`form-${item.slotId}`}
                  onClick={() => setOpen(expanded ? null : item.slotId)}
                >
                  {expanded
                    ? "Hide"
                    : canEdit
                      ? item.status === "not_started"
                        ? "Start report"
                        : item.status === "draft"
                          ? "Continue draft"
                          : "Edit report"
                      : "View"}
                </Button>
              </div>
              {expanded ? (
                <div
                  id={`form-${item.slotId}`}
                  className="mt-4 border-t border-border pt-4"
                >
                  {!item.holder ? (
                    <Muted>
                      Nobody holds this role, so there is no report to write.
                    </Muted>
                  ) : item.kind === "timer" ? (
                    <TimerForm {...props} />
                  ) : item.kind === "ah_counter" ? (
                    <AhCounterForm {...props} />
                  ) : item.kind === "grammarian" ? (
                    <GrammarianForm {...props} />
                  ) : (
                    <SummaryForm {...props} />
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function ReportsSkeleton() {
  return <Skeleton className="h-24 w-full" />;
}
