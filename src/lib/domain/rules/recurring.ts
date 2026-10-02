import { istDate, istToUtcIso } from "@/lib/time/ist";

/**
 * R-08: UTC start instants for every matching weekday from today through `weeksAhead` weeks, in IST,
 * skipping `skipDates` and times already past. The caller drops ones that already exist (idempotency).
 */
export function recurringDates(
  t: {
    weekday: number;
    startTime: string;
    weeksAhead: number;
    skipDates: string[];
  },
  nowIso: string,
): string[] {
  const [y, m, d] = istDate(nowIso).split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i <= t.weeksAhead * 7; i++) {
    const day = new Date(Date.UTC(y, m - 1, d + i));
    if (day.getUTCDay() !== t.weekday) continue;
    const date = day.toISOString().slice(0, 10);
    if (t.skipDates.includes(date)) continue;
    const startsAt = istToUtcIso(date, t.startTime);
    if (startsAt > nowIso) out.push(startsAt);
  }
  return out;
}
