import { istDate } from "@/lib/time/ist";

const DAY_MS = 86_400_000;

/**
 * S-07 groups: Today (overdue or due by the end of today, IST), This week (within 7 days),
 * Later (further out, or no due date).
 */
export function groupTasks<T extends { dueAt: string | null }>(
  tasks: T[],
  nowIso: string,
) {
  const today = istDate(nowIso);
  const weekEnd = Date.parse(nowIso) + 7 * DAY_MS;
  // Undated last; ISO strings compare correctly as plain strings.
  const sorted = [...tasks].sort((a, b) =>
    a.dueAt === b.dueAt
      ? 0
      : !a.dueAt
        ? 1
        : !b.dueAt
          ? -1
          : a.dueAt < b.dueAt
            ? -1
            : 1,
  );
  const groups = { today: [] as T[], week: [] as T[], later: [] as T[] };
  for (const task of sorted) {
    if (!task.dueAt) groups.later.push(task);
    else if (istDate(task.dueAt) <= today) groups.today.push(task);
    else if (Date.parse(task.dueAt) <= weekEnd) groups.week.push(task);
    else groups.later.push(task);
  }
  return groups;
}
