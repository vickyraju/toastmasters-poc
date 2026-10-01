"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, CircleAlert } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { QueryBlock } from "@/components/shared/QueryBlock";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { RoleBoard } from "@/components/roles/RoleBoard";
import { useMeeting, useMeetingRoles } from "@/hooks/useMeeting";
import { useNow } from "@/hooks/useHome";
import { AppError, type MeetingDetail as Detail } from "@/lib/services";
import type { MeetingStatus } from "@/lib/domain/types";
import { formatMeetingRange } from "@/lib/time/ist";
import { cn } from "@/lib/utils";
import { AgendaTab } from "./AgendaTab";
import { OverviewTab } from "./OverviewTab";
import { safeHttpUrl } from "./safeUrl";

const TABS = ["overview", "agenda", "roles", "reports"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  overview: "Overview",
  agenda: "Agenda",
  roles: "Roles",
  reports: "Reports",
};

/** S-04 (design.md section 6). Tabs live in the URL as ?tab=. Actions arrive in M6 to M8. */
export function MeetingDetail({ id }: { id: string }) {
  const meeting = useMeeting(id);
  const pathname = usePathname();

  // R-18: a Member opening a Draft link gets G-05; the service answers FORBIDDEN.
  if (meeting.error instanceof AppError && meeting.error.code === "FORBIDDEN")
    return <AccessDenied path={pathname} />;
  if (meeting.error instanceof AppError && meeting.error.code === "NOT_FOUND")
    return (
      <div className="space-y-2 py-16 text-center">
        <h2 className="text-2xl font-semibold">Meeting not found</h2>
        <Link
          href="/meetings"
          className="text-primary underline-offset-4 hover:underline"
        >
          Back to Meetings
        </Link>
      </div>
    );
  if (meeting.isPending)
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading meeting">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-5 w-96" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  return (
    <QueryBlock query={meeting} label="this meeting">
      {(m) => <Loaded meeting={m} />}
    </QueryBlock>
  );
}

function Loaded({ meeting: m }: { meeting: Detail }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const raw = params.get("tab");
  const tab: Tab = (TABS as readonly string[]).includes(raw ?? "")
    ? (raw as Tab)
    : "overview";
  const link = safeHttpUrl(m.meetingLink);

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold">{m.title}</h2>
          <StatusBadge status={m.status} />
        </div>
        <p className="text-base">
          {m.status === "cancelled" ? (
            <s>{formatMeetingRange(m.startsAt, m.endsAt)}</s>
          ) : (
            formatMeetingRange(m.startsAt, m.endsAt)
          )}
        </p>
        <p className="text-sm text-muted-foreground">
          {[m.venue, m.typeName].filter(Boolean).join(" · ")}
          {link ? (
            <>
              {" · "}
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                Join online
              </a>
            </>
          ) : null}
        </p>
      </header>

      {m.status === "cancelled" ? (
        <div
          role="status"
          className="flex gap-2 rounded-lg border border-danger/30 bg-danger-bg p-4 text-danger"
        >
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <p>
            <span className="font-semibold">This meeting was cancelled.</span>
            {m.cancelledReason ? <> Reason: {m.cancelledReason}</> : null}
          </p>
        </div>
      ) : (
        <LifecycleStepper status={m.status} />
      )}

      <Tabs
        value={tab}
        onValueChange={(v) =>
          router.replace(`${pathname}?tab=${v}`, { scroll: false })
        }
      >
        <TabsList className="max-w-full justify-start overflow-x-auto group-data-horizontal/tabs:h-auto">
          {TABS.map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              className="min-h-9 px-4 max-lg:min-h-11"
            >
              {TAB_LABEL[t]}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="overview" className="pt-4">
          <OverviewTab meeting={m} />
        </TabsContent>
        <TabsContent value="agenda" className="pt-4">
          <AgendaTab meeting={m} />
        </TabsContent>
        <TabsContent value="roles" className="pt-4">
          <RolesTab meetingId={m.id} />
        </TabsContent>
        <TabsContent value="reports" className="pt-4">
          <ReportsTab meeting={m} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const STEPS: { status: MeetingStatus; label: string }[] = [
  { status: "draft", label: "Draft" },
  { status: "open", label: "Open for roles" },
  { status: "finalized", label: "Finalized" },
  { status: "completed", label: "Completed" },
];

/** Draft, Open, Finalized, Completed with the current step marked (design.md section 6). */
export function LifecycleStepper({ status }: { status: MeetingStatus }) {
  const current = STEPS.findIndex((s) => s.status === status);
  return (
    <ol aria-label="Meeting status" className="flex flex-wrap gap-2 sm:gap-0">
      {STEPS.map((s, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li
            key={s.status}
            aria-current={now ? "step" : undefined}
            className="flex items-center"
          >
            {i > 0 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "mx-2 hidden h-px w-8 sm:block",
                  done || now ? "bg-primary" : "bg-border",
                )}
              />
            ) : null}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm",
                now
                  ? "bg-primary font-semibold text-primary-foreground"
                  : done
                    ? "bg-primary-soft text-primary"
                    : "border border-border text-muted-foreground",
              )}
            >
              {done ? <Check className="size-3.5" aria-hidden="true" /> : null}
              {s.label}
              {done ? <span className="sr-only"> (done)</span> : null}
              {now ? <span className="sr-only"> (current)</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function RolesTab({ meetingId }: { meetingId: string }) {
  const roles = useMeetingRoles(meetingId);
  return (
    <QueryBlock
      query={roles}
      label="roles"
      rows={6}
      isEmpty={(d) => d.length === 0}
      empty="No roles added yet"
    >
      {(d) => <RoleBoard roles={d} />}
    </QueryBlock>
  );
}

/** Report forms and the consolidated report come in M8; until then only the "not ended" state is real. */
function ReportsTab({ meeting }: { meeting: Detail }) {
  const nowQ = useNow();
  if (!nowQ.data) return <Skeleton className="h-10 w-full" />;
  if (meeting.status === "cancelled")
    return (
      <p className="text-muted-foreground">
        This meeting was cancelled, so there are no reports.
      </p>
    );
  if (nowQ.data < meeting.endsAt)
    return (
      <p className="text-muted-foreground">
        Reports open after the meeting ends.
      </p>
    );
  return <p className="text-muted-foreground">This screen is not built yet.</p>;
}
