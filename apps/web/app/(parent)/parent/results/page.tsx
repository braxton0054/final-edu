import { redirect } from "next/navigation";
import { requireParentActor } from "@/lib/auth/tenant-actor";
import { parentChildren, childName } from "@/lib/parent/service";
import { studentResults } from "@/lib/academics/service";

export const dynamic = "force-dynamic";

// Published results per linked child. Drafts and finalized-teacher-only work
// never appear; finalized scores are read-only everywhere.
export default async function ParentResultsPage() {
  const parent = await requireParentActor();
  if (!parent.ok) {
    redirect("/login?next=/parent/results");
  }
  const children = await parentChildren(parent.schoolId, parent.userId);

  const withResults = await Promise.all(
    children.map(async (c) => ({
      ...c,
      results: await studentResults(parent.schoolId, c.studentId),
    }))
  );

  return (
    <div>
      <h1 className="dash-greet" style={{ fontSize: "1.3rem" }}>Results</h1>
      <p className="dash-sub">Published assessments and CBC levels.</p>
      {withResults.map((c) => (
        <div className="parent-card" key={c.studentId}>
          <h2>
            {childName(c)} · {c.classId ?? "No class"}
          </h2>
          {c.results.length === 0 ? (
            <p className="dash-muted">No published results yet.</p>
          ) : (
            c.results.map((r) => (
              <div className="dash-row" key={r.assessmentId}>
                <span className="k">
                  {r.title}
                  <br />
                  <small style={{ color: "var(--muted)" }}>
                    {r.learningArea ?? r.type}
                    {r.term ? ` · ${r.term}` : ""}
                  </small>
                </span>
                <span className="v">
                  {r.score !== null ? `${r.score}${r.maxScore !== null ? ` / ${r.maxScore}` : ""}` : ""}
                  {r.score !== null && r.level ? " · " : ""}
                  {r.level ?? ""}
                </span>
              </div>
            ))
          )}
        </div>
      ))}
      {children.length === 0 && <p className="dash-muted">No children linked yet.</p>}
    </div>
  );
}
