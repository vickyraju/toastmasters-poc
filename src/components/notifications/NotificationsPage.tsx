"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { QueryBlock } from "@/components/shared/QueryBlock";
import {
  useMarkAllRead,
  useMarkRead,
  useMyNotifications,
} from "@/hooks/useInbox";
import { useNow } from "@/hooks/useHome";
import { cn } from "@/lib/utils";
import { NotificationList } from "./NotificationList";

type Filter = "all" | "unread";

/** S-08: newest first, All / Unread filter, Mark all read. */
export function NotificationsPage() {
  const inbox = useMyNotifications();
  const nowQ = useNow();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const [filter, setFilter] = useState<Filter>("all");
  const query = { ...inbox, isPending: inbox.isPending || nowQ.isPending };

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label="Show"
          className="inline-flex rounded-lg border border-border-input p-0.5"
        >
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "min-h-9 rounded-md px-3 text-sm font-medium max-lg:min-h-11 max-lg:min-w-11",
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-primary-soft",
              )}
            >
              {f === "all" ? "All" : "Unread"}
            </button>
          ))}
        </div>
        <Button
          variant="outline"
          className="ml-auto"
          disabled={!inbox.data?.unread || markAll.isPending}
          onClick={() =>
            markAll.mutate(undefined, {
              onSuccess: () => toast.success("All caught up."),
            })
          }
        >
          Mark all read
        </Button>
      </div>
      <section className="rounded-lg border border-border bg-card p-3">
        <QueryBlock
          query={query}
          label="notifications"
          rows={4}
          isEmpty={(d) =>
            filter === "unread" ? d.unread === 0 : d.items.length === 0
          }
          empty={
            filter === "unread"
              ? "No unread notifications."
              : "No notifications yet."
          }
        >
          {(d) => (
            <NotificationList
              items={
                filter === "unread" ? d.items.filter((n) => !n.readAt) : d.items
              }
              nowIso={nowQ.data!}
              onOpen={(n) => {
                if (!n.readAt) markRead.mutate([n.id]);
              }}
            />
          )}
        </QueryBlock>
      </section>
    </div>
  );
}
