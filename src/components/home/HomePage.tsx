"use client";

import { useCan, useCurrentUser } from "@/hooks/useSession";
import { useMeetings, useNow } from "@/hooks/useHome";
import { formatIST } from "@/lib/time/ist";
import {
  MyProgressCard,
  MyRolesCard,
  MyTasksCard,
  NextMeetingCard,
  OpenRolesCard,
} from "./MemberCards";
import {
  ApprovalsCard,
  MeetingStatusCard,
  PositionsCard,
  QuickActionsCard,
  VotesCard,
} from "./OfficerCards";

function greeting(nowIso: string) {
  const h = Number(formatIST(nowIso, "H"));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/**
 * S-02. Desktop: main 2/3 (next meeting, roles filled, open roles, tasks) and side 1/3 (my roles,
 * progress, approvals, quick actions). Phone: one column, tasks first (design.md section 4);
 * the columns use `display: contents` below lg so `order-*` can reorder every card.
 */
export function HomePage() {
  const user = useCurrentUser().data;
  const nowQ = useNow();
  const meetings = useMeetings();
  const isOfficer = useCan("meeting.create");
  const isPresident = useCan("position.assign");
  const isVpe = useCan("completion.verify");
  if (!user) return null;

  // Upcoming = not ended yet and not cancelled or completed, soonest first (list is sorted).
  const nowIso = nowQ.data;
  const upcoming = {
    ...meetings,
    isPending: meetings.isPending || !nowIso,
    data:
      meetings.data && nowIso
        ? meetings.data.filter(
            (m) =>
              m.status !== "cancelled" &&
              m.status !== "completed" &&
              m.endsAt > nowIso,
          )
        : undefined,
  } as typeof meetings;

  return (
    <div className="space-y-6">
      <p className="text-[32px] leading-tight font-semibold">
        {nowIso ? greeting(nowIso) : "Hello"}, {user.name.split(" ")[0]}
      </p>
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-3 lg:items-start">
        <div className="flex flex-col gap-4 max-lg:contents lg:col-span-2">
          <NextMeetingCard upcoming={upcoming} className="max-lg:order-2" />
          {isOfficer ? (
            <MeetingStatusCard upcoming={upcoming} className="max-lg:order-5" />
          ) : null}
          <OpenRolesCard className="max-lg:order-4" />
          <MyTasksCard className="max-lg:order-1" />
        </div>
        <div className="flex flex-col gap-4 max-lg:contents">
          <MyRolesCard upcoming={upcoming} className="max-lg:order-3" />
          <MyProgressCard user={user} className="max-lg:order-6" />
          {isOfficer ? (
            <ApprovalsCard isVpe={isVpe} className="max-lg:order-7" />
          ) : null}
          {isOfficer ? <VotesCard className="max-lg:order-8" /> : null}
          {isOfficer ? (
            <QuickActionsCard
              isPresident={isPresident}
              className="max-lg:order-9"
            />
          ) : null}
          {isPresident ? <PositionsCard className="max-lg:order-10" /> : null}
        </div>
      </div>
    </div>
  );
}
