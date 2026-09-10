import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { encryptSecret } from "@/lib/auth/encryption";
import { adminActor } from "@/lib/auth/admin-actor";

const base = () =>
  new URL("/admin/payment-settings", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

// Daraja secrets: consumerKey, consumerSecret, shortcode, passkey.
// PayHero secrets: apiUsername, apiPassword. Non-secret routing fields
// (environment, transactionType, channelId, callbackUrl) travel alongside
// inside the same encrypted JSON.
const SCHEMAS: Record<string, { secrets: string[]; plain: string[] }> = {
  daraja: {
    secrets: ["consumerKey", "consumerSecret", "shortcode", "passkey"],
    plain: ["environment", "transactionType", "callbackUrl"],
  },
  payhero: {
    secrets: ["apiUsername", "apiPassword"],
    plain: ["channelId", "callbackUrl"],
  },
};

// Save a provider's credentials (Super Admin only — enforced in proxy).
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.redirect(base(), 303);
  const provider = String(form.get("provider") ?? "");
  const schema = SCHEMAS[provider];
  if (!schema) return NextResponse.redirect(base(), 303);

  const current = await prisma.paymentProviderConfig.findUnique({ where: { provider } });
  const prev: Record<string, string> = current
    ? JSON.parse(
        (await import("@/lib/auth/encryption")).decryptSecret(current.credentialsEnc)
      )
    : {};

  const next: Record<string, string> = {};
  for (const field of [...schema.secrets, ...schema.plain]) {
    const value = String(form.get(field) ?? "").trim();
    // Blank secret = keep the stored one.
    next[field] = value || (schema.secrets.includes(field) ? prev[field] ?? "" : "");
  }
  if (schema.secrets.some((f) => !next[f])) return NextResponse.redirect(base(), 303);

  const data = {
    environment: String(form.get("environment") ?? "sandbox"),
    active: form.get("active") === "on",
    credentialsEnc: encryptSecret(JSON.stringify(next)),
  };

  if (current) {
    await prisma.paymentProviderConfig.update({ where: { provider }, data });
  } else {
    await prisma.paymentProviderConfig.create({ data: { provider, ...data } });
  }
  await prisma.auditLog.create({
    data: {
      actorId: await adminActor(),
      action: "platform.payment_settings_saved",
      metadata: { provider },
    },
  });
  return NextResponse.redirect(base(), 303);
}
