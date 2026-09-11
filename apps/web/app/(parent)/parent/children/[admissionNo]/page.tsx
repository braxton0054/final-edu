import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@mtanda/database";
import { requireParentActor } from "@/lib/auth/tenant-actor";
import { parentChildren, childName, fmtKES } from "@/lib/parent/service";

export const dynamic = "force-dynamic";

// One child's profile: identity, fee summary, invoice/payment history.
// Only reachable for children linked to this parent login.
export default async function ParentChildPage({
  params,
}: {
  params: Promise<{ admissionNo: string }>;
}) {
  const parent = await requireParentActor();
  if (!parent.ok) {
    redirect("/login?next=/parent/children");
  }

  const children = await parentChildren(parent.schoolId, parent.userId);
  const { admissionNo } = await params;
  const child = children.find(
    (c) => c.admissionNo === decodeURIComponent(admissionNo)
  );
  if (!child) {
    return (
      <div>
        <Link href="/parent/children">← Children</Link>
        <p>Child not found on this account.</p>
      </div>
    );
  }

  const [invoices, payments] = await Promise.all([
    prisma.invoice.findMany({
      where: { schoolId: parent.schoolId, studentId: child.studentId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.payment.findMany({
      where: { schoolId: parent.schoolId, studentId: child.studentId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div>
      <Link href="/parent/children">← Children</Link>
      <h1 className="dash-greet" style={{ fontSize: "1.3rem", marginTop: "0.5rem" }}>
        {childName(child)}
      </h1>
      <p className="dash-sub">
        {child.classId ?? "No class"} · Admission {child.admissionNo}
        {child.relation ? ` · ${child.relation}` : ""}
      </p>

      <div className="parent-card">
        <h2>Fees</h2>
        <div className="dash-row">
          <span className="k">Invoiced</span>
          <span className="v">{fmtKES(child.invoiced)}</span>
        </div>
        <div className="dash-row">
          <span className="k">Paid</span>
          <span className="v">{fmtKES(child.paid)}</span>
        </div>
        <div className="dash-row">
          <span className="k">Balance</span>
          <span className="v">{fmtKES(child.outstanding)}</span>
        </div>
        <Link className="dash-link" href="/parent/fees">Full fee details →</Link>
      </div>

      <div className="parent-card">
        <h2>Invoices ({invoices.length})</h2>
        {invoices.length === 0 ? (
          <p className="dash-muted">No invoices yet.</p>
        ) : (
          invoices.map((inv) => (
            <div className="dash-row" key={inv.id}>
              <span className="k">{inv.createdAt.toDateString()}</span>
              <span className="v">
                {fmtKES(Number(inv.total))} · {inv.status}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="parent-card">
        <h2>Payments ({payments.length})</h2>
        {payments.length === 0 ? (
          <p className="dash-muted">No payments yet.</p>
        ) : (
          payments.map((p) => (
            <div className="dash-row" key={p.id}>
              <span className="k">
                {p.createdAt.toDateString()} · {p.method}
              </span>
              <span className="v">
                {fmtKES(Number(p.amount))} · {p.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
