import { describe, expect, it } from "vitest";
import { nextLevelOnVerify, validateLevelLog } from "./levels";

describe("R-11 nextLevelOnVerify", () => {
  it("moves up one level", () => expect(nextLevelOnVerify(3, 3)).toBe(4));
  it("seed: Ananya L3 verified becomes 4", () =>
    expect(nextLevelOnVerify(3, 3)).toBe(4));
  it("caps at 5", () => expect(nextLevelOnVerify(5, 5)).toBe(5));
  it("never moves a member backwards", () =>
    expect(nextLevelOnVerify(4, 2)).toBe(4));
});

describe("R-11 validateLevelLog", () => {
  const base = {
    currentLevel: 3,
    level: 3,
    completedOn: "2026-09-28",
    today: "2026-10-01",
    hasPendingForLevel: false,
    proofRequired: false,
    hasProof: false,
  };
  it("accepts a level at the current level", () => {
    expect(validateLevelLog(base)).toEqual({ ok: true });
  });
  it("rejects a level above current", () => {
    expect(validateLevelLog({ ...base, level: 4 })).toEqual({
      ok: false,
      code: "LEVEL_ABOVE_CURRENT",
    });
  });
  it("rejects the same level twice while pending", () => {
    expect(validateLevelLog({ ...base, hasPendingForLevel: true })).toEqual({
      ok: false,
      code: "DUPLICATE_PENDING",
    });
  });
  it("rejects a future date; today is fine", () => {
    expect(validateLevelLog({ ...base, completedOn: "2026-10-02" })).toEqual({
      ok: false,
      code: "FUTURE_DATE",
    });
    expect(validateLevelLog({ ...base, completedOn: "2026-10-01" })).toEqual({
      ok: true,
    });
  });
  it("proof is optional unless proofRequired", () => {
    expect(validateLevelLog({ ...base, proofRequired: true })).toEqual({
      ok: false,
      code: "PROOF_REQUIRED",
    });
    expect(
      validateLevelLog({ ...base, proofRequired: true, hasProof: true }),
    ).toEqual({ ok: true });
  });
});
