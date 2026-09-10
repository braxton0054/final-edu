import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { issueOtp } from "@/lib/auth/otp";
import { sendMail } from "@/lib/email/mailer";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

// Request a password reset: issues an OTP code and emails it.
// Always returns ok (never reveals whether the email exists).
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").toLowerCase().trim();

  const rl = await checkRateLimit(`rl:forgot:${clientIp(request)}:${email}`, 5, 3600);
  if (!rl.ok) {
    return NextResponse.json({ ok: true });
  }

  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    const user = await prisma.user.findFirst({ where: { email } });
    if (user) {
      const { code } = await issueOtp(email, "reset");
      await sendMail({
        to: email,
        subject: "Reset your MtandaoLabs password",
        html: `<p>Your password reset code is <strong style="font-size:1.4rem">${code}</strong> (expires in 10 minutes).</p><p>Enter it on the reset page to choose a new password. If you did not ask for this, ignore this email.</p>`,
      });
      await prisma.auditLog.create({
        data: { schoolId: user.schoolId, actorId: user.id, action: "auth.password_reset_requested" },
      });
    }
  }
  return NextResponse.json({ ok: true });
}
