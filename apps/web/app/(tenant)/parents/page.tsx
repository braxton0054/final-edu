import { redirect } from "next/navigation";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import ParentsClient from "./ParentsClient";

export const dynamic = "force-dynamic";

// School admin manages parent logins and links children by admission number.
export default async function ParentsPage() {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    redirect("/login?next=/parents");
  }
  return (
    <div>
      <h1>Parents</h1>
      <p style={{ color: "#5b6470" }}>
        Create parent logins and link each parent to their children. Parents
        sign in with these accounts to read and reply to messages.
      </p>
      <ParentsClient />
    </div>
  );
}
