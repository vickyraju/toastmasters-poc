import { cn } from "@/lib/utils";

// Tints from the design tokens; initials on a tinted circle, never photos (design.md section 5).
const TINTS = [
  "bg-primary-soft text-primary",
  "bg-success-bg text-success",
  "bg-warning-bg text-warning",
  "bg-info-bg text-info",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (
    (parts[0]?.[0] ?? "") + (parts.length > 1 ? parts.at(-1)![0] : "")
  ).toUpperCase();
}

function tint(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return TINTS[Math.abs(h) % TINTS.length];
}

export function Avatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        tint(name),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
