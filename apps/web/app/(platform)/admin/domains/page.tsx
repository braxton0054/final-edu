import { prisma } from "@mtanda/database";

export default async function DomainsPage() {
  const schools = await prisma.school.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, subdomain: true, domain: true, status: true },
  });

  return (
    <>
      <div className="admin-top"><h1>Domains</h1></div>
      <div className="admin-body">
        <div className="admin-panel">
          <h2>School subdomains &amp; custom domains</h2>
          <table className="admin-table">
            <thead><tr><th>School</th><th>Subdomain</th><th>Custom domain</th><th>Status</th></tr></thead>
            <tbody>
              {schools.map((s) => (
                <tr key={s.id}>
                  <td><a href={`/admin/schools/${s.id}`}>{s.name}</a></td>
                  <td>{s.subdomain ? `${s.subdomain}.mtandaolabsedu.com` : "—"}</td>
                  <td>{s.domain ?? "—"}</td>
                  <td><span className="admin-badge">{s.domain ? "VERIFY MANUALLY" : "PLATFORM"}</span></td>
                </tr>
              ))}
              {schools.length === 0 && <tr><td colSpan={4}>No schools yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
