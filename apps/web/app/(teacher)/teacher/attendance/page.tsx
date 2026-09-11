import { redirect } from "next/navigation";
import { requireTeacherActor } from "@/lib/auth/tenant-actor";
import { teacherScope } from "@/lib/messaging/service";
import AttendanceGrid from "../../../components/AttendanceGrid";

export const dynamic = "force-dynamic";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function TeacherAttendancePage() {
  const actor = await requireTeacherActor();
  if (!actor.ok) {
    redirect("/login?next=/teacher/attendance");
  }
  const scope = await teacherScope(actor.schoolId, actor.userId);
  if (!scope) {
    redirect("/login?next=/teacher/attendance");
  }

  return (
    <div>
      <h1 className="dash-greet">Attendance</h1>
      <p className="dash-sub">Mark your assigned classes. Past dates can be corrected.</p>
      {scope.classIds.length === 0 ? (
        <p className="dash-muted">No classes assigned yet.</p>
      ) : (
        <AttendanceGrid
          classIds={scope.classIds}
          initialClassId={scope.classIds[0]}
          initialDate={todayISO()}
        />
      )}
    </div>
  );
}
