import { redirect } from "next/navigation";
import { prisma } from "@mtanda/database";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";

export const dynamic = "force-dynamic";

// Read-only roster. Full student management ships with the Students module.
export default async function StudentsPage() {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    redirect("/login?next=/students");
  }

  const students = await prisma.student.findMany({
    where: { schoolId: staff.schoolId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { _count: { select: { invoices: true } } },
  });

  return (
    <div>
      <h1 className="dash-greet">Students</h1>
      <p className="dash-sub">{students.length} on record</p>
      <div className="dash-panel">
        {students.length === 0 ? (
          <p className="dash-muted">No students yet.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Admission</th>
                <th>Name</th>
                <th>Class</th>
                <th>Invoices</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>{s.admissionNo}</td>
                  <td>
                    {[s.firstName, s.lastName].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td>{s.classId ?? "—"}</td>
                  <td>{s._count.invoices}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
