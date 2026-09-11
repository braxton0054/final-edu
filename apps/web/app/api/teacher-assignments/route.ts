import { NextResponse } from "next/server";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { listAssignments, upsertAssignment, removeAssignment } from "@/lib/messaging/service";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// GET /api/teacher-assignments — all assignments in this school (staff only).
export async function GET() {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    return NextResponse.json({ ok: false, error: staff.error }, { status: staff.status });
  }
  const assignments = await listAssignments(staff.schoolId);
  return NextResponse.json({ ok: true, assignments });
}

// POST /api/teacher-assignments — assign a teacher to a class (+area, role).
export async function POST(request: Request) {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    return NextResponse.json({ ok: false, error: staff.error }, { status: staff.status });
  }

  const rl = await checkRateLimit(`rl:assign:${staff.schoolId}:${clientIp(request)}`, 60, 3600);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many changes. Try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  try {
    const created = await upsertAssignment({
      schoolId: staff.schoolId,
      teacherId: String(body.teacherId ?? ""),
      classId: String(body.classId ?? ""),
      learningArea: String(body.learningArea ?? ""),
      role: String(body.role ?? "subject_teacher"),
    });
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Could not save assignment." },
      { status: 400 }
    );
  }
}

// DELETE /api/teacher-assignments?id= — remove an assignment.
export async function DELETE(request: Request) {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    return NextResponse.json({ ok: false, error: staff.error }, { status: staff.status });
  }
  const id = new URL(request.url).searchParams.get("id") ?? "";
  try {
    await removeAssignment(staff.schoolId, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Could not remove assignment." },
      { status: 400 }
    );
  }
}
