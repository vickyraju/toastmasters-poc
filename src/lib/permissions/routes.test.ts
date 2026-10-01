import { describe, expect, it } from "vitest";
import type { Actor } from "./can";
import { canOpen, NAV_ITEMS, titleFor } from "./routes";

const member: Actor = { id: "mem-1009", accountType: "member", position: null };
const excomm: Actor = {
  id: "mem-1003",
  accountType: "excomm",
  position: "vpm",
};
const president: Actor = {
  id: "mem-1001",
  accountType: "president",
  position: "president",
};

const navFor = (a: Actor) =>
  NAV_ITEMS.filter((i) => canOpen(a, i.href)).map((i) => i.label);

describe("navigation by account type (design.md section 3)", () => {
  it("Member sees My club only", () => {
    expect(navFor(member)).toEqual([
      "Home",
      "Meetings",
      "My tasks",
      "My progress",
    ]);
  });
  it("ExComm adds Manage, not Positions", () => {
    expect(navFor(excomm)).toEqual([
      "Home",
      "Meetings",
      "My tasks",
      "My progress",
      "Club progress",
      "Members",
      "Votes",
      "Audit log",
      "Export",
    ]);
  });
  it("President adds Positions", () => {
    expect(navFor(president)).toContain("Positions");
    expect(navFor(president)).toHaveLength(10);
  });
});

describe("canOpen (flow.md section 2 'Who can open it')", () => {
  it.each([
    "/audit",
    "/export",
    "/members",
    "/progress/club",
    "/votes",
    "/votes/vote-001",
    "/positions",
    "/meetings/new",
    "/meetings/templates",
    "/meetings/mtg-2026-10-02/edit",
  ])("Member is denied %s", (path) => {
    expect(canOpen(member, path)).toBe(false);
  });
  it.each([
    "/home",
    "/meetings",
    "/meetings/mtg-2026-10-02",
    "/tasks",
    "/notifications",
    "/progress",
    "/settings",
  ])("Member may open %s", (path) => expect(canOpen(member, path)).toBe(true));
  it("a member may open their own profile only", () => {
    expect(canOpen(member, "/members/mem-1009")).toBe(true);
    expect(canOpen(member, "/members/mem-1010")).toBe(false);
    expect(canOpen(excomm, "/members/mem-1010")).toBe(true);
  });
  it("Positions is President only", () => {
    expect(canOpen(excomm, "/positions")).toBe(false);
    expect(canOpen(president, "/positions")).toBe(true);
  });
  it("ignores query strings and trailing slashes", () => {
    expect(canOpen(member, "/audit/?x=1")).toBe(false);
    expect(canOpen(member, "/home?tab=1")).toBe(true);
  });
});

describe("titleFor", () => {
  it("names each route", () => {
    expect(titleFor("/home")).toBe("Home");
    expect(titleFor("/progress/club")).toBe("Club progress");
    expect(titleFor("/meetings/new")).toBe("New meeting");
    expect(titleFor("/meetings/mtg-2026-10-02")).toBe("Meeting");
    expect(titleFor("/votes/vote-001")).toBe("Vote");
    expect(titleFor("/nowhere")).toBe("Club Hub");
  });
});

describe("safeNext", () => {
  it("keeps same-site paths and rejects anything else", async () => {
    const { safeNext } = await import("./routes");
    expect(safeNext("/meetings/mtg-2026-10-02?tab=roles")).toBe(
      "/meetings/mtg-2026-10-02?tab=roles",
    );
    for (const bad of [
      null,
      "",
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "javascript:alert(1)",
    ]) {
      expect(safeNext(bad)).toBe("/home");
    }
  });
});
