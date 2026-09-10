import { prisma } from "@mtanda/database";

const FILTERS = ["ALL", "TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED"] as const;

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const status = (statusParam ?? "ALL").toUpperCase();
  const now = new Date();
  const expiringFrom = new Date(now.getTime());
  const expiringTo = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const [plans, subs, expiring] = await Promise.all([
    prisma.subscriptionPlan.findMany({ orderBy: { displayOrder: "asc" } }),
    prisma.subscription.findMany({
      where: status === "ALL" ? {} : { status: status as never },
      orderBy: { createdAt: "desc" },
      include: { plan: true, school: true },
      take: 100,
    }),
    prisma.subscription.count({
      where: {
        status: "ACTIVE",
        currentPeriodEnd: {
          gte: expiringFrom,
          lte: expiringTo,
        },
      },
    }),
  ]);

  const counts = new Map<string, number>();
  for (const s of subs) counts.set(s.plan.slug, (counts.get(s.plan.slug) ?? 0) + 1);

  return (
    <>
      <div className="admin-top"><h1>Subscriptions</h1></div>
      <div className="admin-body">
        <div className="admin-cards">
          {plans.map((p) => (
            <div className="admin-card" key={p.slug}>
              <div className="label">{p.name}</div>
              <div className="value">{counts.get(p.slug) ?? 0}</div>
            </div>
          ))}
          <div className="admin-card">
            <div className="label">Expiring in 14 days</div>
            <div className="value">{expiring}</div>
          </div>
        </div>
        <div className="admin-panel">
          <h2>All subscriptions</h2>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {FILTERS.map((s) => (
              <a
                key={s}
                href={s === "ALL" ? "/admin/subscriptions" : `/admin/subscriptions?status=${s}`}
                className="admin-badge"
                style={status === s ? { background: "#101418", color: "#fff" } : undefined}
              >
                {s.replaceAll("_", " ")}
              </a>
            ))}
          </div>
          <table className="admin-table">
            <thead><tr><th>School</th><th>Plan</th><th>Status</th><th>Period end</th></tr></thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id}>
                  <td><a href={`/admin/schools/${s.schoolId}`}>{s.school.name}</a></td>
                  <td>{s.plan.name}</td>
                  <td><span className="admin-badge">{s.status}</span></td>
                  <td>{s.currentPeriodEnd.toDateString()}</td>
                </tr>
              ))}
              {subs.length === 0 && <tr><td colSpan={4}>No subscriptions yet — schools appear here after self-registration.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
