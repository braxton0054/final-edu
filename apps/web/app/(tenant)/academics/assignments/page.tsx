import { redirect } from "next/navigation";
import { prisma } from "@mtanda/database";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import AssignmentsClient from "./AssignmentsClient";

export const dynamic = "force-dynamic";

// Teaching assignments: who teaches what to which stream, in which year+term.
export default async function AssignmentsPage() {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    redirect("/login?next=/academics/assignments");
  }

  const [grades, teachers, areas] = await Promise.all([
    prisma.grade.findMany({
      where: { schoolId: staff.schoolId },
      orderBy: { name: "asc" },
      include: { streams: { orderBy: { name: "asc" } } },
    }),
    prisma.teacher.findMany({
      where: { schoolId: staff.schoolId },
      orderBy: [{ firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
      take: 500,
    }),
    prisma.learningArea.findMany({
      where: { schoolId: staff.schoolId },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="dash-greet">Teaching Assignments</h1>
      <p className="dash-sub">
        Teacher + stream + learning area, in the current year and term.
        Class teachers are set per stream on each grade&apos;s page.
      </p>
      <AssignmentsClient
        grades={grades.map((g) => ({
          id: g.id,
          name: g.name,
          streams: g.streams.map((s) => ({ id: s.id, displayName: s.displayName })),
        }))}
        teachers={teachers.map((t) => ({
          id: t.id,
          name: [t.firstName, t.lastName].filter(Boolean).join(" ") || "Teacher",
        }))}
        areas={areas.map((a) => ({ id: a.id, name: a.name }))}
      />
    </div>
  );
}
