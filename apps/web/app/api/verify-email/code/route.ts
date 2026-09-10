import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { verifyOtp } from "@/lib/auth/otp";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// POST /api/verify-email/code { email, code } — OTP alternative to the link.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").toLowerCase().trim();
  const code = String(body.code ?? "").trim();
  if (!email || !code) {
    return NextResponse.json({ ok: false, error: "Email and code are required." }, { status: 400 });
  }

  const rl = await checkRateLimit(`rl:otp:${clientIp(request)}:${email}`, 10, 600);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const user = await prisma.user.findFirst({
    where: { email },
    select: { id: true, schoolId: true },
  });
  if (!user?.schoolId) {
    return NextResponse.json({ ok: false, error: "Invalid code." }, { status: 400 });
  }

  const ok = await verifyOtp(email, code, "verify");
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Invalid or expired code." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } }),
    prisma.school.update({ where: { id: user.schoolId }, data: { status: "TRIAL" } }),
    prisma.auditLog.create({
      data: { schoolId: user.schoolId, actorId: user.id, action: "school.email_verified" },
    }),
  ]);
  return NextResponse.json({ ok: true });
}
