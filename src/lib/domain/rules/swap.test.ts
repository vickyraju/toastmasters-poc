import { describe, expect, it } from "vitest";
import { validateSwapAccept, validateSwapRequest } from "./swap";

const side = (slotId: string, holderId: string | null, meetingId = "m1") => ({
  slotId,
  holderId,
  meetingId,
});
const ok = {
  meetingStatus: "open" as const,
  requester: side("s1", "vikram"),
  target: side("s2", "aditya"),
  hasPendingSwap: false,
};

describe("R-06 validateSwapRequest", () => {
  it("accepts a normal request (seed: Vikram Timer <-> Aditya Ah-Counter)", () => {
    expect(validateSwapRequest(ok)).toEqual({ ok: true });
  });
  it("works while Finalized", () => {
    expect(validateSwapRequest({ ...ok, meetingStatus: "finalized" })).toEqual({
      ok: true,
    });
  });
  it.each(["draft", "completed", "cancelled"] as const)(
    "rejects status %s",
    (meetingStatus) => {
      expect(validateSwapRequest({ ...ok, meetingStatus })).toEqual({
        ok: false,
        code: "INVALID_STATE",
      });
    },
  );
  it("rejects swapping with yourself", () => {
    expect(
      validateSwapRequest({ ...ok, target: side("s2", "vikram") }),
    ).toMatchObject({
      ok: false,
      code: "SELF",
    });
  });
  it("rejects roles from different meetings", () => {
    expect(
      validateSwapRequest({ ...ok, target: side("s2", "aditya", "m2") }),
    ).toMatchObject({
      ok: false,
      code: "INVALID_STATE",
    });
  });
  it("rejects when the target role is open", () => {
    expect(
      validateSwapRequest({ ...ok, target: side("s2", null) }),
    ).toMatchObject({
      ok: false,
      code: "INVALID_STATE",
    });
  });
  it("only one pending swap per role", () => {
    expect(validateSwapRequest({ ...ok, hasPendingSwap: true })).toMatchObject({
      ok: false,
      code: "DUPLICATE_PENDING",
    });
  });
});

describe("R-06 validateSwapAccept", () => {
  const speaker = {
    isMain: true,
    category: "main" as const,
    label: "Speaker 1",
  };
  const timer = { isMain: false, category: "support" as const, label: "Timer" };
  const evalSlot = (level: number) => ({
    isMain: true,
    category: "main" as const,
    label: "Evaluator 1",
    evaluates: { id: "spk", level },
  });

  it("ok when both stay within R-02 and R-03", () => {
    expect(
      validateSwapAccept({
        a: {
          member: { id: "a", currentLevel: 3 },
          receiving: timer,
          keeping: [speaker],
        },
        b: {
          member: { id: "b", currentLevel: 3 },
          receiving: speaker,
          keeping: [],
        },
      }),
    ).toEqual({ ok: true });
  });
  it("fails R-02: receiving a second main role", () => {
    expect(
      validateSwapAccept({
        a: {
          member: { id: "a", currentLevel: 3 },
          receiving: speaker,
          keeping: [speaker],
        },
        b: {
          member: { id: "b", currentLevel: 3 },
          receiving: timer,
          keeping: [],
        },
      }),
    ).toMatchObject({
      ok: false,
      code: "ALREADY_HAS_MAIN_ROLE",
      memberId: "a",
    });
  });
  it("fails R-03: a level-2 member swapped into an evaluator slot for a level-2 speaker", () => {
    expect(
      validateSwapAccept({
        a: {
          member: { id: "a", currentLevel: 2 },
          receiving: evalSlot(2),
          keeping: [],
        },
        b: {
          member: { id: "b", currentLevel: 4 },
          receiving: speaker,
          keeping: [],
        },
      }),
    ).toMatchObject({ ok: false, code: "NOT_ELIGIBLE", memberId: "a" });
  });
});
