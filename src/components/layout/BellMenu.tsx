"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMarkRead, useMyNotifications } from "@/hooks/useInbox";
import { useNow } from "@/hooks/useHome";
import { relativeTime } from "@/components/notifications/NotificationList";
import { cn } from "@/lib/utils";

const LATEST = 5;

/** G-02: bell with unread count; the dropdown lists the latest 5, "View all" opens S-08. */
export function BellMenu() {
  const router = useRouter();
  const inbox = useMyNotifications();
  const nowQ = useNow();
  const markRead = useMarkRead();
  const unread = inbox.data?.unread ?? 0;
  const items = inbox.data?.items.slice(0, LATEST) ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        className="relative inline-flex size-11 items-center justify-center rounded-lg hover:bg-primary-soft"
      >
        <Bell className="size-5" aria-hidden="true" />
        {unread > 0 ? (
          <span
            aria-hidden="true"
            className="absolute top-1.5 right-1.5 min-w-5 rounded-full bg-danger px-1 text-center text-xs leading-5 text-primary-foreground"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 shadow-[var(--elevation)]"
      >
        <DropdownMenuLabel className="text-sm font-semibold text-foreground">
          Notifications
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {inbox.isError ? (
          <p className="px-2 py-3 text-sm text-danger">
            Could not load notifications. Try again
          </p>
        ) : items.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            {inbox.isPending ? "Loading…" : "No notifications yet."}
          </p>
        ) : (
          items.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="items-start gap-2 py-2"
              onSelect={() => {
                if (!n.readAt) markRead.mutate([n.id]);
                router.push(n.link);
              }}
            >
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  n.readAt ? "bg-transparent" : "bg-primary",
                )}
                aria-hidden="true"
              />
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-sm whitespace-normal",
                    !n.readAt && "font-semibold",
                  )}
                >
                  {!n.readAt ? <span className="sr-only">Unread: </span> : null}
                  {n.title}
                </span>
                {nowQ.data ? (
                  <span className="block text-xs text-muted-foreground">
                    {relativeTime(n.createdAt, nowQ.data)}
                  </span>
                ) : null}
              </span>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          asChild
          className="justify-center font-medium text-primary"
        >
          <Link href="/notifications">View all</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
