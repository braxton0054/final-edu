import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@mtanda/database";
import { requireTeacherActor } from "@/lib/auth/tenant-actor";
import { listConversationsFor, teacherScope } from "@/lib/messaging/service";
import TenantSidebar from "../components/TenantSidebar";
import LogoutButton from "../components/LogoutButton";
import "../(tenant)/tenant.css";

// Teacher shell: only TEACHER logins with a linked teacher record render.
// Every class, student, and thread below resolves via TeacherAssignment.
export const dynamic = "force-dynamic";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requireTeacherActor();
  if (!actor.ok) {
    redirect("/login?next=/teacher/dashboard");
  }

  const [school, scope, conversations, user] = await Promise.all([
    prisma.school.findUnique({ where: { id: actor.schoolId } }),
    teacherScope(actor.schoolId, actor.userId),
    listConversationsFor({
      schoolId: actor.schoolId,
      userId: actor.userId,
      userType: "TEACHER",
    }),
    prisma.user.findUnique({ where: { id: actor.userId } }),
  ]);

  if (!school || !scope) {
    redirect("/login?next=/teacher/dashboard");
  }

  const unread = conversations.reduce((sum, c) => sum + c.unread, 0);
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Teacher";

  return (
    <div className="tenant-shell">
      <aside className="tenant-side">
        <TenantSidebar
          schoolShortName={school.shortName || school.name}
          groups={[
            { id: "main", label: "Main", items: [{ href: "/teacher/dashboard", label: "Dashboard" }] },
            {
              id: "teaching",
              label: "Teaching",
              items: [
                { href: "/teacher/classes", label: "My Classes" },
                { href: "/teacher/students", label: "Students" },
              ],
            },
            {
              id: "comms",
              label: "Communication",
              items: [{ href: "/teacher/messages", label: "Messages", badge: unread }],
            },
          ]}
        />
        <div className="tenant-side-foot">
          <div>
            {scope.classes.length} {scope.classes.length === 1 ? "class" : "classes"}
            {scope.isClassTeacher ? " · Class teacher" : ""}
          </div>
        </div>
      </aside>

      <div className="tenant-main">
        <header className="tenant-top">
          <span className="tenant-top-school">{school.name}</span>
          <span className="tenant-top-spacer" />
          <Link href="/teacher/messages" className="tenant-icon-btn" aria-label="Messages">
            ✉
            {unread > 0 && <span className="tenant-icon-count">{unread}</span>}
          </Link>
          <div className="tenant-user">
            <details>
              <summary>
                <span className="tenant-avatar">
                  {displayName.slice(0, 1).toUpperCase()}
                </span>
                <span className="tenant-user-name">{displayName}</span>
              </summary>
              <div className="tenant-menu">
                <div className="tenant-menu-meta">{actor.email}</div>
                <LogoutButton />
              </div>
            </details>
          </div>
        </header>
        <main className="tenant-content">{children}</main>
      </div>
    </div>
  );
}
