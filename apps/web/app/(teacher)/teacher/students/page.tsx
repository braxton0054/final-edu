import { redirect } from "next/navigation";
import { requireTeacherActor } from "@/lib/auth/tenant-actor";
import { teacherScope, teacherStudents } from "@/lib/messaging/service";

export const dynamic = "force-dynamic";

// Every student in this teacher's assigned classes — nothing else.
export default async function TeacherStudentsPage() {
  const actor = await requireTeacherActor();
  if (!actor.ok) {
    redirect("/login?next=/teacher/students");
  }
  const scope = await teacherScope(actor.schoolId, actor.userId);
  if (!scope) {
    redirect("/login?next=/teacher/students");
  }
  const students = await teacherStudents(actor.schoolId, scope.classIds);

  return (
    <div>
      <h1 className="dash-greet">My Students</h1>
      <p className="dash-sub">{students.length} across {scope.classes.length} classes.</p>
      <div className="dash-panel">
        {students.length === 0 ? (
          <p className="dash-muted">No students in your assigned classes yet.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Admission</th>
                <th>Name</th>
                <th>Class</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>{s.admissionNo}</td>
                  <td>{[s.firstName, s.lastName].filter(Boolean).join(" ") || "—"}</td>
                  <td>{s.classId ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
