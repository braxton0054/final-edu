import { prisma } from "@mtanda/database";
import { decryptSecret } from "@/lib/auth/encryption";
import PaymentSettingsClient, {
  type ProviderSummary,
} from "./PaymentSettingsClient";

const SECRET_FIELDS: Record<string, string[]> = {
  daraja: ["consumerKey", "consumerSecret", "shortcode", "passkey"],
  payhero: ["apiUsername", "apiPassword"],
};

async function summarize(provider: "daraja" | "payhero"): Promise<ProviderSummary> {
  const row = await prisma.paymentProviderConfig.findUnique({ where: { provider } });
  let fields: Record<string, string> = {};
  if (row) {
    try {
      fields = JSON.parse(decryptSecret(row.credentialsEnc));
    } catch {
      fields = {};
    }
  }
  const secrets = SECRET_FIELDS[provider];
  const secretsSet = secrets.filter((f) => Boolean(fields[f]));
  return {
    provider,
    configured: Boolean(row),
    active: row?.active ?? true,
    environment: row?.environment ?? "sandbox",
    lastVerifiedAt: row?.lastVerifiedAt?.toISOString() ?? null,
    lastError: row?.lastError ?? null,
    secretsSet,
    shortcode: fields.shortcode ?? "",
    channelId: fields.channelId ?? "",
    callbackUrl: fields.callbackUrl ?? "",
    transactionType: fields.transactionType ?? "CustomerPayBillOnline",
  };
}

export const dynamic = "force-dynamic";

export default async function PaymentSettingsPage() {
  const [daraja, payhero] = await Promise.all([
    summarize("daraja"),
    summarize("payhero"),
  ]);

  return (
    <>
      <div className="admin-top"><h1>Payment Settings</h1></div>
      <div className="admin-body">
        <p style={{ color: "#5b6470", marginTop: 0, maxWidth: 720 }}>
          Subscription payments are collected over M-Pesa. Daraja is tried
          first; PayHero is the automatic fallback. Secrets are stored
          encrypted — leave a field blank to keep its saved value.
        </p>
        <PaymentSettingsClient daraja={daraja} payhero={payhero} />
      </div>
    </>
  );
}
