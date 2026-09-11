import { redirect } from "next/navigation";
import { requireTeacherActor } from "@/lib/auth/tenant-actor";
import ThreadClient from "../../../../components/ThreadClient";

export const dynamic = "force-dynamic";

export default async function TeacherThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireTeacherActor();
  if (!actor.ok) {
    redirect("/login?next=/teacher/messages");
  }
  const { id } = await params;
  return <ThreadClient conversationId={id} backHref="/teacher/messages" />;
}
