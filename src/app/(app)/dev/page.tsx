import { notFound } from "next/navigation";
import { DevPanel } from "@/components/layout/DevPanel";

/** Hidden demo controls (mock-data.md section 1); only when NEXT_PUBLIC_DEMO_MODE=true. */
export default function DevPage() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") notFound();
  return <DevPanel />;
}
