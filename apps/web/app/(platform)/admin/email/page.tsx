import { prisma } from "@mtanda/database";

const input = {
  width: "100%",
  padding: "0.6rem 0.75rem",
  borderRadius: "8px",
  border: "1px solid var(--line)",
  background: "var(--bg)",
  color: "var(--ink)",
} as const;

// Every provider here speaks SMTP — one transport, different credentials.
// host/userFixed come from each provider's official docs.
const PROVIDERS: Record<
  string,
  { label: string; host: string; userFixed: string | null; userHint: string; passHint: string; fromHint: string }
> = {
  smtp: {
    label: "Generic SMTP",
    host: "",
    userFixed: null,
    userHint: "Account username",
    passHint: "Account password",
    fromHint: "Any verified sender",
  },
  zeptomail: {
    label: "ZeptoMail",
    host: "smtp.zeptomail.com",
    userFixed: "emailapikey",
    userHint: "Fixed: emailapikey",
    passHint: "Password from Agents → SMTP/API → SMTP tab",
    fromHint: "Verified sender address on that agent",
  },
  resend: {
    label: "Resend",
    host: "smtp.resend.com",
    userFixed: "resend",
    userHint: "Fixed: resend",
    passHint: "Resend API key (re_…)",
    fromHint: "Verified domain sender",
  },
  brevo: {
    label: "Brevo",
    host: "smtp-relay.brevo.com",
    userFixed: null,
    userHint: "Brevo login email",
    passHint: "SMTP key (SMTP & API → SMTP keys)",
    fromHint: "Verified sender in Brevo",
  },
  gmail: {
    label: "Gmail",
    host: "smtp.gmail.com",
    userFixed: null,
    userHint: "Gmail address",
    passHint: "App password (Google Account → Security)",
    fromHint: "That Gmail address",
  },
};

const KEYS = Object.keys(PROVIDERS);

export default async function EmailSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string }>;
}) {
  const { provider: providerParam } = await searchParams;
  const current = await prisma.platformEmailSettings.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  const provider = KEYS.includes(providerParam ?? "")
    ? (providerParam as string)
    : current && KEYS.includes(current.provider)
      ? current.provider
      : "smtp";
  const preset = PROVIDERS[provider];

  const badge = !current ? (
    <span className="admin-badge">NOT CONFIGURED</span>
  ) : !current.active ? (
    <span className="admin-badge">DISABLED</span>
  ) : current.lastError ? (
    <span className="admin-badge red">FAILED</span>
  ) : current.lastVerifiedAt ? (
    <span className="admin-badge green">VERIFIED</span>
  ) : (
    <span className="admin-badge">NOT VERIFIED</span>
  );

  return (
    <>
      <div className="admin-top"><h1>Email Settings</h1></div>
      <div className="admin-body">
        <div className="admin-panel" style={{ maxWidth: 640 }}>
          <h2>{preset.label} {badge}</h2>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {KEYS.map((k) => (
              <a
                key={k}
                href={`/admin/email?provider=${k}`}
                className="admin-badge"
                style={provider === k ? { background: "#101418", color: "#fff" } : undefined}
              >
                {PROVIDERS[k].label}
              </a>
            ))}
          </div>
          <form action="/api/admin/email" method="POST" style={{ display: "grid", gap: "0.9rem" }}>
            <input type="hidden" name="provider" value={provider} />
            {provider === "zeptomail" ? (
              <>
                <div className="reg-review">
                  <div className="reg-review-row"><span>Server name</span><span><code>smtp.zeptomail.com</code></span></div>
                  <div className="reg-review-row"><span>Username</span><span><code>emailapikey</code></span></div>
                </div>
                <label>Port number &amp; Authentication
                  <select name="port" defaultValue={current?.port ?? 587} style={input}>
                    <option value={587}>587 (TLS)</option>
                    <option value={465}>465 (SSL)</option>
                  </select></label>
                <label>Domain / Sender Address *
                  <input name="fromEmail" type="email" required defaultValue={current?.fromEmail ?? ""} style={input} /></label>
                <label>Password 1 *
                  <input name="password" type="password" autoComplete="new-password"
                    placeholder={current ? "(stored — blank keeps it)" : ""} style={input} /></label>
                <label>From name
                  <input name="fromName" defaultValue={current?.fromName ?? "MtandaoLabs"} style={input} /></label>
              </>
            ) : (
              <>
                {preset.userFixed && (
                  <p style={{ margin: 0 }}>
                    <small style={{ color: "var(--muted)" }}>
                      Username is fixed to <code>{preset.userFixed}</code> by {preset.label}.
                    </small>
                  </p>
                )}
                <label>{preset.passHint} *
                  <input name="password" type="password" autoComplete="new-password"
                    placeholder={current ? "(stored — blank keeps it)" : ""} style={input} /></label>
                {!preset.userFixed && (
                  <label>{preset.userHint} *
                    <input name="username" required defaultValue={current?.username ?? ""} style={input} /></label>
                )}
                {provider === "smtp" && (
                  <>
                    <label>Host *
                      <input name="host" required defaultValue={current?.host ?? ""} style={input} /></label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                      <label>Port *
                        <input name="port" type="number" required defaultValue={current?.port ?? 587} style={input} /></label>
                      <label style={{ alignSelf: "end" }}>
                        <input type="checkbox" name="secure" defaultChecked={current?.secure ?? false} /> Port 465 TLS
                      </label>
                    </div>
                  </>
                )}
                {provider !== "smtp" && (
                  <label>Port
                    <select name="port" defaultValue={current?.port ?? 587} style={input}>
                      <option value={587}>587 (TLS)</option>
                      <option value={465}>465 (SSL)</option>
                    </select></label>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                  <label>From email * <small>({preset.fromHint})</small>
                    <input name="fromEmail" type="email" required defaultValue={current?.fromEmail ?? ""} style={input} /></label>
                  <label>From name
                    <input name="fromName" defaultValue={current?.fromName ?? "MtandaoLabs"} style={input} /></label>
                </div>
              </>
            )}
            <div>
              <label><input type="checkbox" name="active" defaultChecked={current?.active ?? true} /> Enabled</label>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit">Save</button>
            </div>
          </form>
          {current && (
            <div style={{ marginTop: "0.75rem" }}>
              <form action="/api/admin/email/test" method="POST" style={{ display: "inline" }}>
                <button type="submit">Test connection</button>
              </form>
              <p><small style={{ color: "var(--muted)" }}>
                {current.lastError
                  ? `Error: ${current.lastError}`
                  : current.lastVerifiedAt
                    ? `Verified ${current.lastVerifiedAt.toLocaleString()}.`
                    : "Not tested yet."}
              </small></p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
