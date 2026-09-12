import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@mtanda/database";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { effectiveAreas } from "@/lib/academics/structure";
import GradeDetailClient from "./GradeDetailClient";

export const dynamic = "force-dynamic";

export default async function GradeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const staff = await requireSchoolActor();
  if (!staff.ok) {
    redirect("/login?next=/academics");
  }
  const { id } = await params;
  const grade = await prisma.grade.findFirst({
    where: { id, schoolId: staff.schoolId },
    include: {
      streams: {
        orderBy: { name: "asc" },
        include: {
          _count: { select: { enrollments: true } },
          classTeacherAssignments: {
            where: { status: "active" },
            include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
            take: 1,
          },
        },
      },
      gradeAreas: { include: { learningArea: true } },
    },
  });
  if (!grade) {
    redirect("/academics");
  }

  const [areas, teachers] = await Promise.all([
    prisma.learningArea.findMany({ where: { schoolId: staff.schoolId }, orderBy: { name: "asc" } }),
    prisma.teacher.findMany({
      where: { schoolId: staff.schoolId },
      orderBy: [{ firstName: "asc" }],
      select: { id: true, firstName: true, lastName: true },
      take: 500,
    }),
  ]);

  const effective = await Promise.all(
    grade.streams.map(async (s) => ({ streamId: s.id, areas: await effectiveAreas(s.id) }))
  );

  return (
    <div>
      <Link href="/academics">← Grades</Link>
      <h1 className="dash-greet" style={{ marginTop: "0.5rem" }}>{grade.name}</h1>
      <p className="dash-sub">
        {grade.streams.length} streams · {grade.gradeAreas.length} default learning areas.
      </p>
      <GradeDetailClient
        gradeId={grade.id}
        streams={grade.streams.map((s) => ({
          id: s.id,
          name: s.name,
          displayName: s.displayName,
          maxStudents: s.maxStudents,
          enrollments: s._count.enrollments,
          classTeacher: s.classTeacherAssignments[0]
            ? {
                id: s.classTeacherAssignments[0].teacher.id,
                name: [s.classTeacherAssignments[0].teacher.firstName, s.classTeacherAssignments[0].teacher.lastName]
                  .filter(Boolean)
                  .join(" "),
              }
            : null,
        }))}
        gradeAreaIds={grade.gradeAreas.map((g) => g.learningAreaId)}
        effective={effective}
        areas={areas.map((a) => ({ id: a.id, name: a.name }))}
        teachers={teachers.map((t) => ({
          id: t.id,
          name: [t.firstName, t.lastName].filter(Boolean).join(" ") || "Teacher",
        }))}
      />
    </div>
  );
}
