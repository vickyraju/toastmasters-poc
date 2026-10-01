import { POSITION_LABELS } from "@/lib/domain/constants";
import type { Position } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

/** design.md section 5: President is maroon, other positions are a blue outline. */
export function PositionBadge({ position }: { position: Position }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        position === "president"
          ? "bg-brand-accent text-primary-foreground"
          : "border border-primary text-primary",
      )}
    >
      {POSITION_LABELS[position]}
    </span>
  );
}
