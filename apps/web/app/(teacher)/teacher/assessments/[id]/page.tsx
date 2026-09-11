import { redirect } from "next/navigation";
import { prisma } from "@mtanda/database";
import { requireTeacherActor } from "@/lib/auth/tenant-actor";
import { teacherScope } from "@/lib/messaging/service";
import ScoreSheet from "../../../../components/ScoreSheet";

export const dynamic = "force-dynamic";

export default async function TeacherAssessmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireTeacherActor();
  if (!actor.ok) {
    redirect("/login?next=/teacher/assessments");
  }
  const { id } = await params;
  const [scope, assessment] = await Promise.all([
    teacherScope(actor.schoolId, actor.userId),
    prisma.assessment.findFirst({ where: { id, schoolId: actor.schoolId } }),
  ]);
  if (!scope || !assessment || !scope.classIds.includes(assessment.classId)) {
    redirect("/teacher/assessments");
  }

  const students = await prisma.student.findMany({
    where: { schoolId: actor.schoolId, classId: assessment.classId },
    orderBy: { admissionNo: "asc" },
    select: { id: true, admissionNo: true, firstName: true, lastName: true },
  });

  return (
    <ScoreSheet
      assessmentId={id}
      backHref="/teacher/assessments"
      roster={students.map((s) => ({
        studentId: s.id,
        admissionNo: s.admissionNo,
        name: [s.firstName, s.lastName].filter(Boolean).join(" ") || s.admissionNo,
      }))}
    />
  );
}
