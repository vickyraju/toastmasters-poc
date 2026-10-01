import { MAX_LEVEL } from "../constants";

/** R-11: verifying level L sets current_level = min(L + 1, 5), never moving a member backwards. */
export function nextLevelOnVerify(
  currentLevel: number,
  completedLevel: number,
): number {
  return completedLevel >= currentLevel
    ? Math.min(completedLevel + 1, MAX_LEVEL)
    : currentLevel;
}

export type LevelLogResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "LEVEL_ABOVE_CURRENT"
        | "DUPLICATE_PENDING"
        | "FUTURE_DATE"
        | "PROOF_REQUIRED";
    };

/** R-11 checks for logging a level completion. Dates are `YYYY-MM-DD` (IST today from the caller). */
export function validateLevelLog(input: {
  currentLevel: number;
  level: number;
  completedOn: string;
  today: string;
  hasPendingForLevel: boolean;
  proofRequired: boolean;
  hasProof: boolean;
}): LevelLogResult {
  if (input.level > input.currentLevel)
    return { ok: false, code: "LEVEL_ABOVE_CURRENT" };
  if (input.hasPendingForLevel) return { ok: false, code: "DUPLICATE_PENDING" };
  if (input.completedOn > input.today)
    return { ok: false, code: "FUTURE_DATE" };
  if (input.proofRequired && !input.hasProof)
    return { ok: false, code: "PROOF_REQUIRED" };
  return { ok: true };
}
