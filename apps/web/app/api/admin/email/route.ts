import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { encryptSecret } from "@/lib/auth/encryption";
import { adminActor } from "@/lib/auth/admin-actor";

const base = () =>
  new URL("/admin/email", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

// Save platform email settings (generic SMTP or ZeptoMail).
// ZeptoMail auth is fixed by their docs: host smtp.zeptomail.com,
// username literally "emailapikey", password = agent SMTP password.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.redirect(base(), 303);

  const provider = String(form.get("provider") ?? "smtp");
  const isZepto = provider === "zeptomail";
  const host = isZepto ? "smtp.zeptomail.com" : String(form.get("host") ?? "").trim();
  const username = isZepto ? "emailapikey" : String(form.get("username") ?? "").trim();
  const fromEmail = String(form.get("fromEmail") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const port = Math.max(1, Number(form.get("port")) || 587);
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
    provider: isZepto ? "zeptomail" : "smtp",
    host,
    port,
    username,
    fromEmail,
    fromName: String(form.get("fromName") ?? "MtandaoLabs").trim() || "MtandaoLabs",
    secure: isZepto ? port === 465 : form.get("secure") === "on",
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
