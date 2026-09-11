import Link from "next/link";
import { redirect } from "next/navigation";
import { requireParentActor } from "@/lib/auth/tenant-actor";
import { parentChildren, childName, fmtKES } from "@/lib/parent/service";

export const dynamic = "force-dynamic";

export default async function ParentChildrenPage() {
  const parent = await requireParentActor();
  if (!parent.ok) {
    redirect("/login?next=/parent/children");
  }
  const children = await parentChildren(parent.schoolId, parent.userId);

  return (
    <div>
      <h1 className="dash-greet" style={{ fontSize: "1.3rem" }}>My Children</h1>
      <p className="dash-sub">
        {children.length === 0
          ? "No children linked yet."
          : `${children.length} ${children.length === 1 ? "child" : "children"} linked.`}
      </p>
      {children.map((c) => (
        <Link
          key={c.studentId}
          href={`/parent/children/${encodeURIComponent(c.admissionNo)}`}
          className="parent-card"
          style={{ display: "block", textDecoration: "none", color: "inherit" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <span className="parent-child-avatar">
              {childName(c).slice(0, 1).toUpperCase()}
            </span>
            <span>
              <strong>{childName(c)}</strong>
              <br />
              <span className="parent-child-sub">
                {c.classId ?? "No class"} · Admission {c.admissionNo}
              </span>
            </span>
          </div>
          <div className="dash-row" style={{ marginTop: "0.6rem" }}>
            <span className="k">Fee balance</span>
            <span className="v">
              {c.outstanding > 0 ? fmtKES(c.outstanding) : "Cleared"}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
