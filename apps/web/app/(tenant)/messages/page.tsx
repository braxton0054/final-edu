import { redirect } from "next/navigation";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { distinctClassIds } from "@/lib/messaging/service";
import MessagesClient from "../../components/MessagesClient";

export const dynamic = "force-dynamic";

// Staff inbox + compose. Server-guarded; threads load through the API.
export default async function MessagesPage() {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    redirect("/login?next=/messages");
  }
  const classIds = await distinctClassIds(staff.schoolId);

  return (
    <div>
      <h1>Messages</h1>
      <p style={{ color: "#5b6470" }}>
        Write to parents — whole school, a class, or specific families. Parents
        read and reply in their inbox.
      </p>
      <MessagesClient classIds={classIds} basePath="/messages" canCompose />
    </div>
  );
}
