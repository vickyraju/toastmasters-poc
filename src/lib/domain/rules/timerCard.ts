import { DEFAULT_TIMER_GRACE_SECONDS } from "../constants";
import type { Card } from "../types";

/** R-04: green from min, yellow from the midpoint, red from max; outside min-grace..max+grace is DQ. */
export function timerCard(
  seconds: number,
  min: number,
  max: number,
  grace = DEFAULT_TIMER_GRACE_SECONDS,
): Card {
  const mid = Math.floor((min + max) / 2);
  if (seconds < min - grace || seconds > max + grace) return "disqualified";
  if (seconds < min) return "none";
  if (seconds < mid) return "green";
  if (seconds < max) return "yellow";
  return "red";
}

/** Numbers behind the helper text under the timer form. */
export function timerThresholds(
  min: number,
  max: number,
  grace = DEFAULT_TIMER_GRACE_SECONDS,
) {
  return {
    green: min,
    yellow: Math.floor((min + max) / 2),
    red: max,
    qualifiesFrom: min - grace,
    qualifiesTo: max + grace,
  };
}
