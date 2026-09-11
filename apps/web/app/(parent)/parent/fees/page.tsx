import { redirect } from "next/navigation";
import { requireParentActor } from "@/lib/auth/tenant-actor";
import { parentChildren, childName, fmtKES } from "@/lib/parent/service";

export const dynamic = "force-dynamic";

// Fees across all linked children: outstanding per child, then totals.
// Online payment arrives with the school's M-Pesa setup; until then this
// page is the transparent statement of record.
export default async function ParentFeesPage() {
  const parent = await requireParentActor();
  if (!parent.ok) {
    redirect("/login?next=/parent/fees");
  }
  const children = await parentChildren(parent.schoolId, parent.userId);

  const totalOutstanding = children.reduce((s, c) => s + c.outstanding, 0);
  const totalPaid = children.reduce((s, c) => s + c.paid, 0);

  return (
    <div>
      <h1 className="dash-greet" style={{ fontSize: "1.3rem" }}>Fees</h1>
      <p className="dash-sub">Balances and history for your children.</p>

      <div className="parent-card">
        <h2>Total</h2>
        <div className="dash-row">
          <span className="k">Outstanding</span>
          <span className="v">{fmtKES(totalOutstanding)}</span>
        </div>
        <div className="dash-row">
          <span className="k">Paid to date</span>
          <span className="v">{fmtKES(totalPaid)}</span>
        </div>
      </div>

      {children.map((c) => (
        <div className="parent-card" key={c.studentId}>
          <h2>
            {childName(c)} · {c.classId ?? "No class"}
          </h2>
          <div className="dash-row">
            <span className="k">Invoiced</span>
            <span className="v">{fmtKES(c.invoiced)}</span>
          </div>
          <div className="dash-row">
            <span className="k">Paid</span>
            <span className="v">{fmtKES(c.paid)}</span>
          </div>
          <div className="dash-row">
            <span className="k">Balance</span>
            <span className="v">{fmtKES(c.outstanding)}</span>
          </div>
        </div>
      ))}

      {children.length === 0 && (
        <p className="dash-muted">No children linked yet.</p>
      )}
    </div>
  );
}
