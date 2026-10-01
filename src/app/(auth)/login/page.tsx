import { LoginForm } from "@/components/layout/LoginForm";
import { DemoRibbon } from "@/components/layout/DemoRibbon";

export const metadata = { title: "Sign in · Club Hub" };

/** S-01 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <DemoRibbon />
      <main className="flex flex-1 items-start justify-center px-4 py-16 sm:items-center">
        <LoginForm next={typeof next === "string" ? next : null} />
      </main>
    </div>
  );
}
