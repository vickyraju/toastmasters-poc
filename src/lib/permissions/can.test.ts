import { describe, expect, it } from "vitest";
import { can, type Actor } from "./can";

const member: Actor = { id: "m", accountType: "member", position: null };
const saa: Actor = { id: "x", accountType: "excomm", position: "saa" };
const vpe: Actor = { id: "v", accountType: "excomm", position: "vpe" };
const president: Actor = {
  id: "p",
  accountType: "president",
  position: "president",
};

describe("R-01 can()", () => {
  it("Member cannot assign positions; only President can", () => {
    expect(can(member, "position.assign")).toBe(false);
    expect(can(saa, "position.assign")).toBe(false);
    expect(can(president, "position.assign")).toBe(true);
    expect(can(president, "president.transfer")).toBe(true);
  });
  it("only the VPE verifies completions; President does not", () => {
    expect(can(vpe, "completion.verify")).toBe(true);
    expect(can(saa, "completion.verify")).toBe(false);
    expect(can(president, "completion.verify")).toBe(false);
  });
  it("TMOD holder edits theme of own meeting, not another", () => {
    expect(
      can(member, "meeting.theme.edit", {
        meetingStatus: "open",
        tmodHolderId: "m",
      }),
    ).toBe(true);
    expect(
      can(member, "meeting.theme.edit", {
        meetingStatus: "open",
        tmodHolderId: "someone",
      }),
    ).toBe(false);
  });
  it("TMOD loses the right once Completed or Cancelled; officers keep the right", () => {
    for (const meetingStatus of ["completed", "cancelled"] as const) {
      expect(
        can(member, "meeting.theme.edit", { meetingStatus, tmodHolderId: "m" }),
      ).toBe(false);
    }
    expect(
      can(saa, "meeting.theme.edit", {
        meetingStatus: "open",
        tmodHolderId: "other",
      }),
    ).toBe(true);
  });
  it("members do not see Draft meetings", () => {
    expect(can(member, "meeting.view", { meetingStatus: "draft" })).toBe(false);
    expect(can(member, "meeting.view", { meetingStatus: "open" })).toBe(true);
    expect(can(saa, "meeting.view", { meetingStatus: "draft" })).toBe(true);
  });
  it("role.claim only while Open or Finalized", () => {
    expect(can(member, "role.claim", { meetingStatus: "open" })).toBe(true);
    expect(can(member, "role.claim", { meetingStatus: "finalized" })).toBe(
      true,
    );
    expect(can(member, "role.claim", { meetingStatus: "draft" })).toBe(false);
    expect(can(member, "role.claim", { meetingStatus: "completed" })).toBe(
      false,
    );
  });
  it("evaluator.claim needs eligibility for members; officers override", () => {
    expect(
      can(member, "evaluator.claim", {
        meetingStatus: "open",
        evaluatorEligible: false,
      }),
    ).toBe(false);
    expect(
      can(member, "evaluator.claim", {
        meetingStatus: "open",
        evaluatorEligible: true,
      }),
    ).toBe(true);
    expect(
      can(saa, "evaluator.claim", {
        meetingStatus: "open",
        evaluatorEligible: false,
      }),
    ).toBe(true);
  });
  it("officer-only actions", () => {
    for (const a of [
      "meeting.create",
      "role.assign",
      "member.add",
      "audit.view",
      "export.run",
      "club_progress.view",
      "member.view_directory",
    ] as const) {
      expect(can(member, a)).toBe(false);
      expect(can(saa, a)).toBe(true);
    }
  });
  it("vote: only President starts/closes; eligible voters cast once; results only after close", () => {
    expect(can(saa, "vote.start")).toBe(false);
    expect(can(president, "vote.start")).toBe(true);
    expect(can(president, "vote.close")).toBe(true);
    expect(
      can(saa, "vote.cast", { voteStatus: "open", isEligibleVoter: true }),
    ).toBe(true);
    expect(
      can(saa, "vote.cast", { voteStatus: "closed", isEligibleVoter: true }),
    ).toBe(false);
    expect(
      can(member, "vote.cast", { voteStatus: "open", isEligibleVoter: false }),
    ).toBe(false);
    expect(can(saa, "vote.view_result", { voteStatus: "open" })).toBe(false);
    expect(can(saa, "vote.view_result", { voteStatus: "closed" })).toBe(true);
    expect(can(member, "vote.view_result", { voteStatus: "closed" })).toBe(
      false,
    );
    expect(can(saa, "vote.view_turnout")).toBe(true);
  });
  it("self-only actions", () => {
    expect(can(member, "member.edit_self", { ownerId: "m" })).toBe(true);
    expect(can(member, "member.edit_self", { ownerId: "other" })).toBe(false);
    expect(can(member, "completion.log", { ownerId: "m" })).toBe(true);
    expect(can(member, "completion.log", { ownerId: "other" })).toBe(false);
    expect(can(member, "role.withdraw", { roleHolderId: "m" })).toBe(true);
    expect(can(member, "role.withdraw", { roleHolderId: "other" })).toBe(false);
    expect(can(member, "role.swap.respond", { targetMemberId: "m" })).toBe(
      true,
    );
    expect(can(member, "role.swap.respond", { targetMemberId: "other" })).toBe(
      false,
    );
  });
  it("reports: holder edits until completed; consolidated visible to all after completed", () => {
    expect(
      can(member, "report.submit", {
        meetingStatus: "open",
        roleHolderId: "m",
      }),
    ).toBe(true);
    expect(
      can(member, "report.submit", {
        meetingStatus: "completed",
        roleHolderId: "m",
      }),
    ).toBe(false);
    expect(can(member, "report.view", { meetingStatus: "completed" })).toBe(
      true,
    );
    expect(can(member, "report.view", { meetingStatus: "open" })).toBe(false);
    expect(
      can(member, "report.view", { meetingStatus: "open", roleHolderId: "m" }),
    ).toBe(true);
    expect(can(saa, "report.view", { meetingStatus: "open" })).toBe(true);
  });
  it("settings.club.edit is President only", () => {
    expect(can(saa, "settings.club.edit")).toBe(false);
    expect(can(president, "settings.club.edit")).toBe(true);
  });
});
