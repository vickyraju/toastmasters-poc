"use client";

import { useState } from "react";
import {
  Calendar,
  CalendarCheck,
  Loader2,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useNow } from "@/hooks/useHome";
import { useRunExport } from "@/hooks/useAdmin";
import type { ExportKind } from "@/lib/services";
import { istDate } from "@/lib/time/ist";
import { downloadCsv } from "./download";

const CARDS: {
  kind: ExportKind;
  title: string;
  text: string;
  Icon: LucideIcon;
}[] = [
  {
    kind: "roles",
    title: "Roles",
    text: "Every role assignment across meetings in the selected range.",
    Icon: CalendarCheck,
  },
  {
    kind: "meetings",
    title: "Meeting history",
    text: "All meetings, their status and lifecycle dates.",
    Icon: Calendar,
  },
  {
    kind: "progress",
    title: "Progress",
    text: "Pathways project and level completions club-wide.",
    Icon: TrendingUp,
  },
];

const DAY = 86_400_000;

/** S-17: three cards, each with its own date range (default the last 90 days) and a CSV download. */
export function ExportPage() {
  const nowQ = useNow();
  if (!nowQ.data)
    return (
      <div
        className="grid gap-4 md:grid-cols-3"
        aria-busy="true"
        aria-label="Loading export"
      >
        {CARDS.map((c) => (
          <Skeleton key={c.kind} className="h-56" />
        ))}
      </div>
    );
  const today = istDate(nowQ.data);
  const start = istDate(Date.parse(nowQ.data) - 90 * DAY);
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {CARDS.map((c) => (
        <ExportCard key={c.kind} {...c} today={today} start={start} />
      ))}
    </div>
  );
}

function ExportCard({
  kind,
  title,
  text,
  Icon,
  today,
  start,
}: {
  kind: ExportKind;
  title: string;
  text: string;
  Icon: LucideIcon;
  today: string;
  start: string;
}) {
  const run = useRunExport();
  const [from, setFrom] = useState(start);
  const [to, setTo] = useState(today);
  const id = (s: string) => `ex-${kind}-${s}`;
  const invalid = !from || !to || from > to;
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5">
      <div className="space-y-2">
        <Icon className="size-6 text-primary" aria-hidden="true" />
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="min-h-10 text-sm text-muted-foreground">{text}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor={id("from")}>From</Label>
          <input
            id={id("from")}
            type="date"
            value={from}
            max={to || today}
            onChange={(e) => setFrom(e.target.value)}
            className="h-11 w-full rounded-lg border border-border-input bg-card px-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={id("to")}>To</Label>
          <input
            id={id("to")}
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            className="h-11 w-full rounded-lg border border-border-input bg-card px-2 text-sm"
          />
        </div>
      </div>
      {from && to && from > to ? (
        <p role="alert" className="text-sm text-danger">
          The end date must be on or after the start date.
        </p>
      ) : null}
      <Button
        className="mt-auto w-full"
        disabled={run.isPending || invalid}
        onClick={() =>
          run.mutate(
            { kind, from, to },
            {
              onSuccess: (r) => {
                if (r.rows === 0) return void toast("No records in this range");
                downloadCsv(r.filename, r.csv);
                toast.success(`${r.filename} downloaded.`);
              },
              onError: () => toast.error("Export failed. Try again"),
            },
          )
        }
      >
        {run.isPending ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : null}
        Download CSV
      </Button>
    </section>
  );
}
