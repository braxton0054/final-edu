import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { verifyOtp } from "@/lib/auth/otp";
import { hashPassword } from "@/lib/auth/passwords";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// Complete a password reset with a valid OTP code.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").toLowerCase().trim();
  const code = String(body.code ?? "").trim();
  const password = String(body.password ?? "");
  if (!email || !code) {
    return NextResponse.json({ ok: false, error: "Email and code are required." }, { status: 400 });
  }

  const rl = await checkRateLimit(`rl:reset:${clientIp(request)}:${email}`, 10, 600);
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Try again later." }, { status: 429 });
  }
  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const user = await prisma.user.findFirst({ where: { email } });
  if (!user || !(await verifyOtp(email, code, "reset"))) {
    return NextResponse.json({ ok: false, error: "Invalid or expired code." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(password) },
    }),
    prisma.auditLog.create({
      data: { schoolId: user.schoolId, actorId: user.id, action: "auth.password_reset_completed" },
    }),
  ]);
  return NextResponse.json({ ok: true });
}
