"use client";

import Link from "next/link";
import { formatDistanceStrict } from "date-fns";
import type { Notification } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

export const relativeTime = (iso: string, nowIso: string) =>
  `${formatDistanceStrict(new Date(iso), new Date(nowIso))} ago`;

/** S-08 rows: unread dot (plus text for screen readers), title, body, relative time. Opening one marks it read. */
export function NotificationList({
  items,
  nowIso,
  onOpen,
}: {
  items: Notification[];
  nowIso: string;
  onOpen: (n: Notification) => void;
}) {
  return (
    <ul className="divide-y divide-border">
      {items.map((n) => (
        <li key={n.id}>
          <Link
            href={n.link}
            onClick={() => onOpen(n)}
            className="flex gap-3 rounded-lg px-2 py-3 hover:bg-primary-soft"
          >
            <span
              className={cn(
                "mt-1.5 size-2 shrink-0 rounded-full",
                n.readAt ? "bg-transparent" : "bg-primary",
              )}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className={cn("block", !n.readAt && "font-semibold")}>
                {!n.readAt ? <span className="sr-only">Unread: </span> : null}
                {n.title}
              </span>
              {n.body ? (
                <span className="block text-sm text-muted-foreground">
                  {n.body}
                </span>
              ) : null}
              <span className="block text-xs text-muted-foreground">
                {relativeTime(n.createdAt, nowIso)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
