import { describe, expect, it } from "vitest";
import { addMonths, monthGrid, monthOf } from "./calendar";

describe("monthGrid (Monday first, IST calendar dates)", () => {
  it("Oct 2026 starts on Thursday: three blanks, 31 days, whole weeks", () => {
    const weeks = monthGrid("2026-10");
    expect(weeks[0]).toEqual([
      null,
      null,
      null,
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks.at(-1)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      null,
    ]);
  });
  it("Feb 2028 is a leap month", () => {
    expect(monthGrid("2028-02").flat().filter(Boolean)).toHaveLength(29);
  });
  it("monthOf reads the IST month; addMonths wraps years", () => {
    expect(monthOf("2026-09-30T19:00:00.000Z")).toBe("2026-10"); // 1 Oct 00:30 IST
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });
});
