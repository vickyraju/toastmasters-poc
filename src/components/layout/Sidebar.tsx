"use client";

import Link from "next/link";
import type { Actor } from "@/lib/permissions/can";
import { NAV_GROUP_LABELS, type NavGroup } from "@/lib/permissions/routes";
import { cn } from "@/lib/utils";
import { NAV_ICONS } from "./navIcons";
import { activeHref, allowedNav } from "./navState";

const GROUPS: NavGroup[] = ["my", "manage", "admin"];

/** Desktop navigation from lg (design.md section 3). */
export function Sidebar({
  actor,
  pathname,
  openTasks,
}: {
  actor: Actor;
  pathname: string;
  openTasks: number;
}) {
  const items = allowedNav(actor);
  const active = activeHref(pathname, items);
  return (
    <nav
      aria-label="Main"
      className="hidden w-[var(--sidebar-width)] shrink-0 border-r border-border bg-card lg:block"
    >
      <div className="px-5 py-5">
        <Link href="/home" className="text-lg font-semibold text-primary">
          Club Hub
        </Link>
        {process.env.NEXT_PUBLIC_CLUB_NAME ? (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {process.env.NEXT_PUBLIC_CLUB_NAME}
          </p>
        ) : null}
      </div>
      {GROUPS.map((g) => {
        const groupItems = items.filter((i) => i.group === g);
        if (groupItems.length === 0) return null;
        return (
          <div key={g} className="px-3 pb-4">
            <h2 className="px-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {NAV_GROUP_LABELS[g]}
            </h2>
            <ul className="space-y-0.5">
              {groupItems.map((i) => {
                const Icon = NAV_ICONS[i.icon];
                const isActive = i.href === active;
                const count = i.href === "/tasks" ? openTasks : 0;
                return (
                  <li key={i.href}>
                    <Link
                      href={i.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex h-10 items-center gap-3 rounded-lg px-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-primary-soft text-primary"
                          : "text-foreground hover:bg-primary-soft/60",
                      )}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                      <span className="flex-1">{i.label}</span>
                      {count > 0 ? (
                        <span className="rounded-full bg-primary px-2 text-xs text-primary-foreground">
                          {count}
                          <span className="sr-only"> open</span>
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
