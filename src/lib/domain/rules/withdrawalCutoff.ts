import { DEFAULT_WITHDRAWAL_CUTOFF_HOURS } from "../constants";

export type WithdrawalDecision =
  | { kind: "immediate" }
  | { kind: "request" }
  | { kind: "duplicate" }
  | { kind: "blocked"; reason: "STARTED" };

const HOUR_MS = 3_600_000;

/** R-05. `cutoffHours` is the meeting override; null uses the club default. */
export function withdrawalCutoff(input: {
  startsAt: Date;
  now: Date;
  cutoffHours: number | null;
  clubDefaultHours?: number;
  hasPendingRequest: boolean;
  isExComm: boolean;
}): WithdrawalDecision {
  if (input.isExComm) return { kind: "immediate" };
  const msUntilStart = input.startsAt.getTime() - input.now.getTime();
  if (msUntilStart <= 0) return { kind: "blocked", reason: "STARTED" };
  const cutoff =
    input.cutoffHours ??
    input.clubDefaultHours ??
    DEFAULT_WITHDRAWAL_CUTOFF_HOURS;
  if (msUntilStart >= cutoff * HOUR_MS) return { kind: "immediate" };
  return input.hasPendingRequest ? { kind: "duplicate" } : { kind: "request" };
}
