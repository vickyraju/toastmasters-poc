import { redirect } from "next/navigation";

/** The shell sends signed-out visitors on to S-01. */
export default function Page() {
  redirect("/home");
}
