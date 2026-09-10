import { prisma } from "@mtanda/database";

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function AnalyticsPage() {
  const [schools, students, subs] = await Promise.all([
    prisma.school.findMany({ select: { createdAt: true } }),
    prisma.student.count(),
    prisma.subscription.findMany({ include: { plan: true } }),
  ]);

  const byMonth = new Map<string, number>();
  for (const s of schools) {
    const k = monthKey(s.createdAt);
    byMonth.set(k, (byMonth.get(k) ?? 0) + 1);
  }
  const months = [...byMonth.entries()].sort().slice(-8);
  const maxM = Math.max(1, ...months.map(([, n]) => n));

  const byPlan = new Map<string, number>();
  for (const s of subs) byPlan.set(s.plan.name, (byPlan.get(s.plan.name) ?? 0) + 1);
  const maxP = Math.max(1, ...byPlan.values());

  return (
    <>
      <div className="admin-top"><h1>Analytics</h1></div>
      <div className="admin-body">
        <div className="admin-cards">
          <div className="admin-card"><div className="label">Schools</div><div className="value">{schools.length}</div></div>
          <div className="admin-card"><div className="label">Students</div><div className="value">{students}</div></div>
          <div className="admin-card"><div className="label">Subscriptions</div><div className="value">{subs.length}</div></div>
        </div>
        <div className="admin-grid-2">
          <div className="admin-panel">
            <h2>School growth</h2>
            <table className="admin-table"><tbody>
              {months.map(([m, n]) => (
                <tr key={m}><td>{m}</td><td>{n}</td>
                  <td><div className="admin-bar"><span style={{ width: `${(n / maxM) * 100}%` }} /></div></td>
                </tr>
              ))}
              {months.length === 0 && <tr><td>No data yet.</td></tr>}
            </tbody></table>
          </div>
          <div className="admin-panel">
            <h2>Subscription distribution</h2>
            <table className="admin-table"><tbody>
              {[...byPlan.entries()].map(([name, n]) => (
                <tr key={name}><td>{name}</td><td>{n}</td>
                  <td><div className="admin-bar"><span style={{ width: `${(n / maxP) * 100}%` }} /></div></td>
                </tr>
              ))}
              {byPlan.size === 0 && <tr><td>No data yet.</td></tr>}
            </tbody></table>
          </div>
        </div>
      </div>
    </>
  );
}
