import { redirect } from "next/navigation";
import { prisma } from "@mtanda/database";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";

export const dynamic = "force-dynamic";

// Finance overview: real invoices, payments, and totals. Full bookkeeping
// ships with the Finance module.
export default async function FinancePage() {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    redirect("/login?next=/finance");
  }
  const schoolId = staff.schoolId;

  const [collected, outstanding, invoices, payments] = await Promise.all([
    prisma.payment.aggregate({
      where: { schoolId, status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { schoolId, status: { notIn: ["PAID", "CANCELLED"] } },
      _sum: { balance: true },
    }),
    prisma.invoice.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { student: { select: { firstName: true, lastName: true, admissionNo: true } } },
    }),
    prisma.payment.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { student: { select: { firstName: true, lastName: true } } },
    }),
  ]);

  const kes = (n: number) => `KSh ${Math.round(n).toLocaleString()}`;

  return (
    <div>
      <h1 className="dash-greet">Finance</h1>
      <p className="dash-sub">Invoices, payments, and totals.</p>

      <div className="dash-stats" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
        <div className="dash-stat">
          <div className="dash-stat-label">Collected</div>
          <div className="dash-stat-value" style={{ fontSize: "1.5rem" }}>
            {kes(Number(collected._sum.amount ?? 0))}
          </div>
        </div>
        <div className="dash-stat">
          <div className="dash-stat-label">Outstanding</div>
          <div className="dash-stat-value" style={{ fontSize: "1.5rem" }}>
            {kes(Number(outstanding._sum.balance ?? 0))}
          </div>
        </div>
      </div>

      <div className="dash-panel" style={{ marginBottom: "1rem" }}>
        <h2>Invoices ({invoices.length})</h2>
        {invoices.length === 0 ? (
          <p className="dash-muted">No invoices yet.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Total</th>
                <th>Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    {[inv.student.firstName, inv.student.lastName].filter(Boolean).join(" ") ||
                      inv.student.admissionNo}
                  </td>
                  <td>{kes(Number(inv.total))}</td>
                  <td>{kes(Number(inv.balance))}</td>
                  <td>{inv.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="dash-panel">
        <h2>Payments ({payments.length})</h2>
        {payments.length === 0 ? (
          <p className="dash-muted">No payments yet.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>
                    {[p.student.firstName, p.student.lastName].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td>{kes(Number(p.amount))}</td>
                  <td>{p.method}</td>
                  <td>{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
