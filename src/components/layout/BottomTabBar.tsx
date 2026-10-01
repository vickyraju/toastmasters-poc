"use client";

import { useState } from "react";
import Link from "next/link";
import {
  House,
  Calendar,
  ListChecks,
  TrendingUp,
  Ellipsis,
  Settings,
  LogOut,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { Actor } from "@/lib/permissions/can";
import { cn } from "@/lib/utils";
import { NAV_ICONS } from "./navIcons";
import { activeHref, allowedNav } from "./navState";

const TABS = [
  { href: "/home", label: "Home", Icon: House },
  { href: "/meetings", label: "Meetings", Icon: Calendar },
  { href: "/tasks", label: "Tasks", Icon: ListChecks },
  { href: "/progress", label: "Progress", Icon: TrendingUp },
];

const tabClass = (on: boolean) =>
  cn(
    "flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium",
    on ? "text-primary" : "text-muted-foreground",
  );

/** Phone navigation below lg: four tabs plus More (design.md section 3). */
export function BottomTabBar({
  actor,
  pathname,
  openTasks,
  onSignOut,
}: {
  actor: Actor;
  pathname: string;
  openTasks: number;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const more = allowedNav(actor).filter((i) => i.group !== "my");
  const active = activeHref(pathname, [
    ...TABS,
    ...more,
    { href: "/settings" },
  ]);
  const moreActive = active !== null && !TABS.some((t) => t.href === active);
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card lg:hidden"
    >
      {TABS.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={active === href ? "page" : undefined}
          className={tabClass(active === href)}
        >
          <span className="relative">
            <Icon className="size-5" aria-hidden="true" />
            {href === "/tasks" && openTasks > 0 ? (
              <span className="absolute -top-1.5 -right-2.5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                {openTasks}
                <span className="sr-only"> open</span>
              </span>
            ) : null}
          </span>
          {label}
        </Link>
      ))}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger className={tabClass(moreActive)}>
          <Ellipsis className="size-5" aria-hidden="true" />
          More
        </SheetTrigger>
        <SheetContent
          side="bottom"
          className="rounded-t-[var(--radius-dialog)] pb-6"
        >
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <ul className="px-2">
            {[
              ...more.map((i) => ({
                href: i.href,
                label: i.label,
                Icon: NAV_ICONS[i.icon],
              })),
              { href: "/settings", label: "Settings", Icon: Settings },
            ].map(({ href, label, Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={active === href ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-base",
                    active === href
                      ? "bg-primary-soft text-primary"
                      : "text-foreground",
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-base text-foreground"
              >
                <LogOut className="size-5" aria-hidden="true" />
                Sign out
              </button>
            </li>
          </ul>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
