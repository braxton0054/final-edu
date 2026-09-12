import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { ensureYearTerm } from "@/lib/academics/structure";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// GET /api/academics/assignments — table with filters (?teacherId=&gradeId=&streamId=).
export async function GET(request: Request) {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    return NextResponse.json({ ok: false, error: staff.error }, { status: staff.status });
  }
  const params = new URL(request.url).searchParams;
  const rows = await prisma.teachingAssignment.findMany({
    where: {
      schoolId: staff.schoolId,
      status: "active",
      ...(params.get("teacherId") ? { teacherId: params.get("teacherId") as string } : {}),
      ...(params.get("gradeId") ? { gradeId: params.get("gradeId") as string } : {}),
      ...(params.get("streamId") ? { streamId: params.get("streamId") as string } : {}),
    },
    orderBy: [{ gradeId: "asc" }, { streamId: "asc" }],
    include: {
      teacher: { select: { id: true, firstName: true, lastName: true } },
      grade: { select: { name: true } },
      stream: { select: { displayName: true } },
      learningArea: { select: { name: true } },
      academicYear: { select: { name: true } },
      term: { select: { name: true } },
    },
    take: 500,
  });
  const teachers = await prisma.teacher.findMany({
    where: { schoolId: staff.schoolId },
    orderBy: [{ firstName: "asc" }],
    select: { id: true, firstName: true, lastName: true },
    take: 500,
  });
  return NextResponse.json({ ok: true, assignments: rows, teachers });
}

// POST /api/academics/assignments — assign teacher to stream + area.
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
  const [teacher, stream, area] = await Promise.all([
    prisma.teacher.findFirst({ where: { id: String(body.teacherId ?? ""), schoolId: staff.schoolId } }),
    prisma.stream.findFirst({ where: { id: String(body.streamId ?? ""), schoolId: staff.schoolId } }),
    body.learningAreaId
      ? prisma.learningArea.findFirst({ where: { id: String(body.learningAreaId), schoolId: staff.schoolId } })
      : null,
  ]);
  if (!teacher || !stream) {
    return NextResponse.json({ ok: false, error: "Teacher and stream are required." }, { status: 400 });
  }
  const { year, term } = await ensureYearTerm(staff.schoolId);
  const created = await prisma.teachingAssignment.create({
    data: {
      schoolId: staff.schoolId,
      academicYearId: year.id,
      termId: term?.id ?? null,
      teacherId: teacher.id,
      gradeId: stream.gradeId,
      streamId: stream.id,
      learningAreaId: area?.id ?? null,
      status: "active",
    },
  });
  await prisma.auditLog.create({
    data: {
      schoolId: staff.schoolId,
      actorId: staff.userId,
      action: "academics.teacher_assigned",
      metadata: { stream: stream.displayName, area: area?.name ?? null },
    },
  });
  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}

// DELETE /api/academics/assignments?id= — deactivate (history kept).
export async function DELETE(request: Request) {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    return NextResponse.json({ ok: false, error: staff.error }, { status: staff.status });
  }
  const id = new URL(request.url).searchParams.get("id") ?? "";
  await prisma.teachingAssignment.updateMany({
    where: { id, schoolId: staff.schoolId },
    data: { status: "inactive" },
  });
  return NextResponse.json({ ok: true });
}
