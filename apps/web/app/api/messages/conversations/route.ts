import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { requireSchoolUser } from "@/lib/auth/tenant-actor";
import {
  createConversation,
  listConversationsFor,
  teacherScope,
  type Audience,
} from "@/lib/messaging/service";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// GET /api/messages/conversations — inbox list with unread counts.
export async function GET() {
  const actor = await requireSchoolUser();
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

// POST /api/messages/conversations — staff and teachers compose.
export async function POST(request: Request) {
  const actor = await requireSchoolUser();
  if (!actor.ok) {
    return NextResponse.json({ ok: false, error: actor.error }, { status: actor.status });
  }
  if (actor.userType !== "SCHOOL_ADMIN" && actor.userType !== "STAFF" && actor.userType !== "TEACHER") {
    return NextResponse.json({ ok: false, error: "Insufficient permissions." }, { status: 403 });
  }

  const rl = await checkRateLimit(`rl:msg:new:${actor.schoolId}:${clientIp(request)}`, 20, 3600);
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

  // Teachers write only to their assigned classes — never school-wide, and
  // only to parents of their own students.
  if (actor.userType === "TEACHER") {
    const scope = await teacherScope(actor.schoolId, actor.userId);
    if (!scope) {
      return NextResponse.json(
        { ok: false, error: "No classes are assigned to this teacher account." },
        { status: 403 }
      );
    }
    if (audience.type === "all_parents") {
      return NextResponse.json(
        { ok: false, error: "Teachers can only write to their assigned classes." },
        { status: 403 }
      );
    }
    if (audience.type === "class" && !scope.classIds.includes(audience.classId)) {
      return NextResponse.json(
        { ok: false, error: "This class is not assigned to you." },
        { status: 403 }
      );
    }
    if (audience.type === "users") {
      const covered = await prisma.studentGuardian.findMany({
        where: {
          schoolId: actor.schoolId,
          parentId: { in: audience.userIds },
          student: { classId: { in: scope.classIds } },
        },
        select: { parentId: true },
      });
      const coveredIds = new Set(covered.map((c) => c.parentId));
      if (!audience.userIds.every((id) => coveredIds.has(id))) {
        return NextResponse.json(
          { ok: false, error: "Recipients must be parents of your assigned students." },
          { status: 403 }
        );
      }
    }
  }

  try {
    const created = await createConversation({
      schoolId: actor.schoolId,
      title,
      audience,
      firstMessage: text,
      senderId: actor.userId,
      createdById: actor.userId,
    });
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Could not send." },
      { status: 400 }
    );
  }
}
