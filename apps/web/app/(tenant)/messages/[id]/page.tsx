import { redirect } from "next/navigation";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import ThreadClient from "../../../components/ThreadClient";

export const dynamic = "force-dynamic";

export default async function StaffThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    redirect("/login?next=/messages");
  }
  const { id } = await params;
  return <ThreadClient conversationId={id} backHref="/messages" />;
}
