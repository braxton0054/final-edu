import { prisma } from "@mtanda/database";
import { decryptSecret, encryptSecret } from "@/lib/auth/encryption";
import type { DarajaConfig } from "./daraja";

// ─── Per-school Daraja (fee collection) ───
// Same Daraja rails as platform billing (see daraja.ts), but with the
// SCHOOL's own encrypted credentials. Platform keys are never mixed in.

export async function getSchoolDarajaConfig(
  schoolId: string
): Promise<(DarajaConfig & { configId: string }) | null> {
  const row = await prisma.schoolPaymentConfig.findFirst({
    where: { schoolId, provider: "daraja", active: true },
  });
  if (!row) return null;
  let c: Record<string, string>;
  try {
    c = JSON.parse(decryptSecret(row.credentialsEnc));
  } catch {
    return null;
  }
  if (!c.consumerKey || !c.consumerSecret || !c.shortcode || !c.passkey) return null;
  return {
    configId: row.id,
    baseUrl:
      row.environment === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke",
    consumerKey: c.consumerKey,
    consumerSecret: c.consumerSecret,
    shortcode: c.shortcode,
    passkey: c.passkey,
    transactionType: c.transactionType || "CustomerPayBillOnline",
    callbackUrl: c.callbackUrl || "",
  };
}

export type SchoolDarajaSummary = {
  configured: boolean;
  active: boolean;
  environment: string;
  shortcodeSet: boolean;
  callbackUrl: string;
  lastVerifiedAt: string | null;
  lastError: string | null;
};

export async function getSchoolDarajaSummary(schoolId: string): Promise<SchoolDarajaSummary> {
  const row = await prisma.schoolPaymentConfig.findFirst({
    where: { schoolId, provider: "daraja" },
  });
  let shortcodeSet = false;
  let callbackUrl = "";
  if (row) {
    try {
      const c = JSON.parse(decryptSecret(row.credentialsEnc)) as Record<string, string>;
      shortcodeSet = Boolean(c.shortcode);
      callbackUrl = c.callbackUrl ?? "";
    } catch {
      shortcodeSet = false;
    }
  }
  return {
    configured: Boolean(row),
    active: row?.active ?? true,
    environment: row?.environment ?? "sandbox",
    shortcodeSet,
    callbackUrl,
    lastVerifiedAt: row?.lastVerifiedAt?.toISOString() ?? null,
    lastError: row?.lastError ?? null,
  };
}

export async function saveSchoolDarajaConfig(opts: {
  schoolId: string;
  environment: string;
  consumerKey?: string;
  consumerSecret?: string;
  shortcode?: string;
  passkey?: string;
  callbackUrl?: string;
  active: boolean;
  updatedBy?: string;
}): Promise<void> {
  const current = await prisma.schoolPaymentConfig.findFirst({
    where: { schoolId: opts.schoolId, provider: "daraja" },
  });
  const prev: Record<string, string> = current
    ? JSON.parse(decryptSecret(current.credentialsEnc))
    : {};
  // Blank secret fields keep the stored value.
  const next: Record<string, string> = {
    consumerKey: opts.consumerKey?.trim() || prev.consumerKey || "",
    consumerSecret: opts.consumerSecret?.trim() || prev.consumerSecret || "",
    shortcode: opts.shortcode?.trim() || prev.shortcode || "",
    passkey: opts.passkey?.trim() || prev.passkey || "",
    transactionType: "CustomerPayBillOnline",
    callbackUrl: opts.callbackUrl?.trim() || prev.callbackUrl || "",
  };
  if (!next.consumerKey || !next.consumerSecret || !next.shortcode || !next.passkey) {
    throw new Error("Consumer key, secret, shortcode, and passkey are all required.");
  }
  const data = {
    environment: opts.environment === "production" ? "production" : "sandbox",
    active: opts.active,
    credentialsEnc: encryptSecret(JSON.stringify(next)),
    lastError: null as string | null,
  };
  if (current) {
    await prisma.schoolPaymentConfig.update({ where: { id: current.id }, data });
  } else {
    await prisma.schoolPaymentConfig.create({
      data: { schoolId: opts.schoolId, provider: "daraja", ...data },
    });
  }
  await prisma.auditLog.create({
    data: {
      schoolId: opts.schoolId,
      actorId: opts.updatedBy ?? null,
      action: "school.mpesa_config_saved",
      metadata: { environment: data.environment },
    },
  });
}
