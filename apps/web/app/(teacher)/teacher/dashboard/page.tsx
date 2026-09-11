import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@mtanda/database";
import { requireTeacherActor } from "@/lib/auth/tenant-actor";
import { listConversationsFor, teacherScope, teacherStudents } from "@/lib/messaging/service";
import { pendingMarking } from "@/lib/academics/service";

export const dynamic = "force-dynamic";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function TeacherDashboard() {
  const actor = await requireTeacherActor();
  if (!actor.ok) {
    redirect("/login?next=/teacher/dashboard");
  }

  const [school, scope, user] = await Promise.all([
    prisma.school.findUnique({ where: { id: actor.schoolId } }),
    teacherScope(actor.schoolId, actor.userId),
    prisma.user.findUnique({ where: { id: actor.userId } }),
  ]);
  if (!school || !scope) {
    redirect("/login?next=/teacher/dashboard");
  }

  const [students, conversations, marking] = await Promise.all([
    teacherStudents(actor.schoolId, scope.classIds),
    listConversationsFor({ schoolId: actor.schoolId, userId: actor.userId, userType: "TEACHER" }),
    pendingMarking(actor.schoolId, scope.classIds),
  ]);

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Teacher";
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const unread = conversations.reduce((sum, c) => sum + c.unread, 0);
  const learningAreas = Array.from(
    new Set(scope.classes.flatMap((c) => c.learningAreas))
  );

  return (
    <div>
      <h1 className="dash-greet">
        {greeting()}, {displayName}
      </h1>
      <p className="dash-sub">
        {today}
        {school.currentTerm ? ` · ${school.currentTerm}` : ""}
      </p>

      {scope.classes.length === 0 ? (
        <div className="dash-panel">
          <h2>No classes assigned yet</h2>
          <p className="dash-muted">
            Your school administrator has not assigned any classes to this
            account. Once assigned, your classes, students, and messages appear
            here.
          </p>
        </div>
      ) : (
        <>
          <div className="dash-stats">
            <Link className="dash-stat" href="/teacher/classes">
              <div className="dash-stat-label">My Classes</div>
              <div className="dash-stat-value">{scope.classes.length}</div>
              <div className="dash-stat-sub">
                {scope.isClassTeacher ? "Includes class-teacher role" : "Subject teaching"}
              </div>
            </Link>
            <Link className="dash-stat" href="/teacher/students">
              <div className="dash-stat-label">Students</div>
              <div className="dash-stat-value">{students.length.toLocaleString()}</div>
              <div className="dash-stat-sub">Across assigned classes</div>
            </Link>
            <div className="dash-stat">
              <div className="dash-stat-label">Learning Areas</div>
              <div className="dash-stat-value">{learningAreas.length}</div>
              <div className="dash-stat-sub">{learningAreas.slice(0, 3).join(", ") || "—"}</div>
            </div>
          </div>

          {marking.length > 0 && (
            <div className="dash-panel" style={{ marginBottom: "1rem" }}>
              <h2>Awaiting marking</h2>
              {marking.slice(0, 4).map((m) => (
                <div className="dash-row" key={m.id}>
                  <span className="k">
                    <Link href={`/teacher/assessments/${m.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                      {m.title} · {m.classId}
                    </Link>
                  </span>
                  <span className="v" style={{ fontSize: "0.85rem" }}>{m.missing} missing</span>
                </div>
              ))}
              <Link className="dash-link" href="/teacher/results">View results →</Link>
            </div>
          )}

          <div className="dash-grid-2">
            <div className="dash-panel">
              <h2>My Classes</h2>
              {scope.classes.map((c) => (
                <div className="dash-row" key={c.classId}>
                  <span className="k">
                    <Link href={`/teacher/classes/${encodeURIComponent(c.classId)}`} style={{ color: "inherit", textDecoration: "none" }}>
                      <strong>{c.classId}</strong>
                    </Link>
                  </span>
                  <span className="v" style={{ fontWeight: 400, fontSize: "0.85rem" }}>
                    {(c.learningAreas.join(", ") || "General") +
                      (c.roles.includes("class_teacher") ? " · Class teacher" : "")}
                  </span>
                </div>
              ))}
              <Link className="dash-link" href="/teacher/classes">View classes →</Link>
            </div>

            <div className="dash-panel">
              <h2>Messages{unread > 0 ? ` · ${unread} unread` : ""}</h2>
              {conversations.length === 0 ? (
                <p className="dash-muted">
                  No conversations yet. Write to parents of your classes from Messages.
                </p>
              ) : (
                conversations.slice(0, 4).map((c) => (
                  <div className="dash-row" key={c.id}>
                    <span className="k">
                      <Link href={`/teacher/messages/${c.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                        {c.unread > 0 ? <strong>{c.title}</strong> : c.title}
                      </Link>
                    </span>
                    <span className="v" style={{ fontWeight: 400, fontSize: "0.85rem" }}>
                      {c.lastMessagePreview?.slice(0, 40) ?? ""}
                    </span>
                  </div>
                ))
              )}
              <Link className="dash-link" href="/teacher/messages">Open messages →</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
