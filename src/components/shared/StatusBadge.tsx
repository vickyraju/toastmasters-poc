import type { MeetingStatus } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const STYLE: Record<MeetingStatus, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "border border-border-input text-muted-foreground",
  },
  open: { label: "Open for roles", className: "bg-info-bg text-info" },
  finalized: { label: "Finalized", className: "bg-success-bg text-success" },
  completed: { label: "Completed", className: "bg-foreground text-card" },
  cancelled: { label: "Cancelled", className: "bg-danger-bg text-danger" },
};

/** Meeting status badge (design.md section 5). Always text, never colour alone. */
export function StatusBadge({ status }: { status: MeetingStatus }) {
  const s = STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        s.className,
      )}
    >
      {s.label}
    </span>
  );
}
