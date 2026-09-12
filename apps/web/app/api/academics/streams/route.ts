import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// POST /api/academics/streams — add a stream to a grade.
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
  const gradeId = String(body.gradeId ?? "");
  const name = String(body.name ?? "").trim();
  const displayName = String(body.displayName ?? "").trim();
  const maxStudents = Number(body.maxStudents ?? 0) || null;
  if (!gradeId || !name) {
    return NextResponse.json({ ok: false, error: "Grade and stream name are required." }, { status: 400 });
  }
  const grade = await prisma.grade.findFirst({ where: { id: gradeId, schoolId: staff.schoolId } });
  if (!grade) {
    return NextResponse.json({ ok: false, error: "Grade not found." }, { status: 404 });
  }
  try {
    const stream = await prisma.stream.create({
      data: {
        schoolId: staff.schoolId,
        gradeId,
        name: name.slice(0, 40),
        displayName: (displayName || `${grade.name} ${name}`).slice(0, 80),
        maxStudents,
      },
    });
    await prisma.auditLog.create({
      data: { schoolId: staff.schoolId, actorId: staff.userId, action: "academics.stream_created", metadata: { grade: grade.name, stream: stream.name } },
    });
    return NextResponse.json({ ok: true, id: stream.id }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "This stream already exists in the grade." }, { status: 409 });
  }
}

// PATCH /api/academics/streams — rename / resize / deactivate a stream.
export async function PATCH(request: Request) {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    return NextResponse.json({ ok: false, error: staff.error }, { status: staff.status });
  }
  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");
  const stream = await prisma.stream.findFirst({ where: { id, schoolId: staff.schoolId } });
  if (!stream) {
    return NextResponse.json({ ok: false, error: "Stream not found." }, { status: 404 });
  }
  const data: Record<string, unknown> = {};
  if (typeof body.displayName === "string" && body.displayName.trim()) {
    data.displayName = body.displayName.trim().slice(0, 80);
  }
  if (body.maxStudents !== undefined) {
    data.maxStudents = Number(body.maxStudents) || null;
  }
  if (body.status === "active" || body.status === "archived") {
    data.status = body.status;
  }
  await prisma.stream.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}
