import { redirect } from "next/navigation";
import { requireParentActor } from "@/lib/auth/tenant-actor";
import MessagesClient from "../../../components/MessagesClient";

export const dynamic = "force-dynamic";

// Parent inbox: threads addressed to this parent, with replies.
export default async function ParentInboxPage() {
  const parent = await requireParentActor();
  if (!parent.ok) {
    redirect("/login?next=/parent/inbox");
  }

  return (
    <div>
      <h1>Inbox</h1>
      <p style={{ color: "#5b6470" }}>
        Messages from the school — fees, results, assignments, announcements.
      </p>
      <MessagesClient classIds={[]} basePath="/parent/inbox" canCompose={false} />
    </div>
  );
}
