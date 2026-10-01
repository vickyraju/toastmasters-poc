import { describe, expect, it } from "vitest";
import { checkRoleLimits, consecutiveRepeat } from "./roleLimits";

const held = (
  label: string,
  isMain: boolean,
  category: "main" | "support" | "report",
) => ({
  label,
  isMain,
  category,
});

describe("R-02 checkRoleLimits", () => {
  it("blocks a second main role, naming the existing role", () => {
    const r = checkRoleLimits([held("Speaker 1", true, "main")], {
      isMain: true,
      category: "main",
    });
    expect(r).toEqual({
      ok: false,
      code: "ALREADY_HAS_MAIN_ROLE",
      existingLabel: "Speaker 1",
    });
  });
  it("allows a support role next to a main role", () => {
    expect(
      checkRoleLimits([held("Speaker 1", true, "main")], {
        isMain: false,
        category: "support",
      }),
    ).toEqual({ ok: true });
  });
  it("blocks a second support role", () => {
    const r = checkRoleLimits([held("Timer", false, "support")], {
      isMain: false,
      category: "support",
    });
    expect(r).toEqual({
      ok: false,
      code: "ALREADY_HAS_SUPPORT_ROLE",
      existingLabel: "Timer",
    });
  });
  it("allows the first role", () => {
    expect(checkRoleLimits([], { isMain: true, category: "main" })).toEqual({
      ok: true,
    });
  });
});

describe("R-02 consecutiveRepeat (optional)", () => {
  const history = [["timer"], ["timer"], ["speaker"]]; // most recent first
  it("off (null) never blocks", () => {
    expect(consecutiveRepeat(null, "timer", history)).toEqual({ ok: true });
  });
  it("limit 2: blocked after two in a row", () => {
    expect(consecutiveRepeat(2, "timer", history)).toEqual({
      ok: false,
      run: 2,
    });
  });
  it("limit 3: still ok", () => {
    expect(consecutiveRepeat(3, "timer", history)).toEqual({ ok: true });
  });
  it("a gap resets the run", () => {
    expect(
      consecutiveRepeat(2, "timer", [["timer"], ["speaker"], ["timer"]]),
    ).toEqual({ ok: true });
  });
});
