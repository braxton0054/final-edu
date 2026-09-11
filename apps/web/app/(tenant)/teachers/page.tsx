import { redirect } from "next/navigation";
import { prisma } from "@mtanda/database";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { distinctClassIds } from "@/lib/messaging/service";
import TeacherAssignmentManager from "./TeacherAssignmentManager";
import TeacherLoginManager from "./TeacherLoginManager";

export const dynamic = "force-dynamic";

// Read-only roster. Full staff management ships with the Staff module.
export default async function TeachersPage() {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    redirect("/login?next=/teachers");
  }

  const [teachers, classIds] = await Promise.all([
    prisma.teacher.findMany({
      where: { schoolId: staff.schoolId },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    distinctClassIds(staff.schoolId),
  ]);

  return (
    <div>
      <h1 className="dash-greet">Teachers</h1>
      <p className="dash-sub">{teachers.length} on record</p>
      <div className="dash-panel">
        {teachers.length === 0 ? (
          <p className="dash-muted">No teachers yet.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Login</th>
                <th>Since</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id}>
                  <td>
                    {[t.firstName, t.lastName].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td>{t.userId ? "✓" : "—"}</td>
                  <td>{t.createdAt.toDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <TeacherAssignmentManager
        teachers={teachers.map((t) => ({ id: t.id, firstName: t.firstName, lastName: t.lastName }))}
        classIds={classIds}
      />
      <TeacherLoginManager
        teachers={teachers.map((t) => ({
          id: t.id,
          name: [t.firstName, t.lastName].filter(Boolean).join(" ") || "Teacher",
          hasLogin: Boolean(t.userId),
        }))}
      />
    </div>
  );
}
