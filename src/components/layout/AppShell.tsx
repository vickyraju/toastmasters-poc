"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { useCurrentUser, useSignOut, toActor } from "@/hooks/useSession";
import { useMyTasks, useNotificationToasts } from "@/hooks/useInbox";
import { useMockTick } from "@/hooks/useDev";
import { canOpen, titleFor } from "@/lib/permissions/routes";
import type { CurrentUser } from "@/lib/services";
import { BottomTabBar } from "./BottomTabBar";
import { DemoRibbon } from "./DemoRibbon";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

/** Signed-in shell: sidebar or bottom tabs, top bar, toasts, and the route guard (G-01 to G-05). */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const me = useCurrentUser();

  // Signed out: go to S-01 and come back here afterwards (flow.md J-01 step 5).
  useEffect(() => {
    if (me.isSuccess && !me.data) {
      router.replace(
        `/login?next=${encodeURIComponent(pathname + window.location.search)}`,
      );
    }
  }, [me.isSuccess, me.data, pathname, router]);

  if (!me.data) return <ShellSkeleton />;
  return (
    <SignedInShell user={me.data} pathname={pathname}>
      {children}
    </SignedInShell>
  );
}

function SignedInShell({
  user,
  pathname,
  children,
}: {
  user: CurrentUser;
  pathname: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const signOut = useSignOut();
  const tasks = useMyTasks();
  useNotificationToasts();
  useMockTick();

  const actor = toActor(user);
  const openTasks = tasks.data?.length ?? 0;
  const handleSignOut = () =>
    signOut.mutate(undefined, { onSuccess: () => router.replace("/login") });

  return (
    <div className="flex min-h-dvh flex-col">
      <DemoRibbon />
      <div className="flex flex-1">
        <Sidebar actor={actor} pathname={pathname} openTasks={openTasks} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar
            title={titleFor(pathname)}
            user={user}

            onSignOut={handleSignOut}
          />
          <main className="mx-auto w-full max-w-[var(--content-max)] flex-1 p-6 max-lg:p-4 max-lg:pb-24">
            {canOpen(actor, pathname) ? (
              children
            ) : (
              <AccessDenied path={pathname} />
            )}
          </main>
        </div>
      </div>
      <BottomTabBar
        actor={actor}
        pathname={pathname}
        openTasks={openTasks}
        onSignOut={handleSignOut}
      />
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="flex min-h-dvh" aria-busy="true" aria-label="Loading">
      <div className="hidden w-[var(--sidebar-width)] space-y-3 border-r border-border bg-card p-5 lg:block">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
      <div className="flex-1">
        <div className="h-14 border-b border-border bg-card" />
        <div className="space-y-4 p-6">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}
