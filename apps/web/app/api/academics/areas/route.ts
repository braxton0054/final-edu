import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// GET /api/academics/areas — school learning areas.
export async function GET() {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    return NextResponse.json({ ok: false, error: staff.error }, { status: staff.status });
  }
  const areas = await prisma.learningArea.findMany({
    where: { schoolId: staff.schoolId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ ok: true, areas });
}

// POST /api/academics/areas — add a learning area.
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
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ ok: false, error: "A name is required." }, { status: 400 });
  }
  try {
    const area = await prisma.learningArea.create({
      data: { schoolId: staff.schoolId, name: name.slice(0, 80), code: String(body.code ?? "").trim().slice(0, 20) || null },
    });
    return NextResponse.json({ ok: true, id: area.id }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "This learning area already exists." }, { status: 409 });
  }
}

// DELETE /api/academics/areas?id= — remove (blocked when in use).
export async function DELETE(request: Request) {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    return NextResponse.json({ ok: false, error: staff.error }, { status: staff.status });
  }
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const inUse = await prisma.gradeLearningArea.count({
    where: { learningArea: { id, schoolId: staff.schoolId } },
  });
  if (inUse > 0) {
    return NextResponse.json(
      { ok: false, error: "Remove it from grades first." },
      { status: 400 }
    );
  }
  await prisma.learningArea.deleteMany({ where: { id, schoolId: staff.schoolId } });
  return NextResponse.json({ ok: true });
}
