import { prisma } from "@mtanda/database";
import { decryptSecret } from "@/lib/auth/encryption";

export type DarajaConfig = {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  shortcode: string;
  passkey: string;
  transactionType: string;
  callbackUrl: string;
};

export async function getDarajaConfig(): Promise<DarajaConfig | null> {
  const row = await prisma.paymentProviderConfig.findFirst({
    where: { provider: "daraja", active: true },
  });
  if (!row) return null;
  const c = JSON.parse(decryptSecret(row.credentialsEnc)) as Record<string, string>;
  if (!c.consumerKey || !c.consumerSecret || !c.shortcode || !c.passkey) return null;
  return {
    baseUrl:
      row.environment === "production"
        ? "https://api.safaricom.co.ke"
        : "https://sandbox.safaricom.co.ke",
    consumerKey: c.consumerKey,
    consumerSecret: c.consumerSecret,
    shortcode: c.shortcode,
    passkey: c.passkey,
    transactionType: c.transactionType || "CustomerPayBillOnline",
    callbackUrl: c.callbackUrl,
  };
}

let cached: { token: string; exp: number } | null = null;

export async function darajaToken(cfg: DarajaConfig): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const basic = Buffer.from(`${cfg.consumerKey}:${cfg.consumerSecret}`).toString("base64");
  const res = await fetch(`${cfg.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${basic}` },
  });
  if (!res.ok) {
    throw new Error(`Daraja OAuth failed: HTTP ${res.status} — ${await res.text()}`.slice(0, 300));
  }
  const data = (await res.json()) as { access_token: string; expires_in?: string };
  cached = {
    token: data.access_token,
    exp: Date.now() + Number(data.expires_in ?? 3600) * 1000,
  };
  return cached.token;
}

export function toMsisdn(phone: string): string {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("254")) return d;
  if (d.startsWith("0")) return `254${d.slice(1)}`;
  if (d.startsWith("7") || d.startsWith("1")) return `254${d}`;
  return d;
}

function stkPassword(shortcode: string, passkey: string, timestamp: string): string {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

export async function darajaStkPush(
  cfg: DarajaConfig,
  opts: { phone: string; amount: number; accountRef: string; description: string }
): Promise<{ checkoutRequestId: string; merchantRequestId: string }> {
  const token = await darajaToken(cfg);
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 14);
  const phone = toMsisdn(opts.phone);
  const res = await fetch(`${cfg.baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: cfg.shortcode,
      Password: stkPassword(cfg.shortcode, cfg.passkey, timestamp),
      Timestamp: timestamp,
      TransactionType: cfg.transactionType,
      Amount: Math.round(opts.amount),
      PartyA: phone,
      PartyB: cfg.shortcode,
      PhoneNumber: phone,
      CallBackURL: cfg.callbackUrl,
      AccountReference: opts.accountRef.slice(0, 12),
      TransactionDesc: opts.description.slice(0, 13),
    }),
  });
  const data = (await res.json()) as Record<string, string>;
  if (!res.ok || !data.CheckoutRequestID) {
    throw new Error(`Daraja STK failed: ${JSON.stringify(data)}`.slice(0, 300));
  }
  return {
    checkoutRequestId: data.CheckoutRequestID,
    merchantRequestId: data.MerchantRequestID,
  };
}

export async function darajaStkQuery(
  cfg: DarajaConfig,
  checkoutRequestId: string
): Promise<Record<string, unknown>> {
  const token = await darajaToken(cfg);
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 14);
  const res = await fetch(`${cfg.baseUrl}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: cfg.shortcode,
      Password: stkPassword(cfg.shortcode, cfg.passkey, timestamp),
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
  });
  return (await res.json()) as Record<string, unknown>;
}
