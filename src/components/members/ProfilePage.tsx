"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { Avatar } from "@/components/shared/Avatar";
import { Card } from "@/components/shared/Card";
import { PositionBadge } from "@/components/shared/PositionBadge";
import { QueryBlock } from "@/components/shared/QueryBlock";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LevelRing } from "@/components/progress/LevelRing";
import { useMemberProfile } from "@/hooks/useMembers";
import { useCan, useCurrentUser } from "@/hooks/useSession";
import { AppError } from "@/lib/services";
import { formatMeetingTime } from "@/lib/time/ist";
import { EditMemberDialog } from "./MemberDialogs";
import { STATUS } from "@/components/progress/MyProgressPage";
import { cn } from "@/lib/utils";

/** S-12: profile card, roles history, progress summary. Self edits their own details; ExComm edits anyone's. */
export function ProfilePage({ id }: { id: string }) {
  const pathname = usePathname();
  const profile = useMemberProfile(id);
  const me = useCurrentUser().data;
  const officer = useCan("member.update");
  const [editing, setEditing] = useState(false);

  if (profile.error instanceof AppError && profile.error.code === "FORBIDDEN")
    return <AccessDenied path={pathname} />;
  if (profile.error instanceof AppError && profile.error.code === "NOT_FOUND")
    return (
      <div className="space-y-2 py-16 text-center">
        <h2 className="text-2xl font-semibold">Member not found</h2>
        <Link
          href="/members"
          className="text-primary underline-offset-4 hover:underline"
        >
          Back to Members
        </Link>
      </div>
    );

  return (
    <QueryBlock query={profile} label="this profile" rows={4}>
      {(p) => {
        const m = p.member;
        const isSelf = me?.id === m.id;
        const canEdit = m.status !== "removed" && (officer || isSelf);
        return (
          <div className="space-y-4">
            <section className="flex flex-wrap items-start gap-4 rounded-lg border border-border bg-card p-5">
              <Avatar name={m.name} className="size-14 text-lg" />
              <div className="min-w-48 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold">{m.name}</h2>
                  {m.position ? <PositionBadge position={m.position} /> : null}
                  {m.status !== "active" ? (
                    <span className="rounded-full bg-warning-bg px-2.5 py-0.5 text-xs font-medium text-warning capitalize">
                      {m.status}
                    </span>
                  ) : null}
                </div>
                <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[max-content_1fr]">
                  <dt className="text-muted-foreground">Employee ID</dt>
                  <dd>{m.employeeId}</dd>
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="break-all">{m.email}</dd>
                  <dt className="text-muted-foreground">Toastmasters ID</dt>
                  <dd>{m.toastmastersId ?? "Not set"}</dd>
                  <dt className="text-muted-foreground">Pathway</dt>
                  <dd>{m.pathway ?? "Not set"}</dd>
                  <dt className="text-muted-foreground">Level</dt>
                  <dd>{m.currentLevel} of 5</dd>
                </dl>
              </div>
              {canEdit ? (
                <Button variant="outline" onClick={() => setEditing(true)}>
                  Edit
                </Button>
              ) : null}
            </section>

            <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
              <Card title="Roles history" className="lg:col-span-2">
                {p.roles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No roles yet</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {p.roles.map((r) => (
                      <li
                        key={`${r.meetingId}-${r.label}`}
                        className="flex flex-wrap items-center gap-3 py-2"
                      >
                        <Link
                          href={`/meetings/${r.meetingId}?tab=roles`}
                          className="min-w-40 flex-1 hover:text-primary"
                        >
                          <span className="font-medium">{r.label}</span>
                          <span className="block text-sm text-muted-foreground">
                            {r.meetingTitle} · {formatMeetingTime(r.startsAt)}
                          </span>
                        </Link>
                        <StatusBadge status={r.meetingStatus} />
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card title="Progress">
                <div className="flex items-center gap-4">
                  <LevelRing level={m.currentLevel} />
                  <div className="space-y-1 text-sm">
                    <p className="font-medium">
                      {m.pathway ?? "No pathway set"}
                    </p>
                    <p className="text-muted-foreground">
                      {p.projectsCompleted === 1
                        ? "1 project done"
                        : `${p.projectsCompleted} projects done`}
                    </p>
                  </div>
                </div>
                {p.completions.length ? (
                  <ul className="mt-3 divide-y divide-border text-sm">
                    {p.completions.map((c) => (
                      <li
                        key={c.id}
                        className="flex justify-between gap-3 py-1.5"
                      >
                        <span>
                          {c.kind === "level"
                            ? `Level ${c.level}`
                            : (c.projectName ?? "Project")}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            STATUS[c.status].className,
                          )}
                        >
                          {STATUS[c.status].label}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Card>
            </div>
            {editing ? (
              <EditMemberDialog
                member={m}
                asSelf={isSelf && !officer}
                onClose={() => setEditing(false)}
              />
            ) : null}
          </div>
        );
      }}
    </QueryBlock>
  );
}
