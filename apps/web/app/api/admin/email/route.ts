import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { encryptSecret } from "@/lib/auth/encryption";
import { adminActor } from "@/lib/auth/admin-actor";

const base = () =>
  new URL("/admin/email", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

// Provider presets (hosts/usernames per official docs). Only the password
// (or key) is ever typed in — everything else is fixed or plain config.
const PRESETS: Record<string, { host: string | null; userFixed: string | null }> = {
  smtp: { host: null, userFixed: null },
  zeptomail: { host: "smtp.zeptomail.com", userFixed: "emailapikey" },
  resend: { host: "smtp.resend.com", userFixed: "resend" },
  brevo: { host: "smtp-relay.brevo.com", userFixed: null },
  gmail: { host: "smtp.gmail.com", userFixed: null },
};

// Save platform email settings for any provider.
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.redirect(base(), 303);

  const provider = String(form.get("provider") ?? "smtp");
  const preset = PRESETS[provider] ?? PRESETS.smtp;
  const host = preset.host ?? String(form.get("host") ?? "").trim();
  const username = preset.userFixed ?? String(form.get("username") ?? "").trim();
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
    provider,
    host,
    port,
    username,
    fromEmail,
    fromName: String(form.get("fromName") ?? "MtandaoLabs").trim() || "MtandaoLabs",
    secure: provider === "smtp" ? form.get("secure") === "on" : port === 465,
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
  return NextResponse.redirect(new URL(`/admin/email?provider=${provider}`, base()), 303);
}
