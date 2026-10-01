"use client";

import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/shared/Avatar";
import { PositionBadge } from "@/components/shared/PositionBadge";
import type { CurrentUser } from "@/lib/services";
import { BellMenu } from "./BellMenu";

/** G-01 and G-02: page title, bell with unread count, avatar menu (design.md section 3). */
export function TopBar({
  title,
  user,
  onSignOut,
}: {
  title: string;
  user: CurrentUser;
  onSignOut: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card px-6 max-lg:px-4">
      <h1 className="flex-1 truncate text-xl font-semibold">{title}</h1>
      <BellMenu />
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Account menu for ${user.name}`}
          className="flex min-h-11 items-center gap-2 rounded-lg px-1.5 hover:bg-primary-soft"
        >
          <Avatar name={user.name} />
          <span className="hidden text-sm font-medium md:inline">
            {user.name}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-60 shadow-[var(--elevation)]"
        >
          <DropdownMenuLabel className="flex flex-col items-start gap-1.5">
            <span className="text-sm font-semibold text-foreground">
              {user.name}
            </span>
            {user.position ? <PositionBadge position={user.position} /> : null}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings aria-hidden="true" />
              Settings
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onSignOut}>
            <LogOut aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
