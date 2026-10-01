import Link from "next/link";
import {
  ArrowLeftRight,
  CalendarClock,
  ClipboardCheck,
  FileText,
  Mic,
  ShieldCheck,
  UserPlus,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Task, TaskCode } from "@/lib/domain/types";
import { formatMeetingTime } from "@/lib/time/ist";

/** One action label per task type, so the button says what it does (flow.md section 6). */
const ACTION: Record<TaskCode, { label: string; Icon: LucideIcon }> = {
  "T-01": { label: "Submit report", Icon: FileText },
  "T-02": { label: "Review request", Icon: ClipboardCheck },
  "T-03": { label: "Verify", Icon: ShieldCheck },
  "T-04": { label: "Answer swap", Icon: ArrowLeftRight },
  "T-05": { label: "Cast vote", Icon: Vote },
  "T-06": { label: "Add details", Icon: Mic },
  "T-07": { label: "Set theme", Icon: CalendarClock },
  "T-08": { label: "Fill roles", Icon: UserPlus },
};

export function TaskRow({ task }: { task: Task }) {
  const { label, Icon } = ACTION[task.code];
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{task.title}</p>
        {task.dueAt ? (
          <p className="text-xs text-muted-foreground">
            Due {formatMeetingTime(task.dueAt)}
          </p>
        ) : null}
      </div>
      <Button asChild variant="outline" size="sm" className="h-9 max-lg:h-11">
        <Link href={task.link}>{label}</Link>
      </Button>
    </li>
  );
}

export function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <ul className="divide-y divide-border">
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} />
      ))}
    </ul>
  );
}
