import Link from "next/link";
import { prisma } from "@mtanda/database";

export const dynamic = "force-dynamic";

export default async function AdminWhatsAppPage() {
  const connections = await prisma.whatsAppConnection.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      school: { select: { name: true, slug: true, status: true } },
      _count: { select: { messages: true } },
    },
    take: 200,
  });

  const counts = {
    CONNECTED: 0,
    CONNECTING: 0,
    DISCONNECTED: 0,
    ERROR: 0,
  };
  for (const c of connections) counts[c.status]++;

  return (
    <>
      <div className="admin-top"><h1>WhatsApp Connections</h1></div>
      <div className="admin-body">
        <div className="admin-cards">
          <div className="admin-card">
            <div className="label">Connected</div>
            <div className="value">{counts.CONNECTED}</div>
          </div>
          <div className="admin-card">
            <div className="label">Connecting</div>
            <div className="value">{counts.CONNECTING}</div>
          </div>
          <div className="admin-card">
            <div className="label">Disconnected</div>
            <div className="value">{counts.DISCONNECTED}</div>
          </div>
          <div className="admin-card">
            <div className="label">Errors</div>
            <div className="value">{counts.ERROR}</div>
          </div>
        </div>
        <div className="admin-panel">
          <h2>Per-school instances</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>School</th>
                <th>Instance</th>
                <th>Status</th>
                <th>Number</th>
                <th>Messages</th>
                <th>Last error</th>
              </tr>
            </thead>
            <tbody>
              {connections.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/schools/${c.schoolId}`}>{c.school.name}</Link>
                    <div style={{ color: "#5b6470", fontSize: "0.8rem" }}>{c.school.slug}</div>
                  </td>
                  <td><code>{c.instanceName}</code></td>
                  <td><span className="admin-badge">{c.status}</span></td>
                  <td>{c.phoneNumber ?? "—"}</td>
                  <td>{c._count.messages}</td>
                  <td style={{ maxWidth: 260 }}>{c.lastError ?? "—"}</td>
                </tr>
              ))}
              {connections.length === 0 && (
                <tr>
                  <td colSpan={6}>No schools have connected WhatsApp yet.</td>
                </tr>
              )}
            </tbody>
          </table>
          <p style={{ color: "#5b6470", fontSize: "0.85rem", marginTop: "1rem" }}>
            This page shows operational status only. Per-instance tokens and
            message bodies are never displayed here.
          </p>
        </div>
      </div>
    </>
  );
}
