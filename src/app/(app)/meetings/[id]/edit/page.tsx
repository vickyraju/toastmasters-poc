import { MeetingForm } from "@/components/meetings/MeetingForm";

/** S-05 (edit) */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MeetingForm id={decodeURIComponent(id)} />;
}
