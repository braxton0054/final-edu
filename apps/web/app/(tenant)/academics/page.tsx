import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { gradesOverview } from "@/lib/academics/structure";
import GradeCreate from "./GradeCreate";

export const dynamic = "force-dynamic";

// Academics → Grades: every grade with its streams and class teachers.
export default async function AcademicsPage() {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    redirect("/login?next=/academics");
  }
  const grades = await gradesOverview(staff.schoolId);

  return (
    <div>
      <h1 className="dash-greet">Academics</h1>
      <p className="dash-sub">
        Grades, streams, learning areas, and teaching assignments.{" "}
        <Link href="/academics/areas">Learning areas</Link> ·{" "}
        <Link href="/academics/assignments">Teaching assignments</Link>
      </p>
      <GradeCreate />
      {grades.length === 0 ? (
        <p className="dash-muted">No grades yet — create the first one above.</p>
      ) : (
        <div className="dash-grid-2">
          {grades.map((g) => (
            <Link key={g.id} href={`/academics/grades/${g.id}`} className="dash-stat">
              <div className="dash-stat-label">{g.name}</div>
              <div className="dash-stat-value">{g.streams.length}</div>
              <div className="dash-stat-sub">
                {g.streams.length === 1 ? "1 stream" : `${g.streams.length} streams`} ·{" "}
                {g._count.gradeAreas} areas
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
