import { describe, expect, it } from "vitest";
import { groupTasks } from "./groupTasks";

const NOW = "2026-10-01T12:30:00.000Z"; // Thu 1 Oct, 6:00 PM IST
const t = (id: string, dueAt: string | null) => ({ id, dueAt });

describe("groupTasks (S-07: Today, This week, Later)", () => {
  it("overdue and due by end of today (IST) go to Today", () => {
    const g = groupTasks(
      [
        t("overdue", "2026-09-25T12:00:00.000Z"),
        t("tonight", "2026-10-01T18:00:00.000Z"),
      ],
      NOW,
    );
    expect(g.today.map((x) => x.id)).toEqual(["overdue", "tonight"]);
  });
  it("tomorrow IST is This week, not Today, even though it is the same UTC date", () => {
    // 1 Oct 18:31 UTC = 2 Oct 00:01 IST
    expect(
      groupTasks([t("a", "2026-10-01T18:31:00.000Z")], NOW).week.map(
        (x) => x.id,
      ),
    ).toEqual(["a"]);
  });
  it("within 7 days is This week; later or no due date is Later", () => {
    const g = groupTasks(
      [
        t("fri", "2026-10-02T10:30:00.000Z"),
        t("far", "2026-10-20T10:30:00.000Z"),
        t("none", null),
      ],
      NOW,
    );
    expect(g.week.map((x) => x.id)).toEqual(["fri"]);
    expect(g.later.map((x) => x.id)).toEqual(["far", "none"]);
  });
  it("sorts each group by due date, undated last", () => {
    const g = groupTasks(
      [t("b", "2026-10-04T10:30:00.000Z"), t("a", "2026-10-02T10:30:00.000Z")],
      NOW,
    );
    expect(g.week.map((x) => x.id)).toEqual(["a", "b"]);
  });
});
