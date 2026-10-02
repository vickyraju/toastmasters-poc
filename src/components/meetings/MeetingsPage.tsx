"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { QueryBlock } from "@/components/shared/QueryBlock";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useMeetings, useNow } from "@/hooks/useHome";
import { useCan } from "@/hooks/useSession";
import { useOpenAllDrafts } from "@/hooks/useTemplates";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { MEETING_STATUS } from "@/lib/domain/constants";
import type { MeetingStatus } from "@/lib/domain/types";
import type { MeetingListItem } from "@/lib/services";
import { formatIST, formatMeetingTime, istDate } from "@/lib/time/ist";
import { cn } from "@/lib/utils";
import { addMonths, monthGrid, monthOf } from "./calendar";

const STATUS_LABEL: Record<MeetingStatus, string> = {
  draft: "Draft",
  open: "Open for roles",
  finalized: "Finalized",
  completed: "Completed",
  cancelled: "Cancelled",
};
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const selectClass =
  "h-10 rounded-lg border border-border-input bg-card px-3 text-sm max-lg:h-11 max-lg:text-base";

/** S-03: Calendar or List, filtered by type and status. Drafts never reach Members (the service filters them). */
export function MeetingsPage() {
  const meetings = useMeetings();
  const nowQ = useNow();
  const isOfficer = useCan("meeting.create");
  const openAll = useOpenAllDrafts();
  const [confirmOpenAll, setConfirmOpenAll] = useState(false);
  const draftCount =
    meetings.data?.filter((m) => m.status === "draft").length ?? 0;
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [type, setType] = useState("");
  const [status, setStatus] = useState<MeetingStatus | "">("");
  const [month, setMonth] = useState<string | null>(null);
  const shownMonth = month ?? (nowQ.data ? monthOf(nowQ.data) : null);

  const types = useMemo(
    () => [
      ...new Map(
        (meetings.data ?? []).map((m) => [m.meetingTypeId, m.typeName]),
      ).entries(),
    ],
    [meetings.data],
  );
  const statuses = MEETING_STATUS.filter((s) => isOfficer || s !== "draft");
  const filtered = meetings.data?.filter(
    (m) =>
      (!type || m.meetingTypeId === type) && (!status || m.status === status),
  );
  const query = {
    ...meetings,
    isPending: meetings.isPending || !shownMonth,
    data: filtered,
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div
          role="group"
          aria-label="View"
          className="inline-flex rounded-lg border border-border-input p-0.5"
        >
          {(["calendar", "list"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={cn(
                "min-h-9 rounded-md px-3 text-sm font-medium max-lg:min-h-11 max-lg:min-w-11",
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-primary-soft",
              )}
            >
              {v === "calendar" ? "Calendar" : "List"}
            </button>
          ))}
        </div>
        <div className="space-y-1">
          <Label htmlFor="filter-type">Type</Label>
          <select
            id="filter-type"
            className={selectClass}
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">All types</option>
            {types.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="filter-status">Status</Label>
          <select
            id="filter-status"
            className={selectClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as MeetingStatus | "")}
          >
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        {isOfficer ? (
          <div className="flex gap-2 lg:ml-auto">
            {draftCount > 0 ? (
              <Button
                variant="outline"
                disabled={openAll.isPending}
                onClick={() => setConfirmOpenAll(true)}
              >
                Open all drafts
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href="/meetings/templates">Templates</Link>
            </Button>
            <Button asChild>
              <Link href="/meetings/new">New meeting</Link>
            </Button>
          </div>
        ) : null}
      </div>

      <QueryBlock
        query={query}
        label="meetings"
        rows={5}
        isEmpty={() => (meetings.data?.length ?? 0) === 0}
        empty="No meetings yet"
      >
        {(list) =>
          view === "list" ? (
            <MeetingList meetings={list} />
          ) : (
            <MonthView
              month={shownMonth!}
              meetings={list}
              onMonth={(n) => setMonth(addMonths(shownMonth!, n))}
            />
          )
        }
      </QueryBlock>
      {confirmOpenAll ? (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setConfirmOpenAll(false)}
          title="Open all drafts for roles?"
          description={`${draftCount} draft ${draftCount === 1 ? "meeting opens" : "meetings open"} and every member is notified once per meeting. A draft with no venue or link stays a draft.`}
          confirmLabel="Open all drafts"
          busy={openAll.isPending}
          onConfirm={() =>
            openAll.mutate(undefined, {
              onSettled: () => setConfirmOpenAll(false),
            })
          }
        />
      ) : null}
    </div>
  );
}

const roleCount = (m: MeetingListItem) =>
  m.status === "cancelled" ? "None" : `${m.filled} of ${m.total}`;

function DateCell({ m }: { m: MeetingListItem }) {
  const text = formatMeetingTime(m.startsAt);
  return m.status === "cancelled" ? <s>{text}</s> : <>{text}</>;
}

/** List view: a table from md, stacked cards below (design.md 2.4). */
function MeetingList({ meetings }: { meetings: MeetingListItem[] }) {
  if (meetings.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        No meetings match these filters.
      </p>
    );
  return (
    <>
      <table className="hidden w-full overflow-hidden rounded-lg border border-border bg-card text-sm md:table">
        <thead className="bg-background text-left text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-2 font-medium">
              Date
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Meeting
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Type
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Roles filled
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {meetings.map((m) => (
            <tr key={m.id} className="hover:bg-primary-soft/50">
              <td className="px-4 py-3 whitespace-nowrap">
                <DateCell m={m} />
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/meetings/${m.id}`}
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {m.title}
                </Link>
                {m.myRoles.length ? (
                  <p className="text-xs text-muted-foreground">
                    Your role: {m.myRoles.join(", ")}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-3">{m.typeName}</td>
              <td className="px-4 py-3">
                <StatusBadge status={m.status} />
              </td>
              <td className="px-4 py-3">{roleCount(m)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="space-y-3 md:hidden">
        {meetings.map((m) => (
          <li key={m.id}>
            <Link
              href={`/meetings/${m.id}`}
              className="block space-y-1 rounded-lg border border-border bg-card p-4"
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-primary">{m.title}</span>
                <StatusBadge status={m.status} />
              </span>
              <span className="block text-sm">
                <DateCell m={m} />
              </span>
              <span className="block text-sm text-muted-foreground">
                {m.typeName} · Roles filled: {roleCount(m)}
              </span>
              {m.myRoles.length ? (
                <span className="block text-sm">
                  Your role: {m.myRoles.join(", ")}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Calendar view: month grid from md; below md the month's meetings as a list (99-phone-variants). */
function MonthView({
  month,
  meetings,
  onMonth,
}: {
  month: string;
  meetings: MeetingListItem[];
  onMonth: (n: number) => void;
}) {
  const inMonth = meetings.filter((m) => monthOf(m.startsAt) === month);
  const byDay = new Map<string, MeetingListItem[]>();
  for (const m of inMonth)
    byDay.set(istDate(m.startsAt), [
      ...(byDay.get(istDate(m.startsAt)) ?? []),
      m,
    ]);
  const title = formatIST(`${month}-15T06:30:00.000Z`, "MMMM yyyy");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="size-10 max-lg:size-11"
          aria-label="Previous month"
          onClick={() => onMonth(-1)}
        >
          <ChevronLeft aria-hidden="true" />
        </Button>
        <h2
          className="min-w-40 text-center text-xl font-semibold"
          aria-live="polite"
        >
          {title}
        </h2>
        <Button
          variant="outline"
          size="icon"
          className="size-10 max-lg:size-11"
          aria-label="Next month"
          onClick={() => onMonth(1)}
        >
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
      <table className="hidden w-full table-fixed overflow-hidden rounded-lg border border-border bg-card text-sm md:table">
        <caption className="sr-only">Meetings in {title}</caption>
        <thead>
          <tr>
            {WEEKDAYS.map((d) => (
              <th
                key={d}
                scope="col"
                className="border-b border-border px-2 py-2 text-left font-medium text-muted-foreground"
              >
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthGrid(month).map((week, i) => (
            <tr key={i}>
              {week.map((day, j) => (
                <td
                  key={j}
                  className="h-24 border-t border-r border-border p-1.5 align-top last:border-r-0"
                >
                  {day ? (
                    <>
                      <span className="text-xs text-muted-foreground">
                        {Number(day.slice(8))}
                      </span>
                      <ul className="mt-1 space-y-1">
                        {(byDay.get(day) ?? []).map((m) => (
                          <li key={m.id}>
                            <Link
                              href={`/meetings/${m.id}`}
                              className="block rounded-md bg-primary-soft px-1.5 py-1 text-xs hover:bg-primary-soft/70"
                            >
                              <span
                                className={cn(
                                  "block font-medium text-primary",
                                  m.status === "cancelled" && "line-through",
                                )}
                              >
                                {formatIST(m.startsAt, "h:mm a")} {m.title}
                              </span>
                              <span className="block text-muted-foreground">
                                {STATUS_LABEL[m.status]}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="md:hidden">
        {inMonth.length ? (
          <MeetingList meetings={inMonth} />
        ) : (
          <p className="text-sm text-muted-foreground">
            No meetings this month.
          </p>
        )}
      </div>
      {inMonth.length === 0 ? (
        <p className="hidden text-sm text-muted-foreground md:block">
          No meetings this month.
        </p>
      ) : null}
    </div>
  );
}
