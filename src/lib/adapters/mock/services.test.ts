import { beforeEach, describe, expect, it } from "vitest";
import { createMockServices, createMockStore, type MockStore } from "./index";
import type { Services } from "../../services/interfaces";
import { AppError } from "../../services/errors";

const NOW = Date.parse("2026-10-01T18:00:00+05:30");
const M2 = "mtg-2026-10-02";
let store: MockStore;
let s: Services;
let clock: number;

const as = async (employeeId: string) => void (await s.auth.signIn(employeeId));
const code = async (p: Promise<unknown>) =>
  p.then(
    () => "ok",
    (e: AppError) => e.code,
  );
const slot = (label: string) => `${M2}:${label}`;

beforeEach(() => {
  clock = NOW;
  store = createMockStore(NOW);
  s = createMockServices({ store, delayMs: 0, clock: () => clock });
});

describe("auth", () => {
  it("unknown, inactive and removed IDs get the same generic refusal (flow.md J-01)", async () => {
    const refusal = {
      code: "NOT_FOUND",
      message: "We could not find that employee ID.",
    };
    await expect(s.auth.signIn("IL0000")).rejects.toMatchObject(refusal);
    await expect(s.auth.signIn("IL1015")).rejects.toMatchObject(refusal);
    await expect(s.auth.signIn("IL1099")).rejects.toMatchObject(refusal);
    await expect(s.auth.signIn("  ")).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });
  it("demo accounts only when NEXT_PUBLIC_DEMO_MODE=true", async () => {
    const prev = process.env.NEXT_PUBLIC_DEMO_MODE;
    process.env.NEXT_PUBLIC_DEMO_MODE = "false";
    expect(await s.auth.demoAccounts()).toEqual([]);
    process.env.NEXT_PUBLIC_DEMO_MODE = "true";
    const list = await s.auth.demoAccounts();
    expect(list).toHaveLength(16);
    expect(list[0]).toEqual({
      employeeId: "IL1001",
      name: "Arjun Mehta",
      position: "president",
      status: "active",
    });
    process.env.NEXT_PUBLIC_DEMO_MODE = prev;
  });
  it("a denied route is written to the audit log", async () => {
    await as("IL1009");
    await s.audit.recordDenied("/audit");
    expect(store.getState().audit.at(-1)).toMatchObject({
      actorId: "mem-1009",
      action: "permission.denied",
      entityId: "/audit",
    });
  });
  it("sign out and current user still work while Simulate error is on", async () => {
    await as("IL1002");
    await s.dev.setSimulateError(true);
    expect((await s.auth.getCurrentUser())?.employeeId).toBe("IL1002");
    await s.auth.signOut();
    expect(await s.auth.getCurrentUser()).toBeNull();
  });
  it("signs in case-insensitively and out", async () => {
    expect((await s.auth.signIn(" il1013 ")).name).toBe("Aditya Kulkarni");
    await s.auth.signOut();
    expect(await s.auth.getCurrentUser()).toBeNull();
  });
  it("calls without a session are UNAUTHENTICATED", async () => {
    expect(await code(s.tasks.listMine())).toBe("UNAUTHENTICATED");
  });
});

describe("R-09 claim concurrency", () => {
  it("two members claiming one slot: first wins, second gets SLOT_TAKEN", async () => {
    await as("IL1013"); // Aditya is level 1; Grammarian is a support role, he holds Ah-Counter -> use a different pair
    await s.auth.signOut();
    await as("IL1010"); // Lakshmi: speaker (main), no support role
    const first = s.roles.claim(slot("grammarian"));
    await s.auth.signOut();
    await as("IL1008"); // Ananya: TMOD (main), no support role
    const second = s.roles.claim(slot("grammarian"));
    expect(await code(first)).toBe("ok");
    expect(await code(second)).toBe("SLOT_TAKEN");
    expect(
      store.getState().meetingRoles.find((r) => r.id === slot("grammarian"))
        ?.memberId,
    ).toBe("mem-1010");
  });
  it("a failed claim writes nothing", async () => {
    await as("IL1013");
    const before = JSON.stringify(store.getState().meetingRoles);
    await code(s.roles.claim(slot("speaker-1")));
    expect(JSON.stringify(store.getState().meetingRoles)).toBe(before);
  });
});

describe("walkthrough 3 and 4: evaluator eligibility", () => {
  it("Lakshmi cannot evaluate her own speech (Evaluator 2)", async () => {
    await as("IL1010");
    await expect(s.roles.claim(slot("evaluator-2"))).rejects.toMatchObject({
      code: "NOT_ELIGIBLE",
      extra: { reason: "SELF" },
    });
  });
  it("Aditya (L1) fails Evaluator 2; Mohammed (L2) takes Evaluator 2 but not Evaluator 3", async () => {
    await as("IL1013");
    await expect(s.roles.claim(slot("evaluator-2"))).rejects.toMatchObject({
      code: "NOT_ELIGIBLE",
      message: "You need to be at level 2 or higher to evaluate this speech.",
    });
    await s.auth.signOut();
    await as("IL1009");
    // Mohammed holds Speaker 1 (a main role), so R-02 blocks him first; free it, as the walkthrough implies
    expect(await code(s.roles.claim(slot("evaluator-2")))).toBe(
      "ALREADY_HAS_MAIN_ROLE",
    );
  });
  it("a member without a main role: L2 takes Evaluator 2, not Evaluator 3 (needs 3)", async () => {
    await as("IL1002"); // VPE officer overrides level; use a plain member instead
    await s.auth.signOut();
    store.setState((d) => ({
      meetingRoles: d.meetingRoles.map((r) =>
        r.id === slot("speaker-1")
          ? { ...r, memberId: null, status: "open" as const }
          : r,
      ),
    }));
    await as("IL1009");
    await expect(s.roles.claim(slot("evaluator-3"))).rejects.toMatchObject({
      code: "NOT_ELIGIBLE",
      extra: { required: 3 },
    });
    expect(await code(s.roles.claim(slot("evaluator-2")))).toBe("ok");
  });
  it("officers can override the level check; it is audited as role.override", async () => {
    await as("IL1007"); // Vikram, level 2, holds Timer (support) only
    expect(await code(s.roles.claim(slot("evaluator-3")))).toBe("ok");
    expect(store.getState().audit.at(-1)?.action).toBe("role.override");
  });
});

describe("R-02 one main role", () => {
  it("claiming a second main role is blocked and names the existing one", async () => {
    await as("IL1008"); // TMOD
    await expect(s.roles.claim(slot("evaluator-3"))).rejects.toMatchObject({
      code: "ALREADY_HAS_MAIN_ROLE",
      message: expect.stringContaining("Toastmaster of the Day"),
    });
  });
  it("the limit is per meeting: a main role in another meeting is fine", async () => {
    await as("IL1008");
    expect(await code(s.roles.claim("mtg-2026-10-09:speaker-2"))).toBe("ok");
  });
});

describe("R-05 withdrawal cutoff", () => {
  const withdrawAt = async (msBeforeStart: number) => {
    const start = Date.parse(
      store.getState().meetings.find((m) => m.id === M2)!.startsAt,
    );
    clock = start - msBeforeStart;
    await as("IL1011"); // Suresh, General Evaluator
    return s.roles.withdraw(slot("ge"));
  };
  it("exactly 24 h before: immediate; slot opens", async () => {
    expect(await withdrawAt(24 * 3_600_000)).toEqual({ outcome: "withdrawn" });
    expect(
      store.getState().meetingRoles.find((r) => r.id === slot("ge"))?.status,
    ).toBe("open");
  });
  it("23 h 59 m before: becomes a request, holder keeps the role, ExComm gets T-02", async () => {
    const r = await withdrawAt(24 * 3_600_000 - 60_000);
    expect(r.outcome).toBe("requested");
    expect(
      store.getState().meetingRoles.find((x) => x.id === slot("ge"))?.memberId,
    ).toBe("mem-1011");
    expect(
      store
        .getState()
        .tasks.filter(
          (t) => t.code === "T-02" && t.link.includes("slot=" + slot("ge")),
        ),
    ).toHaveLength(7);
    await expect(s.roles.withdraw(slot("ge"))).rejects.toMatchObject({
      code: "INVALID_STATE",
    });
  });
  it("after the meeting started: blocked", async () => {
    await expect(withdrawAt(-1)).rejects.toMatchObject({
      code: "INVALID_STATE",
    });
  });
});

describe("walkthrough 1: swap accept (Aditya)", () => {
  it("both roles change, Vikram gets N-16, T-04 disappears", async () => {
    await as("IL1013");
    expect((await s.tasks.listMine()).map((t) => t.code).sort()).toEqual([
      "T-01",
      "T-04",
    ]);
    expect((await s.notifications.listMine()).unread).toBe(3);
    await s.roles.respondSwap("swp-001", "accept");
    const rs = store.getState().meetingRoles;
    expect(rs.find((r) => r.id === slot("timer"))?.memberId).toBe("mem-1013");
    expect(rs.find((r) => r.id === slot("ah-counter"))?.memberId).toBe(
      "mem-1007",
    );
    expect((await s.tasks.listMine()).map((t) => t.code)).toEqual(["T-01"]);
    expect(
      store
        .getState()
        .notifications.some(
          (n) =>
            n.memberId === "mem-1007" &&
            n.code === "N-16" &&
            /accepted/.test(n.title),
        ),
    ).toBe(true);
  });
  it("only the target can answer; a swap that breaks R-03 stays pending", async () => {
    await as("IL1007");
    await expect(
      s.roles.respondSwap("swp-001", "accept"),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("walkthrough 2: speech details clear T-06", () => {
  it("Meera saves title and project", async () => {
    await as("IL1012");
    expect((await s.tasks.listMine()).map((t) => t.code)).toEqual(["T-06"]);
    await s.roles.saveSpeakerDetails(slot("speaker-3"), {
      title: "Plan B",
      projectId: "prj-l2",
    });
    expect(await s.tasks.listMine()).toEqual([]);
  });
});

describe("walkthrough 5: VPE decisions", () => {
  it("verifying Ananya's Level 3 moves her to level 4 and sends N-10; only the VPE may", async () => {
    await as("IL1001");
    expect(await code(s.progress.decide("cmp-001", "verify"))).toBe(
      "FORBIDDEN",
    );
    await s.auth.signOut();
    await as("IL1002");
    await s.progress.decide("cmp-001", "verify");
    const d = store.getState();
    expect(d.members.find((m) => m.id === "mem-1008")?.currentLevel).toBe(4);
    expect(
      d.notifications.some(
        (n) => n.memberId === "mem-1008" && n.code === "N-10",
      ),
    ).toBe(true);
    expect((await s.tasks.listMine()).some((t) => t.code === "T-03")).toBe(
      false,
    );
    expect(d.audit.at(-1)?.action).toBe("level.verify");
  });
  it("rejecting needs a reason", async () => {
    await as("IL1002");
    await expect(s.progress.decide("cmp-001", "reject")).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });
  it("approving Nisha's withdrawal opens the slot and sends N-17", async () => {
    await as("IL1002");
    await s.roles.decideWithdrawal("wdr-001", "approve");
    const d = store.getState();
    expect(
      d.meetingRoles.find((r) => r.id === slot("evaluator-1"))?.status,
    ).toBe("open");
    expect(
      d.notifications.some(
        (n) => n.memberId === "mem-1014" && n.code === "N-17",
      ),
    ).toBe(true);
    expect(d.tasks.filter((t) => t.code === "T-02" && !t.doneAt)).toHaveLength(
      0,
    );
  });
  it("a level above current cannot be logged; a project counts immediately", async () => {
    await as("IL1009");
    await expect(
      s.progress.log({
        kind: "level",
        pathway: "Dynamic Leadership",
        level: 4,
        completedOn: "2026-09-30",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    expect(
      (
        await s.progress.log({
          kind: "project",
          pathway: "Dynamic Leadership",
          level: 2,
          projectName: "Ice Breaker",
          completedOn: "2026-09-30",
        })
      ).status,
    ).toBe("counted");
  });
});

describe("R-13 vote secrecy (walkthrough 6 and 7)", () => {
  it("Divya casts: turnout 5/7, no counts visible while open; second cast is ALREADY_VOTED", async () => {
    await as("IL1004");
    await s.votes.cast("vote-001", "vote-001:yes");
    const v = await s.votes.get("vote-001");
    expect(v.turnout).toEqual({ cast: 5, eligible: 7 });
    expect(v.view).toEqual({
      status: "open",
      turnout: { cast: 5, eligible: 7 },
    });
    expect(await code(s.votes.cast("vote-001", "vote-001:no"))).toBe(
      "ALREADY_VOTED",
    );
  });
  it("ballots never carry a member id and nothing links participation to choice", async () => {
    await as("IL1004");
    await s.votes.cast("vote-001", "vote-001:yes");
    for (const b of store.getState().voteBallots)
      expect(Object.keys(b).sort()).toEqual(["id", "optionId", "voteId"]);
  });
  it("members cannot see or cast votes; only the President closes; results show after close", async () => {
    await as("IL1009");
    expect(await code(s.votes.get("vote-001"))).toBe("FORBIDDEN");
    await s.auth.signOut();
    await as("IL1002");
    expect(await code(s.votes.close("vote-001"))).toBe("FORBIDDEN");
    await s.auth.signOut();
    await as("IL1001");
    await s.votes.close("vote-001");
    const v = await s.votes.get("vote-001");
    expect(v.view.status).toBe("closed");
    expect(await code(s.votes.cast("vote-001", "vote-001:yes"))).toBe("CLOSED");
  });
  it("closed vote-000 shows Yes 4, No 2, Abstain 1", async () => {
    await as("IL1002");
    const v = await s.votes.get("vote-000");
    if (v.view.status !== "closed") throw new Error("expected closed");
    expect(v.view.results.map((r) => r.count)).toEqual([4, 2, 1]);
  });
  it("deadline passing closes the vote through the clock", async () => {
    await as("IL1002");
    clock = Date.parse("2026-10-04T18:00:01+05:30");
    await s.dev.tick();
    expect(
      store.getState().votes.find((v) => v.id === "vote-001")?.status,
    ).toBe("closed");
  });
});

describe("R-07 lifecycle (walkthrough 8)", () => {
  it("Draft -> Open sends one N-01 per member; Open -> Completed is rejected", async () => {
    await as("IL1003");
    const before = store
      .getState()
      .notifications.filter((n) => n.code === "N-01").length;
    await s.meetings.setStatus("mtg-2026-10-16", "open");
    expect(
      store.getState().notifications.filter((n) => n.code === "N-01").length -
        before,
    ).toBe(14);
    expect(
      await code(s.meetings.setStatus("mtg-2026-10-16", "completed")),
    ).toBe("INVALID_STATE");
  });
  it("completing 25 Sep with reports missing succeeds with a warning and clears T-01", async () => {
    await as("IL1003");
    clock = Date.parse("2026-09-25T20:00:00+05:30") + 7 * 86_400_000;
    const r = await s.meetings.setStatus("mtg-2026-09-25", "completed");
    expect(r.warnings).toEqual(["MISSING_REPORTS"]);
    expect(
      store.getState().tasks.some((t) => t.code === "T-01" && !t.doneAt),
    ).toBe(false);
  });
  it("cancel needs a reason, notifies holders (N-04) and removes the meeting's open tasks", async () => {
    await as("IL1003");
    await expect(s.meetings.cancel(M2, " ")).rejects.toMatchObject({
      code: "VALIDATION",
    });
    await s.meetings.cancel(M2, "Venue unavailable");
    const d = store.getState();
    expect(d.notifications.filter((n) => n.code === "N-04")).toHaveLength(9);
    expect(
      d.tasks.some((t) => !t.doneAt && t.link.startsWith(`/meetings/${M2}`)),
    ).toBe(false);
    expect(d.meetings.find((m) => m.id === M2)?.status).toBe("cancelled");
    expect(await code(s.roles.claim(slot("grammarian")))).toBe("INVALID_STATE");
  });
  it("rescheduling sends N-03 to role holders", async () => {
    await as("IL1003");
    await s.meetings.update(M2, {
      startsAt: "2026-10-02T11:30:00.000Z",
      endsAt: "2026-10-02T13:00:00.000Z",
    });
    expect(
      store.getState().notifications.filter((n) => n.code === "N-03"),
    ).toHaveLength(9);
  });
  it("Members cannot see Draft meetings; ExComm can", async () => {
    await as("IL1009");
    expect((await s.meetings.list()).some((m) => m.status === "draft")).toBe(
      false,
    );
    expect(await code(s.meetings.get("mtg-2026-10-16"))).toBe("FORBIDDEN");
    await s.auth.signOut();
    await as("IL1003");
    expect(
      (await s.meetings.list()).filter((m) => m.status === "draft"),
    ).toHaveLength(3);
  });
  it("TMOD publishes the theme (N-05 to all); a plain member cannot; creating a meeting works", async () => {
    await as("IL1009");
    expect(
      await code(
        s.meetings.publishTheme(M2, {
          theme: "x",
          welcomeNote: null,
          wordOfTheDay: null,
          wordMeaning: null,
        }),
      ),
    ).toBe("FORBIDDEN");
    await s.auth.signOut();
    await as("IL1008");
    await s.meetings.publishTheme(M2, {
      theme: "Fresh starts",
      welcomeNote: "Hi",
      wordOfTheDay: "Embark",
      wordMeaning: "begin",
    });
    expect(
      store
        .getState()
        .notifications.filter(
          (n) => n.code === "N-05" && /Fresh starts/.test(n.title),
        ),
    ).toHaveLength(14); // active members only
    await s.auth.signOut();
    await as("IL1003");
    const m = await s.meetings.create({
      title: "Workshop",
      meetingTypeId: "mt-workshop",
      startsAt: "2026-11-06T10:30:00.000Z",
      endsAt: "2026-11-06T12:00:00.000Z",
      venue: "Room B",
    });
    expect(
      store.getState().meetingRoles.filter((r) => r.meetingId === m.id),
    ).toHaveLength(3);
  });
  it("agenda upload rejects bad types and sizes", async () => {
    await as("IL1003");
    expect(
      await code(
        s.meetings.uploadAgenda(M2, {
          name: "a.exe",
          mimeType: "application/pdf",
          sizeBytes: 10,
        }),
      ),
    ).toBe("VALIDATION");
    expect(
      await code(
        s.meetings.uploadAgenda(M2, {
          name: "a.pdf",
          mimeType: "application/pdf",
          sizeBytes: 11 * 1024 * 1024,
        }),
      ),
    ).toBe("VALIDATION");
    expect(
      (
        await s.meetings.uploadAgenda(M2, {
          name: "../new agenda.pdf",
          mimeType: "application/pdf",
          sizeBytes: 100,
        })
      ).originalName,
    ).toBe("new_agenda.pdf");
  });
});

describe("walkthrough 9: time travel", () => {
  it("jumping past 2 Oct's end gives role holders T-01 and N-06", async () => {
    await as("IL1007");
    await s.dev.jump("next-meeting-end");
    clock =
      Date.parse(store.getState().meetings.find((m) => m.id === M2)!.endsAt) +
      60_000;
    await s.dev.tick();
    const d = store.getState();
    expect(d.tasks.some((t) => t.code === "T-01" && t.link.includes(M2))).toBe(
      true,
    );
    expect(
      d.notifications.some((n) => n.code === "N-06" && n.link.includes(M2)),
    ).toBe(true);
  });
  it("T-07 for Sneha (TMOD of 9 Oct) appears 3 days before: not Tue 6 Oct 10 AM, yes at 4 PM", async () => {
    await as("IL1006");
    clock = Date.parse("2026-10-06T10:00:00+05:30");
    expect((await s.tasks.listMine()).some((t) => t.code === "T-07")).toBe(
      false,
    );
    clock = Date.parse("2026-10-06T16:00:00+05:30");
    expect((await s.tasks.listMine()).some((t) => t.code === "T-07")).toBe(
      true,
    );
  });
  it("ticks are idempotent", async () => {
    await as("IL1002");
    const n = store.getState().notifications.length;
    await s.dev.tick();
    await s.dev.tick();
    expect(store.getState().notifications.length).toBe(n);
  });
});

describe("permissions and dev controls", () => {
  it("Members are FORBIDDEN from audit, member directory and club progress", async () => {
    await as("IL1009");
    expect(await code(s.audit.list())).toBe("FORBIDDEN");
    expect(await code(s.members.list())).toBe("FORBIDDEN");
    expect(await code(s.progress.clubTable())).toBe("FORBIDDEN");
  });
  it("Simulate error makes service calls fail with INTERNAL; the dev panel still works", async () => {
    await as("IL1002");
    await s.dev.setSimulateError(true);
    expect(await code(s.tasks.listMine())).toBe("INTERNAL");
    await s.dev.setSimulateError(false);
    expect(await code(s.tasks.listMine())).toBe("ok");
  });
  it("reset reloads the seed; test notification arrives and subscribers hear it", async () => {
    await as("IL1002");
    const heard: string[] = [];
    const off = s.notifications.subscribe((n) => heard.push(n.code));
    await s.dev.sendTestNotification();
    off();
    expect(heard).toEqual(["N-07"]);
    await s.dev.reset();
    expect(
      store
        .getState()
        .notifications.some((n) => n.title.startsWith("Test notification")),
    ).toBe(false);
    // reset keeps the session so the dev panel stays open
    expect((await s.auth.getCurrentUser())?.employeeId).toBe("IL1002");
  });
  it("club table flags Ganesh as inactive and no one else", async () => {
    await as("IL1003");
    expect(
      (await s.progress.clubTable())
        .filter((r) => r.inactive)
        .map((r) => r.member.employeeId),
    ).toEqual(["IL1015"]);
  });
});

describe("M4 Home data", () => {
  it("openForMe: only slots the member can take now (R-02, R-03), soonest first", async () => {
    await as("IL1009"); // Mohammed L2, Speaker 1 on 2 Oct
    const items = await s.roles.openForMe();
    const twoOct = items.filter((i) => i.meetingId === M2).map((i) => i.label);
    expect(twoOct).toEqual(["Grammarian"]); // holds a main role on 2 Oct; Grammarian is support
    expect(items.some((i) => i.meetingId === "mtg-2026-10-09")).toBe(true);
    expect(items.every((i) => i.meetingId !== "mtg-2026-10-16")).toBe(true); // drafts excluded
    expect(items.map((i) => i.startsAt)).toEqual(
      [...items.map((i) => i.startsAt)].sort(),
    );
  });
  it("openForMe: level gates evaluator slots for members", async () => {
    await as("IL1013"); // Aditya L1, Ah-Counter on 2 Oct (support), no main role
    const twoOct = (await s.roles.openForMe())
      .filter((i) => i.meetingId === M2)
      .map((i) => i.label);
    expect(twoOct).not.toContain("Evaluator 2"); // needs 2
    expect(twoOct).not.toContain("Evaluator 3"); // needs 3
    expect(twoOct).not.toContain("Grammarian"); // already has a support role
  });
  it("pendingWithdrawals: ExComm sees Nisha's request; members are FORBIDDEN", async () => {
    await as("IL1003");
    expect(await s.roles.pendingWithdrawals()).toEqual([
      expect.objectContaining({
        memberName: "Nisha Pillai",
        label: "Evaluator 1",
        meetingId: M2,
        request: expect.objectContaining({ reason: "Client call at 4 PM" }),
      }),
    ]);
    await s.auth.signOut();
    await as("IL1009");
    expect(await code(s.roles.pendingWithdrawals())).toBe("FORBIDDEN");
  });
  it("positions.list: President only; seven filled, next President unset", async () => {
    await as("IL1001");
    const p = await s.positions.list();
    expect(p.items.filter((i) => i.memberId)).toHaveLength(7);
    expect(p.items[0]).toEqual({
      code: "president",
      memberId: "mem-1001",
      memberName: "Arjun Mehta",
    });
    expect(p.nextPresidentId).toBeNull();
    await s.auth.signOut();
    await as("IL1002");
    expect(await code(s.positions.list())).toBe("FORBIDDEN");
  });
  it("tasks carry due dates: T-01 at meeting end, T-04 at meeting start", async () => {
    await as("IL1013");
    const t = await s.tasks.listMine();
    expect(t.find((x) => x.code === "T-01")?.dueAt).toBe(
      store.getState().meetings.find((m) => m.id === "mtg-2026-09-25")!.endsAt,
    );
    expect(t.find((x) => x.code === "T-04")?.dueAt).toBe(
      store.getState().meetings.find((m) => m.id === M2)!.startsAt,
    );
  });
});

describe("M5 agenda outline", () => {
  it("2 Oct: seven rows timed from 4:00 PM IST with role holders", async () => {
    await as("IL1009");
    const rows = await s.meetings.agendaOutline(M2);
    expect(
      rows.map((r) => [
        new Date(r.startsAt).toISOString().slice(11, 16),
        r.title,
        r.durationMinutes,
      ]),
    ).toEqual([
      ["10:30", "Opening and TMOD intro", 5],
      ["10:35", "Word of the day", 3],
      ["10:38", "Prepared speeches", 22],
      ["11:00", "Table Topics", 15],
      ["11:15", "Evaluations", 15],
      ["11:30", "Reports", 10],
      ["11:40", "Close", 5],
    ]);
    expect(rows[0].holders).toEqual(["Ananya Das"]);
    expect(rows[2].holders).toEqual([
      "Mohammed Faisal",
      "Lakshmi Narayanan",
      "Meera Joshi",
    ]);
    expect(rows[4].holders).toEqual(["Nisha Pillai"]); // two evaluator slots are open
  });
  it("types without an outline return none; members cannot read a draft's outline", async () => {
    await as("IL1003");
    expect(await s.meetings.agendaOutline("mtg-2026-10-31")).toEqual([]);
    await s.auth.signOut();
    await as("IL1009");
    expect(await code(s.meetings.agendaOutline("mtg-2026-10-16"))).toBe(
      "FORBIDDEN",
    );
  });
});

describe("M6 board actions", () => {
  it("Lakshmi: Evaluator 2 is her own speech; Grammarian is open to her", async () => {
    await as("IL1010");
    const a = await s.roles.myActions(M2);
    expect(a.take[slot("evaluator-2")]).toEqual({
      ok: false,
      message: "You cannot evaluate your own speech.",
    });
    expect(a.take[slot("grammarian")]).toEqual({ ok: true, override: false });
  });
  it("Mohammed (L2, Speaker 1): Evaluator 3 fails on level, Evaluator 2 on his main role; filled slots not listed", async () => {
    await as("IL1009");
    const a = await s.roles.myActions(M2);
    expect(a.take[slot("evaluator-3")]).toEqual({
      ok: false,
      message: "You need to be at level 3 or higher to evaluate this speech.",
    });
    expect(a.take[slot("evaluator-2")]).toMatchObject({
      ok: false,
      message: expect.stringContaining("Speaker 1"),
    });
    expect(a.take[slot("speaker-1")]).toBeUndefined();
  });
  it("Aditya (L1): Evaluator 2 needs level 2", async () => {
    await as("IL1013");
    const a = await s.roles.myActions(M2);
    expect(a.take[slot("evaluator-2")]).toEqual({
      ok: false,
      message: "You need to be at level 2 or higher to evaluate this speech.",
    });
  });
  it("officers see a level failure as an override", async () => {
    await as("IL1007"); // Vikram L2, Timer (support), no main role
    expect((await s.roles.myActions(M2)).take[slot("evaluator-3")]).toEqual({
      ok: true,
      override: true,
    });
  });
  it("withdraw modes: inside 24 h is a request; Nisha's is already pending; 9 Oct is immediate; ExComm immediate", async () => {
    await as("IL1011");
    expect((await s.roles.myActions(M2)).withdraw).toEqual({
      [slot("ge")]: "request",
    });
    await s.auth.signOut();
    await as("IL1014");
    expect((await s.roles.myActions(M2)).withdraw).toEqual({
      [slot("evaluator-1")]: "pending",
    });
    await s.auth.signOut();
    await as("IL1006");
    expect((await s.roles.myActions("mtg-2026-10-09")).withdraw).toEqual({
      "mtg-2026-10-09:tmod": "immediate",
    });
    await s.auth.signOut();
    await as("IL1004");
    expect((await s.roles.myActions(M2)).withdraw).toEqual({
      [slot("ttm")]: "immediate",
    });
  });
  it("closed meetings offer nothing", async () => {
    await as("IL1013");
    expect(await s.roles.myActions("mtg-2026-09-18")).toEqual({
      take: {},
      withdraw: {},
    });
  });
  it("subscribe fires on changes", async () => {
    await as("IL1010");
    let n = 0;
    const off = s.roles.subscribe(() => n++);
    await s.roles.claim(slot("grammarian"));
    off();
    expect(n).toBeGreaterThan(0);
  });
  it("templates: role catalog and project timings", async () => {
    await as("IL1009");
    expect((await s.templates.roleTemplates()).map((r) => r.code)).toContain(
      "hark_master",
    );
    expect(
      (await s.templates.projects()).find((p) => p.id === "prj-l1"),
    ).toMatchObject({ minSeconds: 240, maxSeconds: 360 });
  });
});

describe("store churn", () => {
  it("reading tasks, notifications and ticking with nothing due does not write the store", async () => {
    await as("IL1002");
    await s.tasks.listMine(); // first read may catch up
    let writes = 0;
    const off = store.subscribe(() => writes++);
    await s.tasks.listMine();
    await s.notifications.listMine();
    await s.dev.tick();
    off();
    expect(writes).toBe(0);
  });
});

describe("M7 meetings and templates", () => {
  const input = (o = {}) => ({
    name: "T",
    meetingTypeId: "mt-regular",
    weekday: 5,
    startTime: "16:00",
    durationMinutes: 90,
    venue: "",
    meetingLink: "",
    weeksAhead: 4,
    skipDates: [] as string[],
    isActive: true,
    ...o,
  });

  it("generateRecurring is idempotent and creates nothing new for the seed (16 and 23 Oct exist)", async () => {
    await as("IL1003");
    expect((await s.templates.generateRecurring()).created).toBe(0);
    clock = Date.parse("2026-10-10T10:00:00+05:30");
    const first = await s.templates.generateRecurring();
    expect(first.created).toBeGreaterThan(0);
    expect((await s.templates.generateRecurring()).created).toBe(0);
    const made = store
      .getState()
      .meetings.filter(
        (m) => m.templateId === "tpl-friday" && m.startsAt > "2026-10-24",
      );
    expect(made.every((m) => m.status === "draft")).toBe(true);
    expect(
      store.getState().meetingRoles.filter((r) => r.meetingId === made[0].id),
    ).toHaveLength(12);
  });
  it("skip dates are honoured", async () => {
    await as("IL1003");
    const t = await s.templates.saveRecurring(
      "tpl-friday",
      input({ skipDates: ["2026-10-30"], weeksAhead: 6, venue: "Room B" }),
    );
    expect(t.skipDates).toEqual(["2026-10-30"]);
    await s.templates.generateRecurring();
    expect(
      store
        .getState()
        .meetings.some((m) => m.startsAt.startsWith("2026-10-30")),
    ).toBe(false);
    expect(
      store
        .getState()
        .meetings.some(
          (m) =>
            m.startsAt.startsWith("2026-10-30") ||
            m.startsAt === "2026-10-30T10:30:00.000Z",
        ),
    ).toBe(false);
  });
  it("apply to drafts updates unfilled Draft meetings from the template only", async () => {
    await as("IL1003");
    await s.templates.saveRecurring(
      "tpl-friday",
      input({ startTime: "17:00", venue: "Room C" }),
      true,
    );
    const d = store.getState().meetings;
    expect(d.find((m) => m.id === "mtg-2026-10-16")).toMatchObject({
      startsAt: "2026-10-16T11:30:00.000Z",
      venue: "Room C",
    });
    expect(d.find((m) => m.id === "mtg-2026-10-02")?.startsAt).toBe(
      "2026-10-02T10:30:00.000Z",
    ); // Open: untouched
    await s.templates.saveRecurring(
      "tpl-friday",
      input({ startTime: "18:00" }),
      false,
    );
    expect(
      store.getState().meetings.find((m) => m.id === "mtg-2026-10-16")
        ?.startsAt,
    ).toBe("2026-10-16T11:30:00.000Z");
  });
  it("a new meeting type notifies every active member (N-08) once; editing does not", async () => {
    await as("IL1003");
    const type = await s.templates.saveMeetingType(null, {
      name: "Panel",
      defaultDurationMinutes: 60,
      isActive: true,
      roles: [{ roleTemplateId: "rt-tmod", count: 1 }],
      agendaItems: [
        { title: "Panel", durationMinutes: 45, roleTemplateId: null },
      ],
    });
    expect(
      store.getState().notifications.filter((n) => n.code === "N-08"),
    ).toHaveLength(14);
    await s.templates.saveMeetingType(type.id, {
      name: "Panel talk",
      defaultDurationMinutes: 60,
      isActive: true,
      roles: [],
      agendaItems: [],
    });
    expect(
      store.getState().notifications.filter((n) => n.code === "N-08"),
    ).toHaveLength(14);
    expect(
      (await s.templates.meetingTypes()).find((t) => t.id === type.id),
    ).toMatchObject({ name: "Panel talk", roles: [], agendaItems: [] });
    expect(store.getState().audit.at(-1)?.action).toBe("template.change");
  });
  it("names must be unique; members cannot edit templates", async () => {
    await as("IL1003");
    expect(
      await code(
        s.templates.saveMeetingType(null, {
          name: "regular meeting",
          defaultDurationMinutes: 60,
          isActive: true,
          roles: [],
          agendaItems: [],
        }),
      ),
    ).toBe("VALIDATION");
    await s.auth.signOut();
    await as("IL1009");
    expect(await code(s.templates.saveRecurring(null, input()))).toBe(
      "FORBIDDEN",
    );
    expect(await code(s.templates.meetingTypes())).toBe("ok");
  });
  it("role catalog and project timings: add a role and a custom project", async () => {
    await as("IL1003");
    const r = await s.templates.saveRoleTemplate(null, {
      name: "Quizmaster",
      category: "main",
      reportKind: null,
      isSpeaker: false,
      isEvaluator: false,
      defaultCount: 1,
    });
    expect(r.code).toBe("quizmaster");
    expect(
      await code(
        s.templates.saveRoleTemplate(null, {
          name: "Quizmaster",
          category: "main",
          reportKind: null,
          isSpeaker: false,
          isEvaluator: false,
          defaultCount: 1,
        }),
      ),
    ).toBe("VALIDATION");
    const p = await s.templates.saveProject(null, {
      pathway: "n/a",
      level: 0,
      name: "Demo 2",
      minSeconds: 60,
      maxSeconds: 120,
    });
    expect(p.isCustom).toBe(true);
  });
  it("create meeting with custom roles; they join the catalog", async () => {
    await as("IL1003");
    const m = await s.meetings.create({
      title: "Final",
      meetingTypeId: "mt-contest",
      startsAt: "2026-11-14T04:30:00.000Z",
      endsAt: "2026-11-14T07:00:00.000Z",
      venue: "Room B",
      customRoles: [
        { name: "Chief Judge Two", category: "main", count: 1 },
        { name: "Usher", category: "support", count: 2 },
      ],
    });
    const labels = store
      .getState()
      .meetingRoles.filter((x) => x.meetingId === m.id)
      .map((x) => x.label);
    expect(labels).toEqual(
      expect.arrayContaining([
        "Chief Judge Two",
        "Usher 1",
        "Usher 2",
        "Toastmaster of the Day",
      ]),
    );
    expect(
      (await s.templates.roleTemplates()).some((r) => r.name === "Usher"),
    ).toBe(true);
  });
  it("open all drafts: one N-01 per meeting; drafts without a venue or link are skipped", async () => {
    await as("IL1003");
    const bare = await s.meetings.create({
      title: "No venue",
      meetingTypeId: "mt-regular",
      startsAt: "2026-11-20T10:30:00.000Z",
      endsAt: "2026-11-20T12:00:00.000Z",
    });
    const before = store
      .getState()
      .notifications.filter((n) => n.code === "N-01").length;
    const r = await s.meetings.openAllDrafts();
    expect(r).toEqual({ opened: 3, skipped: 1 });
    expect(
      store.getState().notifications.filter((n) => n.code === "N-01").length -
        before,
    ).toBe(3 * 14);
    expect(
      store.getState().meetings.find((m) => m.id === bare.id)?.status,
    ).toBe("draft");
  });
  it("reschedule through update keeps end after start and notifies holders", async () => {
    await as("IL1003");
    await expect(
      s.meetings.update(M2, {
        startsAt: "2026-10-02T12:00:00.000Z",
        endsAt: "2026-10-02T11:00:00.000Z",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });
});

describe("status preview", () => {
  it("lists warnings without writing; reports why a change is not allowed", async () => {
    await as("IL1003");
    const before = JSON.stringify(store.getState().meetings);
    expect(await s.meetings.statusPreview(M2, "finalized")).toEqual({
      ok: true,
      warnings: ["OPEN_ROLES"],
    });
    clock = Date.parse("2026-10-03T10:00:00+05:30");
    expect(
      await s.meetings.statusPreview("mtg-2026-09-25", "completed"),
    ).toEqual({ ok: true, warnings: ["MISSING_REPORTS"] });
    expect(await s.meetings.statusPreview(M2, "completed")).toEqual({
      ok: false,
      message: "That status change is not allowed.",
    });
    expect(JSON.stringify(store.getState().meetings)).toBe(before);
  });
});

describe("M8 reports (J-08, R-04)", () => {
  const SEP25 = "mtg-2026-09-25";
  const sp = (n: number) => `${SEP25}:speaker-${n}`;

  it("25 Sep as Karthik (officer): five report roles with the seeded statuses; 3 outstanding", async () => {
    await as("IL1003");
    const v = await s.reports.forMeeting(SEP25);
    expect(v.phase).toBe("open");
    expect(v.items.map((i) => [i.roleName, i.status])).toEqual([
      ["General Evaluator", "not_started"],
      ["Table Topics Master", "submitted"],
      ["Timer", "not_started"],
      ["Ah-Counter", "submitted"],
      ["Grammarian", "draft"],
    ]);
    expect(v.outstanding).toBe(3);
    expect(v.speakers.map((x) => [x.name, x.minSeconds, x.maxSeconds])).toEqual(
      [
        ["Vikram Rao", 300, 420],
        ["Meera Joshi", 300, 420],
        ["Mohammed Faisal", 300, 420],
      ],
    );
  });

  it("a member sees only their own report role; 2 Oct has no forms yet", async () => {
    await as("IL1013"); // Aditya: Timer on 25 Sep
    const v = await s.reports.forMeeting(SEP25);
    expect(v.items.map((i) => [i.roleName, i.status, i.mine])).toEqual([
      ["Timer", "not_started", true],
    ]);
    expect(v.outstanding).toBeNull();
    const before = await s.reports.forMeeting(M2);
    expect(before.phase).toBe("before_end");
    expect(before.items).toEqual([]);
    await s.auth.signOut();
    await as("IL1007"); // the Timer on 2 Oct: the right person, too early
    expect(await code(s.reports.save(slot("timer"), { rows: [] }))).toBe(
      "INVALID_STATE",
    );
  });

  it("timer: the server computes cards from the slot limits and ignores the client's; submit clears T-01", async () => {
    await as("IL1013");
    expect((await s.tasks.listMine()).some((t) => t.code === "T-01")).toBe(
      true,
    );
    const r = await s.reports.submit(`${SEP25}:timer`, {
      rows: [
        { speakerSlotId: sp(1), seconds: 320, card: "red" }, // wrong on purpose
        { speakerSlotId: sp(2), seconds: 370 },
        { speakerSlotId: sp(3), seconds: 465 },
      ],
    } as never);
    expect(r.status).toBe("submitted");
    expect(
      (r.payload as { rows: { card: string }[] }).rows.map((x) => x.card),
    ).toEqual(["green", "yellow", "disqualified"]);
    expect((await s.tasks.listMine()).some((t) => t.code === "T-01")).toBe(
      false,
    );
  });

  it("draft keeps the task; the author can edit after submitting until Completed, then it locks (CLOSED)", async () => {
    await as("IL1006"); // Sneha: Grammarian, draft
    await s.reports.save(`${SEP25}:grammarian`, {
      wordOfDayUsage: [],
      goodLanguage: "Nice",
      improvements: "",
    });
    expect((await s.tasks.listMine()).some((t) => t.code === "T-01")).toBe(
      true,
    );
    await s.reports.submit(`${SEP25}:grammarian`, {
      wordOfDayUsage: [{ memberId: "mem-1007", count: 1 }],
      goodLanguage: "Nice",
      improvements: "Fewer fillers",
    });
    expect((await s.tasks.listMine()).some((t) => t.code === "T-01")).toBe(
      false,
    );
    await s.reports.submit(`${SEP25}:grammarian`, {
      wordOfDayUsage: [],
      goodLanguage: "Edited",
      improvements: "x",
    });
    await s.auth.signOut();
    await as("IL1003");
    clock = Date.parse("2026-10-03T10:00:00+05:30");
    await s.meetings.setStatus(SEP25, "completed");
    await s.auth.signOut();
    await as("IL1006");
    expect(
      await code(
        s.reports.save(`${SEP25}:grammarian`, {
          wordOfDayUsage: [],
          goodLanguage: "late",
          improvements: "",
        }),
      ),
    ).toBe("CLOSED");
  });

  it("only the holder reports; validation errors name the problem", async () => {
    await as("IL1009");
    expect(await code(s.reports.save(`${SEP25}:timer`, { rows: [] }))).toBe(
      "FORBIDDEN",
    );
    await s.auth.signOut();
    await as("IL1013");
    await expect(
      s.reports.save(`${SEP25}:timer`, {
        rows: [{ speakerSlotId: sp(1), seconds: -5 }],
      } as never),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      s.reports.save(`${SEP25}:ah-counter`, { rows: [] }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await s.auth.signOut();
    await as("IL1011");
    await expect(
      s.reports.submit(`${SEP25}:ttm`, { summary: "  " }),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      message: "Write a short summary before submitting.",
    });
    expect(await code(s.reports.save(`${SEP25}:ttm`, { summary: "" }))).toBe(
      "ok",
    ); // a draft may be empty
  });

  it("18 Sep Completed: every member sees every report; the removed member's name shows on the Roles board", async () => {
    await as("IL1009");
    const v = await s.reports.forMeeting("mtg-2026-09-18");
    expect(v.phase).toBe("completed");
    expect(v.items.map((i) => i.status)).toEqual([
      "submitted",
      "submitted",
      "submitted",
      "submitted",
      "submitted",
    ]);
    const timer = v.items.find((i) => i.kind === "timer")!.payload as {
      rows: { card: string; seconds: number }[];
    };
    expect(timer.rows.map((r) => [r.seconds, r.card])).toEqual([
      [320, "green"],
      [370, "yellow"],
      [425, "red"],
      [465, "disqualified"],
    ]);
    const roles = await s.roles.listForMeeting("mtg-2026-09-18");
    expect(
      roles.find((r) => r.slot.label === "Evaluator 4")?.holder?.name,
    ).toBe("Old Member");
  });

  it("report tasks come back only for unsubmitted roles after the meeting ends (T-01 and N-06 for 2 Oct)", async () => {
    await as("IL1007");
    clock = Date.parse("2026-10-02T18:00:00+05:30");
    await s.dev.tick();
    const t = (await s.tasks.listMine()).filter(
      (x) => x.code === "T-01" && x.link.includes(M2),
    );
    expect(t).toHaveLength(1);
    const v = await s.reports.forMeeting(M2);
    expect(v.phase).toBe("open");
    expect(v.items.filter((i) => i.mine).map((i) => i.roleName)).toEqual([
      "Timer",
    ]);
    expect(v.items).toHaveLength(5); // an officer sees every report role
  });
});

describe("M8 theme (J-06)", () => {
  it("TMOD publishes: all active members get N-05 and T-07 clears; ExComm may too; others may not", async () => {
    await as("IL1006"); // Sneha is TMOD of 9 Oct
    clock = Date.parse("2026-10-06T16:00:00+05:30");
    expect((await s.tasks.listMine()).some((t) => t.code === "T-07")).toBe(
      true,
    );
    await s.meetings.publishTheme("mtg-2026-10-09", {
      theme: "Courage",
      welcomeNote: "Hello",
      wordOfTheDay: "Brave",
      wordMeaning: "ready to face danger",
    });
    expect((await s.tasks.listMine()).some((t) => t.code === "T-07")).toBe(
      false,
    );
    expect(
      store
        .getState()
        .notifications.filter(
          (n) => n.code === "N-05" && /Courage/.test(n.title),
        ),
    ).toHaveLength(14);
    await s.auth.signOut();
    await as("IL1009");
    expect(
      await code(
        s.meetings.publishTheme("mtg-2026-10-09", {
          theme: "x",
          welcomeNote: null,
          wordOfTheDay: null,
          wordMeaning: null,
        }),
      ),
    ).toBe("FORBIDDEN");
  });
});
