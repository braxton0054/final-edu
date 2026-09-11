import { NextResponse } from "next/server";
import { requireSchoolActor, requireParentActor } from "@/lib/auth/tenant-actor";
import {
  createConversation,
  listConversationsFor,
  type Audience,
} from "@/lib/messaging/service";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// Resolve any school-attached user (staff composes, parents read).
async function schoolUser() {
  const staff = await requireSchoolActor();
  if (staff.ok) {
    return { ok: true as const, schoolId: staff.schoolId, userId: staff.userId, userType: staff.userType };
  }
  const parent = await requireParentActor();
  if (parent.ok) {
    return { ok: true as const, schoolId: parent.schoolId, userId: parent.userId, userType: "PARENT" };
  }
  return { ok: false as const, status: staff.status, error: staff.error };
}

// GET /api/messages/conversations — inbox list with unread counts.
export async function GET() {
  const actor = await schoolUser();
  if (!actor.ok) {
    return NextResponse.json({ ok: false, error: actor.error }, { status: actor.status });
  }
  const conversations = await listConversationsFor({
    schoolId: actor.schoolId,
    userId: actor.userId,
    userType: actor.userType,
  });
  return NextResponse.json({ ok: true, conversations });
}

// POST /api/messages/conversations — staff compose (title + audience + body).
export async function POST(request: Request) {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    return NextResponse.json({ ok: false, error: staff.error }, { status: staff.status });
  }

  const rl = await checkRateLimit(`rl:msg:new:${staff.schoolId}:${clientIp(request)}`, 20, 3600);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many new conversations. Try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const text = String(body.text ?? body.body ?? "").trim();
  if (!title || !text) {
    return NextResponse.json(
      { ok: false, error: "A subject and a message are required." },
      { status: 400 }
    );
  }

  let audience: Audience;
  const kind = String(body.audience ?? "all_parents");
  if (kind === "class" && String(body.classId ?? "").trim()) {
    audience = { type: "class", classId: String(body.classId).trim() };
  } else if (kind === "users" && Array.isArray(body.userIds) && body.userIds.length > 0) {
    audience = { type: "users", userIds: body.userIds.map(String).slice(0, 500) };
  } else {
    audience = { type: "all_parents" };
  }

  try {
    const created = await createConversation({
      schoolId: staff.schoolId,
      title,
      audience,
      firstMessage: text,
      senderId: staff.userId,
      createdById: staff.userId,
    });
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Could not send." },
      { status: 400 }
    );
  }
}
