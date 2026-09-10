import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { encryptSecret } from "@/lib/auth/encryption";
import { adminActor } from "@/lib/auth/admin-actor";

const base = () =>
  new URL("/admin/email", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

// Save platform SMTP settings. Password is AES-256-GCM encrypted before storage.
// (Super Admin only — enforced in proxy; add session check before production.)
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.redirect(base(), 303);

  const host = String(form.get("host") ?? "").trim();
  const username = String(form.get("username") ?? "").trim();
  const fromEmail = String(form.get("fromEmail") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!host || !username || !fromEmail) {
    return NextResponse.redirect(base(), 303);
  }

  const current = await prisma.platformEmailSettings.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  if (!current && !password) {
    return NextResponse.redirect(base(), 303);
  }

  const data = {
    host,
    port: Math.max(1, Number(form.get("port")) || 587),
    username,
    fromEmail,
    fromName: String(form.get("fromName") ?? "MtandaoLabs").trim() || "MtandaoLabs",
    secure: form.get("secure") === "on",
    active: form.get("active") === "on",
    ...(password ? { passwordEnc: encryptSecret(password) } : {}),
  };

  if (current) {
    await prisma.platformEmailSettings.update({ where: { id: current.id }, data });
  } else {
    await prisma.platformEmailSettings.create({
      data: { ...data, passwordEnc: encryptSecret(password) },
    });
  }
  await prisma.auditLog.create({
    data: { actorId: await adminActor(), action: "platform.email_settings_saved" },
  });
  return NextResponse.redirect(base(), 303);
}
