import type { Card } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const STYLE: Record<Card, { word: string; swatch: string; text: string }> = {
  green: { word: "Green", swatch: "bg-timer-green", text: "text-foreground" },
  yellow: {
    word: "Yellow",
    swatch: "bg-timer-yellow",
    text: "text-foreground",
  },
  red: { word: "Red", swatch: "bg-timer-red", text: "text-foreground" },
  disqualified: { word: "DQ", swatch: "bg-timer-dq", text: "text-foreground" },
  none: {
    word: "No card",
    swatch: "bg-transparent border border-border-input",
    text: "text-muted-foreground",
  },
};

/** Card colour plus its word, so the result never depends on colour alone (design.md 2.1). */
export function TimerCardPill({ card }: { card: Card }) {
  const s = STYLE[card];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border px-2.5 py-0.5 text-sm font-medium",
        s.text,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-3 rounded-full", s.swatch)}
      />
      {s.word}
    </span>
  );
}
