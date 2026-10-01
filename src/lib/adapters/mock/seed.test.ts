import { describe, expect, it } from "vitest";
import { createSeed } from "./seed";

const NOW = Date.parse("2026-10-01T18:00:00+05:30");
const d = createSeed(NOW);
const openTasks = (id: string) =>
  d.tasks
    .filter((t) => t.memberId === id && !t.doneAt)
    .map((t) => t.code)
    .sort();
const unread = (id: string) =>
  d.notifications.filter((n) => n.memberId === id && !n.readAt);

describe("seed (mock-data.md)", () => {
  it("has 15 members plus one removed; Ganesh is inactive", () => {
    expect(d.members).toHaveLength(16);
    expect(d.members.find((m) => m.employeeId === "IL1015")?.status).toBe(
      "inactive",
    );
    expect(d.members.find((m) => m.employeeId === "IL1099")?.status).toBe(
      "removed",
    );
  });
  it("has the eight meetings with the stated statuses", () => {
    expect(d.meetings.map((m) => [m.id, m.status])).toEqual([
      ["mtg-2026-09-11", "cancelled"],
      ["mtg-2026-09-18", "completed"],
      ["mtg-2026-09-25", "finalized"],
      ["mtg-2026-10-02", "open"],
      ["mtg-2026-10-09", "open"],
      ["mtg-2026-10-16", "draft"],
      ["mtg-2026-10-23", "draft"],
      ["mtg-2026-10-31", "draft"],
    ]);
  });
  it("2 Oct: 12 slots, 9 filled; Evaluator 2, Evaluator 3, Grammarian open (5.1)", () => {
    const s = d.meetingRoles.filter((r) => r.meetingId === "mtg-2026-10-02");
    expect(s).toHaveLength(12);
    expect(s.filter((r) => r.memberId)).toHaveLength(9);
    expect(
      s
        .filter((r) => !r.memberId)
        .map((r) => r.label)
        .sort(),
    ).toEqual(["Evaluator 2", "Evaluator 3", "Grammarian"]);
  });
  it("9 Oct: 3 of 12 filled; 31 Oct has 9 slots, none filled", () => {
    expect(
      d.meetingRoles.filter(
        (r) => r.meetingId === "mtg-2026-10-09" && r.memberId,
      ),
    ).toHaveLength(3);
    const c = d.meetingRoles.filter((r) => r.meetingId === "mtg-2026-10-31");
    expect(c).toHaveLength(9);
    expect(c.every((r) => !r.memberId)).toBe(true);
  });
  it("no member holds two main roles in a meeting", () => {
    for (const m of d.meetings) {
      const mains = d.meetingRoles
        .filter((r) => r.meetingId === m.id && r.isMain && r.memberId)
        .map((r) => r.memberId);
      expect(new Set(mains).size).toBe(mains.length);
    }
  });
  it("tasks per persona (section 7)", () => {
    expect(openTasks("mem-1013")).toEqual(["T-01", "T-04"]);
    expect(openTasks("mem-1012")).toEqual(["T-06"]);
    expect(openTasks("mem-1002")).toEqual(["T-02", "T-03", "T-08"]);
    expect(openTasks("mem-1004")).toEqual(["T-02", "T-05", "T-08"]);
    expect(openTasks("mem-1006")).toEqual(["T-01", "T-02", "T-08"]);
    expect(openTasks("mem-1003")).toEqual(["T-01", "T-02", "T-08"]);
    expect(openTasks("mem-1005")).toEqual(["T-02", "T-05", "T-08"]);
    expect(openTasks("mem-1011")).toEqual([]);
  });
  it("Aditya has exactly 3 unread notifications: N-16, N-06, N-14 (walkthrough step 1)", () => {
    expect(
      unread("mem-1013")
        .map((n) => n.code)
        .sort(),
    ).toEqual(["N-06", "N-14", "N-16"]);
  });
  it("Priya: N-09 and N-15 unread, N-12 read", () => {
    expect(
      unread("mem-1002")
        .map((n) => n.code)
        .sort(),
    ).toEqual(["N-09", "N-15"]);
    expect(
      d.notifications.find(
        (n) => n.memberId === "mem-1002" && n.code === "N-12",
      )?.readAt,
    ).not.toBeNull();
  });
  it("votes: vote-001 open 4 of 7 cast; vote-000 closed 4/2/1; ballots carry no member id", () => {
    expect(
      d.voteParticipation.filter((p) => p.voteId === "vote-001"),
    ).toHaveLength(4);
    expect(d.voteEligible.filter((e) => e.voteId === "vote-001")).toHaveLength(
      7,
    );
    const closed = d.voteBallots.filter((b) => b.voteId === "vote-000");
    expect(
      ["yes", "no", "abstain"].map(
        (o) => closed.filter((b) => b.optionId === `vote-000:${o}`).length,
      ),
    ).toEqual([4, 2, 1]);
    for (const b of d.voteBallots)
      expect(Object.keys(b).sort()).toEqual(["id", "optionId", "voteId"]);
  });
  it("18 Sep timer report shows green, yellow, red, disqualified", () => {
    const r = d.reports.find(
      (x) => x.meetingRoleId === "mtg-2026-09-18:timer",
    )!;
    expect(
      (r.payload as { rows: { card: string }[] }).rows.map((x) => x.card),
    ).toEqual(["green", "yellow", "red", "disqualified"]);
  });
});
