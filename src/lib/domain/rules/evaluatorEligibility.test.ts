import { describe, expect, it } from "vitest";
import { evaluatorEligibility } from "./evaluatorEligibility";

const ev = (id: string, currentLevel: number) => ({ id, currentLevel });
const sp = (id: string, level: number) => ({ id, level });

describe("R-03 evaluatorEligibility", () => {
  it("L2 speaker + L3 evaluator is ok", () => {
    expect(evaluatorEligibility(ev("a", 3), sp("b", 2))).toEqual({ ok: true });
  });
  it("L2 speaker + L2 evaluator is not ok, needs 3", () => {
    expect(evaluatorEligibility(ev("a", 2), sp("b", 2))).toEqual({
      ok: false,
      reason: "LEVEL",
      required: 3,
    });
  });
  it("L5 speaker + L4 evaluator is not ok; L5 evaluator is ok (cap at 5)", () => {
    expect(evaluatorEligibility(ev("a", 4), sp("b", 5))).toEqual({
      ok: false,
      reason: "LEVEL",
      required: 5,
    });
    expect(evaluatorEligibility(ev("a", 5), sp("b", 5))).toEqual({ ok: true });
  });
  it("evaluating yourself is not ok", () => {
    expect(evaluatorEligibility(ev("a", 5), sp("a", 1))).toEqual({
      ok: false,
      reason: "SELF",
    });
  });
  // mock-data.md 5.1
  it("seed: Nisha (L3) can evaluate Mohammed (L2); Speaker 2 L1 needs 2; Speaker 3 L2 needs 3", () => {
    expect(evaluatorEligibility(ev("nisha", 3), sp("mohammed", 2)).ok).toBe(
      true,
    );
    expect(evaluatorEligibility(ev("x", 2), sp("lakshmi", 1)).ok).toBe(true);
    expect(evaluatorEligibility(ev("x", 1), sp("lakshmi", 1))).toMatchObject({
      required: 2,
    });
    expect(evaluatorEligibility(ev("x", 2), sp("meera", 2))).toMatchObject({
      required: 3,
    });
  });
});
