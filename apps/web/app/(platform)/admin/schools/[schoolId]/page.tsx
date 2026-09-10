import { notFound } from "next/navigation";
import { prisma, enrollmentState } from "@mtanda/database";

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ schoolId: string }>;
}) {
  const { schoolId } = await params;
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    include: {
      _count: {
        select: { students: true, users: true, teachers: true },
      },
      subscriptions: {
        orderBy: { createdAt: "desc" },
        include: { plan: true, invoices: { include: { payments: true } } },
      },
      users: { take: 10, orderBy: { createdAt: "asc" } },
      platformPayments: { orderBy: { createdAt: "desc" }, take: 10 },
      auditLogs: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!school) notFound();

  const sub = school.subscriptions[0] ?? null;
  const plan = sub?.plan ?? null;
  const limit =
    plan && plan.maxStudents !== null
      ? enrollmentState(school._count.students, plan.maxStudents, plan.graceStudents)
      : { state: "ok" as const, remaining: null };

  return (
    <>
      <div className="admin-top">
        <h1>{school.name}</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
          {school.status !== "SUSPENDED" ? (
            <form action={`/api/admin/schools/${school.id}/status`} method="POST">
              <input type="hidden" name="status" value="SUSPENDED" />
              <button type="submit">Suspend</button>
            </form>
          ) : (
            <form action={`/api/admin/schools/${school.id}/status`} method="POST">
              <input type="hidden" name="status" value="ACTIVE" />
              <button type="submit">Reactivate</button>
            </form>
          )}
          {school.status !== "ARCHIVED" && (
            <form action={`/api/admin/schools/${school.id}/status`} method="POST">
              <input type="hidden" name="status" value="ARCHIVED" />
              <button type="submit">Archive</button>
            </form>
          )}
        </div>
      </div>
      <div className="admin-body">
        <div className="admin-cards">
          <div className="admin-card">
            <div className="label">Status</div>
            <div className="value" style={{ fontSize: "1.3rem" }}>
              {school.status.replaceAll("_", " ")}
            </div>
          </div>
          <div className="admin-card">
            <div className="label">Plan</div>
            <div className="value" style={{ fontSize: "1.3rem" }}>
              {plan?.name ?? "—"}
            </div>
          </div>
          <div className="admin-card">
            <div className="label">Students</div>
            <div className="value" style={{ fontSize: "1.3rem" }}>
              {school._count.students}
              {plan?.maxStudents ? ` / ${plan.maxStudents}` : ""}
            </div>
          </div>
          <div className="admin-card">
            <div className="label">Enrollment</div>
            <div className="value" style={{ fontSize: "1.3rem" }}>
              <span className={`admin-badge ${limit.state === "ok" ? "green" : limit.state === "warning" ? "" : "red"}`}>
                {limit.state.replace("-", " ").toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <div className="admin-panel">
          <h2>School</h2>
          <table className="admin-table">
            <tbody>
              <tr><td>Domain</td><td>{school.subdomain ? `${school.subdomain}.mtandaolabsedu.com` : "—"}</td></tr>
              <tr><td>Custom domain</td><td>{school.domain ?? "—"}</td></tr>
              <tr><td>Teachers</td><td>{school._count.teachers}</td></tr>
              <tr><td>Users</td><td>{school._count.users}</td></tr>
              <tr><td>Renewal</td><td>{sub ? sub.currentPeriodEnd.toDateString() : "—"}</td></tr>
            </tbody>
          </table>
        </div>

        <div className="admin-grid-2">
          <div className="admin-panel">
            <h2>Subscription history</h2>
            <table className="admin-table">
              <thead><tr><th>Plan</th><th>Status</th><th>Period end</th></tr></thead>
              <tbody>
                {school.subscriptions.map((s) => (
                  <tr key={s.id}>
                    <td>{s.plan.name}</td>
                    <td><span className="admin-badge">{s.status}</span></td>
                    <td>{s.currentPeriodEnd.toDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="admin-panel">
            <h2>Platform payments</h2>
            <table className="admin-table">
              <thead><tr><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
              <tbody>
                {school.platformPayments.map((p) => (
                  <tr key={p.id}>
                    <td>KSh {Number(p.amount).toLocaleString()}</td>
                    <td>{p.method}</td>
                    <td><span className="admin-badge">{p.status}</span></td>
                  </tr>
                ))}
                {school.platformPayments.length === 0 && (
                  <tr><td colSpan={3}>No subscription payments yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-panel">
          <h2>Recent audit events</h2>
          <table className="admin-table">
            <thead><tr><th>Action</th><th>When</th></tr></thead>
            <tbody>
              {school.auditLogs.map((a) => (
                <tr key={a.id}>
                  <td>{a.action}</td>
                  <td>{a.createdAt.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
