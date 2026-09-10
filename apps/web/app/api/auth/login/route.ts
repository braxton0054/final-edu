import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { verifyPassword } from "@/lib/auth/passwords";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/auth/session";

function landingFor(userType: string): string {
  if (userType === "PLATFORM_ADMIN") return "/admin/dashboard";
  return "/dashboard";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").toLowerCase().trim();
  const password = String(body.password ?? "");

  const user = await prisma.user.findFirst({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ ok: false, error: "Invalid email or password." }, { status: 401 });
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
