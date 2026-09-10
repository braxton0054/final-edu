import { prisma } from "@mtanda/database";

export default async function RevenuePage() {
  const [total, byMethod, failed, recent] = await Promise.all([
    prisma.platformPayment.aggregate({
      _sum: { amount: true },
      where: { status: "COMPLETED" },
    }),
    prisma.platformPayment.groupBy({
      by: ["method"],
      _sum: { amount: true },
      where: { status: "COMPLETED" },
    }),
    prisma.platformPayment.count({ where: { status: "FAILED" } }),
    prisma.platformPayment.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { school: true },
    }),
  ]);

  return (
    <>
      <div className="admin-top"><h1>Platform Revenue</h1></div>
      <div className="admin-body">
        <p style={{ color: "var(--muted)" }}>
          MtandaoLabs subscription income only — school parent collections live
          under each school&apos;s finance, never here.
        </p>
        <div className="admin-cards">
          <div className="admin-card">
            <div className="label">Total collected</div>
            <div className="value">KSh {Number(total._sum.amount ?? 0).toLocaleString()}</div>
          </div>
          {byMethod.map((m) => (
            <div className="admin-card" key={m.method}>
              <div className="label">{m.method}</div>
              <div className="value">KSh {Number(m._sum.amount ?? 0).toLocaleString()}</div>
            </div>
          ))}
          <div className="admin-card">
            <div className="label">Failed payments</div>
            <div className="value">{failed}</div>
          </div>
        </div>
        <div className="admin-panel">
          <h2>Subscription payments</h2>
          <p><a href="/api/admin/revenue/export">Download CSV →</a></p>
          <table className="admin-table">
            <thead><tr><th>School</th><th>Amount</th><th>Method</th><th>Status</th><th>Receipt</th></tr></thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.id}>
                  <td>{p.school.name}</td>
                  <td>KSh {Number(p.amount).toLocaleString()}</td>
                  <td>{p.method}</td>
                  <td><span className="admin-badge">{p.status}</span></td>
                  <td>{p.mpesaReceipt ?? "—"}</td>
                </tr>
              ))}
              {recent.length === 0 && <tr><td colSpan={5}>No platform payments yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
