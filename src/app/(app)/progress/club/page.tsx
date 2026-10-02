import { Suspense } from "react";
import { ClubProgressPage } from "@/components/progress/ClubProgressPage";

/** S-10. The tab bar reads ?tab=, so it renders inside Suspense. */
export default function Page() {
  return (
    <Suspense>
      <ClubProgressPage />
    </Suspense>
  );
}
