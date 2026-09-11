import { NextResponse } from "next/server";
import { requireSchoolUser } from "@/lib/auth/tenant-actor";
import {
  allowedClasses,
  createAssessment,
  isStaff,
  listAssessments,
} from "@/lib/academics/service";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

function canWrite(userType: string): boolean {
  return isStaff(userType) || userType === "TEACHER";
}

// GET /api/assessments?classId=&type=&status= — scoped list.
export async function GET(request: Request) {
  const actor = await requireSchoolUser();
  if (!actor.ok) {
    return NextResponse.json({ ok: false, error: actor.error }, { status: actor.status });
  }
  if (!canWrite(actor.userType)) {
    return NextResponse.json({ ok: false, error: "Insufficient permissions." }, { status: 403 });
  }
  const params = new URL(request.url).searchParams;
  const allowed = await allowedClasses(actor.schoolId, actor.userId, actor.userType);
  const classId = params.get("classId") ?? undefined;
  if (classId && !allowed.includes(classId)) {
    return NextResponse.json({ ok: false, error: "This class is not assigned to you." }, { status: 403 });
  }
  // Teachers default to their own classes; staff see everything.
  const items = await listAssessments(actor.schoolId, {
    classId,
    type: params.get("type") ?? undefined,
    status: params.get("status") ?? undefined,
  });
  const scoped = isStaff(actor.userType) ? items : items.filter((a) => allowed.includes(a.classId));
  return NextResponse.json({ ok: true, assessments: scoped, classes: allowed });
}

// POST /api/assessments — create (teachers: own classes only).
export async function POST(request: Request) {
  const actor = await requireSchoolUser();
  if (!actor.ok) {
    return NextResponse.json({ ok: false, error: actor.error }, { status: actor.status });
  }
  if (!canWrite(actor.userType)) {
    return NextResponse.json({ ok: false, error: "Insufficient permissions." }, { status: 403 });
  }

  const rl = await checkRateLimit(`rl:assess:${actor.schoolId}:${actor.userId}`, 30, 3600);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Too many. Try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const classId = String(body.classId ?? "").trim();
  const allowed = await allowedClasses(actor.schoolId, actor.userId, actor.userType);
  if (!classId || !allowed.includes(classId)) {
    return NextResponse.json(
      { ok: false, error: "Choose one of your assigned classes." },
      { status: 403 }
    );
  }

  const dueRaw = String(body.dueDate ?? "").trim();
  try {
    const created = await createAssessment({
      schoolId: actor.schoolId,
      classId,
      title: String(body.title ?? ""),
      type: String(body.type ?? "test"),
      learningArea: String(body.learningArea ?? ""),
      term: String(body.term ?? ""),
      maxScore: body.maxScore === undefined || body.maxScore === "" ? undefined : Number(body.maxScore),
      instructions: String(body.instructions ?? ""),
      dueDate: /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? new Date(`${dueRaw}T00:00:00Z`) : undefined,
      createdById: actor.userId,
    });
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Could not create." },
      { status: 400 }
    );
  }
}
