import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { CLUB_TIMEZONE } from "../domain/constants";

type DateInput = Date | string | number;

/** Format an instant in IST, e.g. formatIST(d, "d MMM") -> "2 Oct". */
export function formatIST(value: DateInput, pattern: string): string {
  return formatInTimeZone(value, CLUB_TIMEZONE, pattern);
}

/** IST calendar date `YYYY-MM-DD` for an instant (used for "today" and completed-on checks). */
export function istDate(value: DateInput): string {
  return formatIST(value, "yyyy-MM-dd");
}

/** IST wall-clock date and time to an ISO UTC string, e.g. ("2026-10-02", "16:00"). */
export function istToUtcIso(date: string, time: string): string {
  return fromZonedTime(`${date}T${time}:00`, CLUB_TIMEZONE).toISOString();
}
