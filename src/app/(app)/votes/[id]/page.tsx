import { VoteDetail } from "@/components/votes/VoteDetail";

/** S-15 */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VoteDetail id={decodeURIComponent(id)} />;
}
