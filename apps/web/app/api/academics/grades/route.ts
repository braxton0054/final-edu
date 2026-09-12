import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { gradesOverview } from "@/lib/academics/structure";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// GET /api/academics/grades — grades with streams, counts, class teachers.
export async function GET() {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    return NextResponse.json({ ok: false, error: staff.error }, { status: staff.status });
  }
  const grades = await gradesOverview(staff.schoolId);
  return NextResponse.json({ ok: true, grades });
}

// POST /api/academics/grades — create a grade (staff only).
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
    return NextResponse.json({ ok: false, error: "A grade name is required." }, { status: 400 });
  }
  try {
    const grade = await prisma.grade.create({
      data: { schoolId: staff.schoolId, name: name.slice(0, 80) },
    });
    return NextResponse.json({ ok: true, id: grade.id }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: "This grade already exists." }, { status: 409 });
  }
}
