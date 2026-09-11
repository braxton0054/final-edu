import { NextResponse } from "next/server";
import { requireSchoolUser } from "@/lib/auth/tenant-actor";
import { getConversationFor, markRead } from "@/lib/messaging/service";

// POST /api/messages/conversations/[id]/read — mark thread as read.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const actor = await requireSchoolUser();
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
