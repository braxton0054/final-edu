export default function AccountPage() {
  return (
    <>
      <div className="admin-top"><h1>My Account</h1></div>
      <div className="admin-body">
        <div className="admin-panel">
          <h2>Profile</h2>
          <p style={{ color: "var(--muted)" }}>Platform super-admin profile lives here.</p>
        </div>
        <div className="admin-grid-2">
          <div className="admin-panel"><h2>Security &amp; MFA</h2><p style={{ color: "var(--muted)" }}>MFA enrollment plugs in here.</p></div>
          <div className="admin-panel"><h2>Sessions</h2><p style={{ color: "var(--muted)" }}>Active sessions list plugs in here.</p></div>
        </div>
      </div>
    </>
  );
}
