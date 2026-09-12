import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@mtanda/database";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { listConversationsFor } from "@/lib/messaging/service";
import TenantSidebar from "../components/TenantSidebar";
import LogoutButton from "../components/LogoutButton";
import "./tenant.css";

// Tenant shell: guarded school-admin layout with sidebar, topbar, and live
// school context. Only SCHOOL_ADMIN/STAFF with a school attached render.
export const dynamic = "force-dynamic";

export default async function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const actor = await requireSchoolActor();
  if (!actor.ok) {
    redirect("/login?next=/dashboard");
  }

  const [school, subscription, studentCount, conversations, user] = await Promise.all([
    prisma.school.findUnique({ where: { id: actor.schoolId } }),
    prisma.subscription.findFirst({
      where: { schoolId: actor.schoolId },
      orderBy: { createdAt: "desc" },
      include: { plan: true },
    }),
    prisma.student.count({ where: { schoolId: actor.schoolId } }),
    listConversationsFor({
      schoolId: actor.schoolId,
      userId: actor.userId,
      userType: actor.userType,
    }),
    prisma.user.findUnique({ where: { id: actor.userId } }),
  ]);

  if (!school) {
    redirect("/login?next=/dashboard");
  }

  const unread = conversations.reduce((sum, c) => sum + c.unread, 0);
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Administrator";
  const shortName = school.shortName || school.name;
  const planName = subscription?.plan.name ?? "Trial";
  const maxStudents = subscription?.plan.maxStudents ?? null;

  return (
    <div className="tenant-shell">
      <aside className="tenant-side">
        <TenantSidebar
          schoolShortName={shortName}
          groups={[
            { id: "main", label: "Main", items: [{ href: "/dashboard", label: "Dashboard" }] },
            {
              id: "people",
              label: "People",
              items: [
                { href: "/students", label: "Students" },
                { href: "/parents", label: "Parents" },
                { href: "/teachers", label: "Teachers" },
              ],
            },
            {
              id: "academics",
              label: "Academics",
              items: [
                { href: "/academics", label: "Grades" },
                { href: "/academics/areas", label: "Learning Areas" },
                { href: "/academics/assignments", label: "Assignments" },
              ],
            },
            {
              id: "comms",
              label: "Communication",
              items: [{ href: "/messages", label: "Messages", badge: unread }],
            },
            {
              id: "finance",
              label: "Finance",
              items: [{ href: "/finance", label: "Overview" }],
            },
            {
              id: "settings",
              label: "Settings",
              items: [{ href: "/settings/whatsapp", label: "WhatsApp" }],
            },
          ]}
        />
        <div className="tenant-side-foot">
          <div>
            {studentCount}
            {maxStudents ? ` / ${maxStudents.toLocaleString()}` : ""} students
          </div>
          {maxStudents ? (
            <div className="tenant-usage-bar">
              <span style={{ width: `${Math.min(100, Math.round((studentCount / maxStudents) * 100))}%` }} />
            </div>
          ) : null}
        </div>
      </aside>

      <div className="tenant-main">
        <header className="tenant-top">
          <span className="tenant-top-school">{school.name}</span>
          <span className="tenant-plan-badge">{planName}</span>
          <span className="tenant-top-spacer" />
          <Link href="/messages" className="tenant-icon-btn" aria-label="Messages">
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
