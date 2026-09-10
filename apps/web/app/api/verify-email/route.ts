import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";

// GET /api/verify-email?token=… — mandatory before tenant activation.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") ?? "";
  if (!token) {
    return NextResponse.json({ ok: false, error: "Missing token." }, { status: 400 });
  }

  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
    include: { school: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json(
      { ok: false, error: "This verification link is invalid or expired." },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: true },
    }),
    prisma.school.update({
      where: { id: record.schoolId },
      data: { status: "TRIAL" },
    }),
    prisma.auditLog.create({
      data: {
        schoolId: record.schoolId,
        actorId: record.userId,
        action: "school.email_verified",
      },
    }),
  ]);

  return NextResponse.json({ ok: true, slug: record.school.slug });
}
