import { redirect } from "next/navigation";
import { prisma } from "@mtanda/database";
import { requireParentActor } from "@/lib/auth/tenant-actor";
import { parentChildren, childName } from "@/lib/parent/service";
import LogoutButton from "../../../components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function ParentProfilePage() {
  const parent = await requireParentActor();
  if (!parent.ok) {
    redirect("/login?next=/parent/profile");
  }

  const [user, children] = await Promise.all([
    prisma.user.findUnique({ where: { id: parent.userId } }),
    parentChildren(parent.schoolId, parent.userId),
  ]);

  return (
    <div>
      <h1 className="dash-greet" style={{ fontSize: "1.3rem" }}>Profile</h1>

      <div className="parent-card">
        <h2>Account</h2>
        <div className="dash-row">
          <span className="k">Name</span>
          <span className="v">
            {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "—"}
          </span>
        </div>
        <div className="dash-row">
          <span className="k">Email</span>
          <span className="v">{user?.email ?? parent.email}</span>
        </div>
        <div className="dash-row">
          <span className="k">Phone</span>
          <span className="v">{user?.phone ?? "—"}</span>
        </div>
      </div>

      <div className="parent-card">
        <h2>Children ({children.length})</h2>
        {children.length === 0 ? (
          <p className="dash-muted">No children linked yet.</p>
        ) : (
          children.map((c) => (
            <div className="dash-row" key={c.studentId}>
              <span className="k">{childName(c)}</span>
              <span className="v" style={{ fontWeight: 400 }}>
                {c.classId ?? "No class"} · {c.admissionNo}
              </span>
            </div>
          ))
        )}
      </div>

      <div className="parent-card">
        <h2>Session</h2>
        <LogoutButton />
      </div>
    </div>
  );
}
