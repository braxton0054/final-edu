import { redirect } from "next/navigation";
import { prisma } from "@mtanda/database";
import { requireTeacherActor } from "@/lib/auth/tenant-actor";
import { teacherScope } from "@/lib/messaging/service";
import AssessmentsClient from "../../../components/AssessmentsClient";

export const dynamic = "force-dynamic";

export default async function TeacherAssessmentsPage() {
  const actor = await requireTeacherActor();
  if (!actor.ok) {
    redirect("/login?next=/teacher/assessments");
  }
  const [scope, school] = await Promise.all([
    teacherScope(actor.schoolId, actor.userId),
    prisma.school.findUnique({ where: { id: actor.schoolId } }),
  ]);
  if (!scope) {
    redirect("/login?next=/teacher/assessments");
  }

  return (
    <div>
      <h1 className="dash-greet">Assessments</h1>
      <p className="dash-sub">Create, enter marks, and finalize — within your classes.</p>
      <AssessmentsClient
        classIds={scope.classIds}
        defaultTerm={school?.currentTerm ?? ""}
        basePath="/teacher/assessments"
      />
    </div>
  );
}
