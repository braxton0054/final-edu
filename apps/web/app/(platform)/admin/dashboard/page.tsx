import { prisma } from "@mtanda/database";

function quarterStart(): Date {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3) * 3;
  return new Date(now.getFullYear(), q, 1);
}

export default async function AdminDashboard() {
  const [schools, students, users, subscriptions, plans, revenue, recent, pending] =
    await Promise.all([
      prisma.school.count(),
      prisma.student.count(),
      prisma.user.count(),
      prisma.subscription.findMany({
        include: { plan: true },
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.subscriptionPlan.findMany({ orderBy: { displayOrder: "asc" } }),
      prisma.platformPayment.aggregate({
        _sum: { amount: true },
        where: { status: "COMPLETED", createdAt: { gte: quarterStart() } },
      }),
      prisma.school.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
      prisma.school.count({ where: { status: "PENDING_VERIFICATION" } }),
    ]);

  const byPlan = new Map<string, number>();
  for (const s of subscriptions) {
    byPlan.set(s.plan.slug, (byPlan.get(s.plan.slug) ?? 0) + 1);
  }
  const maxPlan = Math.max(1, ...byPlan.values());

  return (
    <>
      <div className="admin-top">
        <h1>Dashboard</h1>
      </div>
      <div className="admin-body">
        <div className="admin-cards">
          <div className="admin-card">
            <div className="label">Schools</div>
            <div className="value">{schools}</div>
          </div>
          <div className="admin-card">
            <div className="label">Students</div>
            <div className="value">{students}</div>
          </div>
          <div className="admin-card">
            <div className="label">Users</div>
            <div className="value">{users}</div>
          </div>
          <div className="admin-card">
            <div className="label">Revenue (last 3 months)</div>
            <div className="value">KSh {Number(revenue._sum.amount ?? 0).toLocaleString()}</div>
          </div>
          <div className="admin-card">
            <div className="label">Pending verification</div>
            <div className="value">
              <a href="/admin/schools?status=PENDING_VERIFICATION">{pending}</a>
            </div>
          </div>
        </div>

        <div className="admin-grid-2">
          <div className="admin-panel">
            <h2>Active plans</h2>
            <table className="admin-table">
              <tbody>
                {plans.map((p) => {
                  const n = byPlan.get(p.slug) ?? 0;
                  return (
                    <tr key={p.slug}>
                      <td>{p.name}</td>
                      <td>{n}</td>
                      <td>
                        <div className="admin-bar">
                          <span style={{ width: `${(n / maxPlan) * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="admin-panel">
            <h2>Newest schools</h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>School</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>
                      <span className="admin-badge">{s.status.replaceAll("_", " ")}</span>
                    </td>
                    <td>
                      <a href={`/admin/schools/${s.id}`}>Open →</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
