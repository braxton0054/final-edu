import { redirect } from "next/navigation";
import { requireTeacherActor } from "@/lib/auth/tenant-actor";
import { distinctClassIds, teacherScope } from "@/lib/messaging/service";
import MessagesClient from "../../../components/MessagesClient";

export const dynamic = "force-dynamic";

// Teacher inbox: member threads + compose limited to assigned classes.
export default async function TeacherMessagesPage() {
  const actor = await requireTeacherActor();
  if (!actor.ok) {
    redirect("/login?next=/teacher/messages");
  }
  const [scope, schoolClasses] = await Promise.all([
    teacherScope(actor.schoolId, actor.userId),
    distinctClassIds(actor.schoolId),
  ]);
  if (!scope) {
    redirect("/login?next=/teacher/messages");
  }

  return (
    <div>
      <h1 className="dash-greet">Messages</h1>
      <p className="dash-sub">
        Write to parents of your assigned classes. School-wide messages are
        reserved for administrators.
      </p>
      <MessagesClient
        classIds={schoolClasses.filter((c) => scope.classIds.includes(c))}
        basePath="/teacher/messages"
        canCompose
        audienceOptions={["class"]}
      />
    </div>
  );
}
