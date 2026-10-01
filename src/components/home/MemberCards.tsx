"use client";

import Link from "next/link";
import type { UseQueryResult } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/shared/Card";
import { QueryBlock } from "@/components/shared/QueryBlock";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TaskList } from "@/components/tasks/TaskList";
import { useMyTasks } from "@/hooks/useInbox";
import {
  useClaimRole,
  useMyCompletions,
  useOpenRolesForMe,
} from "@/hooks/useHome";
import { formatIST, formatMeetingTime } from "@/lib/time/ist";
import type { CurrentUser, MeetingListItem } from "@/lib/services";

type Upcoming = UseQueryResult<MeetingListItem[]>;
const shortDate = (iso: string) => formatIST(iso, "EEE d MMM");
const linkClass =
  "text-sm font-medium text-primary underline-offset-4 hover:underline";

export function NextMeetingCard({
  upcoming,
  className,
}: {
  upcoming: Upcoming;
  className?: string;
}) {
  return (
    <Card title="Next meeting" className={className}>
      <QueryBlock
        query={upcoming}
        label="the next meeting"
        isEmpty={(d) => d.length === 0}
        empty="No upcoming meetings"
      >
        {([m]) => (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold">{m.title}</p>
              <StatusBadge status={m.status} />
            </div>
            <p className="text-base">{formatMeetingTime(m.startsAt)}</p>
            <dl className="grid gap-1 text-sm sm:grid-cols-[max-content_1fr] sm:gap-x-4">
              <dt className="text-muted-foreground">Theme</dt>
              <dd>{m.theme ?? "Not set yet"}</dd>
              <dt className="text-muted-foreground">Word of the day</dt>
              <dd>
                {m.wordOfTheDay ? (
                  <>
                    {m.wordOfTheDay}
                    {m.wordMeaning ? (
                      <span className="text-muted-foreground">
                        {" "}
                        ({m.wordMeaning})
                      </span>
                    ) : null}
                  </>
                ) : (
                  "Not set yet"
                )}
              </dd>
            </dl>
            <p className="font-medium">
              {m.myRoles.length
                ? `Your role: ${m.myRoles.join(", ")}`
                : "You have no role yet"}
            </p>
            <Button asChild>
              <Link href={`/meetings/${m.id}`}>Open meeting</Link>
            </Button>
          </div>
        )}
      </QueryBlock>
    </Card>
  );
}

export function MyTasksCard({ className }: { className?: string }) {
  const tasks = useMyTasks();
  return (
    <Card
      title="My tasks"
      className={className}
      action={
        <Link href="/tasks" className={linkClass}>
          View all
        </Link>
      }
    >
      <QueryBlock
        query={tasks}
        label="tasks"
        isEmpty={(d) => d.length === 0}
        empty="No tasks. You are all caught up."
      >
        {(d) => <TaskList tasks={d.slice(0, 4)} />}
      </QueryBlock>
    </Card>
  );
}

export function MyRolesCard({
  upcoming,
  className,
}: {
  upcoming: Upcoming;
  className?: string;
}) {
  return (
    <Card title="My upcoming roles" className={className}>
      <QueryBlock
        query={upcoming}
        label="your roles"
        isEmpty={(d) => !d.some((m) => m.myRoles.length)}
        empty="You have no upcoming roles."
      >
        {(d) => (
          <ul className="divide-y divide-border">
            {d
              .filter((m) => m.myRoles.length)
              .map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/meetings/${m.id}?tab=roles`}
                    className="flex justify-between gap-3 py-2 hover:text-primary"
                  >
                    <span className="text-muted-foreground">
                      {shortDate(m.startsAt)}
                    </span>
                    <span className="text-right font-medium">
                      {m.myRoles.join(", ")}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </QueryBlock>
    </Card>
  );
}

export function OpenRolesCard({ className }: { className?: string }) {
  const open = useOpenRolesForMe();
  const claim = useClaimRole();
  return (
    <Card title="Open roles I can take" className={className}>
      <QueryBlock
        query={open}
        label="open roles"
        isEmpty={(d) => d.length === 0}
        empty="No open roles right now"
      >
        {(d) => (
          <ul className="divide-y divide-border">
            {d.slice(0, 5).map((r) => {
              const busy =
                claim.isPending && claim.variables?.slotId === r.slotId;
              return (
                <li
                  key={r.slotId}
                  className="flex flex-wrap items-center gap-3 py-2"
                >
                  <span className="w-24 text-sm text-muted-foreground">
                    {shortDate(r.startsAt)}
                  </span>
                  <span className="flex-1 font-medium">{r.label}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 max-lg:h-11"
                    disabled={claim.isPending}
                    aria-label={`Take ${r.label} on ${shortDate(r.startsAt)}`}
                    onClick={() =>
                      claim.mutate({ slotId: r.slotId, label: r.label })
                    }
                  >
                    {busy ? (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    ) : null}
                    Take this role
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </QueryBlock>
    </Card>
  );
}

/** Level ring: current level out of 5, with the number in text (never colour alone). */
function LevelRing({ level }: { level: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg
      viewBox="0 0 64 64"
      className="size-16 shrink-0"
      role="img"
      aria-label={`Level ${level} of 5`}
    >
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="var(--primary-soft)"
        strokeWidth="8"
      />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="8"
        strokeDasharray={`${(c * level) / 5} ${c}`}
        transform="rotate(-90 32 32)"
      />
      <text
        x="32"
        y="37"
        textAnchor="middle"
        className="fill-foreground text-base font-semibold"
      >
        {level}
      </text>
    </svg>
  );
}

export function MyProgressCard({
  user,
  className,
}: {
  user: CurrentUser;
  className?: string;
}) {
  const completions = useMyCompletions();
  return (
    <Card title="My progress" className={className}>
      <div className="flex items-center gap-4">
        <LevelRing level={user.currentLevel} />
        <div className="space-y-1 text-sm">
          <p className="font-medium">{user.pathway ?? "No pathway set"}</p>
          <p className="text-muted-foreground">
            Level {user.currentLevel} of 5
          </p>
          <QueryBlock query={completions} label="your progress" rows={1}>
            {(d) => {
              const n = d.filter(
                (c) => c.kind === "project" && c.status === "counted",
              ).length;
              return (
                <p className="text-muted-foreground">
                  {n === 1 ? "1 project done" : `${n} projects done`}
                </p>
              );
            }}
          </QueryBlock>
        </div>
      </div>
      <Link href="/progress" className={`mt-3 inline-block ${linkClass}`}>
        {user.pathway ? "View progress" : "Set your pathway"}
      </Link>
    </Card>
  );
}
