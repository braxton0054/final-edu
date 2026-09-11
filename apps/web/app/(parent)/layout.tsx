import { redirect } from "next/navigation";
import { prisma } from "@mtanda/database";
import { requireParentActor } from "@/lib/auth/tenant-actor";
import { listConversationsFor } from "@/lib/messaging/service";
import ParentNav from "../components/ParentNav";
import LogoutButton from "../components/LogoutButton";
import "../(tenant)/tenant.css";
import "./parent.css";

// Parent portal shell: mobile-first top bar + bottom tabs. Only PARENT
// sessions with a school attached render.
export const dynamic = "force-dynamic";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const parent = await requireParentActor();
  if (!parent.ok) {
    redirect("/login?next=/parent/home");
  }

  const [school, conversations, user] = await Promise.all([
    prisma.school.findUnique({ where: { id: parent.schoolId } }),
    listConversationsFor({
      schoolId: parent.schoolId,
      userId: parent.userId,
      userType: "PARENT",
    }),
    prisma.user.findUnique({ where: { id: parent.userId } }),
  ]);

  if (!school) {
    redirect("/login?next=/parent/home");
  }

  const unread = conversations.reduce((sum, c) => sum + c.unread, 0);
  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Parent";

  return (
    <div className="parent-shell">
      <header className="parent-top">
        <span className="tenant-brand-mark">
          {(school.shortName || school.name || "M").slice(0, 2).toUpperCase()}
        </span>
        <span className="parent-top-school">{school.name}</span>
        <span className="tenant-top-spacer" />
        <div className="tenant-user">
          <details>
            <summary>
              <span className="tenant-avatar">
                {displayName.slice(0, 1).toUpperCase()}
              </span>
            </summary>
            <div className="tenant-menu">
              <div className="tenant-menu-meta">
                {displayName}
                <br />
                {parent.email}
              </div>
              <LogoutButton />
            </div>
          </details>
        </div>
      </header>
      <main className="parent-content">{children}</main>
      <ParentNav unread={unread} />
    </div>
  );
}
