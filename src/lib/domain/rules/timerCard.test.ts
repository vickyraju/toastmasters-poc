import { describe, expect, it } from "vitest";
import { timerCard, timerThresholds } from "./timerCard";

describe("R-04 timerCard (min 300, max 420, grace 30)", () => {
  it.each([
    [300, "green"],
    [359, "green"],
    [360, "yellow"],
    [419, "yellow"],
    [420, "red"],
    [450, "red"],
    [451, "disqualified"],
    [269, "disqualified"],
    [270, "none"],
    [280, "none"],
    [299, "none"],
  ])("%is -> %s", (t, card) => {
    expect(timerCard(t, 300, 420)).toBe(card);
  });
  it("respects a custom grace", () => {
    expect(timerCard(451, 300, 420, 60)).toBe("red");
  });
  it("thresholds for the helper text", () => {
    expect(timerThresholds(300, 420)).toEqual({
      green: 300,
      yellow: 360,
      red: 420,
      qualifiesFrom: 270,
      qualifiesTo: 450,
    });
  });
});
