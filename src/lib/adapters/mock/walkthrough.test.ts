// mock-data.md section 9: the acceptance walkthrough, run in order against ONE store, like a person would.
// Step 4 differs from the doc where the docs conflict (see decisions.md M6): Mohammed holds Speaker 1, and
// one main role per meeting (R-02) outranks mock-data.md, so Evaluator 2 is refused; the level rule itself is
// shown passing for a member with no main role.
import { beforeAll, describe, expect, it } from "vitest";
import { createMockServices, createMockStore, type MockStore } from "./index";
import type { Services } from "../../services/interfaces";
import { canOpen } from "../../permissions/routes";

const NOW = Date.parse("2026-10-01T18:00:00+05:30");
const M2 = "mtg-2026-10-02";
const slot = (l: string) => `${M2}:${l}`;
let store: MockStore;
let s: Services;
let clock = NOW;

const asUser = async (id: string) => {
  await s.auth.signOut();
  return s.auth.signIn(id);
};
const codes = async (p: Promise<unknown>) =>
  p.then(
    () => "ok",
    (e: { code: string }) => e.code,
  );
const unread = async () => (await s.notifications.listMine()).unread;

beforeAll(() => {
  store = createMockStore(NOW);
  s = createMockServices({ store, delayMs: 0, clock: () => clock });
});

describe("mock-data.md section 9: demo walkthrough", () => {
  it("1. IL1013: T-01 and T-04, next meeting 2 Oct as Ah-Counter, bell 3; accepting the swap changes both roles, Vikram gets N-16, T-04 goes", async () => {
    await asUser("IL1013");
    expect((await s.tasks.listMine()).map((t) => t.code).sort()).toEqual([
      "T-01",
      "T-04",
    ]);
    expect(await unread()).toBe(3);
    const next = (await s.meetings.list()).find((m) => m.id === M2)!;
    expect(next.myRoles).toEqual(["Ah-Counter"]);
    await s.roles.respondSwap("swp-001", "accept");
    const d = store.getState();
    expect(d.meetingRoles.find((r) => r.id === slot("timer"))?.memberId).toBe(
      "mem-1013",
    );
    expect(
      d.meetingRoles.find((r) => r.id === slot("ah-counter"))?.memberId,
    ).toBe("mem-1007");
    expect(
      d.notifications.some(
        (n) =>
          n.memberId === "mem-1007" &&
          n.code === "N-16" &&
          /accepted/.test(n.title),
      ),
    ).toBe(true);
    expect((await s.tasks.listMine()).some((t) => t.code === "T-04")).toBe(
      false,
    );
  });

  it("2. IL1012 fills in the speech title and project; T-06 disappears", async () => {
    await asUser("IL1012");
    expect((await s.tasks.listMine()).map((t) => t.code)).toEqual(["T-06"]);
    await s.roles.saveSpeakerDetails(slot("speaker-3"), {
      title: "Plan B",
      projectId: "prj-l2",
    });
    expect(await s.tasks.listMine()).toEqual([]);
  });

  it("3. IL1010 tries Evaluator 2 for her own speech: blocked with an explanation", async () => {
    await asUser("IL1010");
    await expect(s.roles.claim(slot("evaluator-2"))).rejects.toMatchObject({
      code: "NOT_ELIGIBLE",
      message: "You cannot evaluate your own speech.",
    });
  });

  it("4. IL1009: Evaluator 3 is blocked on level; Evaluator 2 is blocked only by his own Speaker 1 role (R-02); a member with no main role at level 2 can take it", async () => {
    await asUser("IL1009");
    await expect(s.roles.claim(slot("evaluator-3"))).rejects.toMatchObject({
      code: "NOT_ELIGIBLE",
      message: "You need to be at level 3 or higher to evaluate this speech.",
    });
    await expect(s.roles.claim(slot("evaluator-2"))).rejects.toMatchObject({
      code: "ALREADY_HAS_MAIN_ROLE",
    });
    await asUser("IL1005"); // Rahul, level 2, no main role on 2 Oct
    expect(await codes(s.roles.claim(slot("evaluator-2")))).toBe("ok");
  });

  it("5. IL1002 (VPE): verifies Ananya's Level 3 (level 4, N-10) and approves Nisha's withdrawal (slot opens, N-17)", async () => {
    await asUser("IL1002");
    await s.progress.decide("cmp-001", "verify");
    await s.roles.decideWithdrawal("wdr-001", "approve");
    const d = store.getState();
    expect(d.members.find((m) => m.id === "mem-1008")?.currentLevel).toBe(4);
    expect(
      d.notifications.some(
        (n) => n.memberId === "mem-1008" && n.code === "N-10",
      ),
    ).toBe(true);
    expect(
      d.meetingRoles.find((r) => r.id === slot("evaluator-1"))?.status,
    ).toBe("open");
    expect(
      d.notifications.some(
        (n) => n.memberId === "mem-1014" && n.code === "N-17",
      ),
    ).toBe(true);
  });

  it("6. IL1004 casts a vote: turnout 5/7, results not shown", async () => {
    await asUser("IL1004");
    await s.votes.cast("vote-001", "vote-001:yes");
    const v = await s.votes.get("vote-001");
    expect(v.turnout).toEqual({ cast: 5, eligible: 7 });
    expect(v.view).toEqual({
      status: "open",
      turnout: { cast: 5, eligible: 7 },
    });
  });

  it("7. IL1001 closes the vote: results appear for voters; S-13 lists the seven positions; names the next President", async () => {
    await asUser("IL1001");
    await s.votes.close("vote-001");
    const v = await s.votes.get("vote-001");
    expect(v.view.status).toBe("closed");
    if (v.view.status === "closed")
      expect(v.view.results.reduce((n, r) => n + r.count, 0)).toBe(5);
    const p = await s.positions.list();
    expect(p.items.filter((i) => i.memberId)).toHaveLength(7);
    await s.positions.setNextPresident("mem-1002");
    expect((await s.positions.list()).nextPresidentName).toBe("Priya Raman");
  });

  it("8. IL1003: completing 25 Sep warns and lists the missing reports; adds a member; cancels the 16 Oct draft", async () => {
    await asUser("IL1003");
    const preview = await s.meetings.statusPreview(
      "mtg-2026-09-25",
      "completed",
    );
    expect(preview).toMatchObject({
      ok: true,
      warnings: ["MISSING_REPORTS"],
      missingReports: [
        "General Evaluator (Karthik Subramanian)",
        "Timer (Aditya Kulkarni)",
        "Grammarian (Sneha Iyer)",
      ],
    });
    expect(
      (await s.meetings.setStatus("mtg-2026-09-25", "completed")).meeting
        .status,
    ).toBe("completed");
    await s.members.add({
      employeeId: "IL1016",
      name: "Walk Through",
      email: "walk.through@example.com",
      currentLevel: 1,
    } as never);
    expect(
      (await s.members.list()).some((m) => m.employeeId === "IL1016"),
    ).toBe(true);
    await s.meetings.cancel("mtg-2026-10-16", "Venue unavailable");
    expect(
      store.getState().meetings.find((m) => m.id === "mtg-2026-10-16")?.status,
    ).toBe("cancelled");
  });

  it("9. jumping to 2 Oct 4:00 PM plus 90 minutes gives 2 Oct's report-role holders T-01 and N-06", async () => {
    clock = Date.parse("2026-10-02T17:31:00+05:30");
    await s.dev.tick();
    const d = store.getState();
    const holders = d.meetingRoles.filter(
      (r) =>
        r.meetingId === M2 &&
        r.memberId &&
        ["timer", "ah-counter", "grammarian", "ttm", "ge"].some((k) =>
          r.id.endsWith(`:${k}`),
        ),
    );
    expect(holders.length).toBeGreaterThan(0);
    for (const r of holders) {
      expect(
        d.tasks.some((t) => t.code === "T-01" && t.refId === r.id && !t.doneAt),
      ).toBe(true);
      expect(
        d.notifications.some(
          (n) =>
            n.code === "N-06" &&
            n.memberId === r.memberId &&
            n.link.includes(M2),
        ),
      ).toBe(true);
    }
  });

  it("10. a Member visiting /audit gets G-05: the route is not theirs and the service refuses; the attempt is logged", async () => {
    const user = await asUser("IL1009");
    expect(
      canOpen(
        { id: user.id, accountType: user.accountType, position: user.position },
        "/audit",
      ),
    ).toBe(false);
    expect(await codes(s.audit.list())).toBe("FORBIDDEN");
    await s.audit.recordDenied("/audit");
    await asUser("IL1003");
    expect(
      (await s.audit.list({ action: "permission.denied" }))[0],
    ).toMatchObject({ actorName: "Mohammed Faisal", target: "/audit" });
  });
});
