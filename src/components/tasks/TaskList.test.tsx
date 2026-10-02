import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TaskList } from "./TaskList";
import type { Task } from "@/lib/domain/types";

const task = (id: string, dueAt: string): Task =>
  ({
    id,
    code: "T-01",
    title: `Task ${id}`,
    dueAt,
    link: "/home",
  }) as unknown as Task;

describe("TaskList", () => {
  it("tags a task that is past its due time as Overdue, and only that one", () => {
    render(
      <TaskList
        nowIso="2026-10-01T12:30:00.000Z"
        tasks={[
          task("a", "2026-09-25T12:00:00.000Z"),
          task("b", "2026-10-02T10:30:00.000Z"),
        ]}
      />,
    );
    expect(screen.getAllByText("Overdue")).toHaveLength(1);
    expect(screen.getByText("Task a").closest("li")?.textContent).toContain(
      "Overdue",
    );
  });
});
