import { prisma } from "@mtanda/database";

const input = {
  width: "100%",
  padding: "0.6rem 0.75rem",
  borderRadius: "8px",
  border: "1px solid var(--line)",
  background: "var(--bg)",
  color: "var(--ink)",
} as const;

export default async function EmailSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string }>;
}) {
  const { provider: providerParam } = await searchParams;
  const current = await prisma.platformEmailSettings.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  const provider =
    providerParam === "zeptomail" || providerParam === "smtp"
      ? providerParam
      : current?.provider === "zeptomail"
        ? "zeptomail"
        : "smtp";

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
          <h2>
            {provider === "zeptomail" ? "ZeptoMail SMTP" : "Generic SMTP"} {badge}
          </h2>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <a
              href="/admin/email?provider=smtp"
              className="admin-badge"
              style={provider === "smtp" ? { background: "#101418", color: "#fff" } : undefined}
            >
              Generic SMTP
            </a>
            <a
              href="/admin/email?provider=zeptomail"
              className="admin-badge"
              style={provider === "zeptomail" ? { background: "#101418", color: "#fff" } : undefined}
            >
              ZeptoMail
            </a>
          </div>
          <form action="/api/admin/email" method="POST" style={{ display: "grid", gap: "0.9rem" }}>
            <input type="hidden" name="provider" value={provider} />
            {provider === "zeptomail" ? (
              <>
                <p style={{ margin: 0 }}>
                  <small style={{ color: "var(--muted)" }}>
                    From your ZeptoMail dashboard → Agents → SMTP/API → SMTP tab.
                    Host is fixed. Username is always <code>emailapikey</code>.
                    Password is the agent SMTP password. From address must be a
                    verified bounce address on that agent.
                  </small>
                </p>
                <label>SMTP password *
                  <input name="password" type="password" autoComplete="new-password"
                    placeholder={current ? "(stored — blank keeps it)" : ""} style={input} /></label>
                <label>Port
                  <select name="port" defaultValue={current?.port ?? 587} style={input}>
                    <option value={587}>587 (TLS, recommended)</option>
                    <option value={465}>465 (SSL)</option>
                  </select></label>
              </>
            ) : (
              <>
                <label>Host *
                  <input name="host" required defaultValue={current?.host ?? ""} style={input} /></label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
                  <label>Port *
                    <input name="port" type="number" required defaultValue={current?.port ?? 587} style={input} /></label>
                  <label>Username *
                    <input name="username" required defaultValue={current?.username ?? ""} style={input} /></label>
                </div>
                <label>Password {current && <small>(blank keeps stored)</small>}
                  <input name="password" type="password" autoComplete="new-password" style={input} /></label>
              </>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
              <label>From email *
                <input name="fromEmail" type="email" required defaultValue={current?.fromEmail ?? ""} style={input} /></label>
              <label>From name
                <input name="fromName" defaultValue={current?.fromName ?? "MtandaoLabs"} style={input} /></label>
            </div>
            {provider === "smtp" && (
              <div style={{ display: "flex", gap: "1.5rem" }}>
                <label><input type="checkbox" name="secure" defaultChecked={current?.secure ?? false} /> Port 465 TLS</label>
                <label><input type="checkbox" name="active" defaultChecked={current?.active ?? true} /> Enabled</label>
              </div>
            )}
            {provider === "zeptomail" && (
              <div>
                <label><input type="checkbox" name="active" defaultChecked={current?.active ?? true} /> Enabled</label>
              </div>
            )}
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
