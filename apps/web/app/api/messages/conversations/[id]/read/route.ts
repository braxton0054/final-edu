import { NextResponse } from "next/server";
import { requireSchoolActor, requireParentActor } from "@/lib/auth/tenant-actor";
import { getConversationFor, markRead } from "@/lib/messaging/service";

async function schoolUser() {
  const staff = await requireSchoolActor();
  if (staff.ok) {
    return { ok: true as const, schoolId: staff.schoolId, userId: staff.userId, userType: staff.userType };
  }
  const parent = await requireParentActor();
  if (parent.ok) {
    return { ok: true as const, schoolId: parent.schoolId, userId: parent.userId, userType: "PARENT" };
  }
  return { ok: false as const, status: parent.status, error: parent.error };
}

// POST /api/messages/conversations/[id]/read — mark thread as read.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await schoolUser();
  if (!actor.ok) {
    return NextResponse.json({ ok: false, error: actor.error }, { status: actor.status });
  }
  const { id } = await params;
  const conversation = await getConversationFor(actor.schoolId, id, actor.userId, actor.userType);
  if (!conversation) {
    return NextResponse.json({ ok: false, error: "Conversation not found." }, { status: 404 });
  }
  await markRead(id, actor.userId);
  return NextResponse.json({ ok: true });
}
