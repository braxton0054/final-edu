import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// GET /api/academics/grade-areas?gradeId= — defaults + stream overrides.
export async function GET(request: Request) {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    return NextResponse.json({ ok: false, error: staff.error }, { status: staff.status });
  }
  const gradeId = new URL(request.url).searchParams.get("gradeId") ?? "";
  const grade = await prisma.grade.findFirst({
    where: { id: gradeId, schoolId: staff.schoolId },
    include: {
      gradeAreas: { include: { learningArea: true } },
      streams: { include: { areaOverrides: { include: { learningArea: true } } } },
    },
  });
  if (!grade) {
    return NextResponse.json({ ok: false, error: "Grade not found." }, { status: 404 });
  }
  const areas = await prisma.learningArea.findMany({
    where: { schoolId: staff.schoolId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ ok: true, grade, areas });
}

// POST /api/academics/grade-areas — replace a grade's default areas, or set
// one stream override { streamId, learningAreaId, offered }.
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

  // Stream-level exception.
  if (body.streamId && body.learningAreaId) {
    const stream = await prisma.stream.findFirst({
      where: { id: String(body.streamId), schoolId: staff.schoolId },
    });
    const area = await prisma.learningArea.findFirst({
      where: { id: String(body.learningAreaId), schoolId: staff.schoolId },
    });
    if (!stream || !area) {
      return NextResponse.json({ ok: false, error: "Stream or area not found." }, { status: 404 });
    }
    await prisma.streamLearningArea.upsert({
      where: { streamId_learningAreaId: { streamId: stream.id, learningAreaId: area.id } },
      update: { offered: body.offered !== false },
      create: { streamId: stream.id, learningAreaId: area.id, offered: body.offered !== false },
    });
    return NextResponse.json({ ok: true });
  }

  // Grade defaults replacement.
  const gradeId = String(body.gradeId ?? "");
  const ids: string[] = Array.isArray(body.learningAreaIds)
    ? body.learningAreaIds.map(String)
    : [];
  const grade = await prisma.grade.findFirst({ where: { id: gradeId, schoolId: staff.schoolId } });
  if (!grade) {
    return NextResponse.json({ ok: false, error: "Grade not found." }, { status: 404 });
  }
  const valid = await prisma.learningArea.findMany({
    where: { schoolId: staff.schoolId, id: { in: ids } },
    select: { id: true },
  });
  await prisma.$transaction([
    prisma.gradeLearningArea.deleteMany({ where: { gradeId } }),
    prisma.gradeLearningArea.createMany({
      data: valid.map((a) => ({ gradeId, learningAreaId: a.id })),
    }),
  ]);
  return NextResponse.json({ ok: true });
}
