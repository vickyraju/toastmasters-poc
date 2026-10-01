import { describe, expect, it } from "vitest";
import { withdrawalCutoff } from "./withdrawalCutoff";

const HOUR = 3_600_000;
const start = new Date("2026-10-02T10:30:00Z");
const at = (msBefore: number) => new Date(start.getTime() - msBefore);
const base = {
  startsAt: start,
  cutoffHours: null,
  hasPendingRequest: false,
  isExComm: false,
};

describe("R-05 withdrawalCutoff", () => {
  it("48 h before: immediate", () => {
    expect(withdrawalCutoff({ ...base, now: at(48 * HOUR) })).toEqual({
      kind: "immediate",
    });
  });
  it("exactly 24 h: immediate", () => {
    expect(withdrawalCutoff({ ...base, now: at(24 * HOUR) })).toEqual({
      kind: "immediate",
    });
  });
  it("23 h 59 m: request", () => {
    expect(withdrawalCutoff({ ...base, now: at(24 * HOUR - 60_000) })).toEqual({
      kind: "request",
    });
  });
  it("duplicate pending request is rejected", () => {
    expect(
      withdrawalCutoff({ ...base, now: at(2 * HOUR), hasPendingRequest: true }),
    ).toEqual({ kind: "duplicate" });
  });
  it("after the meeting started: blocked for members", () => {
    expect(
      withdrawalCutoff({ ...base, now: new Date(start.getTime() + 1) }),
    ).toEqual({
      kind: "blocked",
      reason: "STARTED",
    });
  });
  it("meeting override replaces the club default", () => {
    expect(
      withdrawalCutoff({ ...base, cutoffHours: 48, now: at(30 * HOUR) }),
    ).toEqual({
      kind: "request",
    });
  });
  it("ExComm withdrawals are never delayed", () => {
    expect(
      withdrawalCutoff({ ...base, isExComm: true, now: at(HOUR) }),
    ).toEqual({
      kind: "immediate",
    });
  });
});
