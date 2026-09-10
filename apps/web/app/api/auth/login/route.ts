import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { verifyPassword } from "@/lib/auth/passwords";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth/session";
import { checkRateLimit, clientIp, rateLimitHeaders } from "@/lib/rate-limit";

function landingFor(userType: string): string {
  if (userType === "PLATFORM_ADMIN") return "/admin/dashboard";
  return "/dashboard";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").toLowerCase().trim();
  const password = String(body.password ?? "");

  const rl = await checkRateLimit(`rl:login:${clientIp(request)}:${email}`, 10, 60);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts. Try again in a minute." },
      { status: 429, headers: rateLimitHeaders(rl.remaining, 10) }
    );
  }

  const user = await prisma.user.findFirst({
    where: { email },
    include: { school: { select: { status: true } } },
  });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
  }

  // Hard cutoff: suspended/archived schools cannot sign in (trial expired
  // without payment). Contact the platform to reactivate.
  if (
    user.schoolId &&
    user.school &&
    (user.school.status === "SUSPENDED" || user.school.status === "ARCHIVED")
  ) {
    return NextResponse.json(
      { ok: false, error: "This school account is suspended. Complete payment to reactivate it." },
      { status: 403 }
    );
  }

  const token = createSessionToken({
    userId: user.id,
    email: user.email,
    userType: user.userType,
    schoolId: user.schoolId,
  });

  const res = NextResponse.json({ ok: true, redirect: landingFor(user.userType) });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
