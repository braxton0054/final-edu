import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@mtanda/database";
import { requireTeacherActor } from "@/lib/auth/tenant-actor";
import { teacherScope } from "@/lib/messaging/service";
import { classPerformance, pendingMarking } from "@/lib/academics/service";

export const dynamic = "force-dynamic";

// Class performance across published assessments + marking queue.
export default async function TeacherResultsPage() {
  const actor = await requireTeacherActor();
  if (!actor.ok) {
    redirect("/login?next=/teacher/results");
  }
  const scope = await teacherScope(actor.schoolId, actor.userId);
  if (!scope) {
    redirect("/login?next=/teacher/results");
  }

  const [pending, classes] = await Promise.all([
    pendingMarking(actor.schoolId, scope.classIds),
    Promise.all(
      scope.classes.map(async (c) => {
        const n = await prisma.student.count({
          where: { schoolId: actor.schoolId, classId: c.classId },
        });
        return {
          ...c,
          students: n,
          performance: await classPerformance(actor.schoolId, c.classId),
        };
      })
    ),
  ]);

  const withStudents = classes;

  return (
    <div>
      <h1 className="dash-greet">Results</h1>
      <p className="dash-sub">Published assessments in your classes. Finalized results are read-only.</p>

      {pending.length > 0 && (
        <div className="dash-panel" style={{ marginBottom: "1rem" }}>
          <h2>Awaiting marking ({pending.length})</h2>
          {pending.map((p) => (
            <div className="dash-row" key={p.id}>
              <span className="k">
                <Link href={`/teacher/assessments/${p.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                  {p.title} · {p.classId}
                </Link>
              </span>
              <span className="v" style={{ fontSize: "0.85rem" }}>{p.missing} missing</span>
            </div>
          ))}
        </div>
      )}

      {withStudents.map((c) => {
        const avgs = c.performance.map((p) => p.average).filter((a): a is number => a !== null);
        const classAvg = avgs.length ? avgs.reduce((x, y) => x + y, 0) / avgs.length : null;
        return (
          <div className="dash-panel" key={c.classId} style={{ marginBottom: "1rem" }}>
            <h2>
              {c.classId} · {c.students} students
              {classAvg !== null ? ` · avg ${classAvg.toFixed(1)}` : ""}
            </h2>
            {c.performance.length === 0 ? (
              <p className="dash-muted">No published assessments yet.</p>
            ) : (
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Assessment</th>
                    <th>Area</th>
                    <th>Entries</th>
                    <th>Average</th>
                  </tr>
                </thead>
                <tbody>
                  {c.performance.map((p) => (
                    <tr key={p.assessmentId}>
                      <td>
                        <Link href={`/teacher/assessments/${p.assessmentId}`}>{p.title}</Link>
                      </td>
                      <td>{p.learningArea ?? "—"}</td>
                      <td>{p.entries}</td>
                      <td>{p.average !== null ? p.average.toFixed(1) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}
