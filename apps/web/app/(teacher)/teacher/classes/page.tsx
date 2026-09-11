import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@mtanda/database";
import { requireTeacherActor } from "@/lib/auth/tenant-actor";
import { teacherScope } from "@/lib/messaging/service";

export const dynamic = "force-dynamic";

// Only classes assigned to this teacher, with live student counts.
export default async function TeacherClassesPage() {
  const actor = await requireTeacherActor();
  if (!actor.ok) {
    redirect("/login?next=/teacher/classes");
  }
  const scope = await teacherScope(actor.schoolId, actor.userId);
  if (!scope) {
    redirect("/login?next=/teacher/classes");
  }

  const counts = await Promise.all(
    scope.classes.map(async (c) => ({
      ...c,
      students: await prisma.student.count({
        where: { schoolId: actor.schoolId, classId: c.classId },
      }),
    }))
  );

  return (
    <div>
      <h1 className="dash-greet">My Classes</h1>
      <p className="dash-sub">
        {counts.length === 0
          ? "No classes assigned yet — ask your administrator."
          : `${counts.length} ${counts.length === 1 ? "class" : "classes"} assigned to you.`}
      </p>
      <div className="dash-grid-2">
        {counts.map((c) => (
          <Link
            key={c.classId}
            href={`/teacher/classes/${encodeURIComponent(c.classId)}`}
            className="dash-stat"
          >
            <div className="dash-stat-label">{c.classId}</div>
            <div className="dash-stat-value">{c.students}</div>
            <div className="dash-stat-sub">
              {(c.learningAreas.join(", ") || "General") +
                (c.roles.includes("class_teacher") ? " · Class teacher" : " · Subject teacher")}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
