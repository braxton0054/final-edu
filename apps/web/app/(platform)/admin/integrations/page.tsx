const ROWS = [
  { name: "M-Pesa (Daraja)", detail: "Per-school credentials, encrypted in DB. Callbacks at /api/webhooks/mpesa.", status: "Scaffolded" },
  { name: "Email (SMTP)", detail: "Per-school provider config in tenant settings.", status: "Scaffolded" },
  { name: "WhatsApp", detail: "Built-in messaging. One number per school, managed from tenant Settings → WhatsApp; monitored in Super Admin → WhatsApp.", status: "Live" },
  { name: "Storage (S3-compatible)", detail: "Document buckets per school.", status: "Planned" },
  { name: "Public API", detail: "Scoped keys per school.", status: "Planned" },
];

export default function IntegrationsPage() {
  return (
    <>
      <div className="admin-top"><h1>Integrations</h1></div>
      <div className="admin-body">
        <div className="admin-panel">
          <h2>Platform integration status</h2>
          <table className="admin-table">
            <thead><tr><th>Integration</th><th>Model</th><th>Status</th></tr></thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.name}><td><strong>{r.name}</strong></td><td>{r.detail}</td>
                  <td><span className="admin-badge">{r.status}</span></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
