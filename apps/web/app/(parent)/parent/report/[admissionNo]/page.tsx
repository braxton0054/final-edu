import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@mtanda/database";
import { requireParentActor } from "@/lib/auth/tenant-actor";
import { buildReportCard } from "@/lib/academics/service";
import { parentChildren, childName } from "@/lib/parent/service";
import PrintButton from "../../../../components/PrintButton";

export const dynamic = "force-dynamic";

// Printable report card: school identity, subject averages, CBC levels,
// attendance. The browser print dialog produces the PDF.
export default async function ParentReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ admissionNo: string }>;
  searchParams: Promise<{ term?: string }>;
}) {
  const parent = await requireParentActor();
  if (!parent.ok) {
    redirect("/login?next=/parent/children");
  }

  const children = await parentChildren(parent.schoolId, parent.userId);
  const { admissionNo } = await params;
  const { term } = await searchParams;
  const child = children.find((c) => c.admissionNo === decodeURIComponent(admissionNo));
  if (!child) {
    return (
      <div>
        <Link href="/parent/children">← Children</Link>
        <p>Child not found on this account.</p>
      </div>
    );
  }

  const school = await prisma.school.findUnique({ where: { id: parent.schoolId } });
  const effectiveTerm = term?.trim() || school?.currentTerm || null;
  const report = await buildReportCard(parent.schoolId, child.studentId, effectiveTerm);
  if (!report) {
    return (
      <div>
        <Link href="/parent/children">← Children</Link>
        <p>Report unavailable.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="no-print" style={{ marginBottom: "1rem", display: "flex", gap: "0.6rem" }}>
        <Link href="/parent/children">← Children</Link>
        <PrintButton />
      </div>

      <div className="parent-card" style={{ color: "#101418" }}>
        <div style={{ textAlign: "center", borderBottom: "2px solid #101418", paddingBottom: "0.8rem", marginBottom: "1rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.4rem" }}>{school?.name ?? "School"}</h1>
          {school?.motto && <p style={{ margin: "0.2rem 0", fontStyle: "italic" }}>{school.motto}</p>}
          <p style={{ margin: "0.2rem 0", fontSize: "0.85rem" }}>
            Term Report{report.term ? ` — ${report.term}` : ""}
          </p>
        </div>

        <div className="dash-row">
          <span className="k">Student</span>
          <span className="v">
            {childName(child)} · {child.classId ?? ""}
          </span>
        </div>
        <div className="dash-row">
          <span className="k">Admission</span>
          <span className="v">{report.student.admissionNo}</span>
        </div>

        <h2 style={{ marginTop: "1.2rem" }}>Academic performance</h2>
        {report.subjects.length === 0 ? (
          <p className="dash-muted">No published results for this term.</p>
        ) : (
          <table className="dash-table">
            <thead>
              <tr>
                <th>Learning area</th>
                <th>Average</th>
                <th>Level</th>
              </tr>
            </thead>
            <tbody>
              {report.subjects.map((s) => (
                <tr key={s.learningArea}>
                  <td>{s.learningArea}</td>
                  <td>
                    {s.average !== null
                      ? `${s.average.toFixed(1)}${s.maxScore !== null ? ` / ${s.maxScore}` : ""}`
                      : "—"}
                  </td>
                  <td>{s.levels.join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {report.overallAverage !== null && (
          <p><strong>Overall average: {report.overallAverage.toFixed(1)}</strong></p>
        )}

        <h2 style={{ marginTop: "1.2rem" }}>Attendance</h2>
        <div className="dash-row">
          <span className="k">Present / Late / Absent / Excused</span>
          <span className="v">
            {report.attendance.present} / {report.attendance.late} /{" "}
            {report.attendance.absent} / {report.attendance.excused}
          </span>
        </div>
        <div className="dash-row">
          <span className="k">Rate</span>
          <span className="v">
            {report.attendance.rate !== null ? `${report.attendance.rate}%` : "—"}
          </span>
        </div>
      </div>

      <style>{`@media print { .no-print, .parent-nav, .parent-top { display: none !important; } .parent-content { padding: 0; } }`}</style>
    </div>
  );
}
