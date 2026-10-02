"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/shared/Card";
import { QueryBlock } from "@/components/shared/QueryBlock";
import { useMeetingRoles } from "@/hooks/useMeeting";
import { useCan, useCurrentUser } from "@/hooks/useSession";
import { ThemeEditor } from "./ThemeEditor";
import type { MeetingDetail } from "@/lib/services";
import { safeHttpUrl } from "./safeUrl";

/** S-04 Overview: theme block, details, my role, roles filled. Theme editing is M8. */
export function OverviewTab({ meeting: m }: { meeting: MeetingDetail }) {
  const roles = useMeetingRoles(m.id);
  const me = useCurrentUser().data;
  const link = safeHttpUrl(m.meetingLink);
  const [editing, setEditing] = useState(false);
  const tmod =
    roles.data?.find((r) => r.roleCode === "tmod")?.holder?.id ?? null;
  const canEdit = useCan("meeting.theme.edit", {
    meetingStatus: m.status,
    tmodHolderId: tmod,
  });

  return (
    <div className="grid gap-4 lg:grid-cols-3 lg:items-start">
      <Card
        title="Theme"
        className="lg:col-span-2"
        action={
          canEdit ? (
            <Button variant="outline" onClick={() => setEditing(true)}>
              {m.themePublishedAt ? "Edit theme" : "Set theme"}
            </Button>
          ) : null
        }
      >
        {m.theme || m.wordOfTheDay || m.welcomeNote ? (
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[max-content_1fr]">
            <dt className="text-muted-foreground">Theme</dt>
            <dd className="font-medium">{m.theme ?? "Not set yet"}</dd>
            <dt className="text-muted-foreground">Welcome note</dt>
            <dd>{m.welcomeNote ?? "Not set yet"}</dd>
            <dt className="text-muted-foreground">Word of the day</dt>
            <dd>
              {m.wordOfTheDay ? (
                <>
                  <span className="font-medium">{m.wordOfTheDay}</span>
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
        ) : (
          <p className="text-muted-foreground">
            The theme and word of the day are not set yet.
          </p>
        )}
      </Card>

      <div className="space-y-4">
        <Card title="Roles">
          <QueryBlock query={roles} label="roles" rows={2}>
            {(d) => {
              const filled = d.filter((r) => r.holder).length;
              const mine = d
                .filter((r) => r.holder?.id === me?.id)
                .map((r) => r.slot.label);
              return (
                <div className="space-y-3">
                  <p className="font-medium">
                    {mine.length
                      ? `Your role: ${mine.join(", ")}`
                      : "You have no role yet"}
                  </p>
                  <p className="text-sm">
                    {filled} of {d.length} roles filled
                  </p>
                  <div
                    role="progressbar"
                    aria-label="Roles filled"
                    aria-valuemin={0}
                    aria-valuemax={d.length}
                    aria-valuenow={filled}
                    className="h-2 overflow-hidden rounded-full bg-primary-soft"
                  >
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${d.length ? (filled / d.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              );
            }}
          </QueryBlock>
        </Card>
        <Card title="Details">
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Type</dt>
            <dd>{m.typeName}</dd>
            <dt className="text-muted-foreground">Venue</dt>
            <dd>{m.venue ?? "Not set"}</dd>
            <dt className="text-muted-foreground">Online</dt>
            <dd className="break-all">
              {link ? (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {link}
                </a>
              ) : (
                "Not set"
              )}
            </dd>
          </dl>
        </Card>
      </div>
      {editing ? (
        <ThemeEditor meeting={m} onClose={() => setEditing(false)} />
      ) : null}
    </div>
  );
}
