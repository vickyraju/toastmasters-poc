import { describe, expect, it } from "vitest";
import {
  ahCounterPayload,
  grammarianPayload,
  memberInput,
  meetingInput,
  startVoteInput,
  summaryPayload,
  timerPayload,
} from "./schemas";

const now = new Date("2026-10-01T12:30:00Z");

describe("report payloads", () => {
  it("timer rows carry a card", () => {
    expect(
      timerPayload.safeParse({
        rows: [{ speakerSlotId: "s", seconds: 310, card: "green" }],
      }).success,
    ).toBe(true);
    expect(
      timerPayload.safeParse({
        rows: [{ speakerSlotId: "s", seconds: -1, card: "green" }],
      }).success,
    ).toBe(false);
    expect(
      timerPayload.safeParse({
        rows: [{ speakerSlotId: "s", seconds: 1, card: "purple" }],
      }).success,
    ).toBe(false);
  });
  it("ah-counter, grammarian and summary shapes", () => {
    expect(
      ahCounterPayload.safeParse({
        rows: [
          { memberId: "m", total: 13, breakdown: { um: 6, so: 4, like: 3 } },
        ],
      }).success,
    ).toBe(true);
    expect(
      grammarianPayload.safeParse({
        wordOfDayUsage: [{ memberId: "m", count: 2 }],
        goodLanguage: "x",
        improvements: "y",
      }).success,
    ).toBe(true);
    expect(summaryPayload.safeParse({ summary: "ok" }).success).toBe(true);
    expect(summaryPayload.safeParse({}).success).toBe(false);
  });
});

describe("R-13 startVoteInput(now)", () => {
  const schema = startVoteInput(now);
  const ok = {
    title: "Move meetings to 5 PM?",
    description: "",
    options: ["Yes", "No", "Abstain"],
  };
  it("accepts the default Yes/No/Abstain", () =>
    expect(schema.safeParse(ok).success).toBe(true));
  it("title 3 to 120 chars", () => {
    expect(schema.safeParse({ ...ok, title: "ab" }).success).toBe(false);
    expect(schema.safeParse({ ...ok, title: "x".repeat(121) }).success).toBe(
      false,
    );
  });
  it("description up to 1000", () => {
    expect(
      schema.safeParse({ ...ok, description: "x".repeat(1001) }).success,
    ).toBe(false);
  });
  it("2 to 6 options", () => {
    expect(schema.safeParse({ ...ok, options: ["Yes"] }).success).toBe(false);
    expect(
      schema.safeParse({ ...ok, options: ["a", "b", "c", "d", "e", "f", "g"] })
        .success,
    ).toBe(false);
  });
  it("deadline must be in the future", () => {
    expect(
      schema.safeParse({ ...ok, deadlineAt: "2026-10-01T12:00:00Z" }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...ok, deadlineAt: "2026-10-02T12:00:00Z" }).success,
    ).toBe(true);
  });
});

describe("R-15 meetingInput(now)", () => {
  const schema = meetingInput(now);
  const ok = {
    title: "Regular Meeting",
    meetingTypeId: "t",
    startsAt: "2026-10-09T10:30:00Z",
    endsAt: "2026-10-09T12:00:00Z",
  };
  it("accepts a valid future meeting", () =>
    expect(schema.safeParse(ok).success).toBe(true));
  it("ends_at must be after starts_at", () => {
    expect(schema.safeParse({ ...ok, endsAt: ok.startsAt }).success).toBe(
      false,
    );
  });
  it("cannot span more than 12 hours", () => {
    expect(
      schema.safeParse({ ...ok, endsAt: "2026-10-09T22:31:00Z" }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ ...ok, endsAt: "2026-10-09T22:30:00Z" }).success,
    ).toBe(true);
  });
  it("past meetings are blocked by default [default]", () => {
    expect(
      schema.safeParse({
        ...ok,
        startsAt: "2026-09-01T10:00:00Z",
        endsAt: "2026-09-01T11:00:00Z",
      }).success,
    ).toBe(false);
  });
  it("title max 120", () =>
    expect(schema.safeParse({ ...ok, title: "x".repeat(121) }).success).toBe(
      false,
    ));
});

describe("memberInput", () => {
  it("uppercases employee id, lowercases email, trims", () => {
    const r = memberInput.parse({
      employeeId: " il1009 ",
      name: " Mohammed Faisal ",
      email: "Mohammed@Example.COM",
    });
    expect(r).toMatchObject({
      employeeId: "IL1009",
      name: "Mohammed Faisal",
      email: "mohammed@example.com",
    });
  });
  it("name max 80 and email must be valid", () => {
    expect(
      memberInput.safeParse({
        employeeId: "IL1",
        name: "x".repeat(81),
        email: "a@b.co",
      }).success,
    ).toBe(false);
    expect(
      memberInput.safeParse({ employeeId: "IL1", name: "A", email: "nope" })
        .success,
    ).toBe(false);
  });
});
