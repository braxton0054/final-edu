import { prisma } from "@mtanda/database";

const input = {
  width: "100%",
  padding: "0.6rem 0.75rem",
  borderRadius: "8px",
  border: "1px solid var(--line)",
  background: "var(--bg)",
  color: "var(--ink)",
} as const;

export default async function EmailSettingsPage() {
  const current = await prisma.platformEmailSettings.findFirst({
    orderBy: { updatedAt: "desc" },
  });

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
          <h2>SMTP {badge}</h2>
          <form action="/api/admin/email" method="POST" style={{ display: "grid", gap: "0.9rem" }}>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.9rem" }}>
              <label>From email *
                <input name="fromEmail" type="email" required defaultValue={current?.fromEmail ?? ""} style={input} /></label>
              <label>From name
                <input name="fromName" defaultValue={current?.fromName ?? "MtandaoLabs"} style={input} /></label>
            </div>
            <div style={{ display: "flex", gap: "1.5rem" }}>
              <label><input type="checkbox" name="secure" defaultChecked={current?.secure ?? false} /> Port 465 TLS</label>
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
