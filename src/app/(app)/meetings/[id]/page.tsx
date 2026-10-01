import { Suspense } from "react";
import { MeetingDetail } from "@/components/meetings/MeetingDetail";

/** S-04. The tab bar reads ?tab=, so it renders inside Suspense (Next.js useSearchParams rule). */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <Suspense>
      <MeetingDetail id={decodeURIComponent(id)} />
    </Suspense>
  );
}
