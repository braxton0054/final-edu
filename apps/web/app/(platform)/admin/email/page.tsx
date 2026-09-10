import { prisma } from "@mtanda/database";

const input = {
  width: "100%",
  padding: "0.7rem 0.85rem",
  borderRadius: "10px",
  border: "1.5px solid var(--line)",
  background: "var(--bg)",
  color: "var(--ink)",
  fontSize: "0.95rem",
} as const;

const PROVIDERS: Record<
  string,
  { label: string; blurb: string; host: string | null; userFixed: string | null; passHint: string; fromHint: string }
> = {
  smtp: {
    label: "Generic SMTP",
    blurb: "Any SMTP host",
    host: null,
    userFixed: null,
    passHint: "Account password",
    fromHint: "Any verified sender",
  },
  zeptomail: {
    label: "ZeptoMail",
    blurb: "smtp.zeptomail.com",
    host: "smtp.zeptomail.com",
    userFixed: "emailapikey",
    passHint: "Password from Agents → SMTP/API → SMTP tab",
    fromHint: "Domain or sender address",
  },
  resend: {
    label: "Resend",
    blurb: "smtp.resend.com",
    host: "smtp.resend.com",
    userFixed: "resend",
    passHint: "API key (re_…)",
    fromHint: "Verified domain sender",
  },
  brevo: {
    label: "Brevo",
    blurb: "smtp-relay.brevo.com",
    host: "smtp-relay.brevo.com",
    userFixed: null,
    passHint: "SMTP key (SMTP & API → SMTP, not the API key)",
    fromHint: "Verified sender or domain",
  },
  gmail: {
    label: "Gmail",
    blurb: "smtp.gmail.com",
    host: "smtp.gmail.com",
    userFixed: null,
    passHint: "App password (Google Account → Security)",
    fromHint: "That Gmail address",
  },
};

const KEYS = Object.keys(PROVIDERS);

export default async function EmailSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string; error?: string }>;
}) {
  const { provider: providerParam, error: errorParam } = await searchParams;
  const current = await prisma.platformEmailSettings.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  const provider = KEYS.includes(providerParam ?? "")
    ? (providerParam as string)
    : current && KEYS.includes(current.provider)
      ? current.provider
      : "smtp";
  const preset = PROVIDERS[provider];

  const state = !current
    ? "empty"
    : !current.active
      ? "disabled"
      : current.lastError
        ? "failed"
        : current.lastVerifiedAt
          ? "verified"
          : "untested";

  return (
    <>
      <div className="admin-top"><h1>Email Settings</h1></div>
      <div className="admin-body" style={{ maxWidth: 760 }}>
        {/* Status banner */}
        {state === "verified" && (
          <div className="admin-panel" style={{ borderColor: "var(--brand-accent)" }}>
            <strong>Working.</strong>{" "}
            <span style={{ color: "var(--muted)" }}>
              Verified {current!.lastVerifiedAt!.toLocaleString()} via {PROVIDERS[current!.provider]?.label ?? current!.provider}.
            </span>
          </div>
        )}
        {state === "failed" && (
          <div className="admin-panel" style={{ borderColor: "#c8102e" }}>
            <strong>Not working.</strong>
            <p style={{ margin: "0.4rem 0 0", color: "var(--muted)" }}>{current!.lastError}</p>
          </div>
        )}
        {state === "empty" && (
          <div className="admin-panel">
            <strong>No email provider configured.</strong>{" "}
            <span style={{ color: "var(--muted)" }}>Pick one below — OTPs and notifications need it.</span>
          </div>
        )}
        {errorParam && <div className="reg-error">{errorParam}</div>}

        {/* Provider cards */}
        <h2 style={{ fontSize: "1rem", margin: "1.5rem 0 0.75rem" }}>Provider</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "0.75rem" }}>
          {KEYS.map((k) => (
            <a
              key={k}
              href={`/admin/email?provider=${k}`}
              style={{
                textDecoration: "none",
                border: `1.5px solid ${provider === k ? "var(--brand-accent)" : "var(--line)"}`,
                background: provider === k ? "rgba(245,158,11,0.08)" : "var(--bg)",
                borderRadius: 12,
                padding: "0.85rem 1rem",
                color: "var(--ink)",
              }}
            >
              <strong style={{ display: "block" }}>{PROVIDERS[k].label}</strong>
              <small style={{ color: "var(--muted)" }}>{PROVIDERS[k].blurb}</small>
            </a>
          ))}
        </div>

        {/* Config form */}
        <form action="/api/admin/email" method="POST" style={{ marginTop: "1.5rem" }}>
          <input type="hidden" name="provider" value={provider} />
          <h2 style={{ fontSize: "1rem", margin: "0 0 0.75rem" }}>Connection</h2>
          <div style={{ display: "grid", gap: "1rem" }}>
            {provider === "smtp" && (
              <label>Host *
                <input name="host" required defaultValue={current?.host ?? ""} style={input} /></label>
            )}
            {provider !== "smtp" && (
              <p style={{ margin: 0 }}>
                <small style={{ color: "var(--muted)" }}>Host: <code>{preset.host}</code></small>
              </p>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <label>Port
                {provider === "smtp" ? (
                  <input name="port" type="number" required defaultValue={current?.port ?? 587} style={input} />
                ) : (
                  <select name="port" defaultValue={current?.port ?? 587} style={input}>
                    <option value={587}>587 (TLS)</option>
                    <option value={465}>465 (SSL)</option>
                  </select>
                )}</label>
              {preset.userFixed ? (
                <p style={{ margin: 0, alignSelf: "end" }}>
                  <small style={{ color: "var(--muted)" }}>Username: <code>{preset.userFixed}</code></small>
                </p>
              ) : (
                <label>Username *
                  <input name="username" required defaultValue={current?.username ?? ""} style={input} /></label>
              )}
            </div>
            <label>{provider === "smtp" ? "Password" : preset.passHint} {current ? <small>(blank keeps stored)</small> : <small>*</small>}
              <input name="password" type="password" autoComplete="new-password" style={input} /></label>
            {provider === "smtp" && (
              <label><input type="checkbox" name="secure" defaultChecked={current?.secure ?? false} /> Use port 465 SSL</label>
            )}
          </div>

          <h2 style={{ fontSize: "1rem", margin: "1.75rem 0 0.75rem" }}>Sender</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <label>{provider === "zeptomail" ? "Domain / Sender *" : "From email *"} {provider !== "zeptomail" && <small>({preset.fromHint})</small>}
              <input name="fromEmail" type={provider === "zeptomail" ? "text" : "email"} required
                defaultValue={current?.fromEmail ?? ""} style={input}
                placeholder={provider === "zeptomail" ? "mtandaolabs.com or name@mtandaolabs.com" : ""} /></label>
            <label>From name
              <input name="fromName" defaultValue={current?.fromName ?? "MtandaoLabs"} style={input} /></label>
          </div>
          {provider === "zeptomail" && (
            <p style={{ marginBottom: 0 }}>
              <small style={{ color: "var(--muted)" }}>Domain only → sends as noreply@yourdomain.</small>
            </p>
          )}

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "1.75rem" }}>
            <button type="submit" className="reg-btn reg-btn-primary" style={{ border: "none" }}>Save settings</button>
            <label style={{ fontSize: "0.9rem" }}>
              <input type="checkbox" name="active" defaultChecked={current?.active ?? true} /> Enabled
            </label>
          </div>
        </form>

        {/* Verify */}
        {current && (
          <>
            <h2 style={{ fontSize: "1rem", margin: "2rem 0 0.75rem" }}>Verify</h2>
            <div className="admin-panel" style={{ display: "grid", gap: "1rem" }}>
              <form action="/api/admin/email/test" method="POST">
                <button type="submit">Test connection</button>
                <div><small style={{ color: "var(--muted)" }}>Live login check, nothing sent.</small></div>
              </form>
              <form action="/api/admin/email/send-test" method="POST" style={{ display: "flex", gap: "0.5rem", alignItems: "end" }}>
                <label style={{ flex: 1 }}>Send test email to
                  <input name="to" type="email" required placeholder="name@example.com" style={input} /></label>
                <button type="submit">Send</button>
              </form>
            </div>
          </>
        )}
      </div>
    </>
  );
}
