import Link from "next/link";
import { redirect } from "next/navigation";
import { requireParentActor } from "@/lib/auth/tenant-actor";
import { listConversationsFor } from "@/lib/messaging/service";
import { parentChildren, childName, fmtKES } from "@/lib/parent/service";

export const dynamic = "force-dynamic";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function ParentHomePage() {
  const parent = await requireParentActor();
  if (!parent.ok) {
    redirect("/login?next=/parent/home");
  }

  const [children, conversations] = await Promise.all([
    parentChildren(parent.schoolId, parent.userId),
    listConversationsFor({
      schoolId: parent.schoolId,
      userId: parent.userId,
      userType: "PARENT",
    }),
  ]);

  const unread = conversations.reduce((sum, c) => sum + c.unread, 0);
  const totalOutstanding = children.reduce((sum, c) => sum + c.outstanding, 0);

  return (
    <div>
      <h1 className="dash-greet" style={{ fontSize: "1.3rem" }}>
        {greeting()}
      </h1>

      <div className="parent-card">
        <h2>Children ({children.length})</h2>
        {children.length === 0 ? (
          <p className="dash-muted">
            No children linked yet — ask the school office to link your children
            to this account.
          </p>
        ) : (
          children.map((c) => (
            <Link
              key={c.studentId}
              href={`/parent/children/${encodeURIComponent(c.admissionNo)}`}
              className="parent-child"
            >
              <span className="parent-child-avatar">
                {childName(c).slice(0, 1).toUpperCase()}
              </span>
              <span>
                <span className="parent-child-name">{childName(c)}</span>
                <br />
                <span className="parent-child-sub">
                  {c.classId ?? "No class"} ·{" "}
                  {c.outstanding > 0
                    ? `Balance ${fmtKES(c.outstanding)}`
                    : "Fees cleared"}
                </span>
              </span>
            </Link>
          ))
        )}
      </div>

      <h2
        style={{
          fontSize: "0.8rem",
          letterSpacing: "0.06em",
          color: "var(--muted)",
          margin: "1.1rem 0 0.6rem",
        }}
      >
        Quick actions
      </h2>
      <div className="parent-actions">
        <Link className="parent-action" href="/parent/fees">
          💰 Fees
          {totalOutstanding > 0 ? <br /> : null}
          {totalOutstanding > 0 ? (
            <small style={{ color: "var(--muted)" }}>{fmtKES(totalOutstanding)} due</small>
          ) : null}
        </Link>
        <Link className="parent-action" href="/parent/inbox">
          ✉️ Messages
          {unread > 0 ? <br /> : null}
          {unread > 0 ? (
            <small style={{ color: "var(--muted)" }}>{unread} unread</small>
          ) : null}
        </Link>
      </div>

      <div className="parent-card" style={{ marginTop: "0.9rem" }}>
        <h2>Recent messages</h2>
        {conversations.length === 0 ? (
          <p className="dash-muted">Nothing from the school yet.</p>
        ) : (
          conversations.slice(0, 3).map((c) => (
            <Link
              key={c.id}
              href={`/parent/inbox/${c.id}`}
              className="parent-child"
            >
              <span>
                <span className="parent-child-name">
                  {c.unread > 0 ? `● ${c.title}` : c.title}
                </span>
                <br />
                <span className="parent-child-sub">
                  {c.lastMessagePreview?.slice(0, 80) ?? ""}
                </span>
              </span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
