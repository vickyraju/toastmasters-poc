import { describe, expect, it } from "vitest";
import {
  formatMeetingRange,
  formatSeconds,
  istDate,
  istToUtcIso,
  parseMmSs,
} from "./ist";

describe("IST helpers", () => {
  it("istToUtcIso and istDate round-trip across midnight", () => {
    expect(istToUtcIso("2026-10-02", "16:00")).toBe("2026-10-02T10:30:00.000Z");
    expect(istDate("2026-10-01T18:31:00.000Z")).toBe("2026-10-02");
  });
  it("meeting ranges and seconds", () => {
    expect(
      formatMeetingRange(
        "2026-10-02T10:30:00.000Z",
        "2026-10-02T12:00:00.000Z",
      ),
    ).toBe("Fri 2 Oct, 4:00 PM to 5:30 PM IST");
    expect(formatSeconds(300)).toBe("5:00");
    expect(formatSeconds(425)).toBe("7:05");
  });
});

describe("parseMmSs", () => {
  it("parses m:ss and rejects junk", () => {
    expect(parseMmSs("5:20")).toBe(320);
    expect(parseMmSs(" 07:05 ")).toBe(425);
    expect(parseMmSs("0:00")).toBe(0);
    for (const bad of ["", "5", "5:60", "5:2", "a:bc", "-1:00", "5:20:10"])
      expect(parseMmSs(bad)).toBeNull();
  });
});
