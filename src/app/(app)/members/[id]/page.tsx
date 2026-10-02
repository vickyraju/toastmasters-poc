import { ProfilePage } from "@/components/members/ProfilePage";

/** S-12 */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProfilePage id={decodeURIComponent(id)} />;
}
