import { describe, expect, it } from "vitest";
import { lifecycleCheck } from "./lifecycle";

const ends = new Date("2026-10-02T12:00:00Z");
const base = {
  hasVenueOrLink: true,
  slotCount: 12,
  openSlots: 0,
  endsAt: ends,
  now: new Date("2026-10-03T00:00:00Z"),
  missingReports: 0,
  reason: null as string | null,
};
const check = (
  from: Parameters<typeof lifecycleCheck>[0]["from"],
  to: Parameters<typeof lifecycleCheck>[0]["to"],
  o = {},
) => lifecycleCheck({ from, to, ...base, ...o });

describe("R-07 lifecycleCheck", () => {
  it("allows the documented transitions", () => {
    expect(check("draft", "open")).toEqual({ ok: true, warnings: [] });
    expect(check("open", "finalized")).toEqual({ ok: true, warnings: [] });
    expect(check("finalized", "open")).toEqual({ ok: true, warnings: [] });
    expect(check("finalized", "completed")).toEqual({ ok: true, warnings: [] });
    for (const from of ["draft", "open", "finalized"] as const) {
      expect(check(from, "cancelled", { reason: "Holiday" })).toEqual({
        ok: true,
        warnings: [],
      });
    }
  });
  it("Open -> Completed is not allowed", () => {
    expect(check("open", "completed")).toEqual({
      ok: false,
      reason: "NOT_ALLOWED",
    });
  });
  it.each([
    ["completed", "open"],
    ["cancelled", "open"],
    ["draft", "finalized"],
    ["draft", "completed"],
    ["completed", "cancelled"],
  ] as const)("%s -> %s is not allowed", (from, to) => {
    expect(check(from, to, { reason: "x" })).toEqual({
      ok: false,
      reason: "NOT_ALLOWED",
    });
  });
  it("Draft -> Open needs a venue or link, and at least one role", () => {
    expect(check("draft", "open", { hasVenueOrLink: false })).toEqual({
      ok: false,
      reason: "NO_VENUE_OR_LINK",
    });
    expect(check("draft", "open", { slotCount: 0 })).toEqual({
      ok: false,
      reason: "NO_ROLES",
    });
  });
  it("Open -> Finalized warns about open roles but allows it", () => {
    expect(check("open", "finalized", { openSlots: 3 })).toEqual({
      ok: true,
      warnings: ["OPEN_ROLES"],
    });
  });
  it("Finalized -> Completed only after ends_at; warns on missing reports", () => {
    expect(
      check("finalized", "completed", {
        now: new Date("2026-10-02T11:59:59Z"),
      }),
    ).toEqual({ ok: false, reason: "NOT_ENDED" });
    expect(check("finalized", "completed", { missingReports: 2 })).toEqual({
      ok: true,
      warnings: ["MISSING_REPORTS"],
    });
  });
  it("Cancel needs a reason", () => {
    expect(check("open", "cancelled", { reason: "  " })).toEqual({
      ok: false,
      reason: "REASON_REQUIRED",
    });
    expect(check("open", "cancelled", { reason: null })).toEqual({
      ok: false,
      reason: "REASON_REQUIRED",
    });
  });
});
