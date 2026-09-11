import Link from "next/link";
import { redirect } from "next/navigation";
import { requireTeacherActor } from "@/lib/auth/tenant-actor";
import { teacherScope, teacherStudents } from "@/lib/messaging/service";

export const dynamic = "force-dynamic";

// Class roster: only students in a class assigned to this teacher.
export default async function TeacherClassPage({
  params,
}: {
  params: Promise<{ classId: string }>;
}) {
  const actor = await requireTeacherActor();
  if (!actor.ok) {
    redirect("/login?next=/teacher/classes");
  }
  const scope = await teacherScope(actor.schoolId, actor.userId);
  const { classId } = await params;
  const decoded = decodeURIComponent(classId);
  if (!scope || !scope.classIds.includes(decoded)) {
    return (
      <div>
        <Link href="/teacher/classes">← My Classes</Link>
        <p>This class is not assigned to you.</p>
      </div>
    );
  }

  const students = await teacherStudents(actor.schoolId, [decoded]);
  const assignment = scope.classes.find((c) => c.classId === decoded);

  return (
    <div>
      <Link href="/teacher/classes">← My Classes</Link>
      <h1 className="dash-greet" style={{ marginTop: "0.5rem" }}>{decoded}</h1>
      <p className="dash-sub">
        {students.length} students
        {assignment?.learningAreas.length
          ? ` · ${assignment.learningAreas.join(", ")}`
          : ""}
        {assignment?.roles.includes("class_teacher") ? " · Class teacher" : ""}
      </p>
      <div className="dash-panel">
        {students.length === 0 ? (
          <p className="dash-muted">No students in this class yet.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Admission</th>
                <th>Name</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td>{s.admissionNo}</td>
                  <td>{[s.firstName, s.lastName].filter(Boolean).join(" ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
