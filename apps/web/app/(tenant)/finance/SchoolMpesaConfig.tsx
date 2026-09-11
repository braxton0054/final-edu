"use client";

import { useEffect, useState } from "react";

async function api(path: string, init?: RequestInit) {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  return (await res.json().catch(() => ({}))) as Record<string, unknown> & {
    ok?: boolean;
  };
}

const input = {
  display: "block",
  width: "100%",
  padding: "0.55rem 0.7rem",
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: "0.92rem",
} as const;

// The school's own Daraja credentials for parent fee collection. Secrets stay
// encrypted server-side; blanks keep stored values.
export default function SchoolMpesaConfig() {
  const [loaded, setLoaded] = useState(false);
  const [shortcodeSet, setShortcodeSet] = useState(false);
  const [environment, setEnvironment] = useState("sandbox");
  const [active, setActive] = useState(true);
  const [callbackUrl, setCallbackUrl] = useState("");
  const [consumerKey, setConsumerKey] = useState("");
  const [consumerSecret, setConsumerSecret] = useState("");
  const [shortcode, setShortcode] = useState("");
  const [passkey, setPasskey] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: string; text: string } | null>(null);

  useEffect(() => {
    api("/api/school-payments/config").then((d) => {
      if (d.ok) {
        setShortcodeSet(d.shortcodeSet === true);
        setEnvironment(String(d.environment ?? "sandbox"));
        setActive(d.active !== false);
        setCallbackUrl(String(d.callbackUrl ?? ""));
      }
      setLoaded(true);
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy("save");
    setNotice(null);
    const data = await api("/api/school-payments/config", {
      method: "POST",
      body: JSON.stringify({
        environment,
        consumerKey,
        consumerSecret,
        shortcode,
        passkey,
        callbackUrl,
        active,
      }),
    });
    setBusy(null);
    setNotice(
      data.ok
        ? { kind: "ok", text: "Saved." }
        : { kind: "error", text: String(data.error ?? "Could not save.") }
    );
    if (data.ok) {
      setConsumerKey("");
      setConsumerSecret("");
      setPasskey("");
      if (shortcode) setShortcodeSet(true);
      setShortcode("");
    }
  }

  async function test() {
    setBusy("test");
    setNotice(null);
    const data = await api("/api/school-payments/test", { method: "POST" });
    setBusy(null);
    setNotice(
      data.ok
        ? { kind: "ok", text: "Live check passed against Safaricom." }
        : { kind: "error", text: String(data.error ?? "Check failed.") }
    );
  }

  if (!loaded) return null;

  return (
    <div className="dash-panel" style={{ marginBottom: "1rem" }}>
      <h2>M-Pesa collection</h2>
      <p className="dash-muted" style={{ marginTop: "-0.4rem" }}>
        The school&apos;s own Daraja credentials. Parents pay fee invoices by STK
        push; receipts reconcile automatically. {shortcodeSet ? "Shortcode saved ✓." : "Not configured yet."}
      </p>
      <form onSubmit={save} style={{ display: "grid", gap: "0.7rem" }}>
        <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
          <label style={{ flex: 1, minWidth: 150 }}>
            Environment
            <select value={environment} onChange={(e) => setEnvironment(e.target.value)} style={input}>
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          </label>
          <label style={{ flex: 1, minWidth: 150 }}>
            Shortcode {shortcodeSet && <small>(saved ✓)</small>}
            <input value={shortcode} onChange={(e) => setShortcode(e.target.value)} placeholder={shortcodeSet ? "••••••" : "e.g. 174379"} style={input} />
          </label>
        </div>
        <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
          <label style={{ flex: 1, minWidth: 150 }}>
            Consumer key
            <input value={consumerKey} onChange={(e) => setConsumerKey(e.target.value)} placeholder="Leave blank to keep" autoComplete="off" style={input} />
          </label>
          <label style={{ flex: 1, minWidth: 150 }}>
            Consumer secret
            <input type="password" value={consumerSecret} onChange={(e) => setConsumerSecret(e.target.value)} placeholder="Leave blank to keep" autoComplete="off" style={input} />
          </label>
        </div>
        <label>
          Passkey
          <input type="password" value={passkey} onChange={(e) => setPasskey(e.target.value)} placeholder="Leave blank to keep" autoComplete="off" style={input} />
        </label>
        <label>
          Callback URL
          <input value={callbackUrl} onChange={(e) => setCallbackUrl(e.target.value)} placeholder="https://…/api/webhooks/school-mpesa" style={input} />
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Enabled
        </label>
        {notice && (
          <p style={{ margin: 0, color: notice.kind === "ok" ? "#15803d" : "#b45309" }}>{notice.text}</p>
        )}
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button type="submit" disabled={busy !== null}>{busy === "save" ? "Saving…" : "Save"}</button>
          <button type="button" onClick={test} disabled={busy !== null}>
            {busy === "test" ? "Testing…" : "Test connection"}
          </button>
        </div>
      </form>
    </div>
  );
}
