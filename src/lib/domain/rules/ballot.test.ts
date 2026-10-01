import { describe, expect, it } from "vitest";
import { assertBallotAnonymous, makeBallot, voteView } from "./ballot";

const options = [
  { id: "y", label: "Yes" },
  { id: "n", label: "No" },
  { id: "a", label: "Abstain" },
];
const ballots = [...Array(4).fill("y"), ...Array(2).fill("n"), "a"].map(
  (optionId, i) => ({ id: `b${i}`, voteId: "v", optionId }),
);

describe("R-13 ballot secrecy", () => {
  it("makeBallot keeps only voteId and optionId", () => {
    const b = makeBallot({ voteId: "v", optionId: "y", memberId: "m1" } as {
      voteId: string;
      optionId: string;
    });
    expect(Object.keys(b).sort()).toEqual(["optionId", "voteId"]);
  });
  it("assertBallotAnonymous throws on a member reference", () => {
    expect(() =>
      assertBallotAnonymous({
        id: "b",
        voteId: "v",
        optionId: "y",
        memberId: "m",
      }),
    ).toThrow();
    expect(() =>
      assertBallotAnonymous({ id: "b", voteId: "v", optionId: "y" }),
    ).not.toThrow();
  });
});

describe("R-13 voteView", () => {
  it("while open: turnout only, no counts anywhere", () => {
    const v = voteView({
      status: "open",
      options,
      ballots,
      cast: 4,
      eligible: 7,
    });
    expect(v).toEqual({ status: "open", turnout: { cast: 4, eligible: 7 } });
    expect(JSON.stringify(v)).not.toMatch(/count|percent|results/i);
  });
  it("after close: counts and percentages (seed vote-000: Yes 4, No 2, Abstain 1)", () => {
    const v = voteView({
      status: "closed",
      options,
      ballots,
      cast: 7,
      eligible: 7,
    });
    expect(v.status).toBe("closed");
    if (v.status !== "closed") throw new Error("unreachable");
    expect(v.results.map((r) => [r.optionId, r.count])).toEqual([
      ["y", 4],
      ["n", 2],
      ["a", 1],
    ]);
    expect(v.results[0].percent).toBe(57);
    expect(v.tie).toBe(false);
  });
  it("reports a tie, never picks a winner", () => {
    const tied = [
      { id: "1", voteId: "v", optionId: "y" },
      { id: "2", voteId: "v", optionId: "n" },
    ];
    const v = voteView({
      status: "closed",
      options,
      ballots: tied,
      cast: 2,
      eligible: 2,
    });
    if (v.status !== "closed") throw new Error("unreachable");
    expect(v.tie).toBe(true);
  });
});
