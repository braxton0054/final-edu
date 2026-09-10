import { prisma } from "@mtanda/database";

export default async function SecurityPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { school: true },
  });

  return (
    <>
      <div className="admin-top"><h1>Security</h1></div>
      <div className="admin-body">
        <div className="admin-panel">
          <h2>Audit logs</h2>
          <table className="admin-table">
            <thead><tr><th>When</th><th>School</th><th>Action</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{l.createdAt.toLocaleString()}</td>
                  <td>{l.school?.name ?? "— platform —"}</td>
                  <td>{l.action}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan={3}>No audit events yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
