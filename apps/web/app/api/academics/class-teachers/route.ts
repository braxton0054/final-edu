import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { ensureYearTerm } from "@/lib/academics/structure";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// POST /api/academics/class-teachers — set a stream's class teacher.
// Exactly one ACTIVE holder per stream (DB partial unique); assigning a new
// one retires the previous holder to history automatically.
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
  const [teacher, stream] = await Promise.all([
    prisma.teacher.findFirst({ where: { id: String(body.teacherId ?? ""), schoolId: staff.schoolId } }),
    prisma.stream.findFirst({ where: { id: String(body.streamId ?? ""), schoolId: staff.schoolId } }),
  ]);
  if (!teacher || !stream) {
    return NextResponse.json({ ok: false, error: "Teacher and stream are required." }, { status: 400 });
  }
  const { year, term } = await ensureYearTerm(staff.schoolId);
  const created = await prisma.$transaction(async (tx) => {
    await tx.classTeacherAssignment.updateMany({
      where: { streamId: stream.id, status: "active" },
      data: { status: "inactive" },
    });
    return tx.classTeacherAssignment.create({
      data: {
        schoolId: staff.schoolId,
        academicYearId: year.id,
        termId: term?.id ?? null,
        teacherId: teacher.id,
        gradeId: stream.gradeId,
        streamId: stream.id,
        status: "active",
      },
    });
  });
  await prisma.auditLog.create({
    data: {
      schoolId: staff.schoolId,
      actorId: staff.userId,
      action: "academics.class_teacher_assigned",
      metadata: { stream: stream.displayName },
    },
  });
  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}

// DELETE /api/academics/class-teachers?id= — retire the holder.
export async function DELETE(request: Request) {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    return NextResponse.json({ ok: false, error: staff.error }, { status: staff.status });
  }
  const id = new URL(request.url).searchParams.get("id") ?? "";
  await prisma.classTeacherAssignment.updateMany({
    where: { id, schoolId: staff.schoolId },
    data: { status: "inactive" },
  });
  return NextResponse.json({ ok: true });
}
