import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { hashPassword } from "@/lib/auth/passwords";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// POST /api/teacher-logins — staff creates a TEACHER login for a teacher row.
// Links Teacher.userId so the teacher portal scope resolves on sign-in.
export async function POST(request: Request) {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    return NextResponse.json({ ok: false, error: staff.error }, { status: staff.status });
  }

  const rl = await checkRateLimit(`rl:tlogin:${staff.schoolId}:${clientIp(request)}`, 30, 3600);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many accounts. Try again later." },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const teacherId = String(body.teacherId ?? "");
  const email = String(body.email ?? "").toLowerCase().trim();
  const password = String(body.password ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "A valid email is required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const teacher = await prisma.teacher.findFirst({
    where: { id: teacherId, schoolId: staff.schoolId },
  });
  if (!teacher) {
    return NextResponse.json({ ok: false, error: "Teacher not found." }, { status: 404 });
  }
  if (teacher.userId) {
    return NextResponse.json({ ok: false, error: "This teacher already has a login." }, { status: 409 });
  }
  const existing = await prisma.user.findFirst({
    where: { schoolId: staff.schoolId, email },
  });
  if (existing) {
    return NextResponse.json({ ok: false, error: "A user with this email already exists." }, { status: 409 });
  }

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        schoolId: staff.schoolId,
        email,
        passwordHash: await hashPassword(password),
        userType: "TEACHER",
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        emailVerified: true,
      },
    });
    await tx.teacher.update({ where: { id: teacher.id }, data: { userId: created.id } });
    await tx.auditLog.create({
      data: {
        schoolId: staff.schoolId,
        actorId: staff.userId,
        action: "staff.teacher_login_created",
        metadata: { teacherId: teacher.id },
      },
    });
    return created;
  });

  return NextResponse.json({ ok: true, id: user.id }, { status: 201 });
}
