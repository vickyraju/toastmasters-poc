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

/** Meeting times always show the weekday and IST (design.md section 5), e.g. "Fri 2 Oct, 4:00 PM IST". */
export function formatMeetingTime(value: DateInput): string {
  return `${formatIST(value, "EEE d MMM, h:mm a")} IST`;
}

/** "Fri 2 Oct, 4:00 PM to 5:30 PM IST" (end on the same day) for meeting headers. */
export function formatMeetingRange(start: DateInput, end: DateInput): string {
  const sameDay = istDate(start) === istDate(end);
  return sameDay
    ? `${formatIST(start, "EEE d MMM, h:mm a")} to ${formatIST(end, "h:mm a")} IST`
    : `${formatIST(start, "EEE d MMM, h:mm a")} to ${formatIST(end, "EEE d MMM, h:mm a")} IST`;
}

/** Seconds as m:ss, e.g. 300 -> "5:00". */
export function formatSeconds(total: number): string {
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
