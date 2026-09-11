import { redirect } from "next/navigation";
import { prisma } from "@mtanda/database";
import { requireParentActor } from "@/lib/auth/tenant-actor";
import { parentChildren, childName } from "@/lib/parent/service";

export const dynamic = "force-dynamic";

// Assignments published for the parent's children's classes, with per-child
// submission state. Only published work is visible — never drafts.
export default async function ParentAssignmentsPage() {
  const parent = await requireParentActor();
  if (!parent.ok) {
    redirect("/login?next=/parent/assignments");
  }
  const children = await parentChildren(parent.schoolId, parent.userId);
  const classIds = Array.from(new Set(children.map((c) => c.classId).filter(Boolean))) as string[];

  const assignments = classIds.length
    ? await prisma.assessment.findMany({
        where: { schoolId: parent.schoolId, classId: { in: classIds }, type: "assignment", status: "published" },
        orderBy: { dueDate: "asc" },
        take: 100,
      })
    : [];

  const byChild = await Promise.all(
    children.map(async (c) => {
      const submitted = await prisma.assessmentScore.findMany({
        where: {
          schoolId: parent.schoolId,
          studentId: c.studentId,
          submittedAt: { not: null },
        },
        select: { assessmentId: true },
      });
      return { ...c, submittedIds: new Set(submitted.map((s) => s.assessmentId)) };
    })
  );

  return (
    <div>
      <h1 className="dash-greet" style={{ fontSize: "1.3rem" }}>Assignments</h1>
      <p className="dash-sub">Published work and deadlines.</p>
      {assignments.length === 0 ? (
        <p className="dash-muted">No published assignments right now.</p>
      ) : (
        assignments.map((a) => (
          <div className="parent-card" key={a.id}>
            <h2>{a.title}</h2>
            <div className="dash-row">
              <span className="k">{a.classId}{a.learningArea ? ` · ${a.learningArea}` : ""}</span>
              <span className="v" style={{ fontWeight: 400 }}>
                {a.dueDate ? `Due ${a.dueDate.toDateString()}` : "No due date"}
              </span>
            </div>
            {a.instructions && (
              <p style={{ fontSize: "0.92rem", whiteSpace: "pre-wrap" }}>{a.instructions}</p>
            )}
            {byChild
              .filter((c) => c.classId === a.classId)
              .map((c) => (
                <p key={c.studentId} style={{ fontSize: "0.88rem", color: "var(--muted)", margin: "0.3rem 0 0" }}>
                  {childName(c)}: {c.submittedIds.has(a.id) ? "Submitted ✓" : "Pending"}
                </p>
              ))}
          </div>
        ))
      )}
    </div>
  );
}
