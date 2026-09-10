import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { hashPassword } from "@/lib/auth/passwords";

// One-time bootstrap: creates the first PLATFORM_ADMIN.
// Refuses once any platform admin exists. Disabled in production.
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Disabled in production." }, { status: 403 });
  }
  const existing = await prisma.user.count({ where: { userType: "PLATFORM_ADMIN" } });
  if (existing > 0) {
    return NextResponse.json({ error: "A super admin already exists." }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").toLowerCase().trim();
  const password = String(body.password ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      userType: "PLATFORM_ADMIN",
      firstName: "Super",
      lastName: "Admin",
      emailVerified: true,
    },
  });
  await prisma.auditLog.create({
    data: { actorId: user.id, action: "platform.super_admin_bootstrapped" },
  });
  return NextResponse.json({ ok: true, email: user.email }, { status: 201 });
}
