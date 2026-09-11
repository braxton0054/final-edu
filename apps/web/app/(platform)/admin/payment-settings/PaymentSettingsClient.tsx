"use client";

import { useState } from "react";

export type ProviderSummary = {
  provider: "daraja" | "payhero";
  configured: boolean;
  active: boolean;
  environment: string;
  lastVerifiedAt: string | null;
  lastError: string | null;
  secretsSet: string[];
  shortcode: string;
  channelId: string;
  callbackUrl: string;
  transactionType: string;
};

type Notice = { kind: "ok" | "error"; text: string } | null;

const input = {
  width: "100%",
  padding: "0.65rem 0.8rem",
  borderRadius: "10px",
  border: "1.5px solid var(--line)",
  background: "var(--bg)",
  color: "var(--ink)",
  fontSize: "0.95rem",
} as const;

const label = {
  display: "grid",
  gap: "0.35rem",
  fontSize: "0.9rem",
  fontWeight: 600,
} as const;

function StatusBadge({ summary }: { summary: ProviderSummary }) {
  if (!summary.configured) return <span className="admin-badge">NOT CONFIGURED</span>;
  if (!summary.active) return <span className="admin-badge">DISABLED</span>;
  if (summary.lastError) return <span className="admin-badge red">FAILED</span>;
  if (summary.lastVerifiedAt) return <span className="admin-badge green">VERIFIED</span>;
  return <span className="admin-badge">NOT VERIFIED</span>;
}

function SecretField({
  name,
  title,
  saved,
  type,
  value,
  onChange,
}: {
  name: string;
  title: string;
  saved: boolean;
  type?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label style={label}>
      <span>
        {title} {!saved && <span style={{ color: "#b45309" }}>*</span>}
        {saved && (
          <small style={{ color: "#15803d", fontWeight: 400 }}> — saved ✓ (blank keeps it)</small>
        )}
      </span>
      <input
        name={name}
        type={type ?? "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={saved ? "••••••••" : undefined}
        autoComplete="off"
        style={input}
      />
    </label>
  );
}

function ProviderCard({
  initial,
  title,
  help,
  children,
}: {
  initial: ProviderSummary;
  title: string;
  help: React.ReactNode;
  children: (form: Record<string, string>, set: (k: string, v: string) => void) => React.ReactNode;
}) {
  const [summary, setSummary] = useState(initial);
  const [form, setForm] = useState<Record<string, string>>({
    environment: initial.environment,
    shortcode: initial.shortcode,
    channelId: initial.channelId,
    callbackUrl: initial.callbackUrl,
    transactionType: initial.transactionType,
  });
  const [active, setActive] = useState(initial.active);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const fd = new FormData();
      fd.set("provider", summary.provider);
      fd.set("environment", form.environment);
      fd.set("shortcode", form.shortcode);
      fd.set("channelId", form.channelId);
      fd.set("callbackUrl", form.callbackUrl);
      fd.set("transactionType", form.transactionType);
      fd.set("active", active ? "on" : "off");
      for (const [k, v] of Object.entries(form)) {
        if (["consumerKey", "consumerSecret", "passkey", "apiUsername", "apiPassword"].includes(k) && v) {
          fd.set(k, v);
        }
      }
      const res = await fetch("/api/admin/payment-settings", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!data.ok) throw new Error(data.error || "Save failed.");
      setNotice({ kind: "ok", text: "Saved." });
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Save failed." });
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/payment-settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ provider: summary.provider }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!data.ok) throw new Error(data.error || "Connection test failed.");
      setSummary((s) => ({ ...s, configured: true, lastError: null, lastVerifiedAt: new Date().toISOString() }));
      setNotice({ kind: "ok", text: "Connection verified live against the provider." });
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Connection test failed." });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="admin-panel">
      <h2 style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
        {title} <StatusBadge summary={summary} />
      </h2>

      {summary.lastError ? (
        <p style={{ color: "#b45309", fontSize: "0.9rem" }}>Last error: {summary.lastError}</p>
      ) : summary.lastVerifiedAt ? (
        <p style={{ color: "#5b6470", fontSize: "0.9rem" }}>
          Verified {new Date(summary.lastVerifiedAt).toLocaleString()}.
        </p>
      ) : summary.configured ? (
        <p style={{ color: "#5b6470", fontSize: "0.9rem" }}>Saved, not tested yet.</p>
      ) : null}

      <form onSubmit={save} style={{ display: "grid", gap: "0.9rem", marginTop: "0.5rem" }}>
        {children(form, set)}

        <label style={{ ...label, display: "flex", alignItems: "center", gap: "0.55rem", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            style={{ width: "1.05rem", height: "1.05rem", accentColor: "var(--brand-accent)" }}
          />
          Enabled
        </label>

        {notice && (
          <p
            style={{
              margin: 0,
              fontSize: "0.9rem",
              color: notice.kind === "ok" ? "#15803d" : "#b45309",
            }}
          >
            {notice.text}
          </p>
        )}

        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={test} disabled={testing}>
            {testing ? "Testing…" : "Test connection"}
          </button>
        </div>
      </form>

      <div
        style={{
          marginTop: "1rem",
          borderTop: "1px solid var(--line)",
          paddingTop: "0.8rem",
          fontSize: "0.85rem",
          color: "#5b6470",
        }}
      >
        {help}
      </div>
    </div>
  );
}

export default function PaymentSettingsClient({
  daraja,
  payhero,
}: {
  daraja: ProviderSummary;
  payhero: ProviderSummary;
}) {
  return (
    <div className="admin-grid-2" style={{ alignItems: "start" }}>
      <ProviderCard
        initial={daraja}
        title="M-Pesa Daraja"
        help={
          <>
            Get keys at <strong>developer.safaricom.co.ke → My Apps</strong>.
            The passkey arrives in Safaricom&apos;s go-live email. Test runs a
            live OAuth token request against the selected environment.
          </>
        }
      >
        {(form, set) => (
          <>
            <label style={label}>
              Environment
              <select
                value={form.environment}
                onChange={(e) => set("environment", e.target.value)}
                style={input}
              >
                <option value="sandbox">Sandbox — sandbox.safaricom.co.ke</option>
                <option value="production">Production — api.safaricom.co.ke</option>
              </select>
            </label>
            <SecretField name="consumerKey" title="Consumer key" saved={daraja.secretsSet.includes("consumerKey")} value={form.consumerKey ?? ""} onChange={(v) => set("consumerKey", v)} />
            <SecretField name="consumerSecret" title="Consumer secret" saved={daraja.secretsSet.includes("consumerSecret")} type="password" value={form.consumerSecret ?? ""} onChange={(v) => set("consumerSecret", v)} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
              <SecretField name="shortcode" title="Shortcode" saved={daraja.secretsSet.includes("shortcode")} value={form.shortcode} onChange={(v) => set("shortcode", v)} />
              <SecretField name="passkey" title="Passkey" saved={daraja.secretsSet.includes("passkey")} type="password" value={form.passkey ?? ""} onChange={(v) => set("passkey", v)} />
            </div>
            <label style={label}>
              Transaction type
              <select
                value={form.transactionType}
                onChange={(e) => set("transactionType", e.target.value)}
                style={input}
              >
                <option value="CustomerPayBillOnline">CustomerPayBillOnline (Paybill)</option>
                <option value="CustomerBuyGoodsOnline">CustomerBuyGoodsOnline (Till)</option>
              </select>
            </label>
            <label style={label}>
              Callback URL
              <input
                value={form.callbackUrl}
                onChange={(e) => set("callbackUrl", e.target.value)}
                placeholder="https://…/api/webhooks/mpesa"
                style={input}
              />
            </label>
          </>
        )}
      </ProviderCard>

      <ProviderCard
        initial={payhero}
        title="PayHero"
        help={
          <>
            Get keys at <strong>app.payhero.co.ke → API keys</strong>; the
            channel lives under Payment Channels. The service wallet needs
            float. Test checks the live wallet balance.
          </>
        }
      >
        {(form, set) => (
          <>
            <SecretField name="apiUsername" title="API username" saved={payhero.secretsSet.includes("apiUsername")} value={form.apiUsername ?? ""} onChange={(v) => set("apiUsername", v)} />
            <SecretField name="apiPassword" title="API password" saved={payhero.secretsSet.includes("apiPassword")} type="password" value={form.apiPassword ?? ""} onChange={(v) => set("apiPassword", v)} />
            <label style={label}>
              Channel ID
              <input
                value={form.channelId}
                onChange={(e) => set("channelId", e.target.value)}
                style={input}
              />
            </label>
            <label style={label}>
              Callback URL
              <input
                value={form.callbackUrl}
                onChange={(e) => set("callbackUrl", e.target.value)}
                placeholder="https://…/api/webhooks/payhero"
                style={input}
              />
            </label>
            <label style={label}>
              Environment
              <select
                value={form.environment}
                onChange={(e) => set("environment", e.target.value)}
                style={input}
              >
                <option value="sandbox">Sandbox / test</option>
                <option value="production">Production</option>
              </select>
            </label>
          </>
        )}
      </ProviderCard>
    </div>
  );
}
