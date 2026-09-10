import { prisma } from "@mtanda/database";
import { decryptSecret } from "@/lib/auth/encryption";
import { toMsisdn } from "./daraja";

const BASE = "https://backend.payhero.co.ke/api/v2";

export type PayHeroConfig = {
  apiUsername: string;
  apiPassword: string;
  channelId: string;
  callbackUrl: string;
};

export async function getPayHeroConfig(): Promise<PayHeroConfig | null> {
  const row = await prisma.paymentProviderConfig.findFirst({
    where: { provider: "payhero", active: true },
  });
  if (!row) return null;
  const c = JSON.parse(decryptSecret(row.credentialsEnc)) as Record<string, string>;
  if (!c.apiUsername || !c.apiPassword || !c.channelId) return null;
  return {
    apiUsername: c.apiUsername,
    apiPassword: c.apiPassword,
    channelId: c.channelId,
    callbackUrl: c.callbackUrl,
  };
}

function basic(cfg: PayHeroConfig): string {
  return Buffer.from(`${cfg.apiUsername}:${cfg.apiPassword}`).toString("base64");
}

async function call<T>(cfg: PayHeroConfig, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic(cfg)}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T & { success?: boolean };
  if (!res.ok || data.success === false) {
    throw new Error(`PayHero ${path} failed: ${JSON.stringify(data)}`.slice(0, 300));
  }
  return data;
}

// Real credential check: wallet balance requires valid Basic auth
// (same endpoint as PayHero's official PHP client).
export async function payheroBalance(cfg: PayHeroConfig): Promise<unknown> {
  const res = await fetch(`${BASE}/wallets?wallet_type=service_wallet`, {
    headers: { Authorization: `Basic ${basic(cfg)}` },
  });
  if (!res.ok) {
    throw new Error(`PayHero auth failed: HTTP ${res.status} — ${await res.text()}`.slice(0, 300));
  }
  return res.json();
}

export async function payheroStkPush(
  cfg: PayHeroConfig,
  opts: {
    phone: string;
    amount: number;
    externalRef: string;
    customerName?: string;
    callbackUrl?: string;
  }
): Promise<{ reference: string; checkoutRequestId?: string; status: string }> {
  return call(cfg, "/payments", {
    amount: Math.round(opts.amount),
    phone_number: toMsisdn(opts.phone),
    channel_id: Number(opts.channelId),
    provider: "m-pesa",
    external_reference: opts.externalRef,
    customer_name: opts.customerName,
    callback_url: opts.callbackUrl || cfg.callbackUrl || undefined,
  });
}

export async function payheroStatus(
  cfg: PayHeroConfig,
  reference: string
): Promise<Record<string, unknown>> {
  return call(cfg, "/payments/status", { reference });
}
