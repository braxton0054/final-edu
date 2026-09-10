import { NextResponse } from "next/server";
import { prisma } from "@mtanda/database";
import { getDarajaConfig, darajaToken } from "@/lib/payments/daraja";
import { getPayHeroConfig, payheroBalance } from "@/lib/payments/payhero";

// Live credential check against the real provider:
// Daraja → OAuth token request; PayHero → service-wallet balance.
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let provider = "";
  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    provider = String(body.provider ?? "");
  } else {
    const form = await request.formData().catch(() => null);
    provider = String(form?.get("provider") ?? "");
  }
  let error: string | null = null;

  try {
    if (provider === "daraja") {
      const cfg = await getDarajaConfig();
      if (!cfg) throw new Error("Daraja is not configured or not active.");
      await darajaToken(cfg);
    } else if (provider === "payhero") {
      const cfg = await getPayHeroConfig();
      if (!cfg) throw new Error("PayHero is not configured or not active.");
      await payheroBalance(cfg);
    } else {
      throw new Error("Unknown provider.");
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Check failed.";
  }

  if (provider === "daraja" || provider === "payhero") {
    await prisma.paymentProviderConfig.updateMany({
      where: { provider },
      data: {
        lastVerifiedAt: error ? undefined : new Date(),
        lastError: error?.slice(0, 500) ?? null,
      },
    });
  }
  return NextResponse.json(
    error ? { ok: false, error } : { ok: true },
    { status: error ? 502 : 200 }
  );
}
