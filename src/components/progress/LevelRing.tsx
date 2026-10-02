/** Level ring: current level out of 5, with the number in text (never colour alone). */
export function LevelRing({
  level,
  className = "size-16",
}: {
  level: number;
  className?: string;
}) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg
      viewBox="0 0 64 64"
      className={`shrink-0 ${className}`}
      role="img"
      aria-label={`Level ${level} of 5`}
    >
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="var(--primary-soft)"
        strokeWidth="8"
      />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="8"
        strokeDasharray={`${(c * level) / 5} ${c}`}
        transform="rotate(-90 32 32)"
      />
      <text
        x="32"
        y="37"
        textAnchor="middle"
        className="fill-foreground text-base font-semibold"
      >
        {level}
      </text>
    </svg>
  );
}
