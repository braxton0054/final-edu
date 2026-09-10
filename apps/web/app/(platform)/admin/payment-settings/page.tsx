import { prisma } from "@mtanda/database";
import { decryptSecret } from "@/lib/auth/encryption";

const input = {
  width: "100%",
  padding: "0.6rem 0.75rem",
  borderRadius: "8px",
  border: "1px solid var(--line)",
  background: "var(--bg)",
  color: "var(--ink)",
} as const;

type Row = {
  active: boolean;
  lastVerifiedAt: Date | null;
  lastError: string | null;
} | null;

function StatusBadge({ row }: { row: Row }) {
  if (!row) return <span className="admin-badge">NOT CONFIGURED</span>;
  if (!row.active) return <span className="admin-badge">DISABLED</span>;
  if (row.lastError)
    return <span className="admin-badge red">FAILED</span>;
  if (row.lastVerifiedAt)
    return <span className="admin-badge green">VERIFIED</span>;
  return <span className="admin-badge">NOT VERIFIED</span>;
}

function creds(row: { credentialsEnc: string } | null): Record<string, string> {
  if (!row) return {};
  try {
    return JSON.parse(decryptSecret(row.credentialsEnc));
  } catch {
    return {};
  }
}

export default async function PaymentSettingsPage() {
  const [daraja, payhero] = await Promise.all([
    prisma.paymentProviderConfig.findUnique({ where: { provider: "daraja" } }),
    prisma.paymentProviderConfig.findUnique({ where: { provider: "payhero" } }),
  ]);
  const d = creds(daraja);
  const p = creds(payhero);

  return (
    <>
      <div className="admin-top"><h1>Payment Settings</h1></div>
      <div className="admin-body">
        <div className="admin-grid-2" style={{ alignItems: "start" }}>
          {/* Daraja */}
          <div className="admin-panel">
            <h2>M-Pesa Daraja <StatusBadge row={daraja} /></h2>
            <form action="/api/admin/payment-settings" method="POST" style={{ display: "grid", gap: "0.9rem" }}>
              <input type="hidden" name="provider" value="daraja" />
              <label>Environment
                <select name="environment" defaultValue={daraja?.environment ?? "sandbox"} style={input}>
                  <option value="sandbox">Sandbox — sandbox.safaricom.co.ke</option>
                  <option value="production">Production — api.safaricom.co.ke</option>
                </select></label>
              <label>Consumer key *<input name="consumerKey" style={input} /></label>
              <label>Consumer secret *<input name="consumerSecret" type="password" style={input} /></label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                <label>Shortcode *<input name="shortcode" defaultValue={d.shortcode ?? ""} style={input} /></label>
                <label>Passkey *<input name="passkey" type="password" style={input} /></label>
              </div>
              <label>Transaction type
                <select name="transactionType" defaultValue={d.transactionType ?? "CustomerPayBillOnline"} style={input}>
                  <option value="CustomerPayBillOnline">CustomerPayBillOnline (Paybill)</option>
                  <option value="CustomerBuyGoodsOnline">CustomerBuyGoodsOnline (Till)</option>
                </select></label>
              <label>Callback URL
                <input name="callbackUrl" defaultValue={d.callbackUrl ?? ""} style={input} /></label>
              <label><input type="checkbox" name="active" defaultChecked={daraja?.active ?? true} /> Enabled</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit">Save</button>
              </div>
            </form>
            <form action="/api/admin/payment-settings/test" method="POST" style={{ marginTop: "0.75rem" }}>
              <input type="hidden" name="provider" value="daraja" />
              <button type="submit">Test connection</button>
            </form>
            <VerifyLine row={daraja} />
            <p><small style={{ color: "var(--muted)" }}>Keys: developer.safaricom.co.ke → My Apps. Passkey: Safaricom go-live email.</small></p>
          </div>

          {/* PayHero */}
          <div className="admin-panel">
            <h2>PayHero <StatusBadge row={payhero} /></h2>
            <form action="/api/admin/payment-settings" method="POST" style={{ display: "grid", gap: "0.9rem" }}>
              <input type="hidden" name="provider" value="payhero" />
              <label>API username *<input name="apiUsername" style={input} /></label>
              <label>API password *<input name="apiPassword" type="password" style={input} /></label>
              <label>Channel ID *<input name="channelId" defaultValue={p.channelId ?? ""} style={input} /></label>
              <label>Callback URL
                <input name="callbackUrl" defaultValue={p.callbackUrl ?? ""} style={input} /></label>
              <label>Environment
                <select name="environment" defaultValue={payhero?.environment ?? "sandbox"} style={input}>
                  <option value="sandbox">Sandbox / test</option>
                  <option value="production">Production</option>
                </select></label>
              <label><input type="checkbox" name="active" defaultChecked={payhero?.active ?? true} /> Enabled</label>
              <div><button type="submit">Save</button></div>
            </form>
            <form action="/api/admin/payment-settings/test" method="POST" style={{ marginTop: "0.75rem" }}>
              <input type="hidden" name="provider" value="payhero" />
              <button type="submit">Test connection</button>
            </form>
            <VerifyLine row={payhero} />
            <p><small style={{ color: "var(--muted)" }}>Keys: app.payhero.co.ke → API keys. Channel: Payment Channels. Wallet needs float.</small></p>
          </div>
        </div>
      </div>
    </>
  );
}

function VerifyLine({ row }: { row: Row }) {
  if (!row) return null;
  const text = row.lastError
    ? `Error: ${row.lastError}`
    : row.lastVerifiedAt
      ? `Verified ${row.lastVerifiedAt.toLocaleString()}.`
      : "Not tested yet.";
  return (
    <p><small style={{ color: "var(--muted)" }}>{text}</small></p>
  );
}
