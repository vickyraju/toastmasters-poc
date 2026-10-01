import { MAX_LEVEL } from "../constants";

export type EligibilityResult =
  | { ok: true }
  | { ok: false; reason: "SELF" }
  | { ok: false; reason: "LEVEL"; required: number };

/** R-03: the evaluator has completed the speaker's level or is in the next one (cap 5). */
export function evaluatorEligibility(
  evaluator: { id: string; currentLevel: number },
  speaker: { id: string; level: number },
): EligibilityResult {
  if (evaluator.id === speaker.id) return { ok: false, reason: "SELF" };
  const required = Math.min(speaker.level + 1, MAX_LEVEL);
  return evaluator.currentLevel >= required
    ? { ok: true }
    : { ok: false, reason: "LEVEL", required };
}
