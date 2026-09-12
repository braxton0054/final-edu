import { NextResponse } from "next/server";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { moveStudent } from "@/lib/academics/structure";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// POST /api/academics/enroll — move a student to another stream. The old
// enrollment closes to history; a new active one opens. Never overwrites.
export async function POST(request: Request) {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    return NextResponse.json({ ok: false, error: staff.error }, { status: staff.status });
  }
  const rl = await checkRateLimit(`rl:acad:${staff.schoolId}:${clientIp(request)}`, 60, 3600);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Too many changes. Try again later." }, { status: 429 });
  }
  const body = await request.json().catch(() => ({}));
  try {
    const out = await moveStudent({
      schoolId: staff.schoolId,
      studentId: String(body.studentId ?? ""),
      streamId: String(body.streamId ?? ""),
      actorId: staff.userId,
    });
    return NextResponse.json({ ok: true, classId: out.classId });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Could not move student." },
      { status: 400 }
    );
  }
}
