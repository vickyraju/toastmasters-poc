/** Shown when NEXT_PUBLIC_DEMO_MODE=true (design.md section 3). */
export function DemoRibbon() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;
  return (
    <div className="bg-warning-bg py-1 text-center text-xs font-medium text-warning">
      Demo mode
    </div>
  );
}
