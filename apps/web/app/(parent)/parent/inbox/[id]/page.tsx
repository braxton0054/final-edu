import { redirect } from "next/navigation";
import { requireParentActor } from "@/lib/auth/tenant-actor";
import ThreadClient from "../../../../components/ThreadClient";

export const dynamic = "force-dynamic";

export default async function ParentThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const parent = await requireParentActor();
  if (!parent.ok) {
    redirect("/login?next=/parent/inbox");
  }
  const { id } = await params;
  return <ThreadClient conversationId={id} backHref="/parent/inbox" />;
}
