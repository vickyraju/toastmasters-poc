import type { RoleCategory } from "../types";

interface HeldRole {
  label: string;
  isMain: boolean;
  category: RoleCategory;
}

export type RoleLimitResult =
  | { ok: true }
  | {
      ok: false;
      code: "ALREADY_HAS_MAIN_ROLE" | "ALREADY_HAS_SUPPORT_ROLE";
      existingLabel: string;
    };

/**
 * R-02: one main role per member per meeting; one support role too [assumption, default].
 * `held` are the member's current slots in that meeting.
 */
export function checkRoleLimits(
  held: HeldRole[],
  candidate: { isMain: boolean; category: RoleCategory },
): RoleLimitResult {
  if (candidate.isMain) {
    const existing = held.find((r) => r.isMain);
    if (existing)
      return {
        ok: false,
        code: "ALREADY_HAS_MAIN_ROLE",
        existingLabel: existing.label,
      };
  }
  if (candidate.category === "support") {
    const existing = held.find((r) => r.category === "support");
    if (existing)
      return {
        ok: false,
        code: "ALREADY_HAS_SUPPORT_ROLE",
        existingLabel: existing.label,
      };
  }
  return { ok: true };
}

/**
 * R-02 optional limit. `history` lists the role codes the member held in each earlier meeting,
 * most recent first. Taking `roleCode` again is blocked once the run reaches `limit`.
 */
export function consecutiveRepeat(
  limit: number | null,
  roleCode: string,
  history: string[][],
): { ok: true } | { ok: false; run: number } {
  if (limit === null) return { ok: true };
  let run = 0;
  for (const codes of history) {
    if (!codes.includes(roleCode)) break;
    run += 1;
  }
  return run >= limit ? { ok: false, run } : { ok: true };
}
