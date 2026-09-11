import { NextResponse } from "next/server";
import { requireSchoolUser } from "@/lib/auth/tenant-actor";
import { getConversationFor, getThread, postMessage } from "@/lib/messaging/service";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// GET /api/messages/conversations/[id]/messages — thread (membership-checked).
export async function GET(
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
  const messages = await getThread(id);
  return NextResponse.json({
    ok: true,
    conversation: {
      id: conversation.id,
      title: conversation.title,
      audience: conversation.audience,
      audienceRef: conversation.audienceRef,
    },
    messages,
  });
}

// POST /api/messages/conversations/[id]/messages — reply (members + staff).
export async function POST(
  request: Request,
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

  const rl = await checkRateLimit(`rl:msg:send:${actor.schoolId}:${actor.userId}`, 60, 3600);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many messages. Slow down." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const text = String(body.text ?? body.body ?? "").trim();
  if (!text) {
    return NextResponse.json({ ok: false, error: "Message text is required." }, { status: 400 });
  }
  const sent = await postMessage({
    schoolId: actor.schoolId,
    conversationId: id,
    senderId: actor.userId,
    body: text,
  });
  return NextResponse.json({ ok: true, id: sent.id }, { status: 201 });
}
