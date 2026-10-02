"use client";

import { QueryBlock } from "@/components/shared/QueryBlock";
import { useMyTasks } from "@/hooks/useInbox";
import { useNow } from "@/hooks/useHome";
import { groupTasks } from "./groupTasks";
import { TaskList } from "./TaskList";

const GROUPS = [
  ["today", "Today"],
  ["week", "This week"],
  ["later", "Later"],
] as const;

/** S-07: own open tasks grouped by due date; a task disappears when its action is done. */
export function TasksPage() {
  const tasks = useMyTasks();
  const nowQ = useNow();
  const query = { ...tasks, isPending: tasks.isPending || nowQ.isPending };
  return (
    <div className="max-w-3xl">
      <QueryBlock
        query={query}
        label="tasks"
        rows={4}
        isEmpty={(d) => d.length === 0}
        empty="No tasks. You are all caught up."
      >
        {(d) => {
          const g = groupTasks(d, nowQ.data!);
          return (
            <div className="space-y-6">
              {GROUPS.map(([key, title]) =>
                g[key].length ? (
                  <section
                    key={key}
                    aria-labelledby={`tasks-${key}`}
                    className="rounded-lg border border-border bg-card px-5 py-2"
                  >
                    <h2
                      id={`tasks-${key}`}
                      className="pt-3 text-xl font-semibold"
                    >
                      {title}
                    </h2>
                    <TaskList tasks={g[key]} nowIso={nowQ.data!} />
                  </section>
                ) : null,
              )}
            </div>
          );
        }}
      </QueryBlock>
    </div>
  );
}
