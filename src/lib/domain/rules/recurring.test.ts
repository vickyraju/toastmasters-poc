import { describe, expect, it } from "vitest";
import { recurringDates } from "./recurring";

const NOW = "2026-10-01T12:30:00.000Z"; // Thu 1 Oct, 6:00 PM IST
const friday = {
  weekday: 5,
  startTime: "16:00",
  weeksAhead: 4,
  skipDates: [] as string[],
};
const istDay = (iso: string) =>
  new Date(Date.parse(iso) + 330 * 60_000).toISOString().slice(0, 10);

describe("R-08 recurringDates", () => {
  it("Friday 16:00 IST, 4 weeks ahead from Thu 1 Oct: 2, 9, 16 and 23 Oct", () => {
    const d = recurringDates(friday, NOW);
    expect(d.map(istDay)).toEqual([
      "2026-10-02",
      "2026-10-09",
      "2026-10-16",
      "2026-10-23",
    ]);
    expect(d[0]).toBe("2026-10-02T10:30:00.000Z");
  });
  it("skips holidays", () => {
    expect(
      recurringDates({ ...friday, skipDates: ["2026-10-09"] }, NOW).map(istDay),
    ).toEqual(["2026-10-02", "2026-10-16", "2026-10-23"]);
  });
  it("today counts only if the start time is still ahead", () => {
    const fri = "2026-10-02T05:00:00.000Z"; // Fri 10:30 IST
    expect(recurringDates(friday, fri).map(istDay)[0]).toBe("2026-10-02");
    expect(
      recurringDates(friday, "2026-10-02T11:00:00.000Z").map(istDay)[0],
    ).toBe("2026-10-09");
  });
  it("weeksAhead 1 reaches 7 days out; Sunday is weekday 0", () => {
    expect(
      recurringDates({ ...friday, weeksAhead: 1 }, NOW).map(istDay),
    ).toEqual(["2026-10-02"]);
    expect(
      recurringDates(
        { weekday: 0, startTime: "09:00", weeksAhead: 1, skipDates: [] },
        NOW,
      ).map(istDay),
    ).toEqual(["2026-10-04"]);
  });
});
