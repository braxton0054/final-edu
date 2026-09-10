import { prisma } from "@mtanda/database";

const input = {
  width: "100%",
  padding: "0.6rem 0.75rem",
  borderRadius: "8px",
  border: "1px solid var(--line)",
  background: "var(--bg)",
  color: "var(--ink)",
} as const;

export default async function AnnouncementsPage() {
  const items = await prisma.platformAnnouncement.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <>
      <div className="admin-top"><h1>Announcements</h1></div>
      <div className="admin-body">
        <div className="admin-grid-2" style={{ alignItems: "start" }}>
          <div className="admin-panel">
            <h2>New broadcast</h2>
            <form action="/api/admin/announcements" method="POST" style={{ display: "grid", gap: "0.9rem" }}>
              <label>Title *
                <input name="title" required style={input} /></label>
              <label>Message *
                <textarea name="body" required rows={5} style={input} /></label>
              <div><button type="submit">Publish to all schools</button></div>
            </form>
          </div>
          <div className="admin-panel">
            <h2>Published ({items.length})</h2>
            <table className="admin-table">
              <tbody>
                {items.map((a) => (
                  <tr key={a.id}>
                    <td><strong>{a.title}</strong><br /><small>{a.body}</small></td>
                    <td style={{ whiteSpace: "nowrap" }}>{a.createdAt.toDateString()}</td>
                  </tr>
                ))}
                {items.length === 0 && <tr><td>No announcements yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
