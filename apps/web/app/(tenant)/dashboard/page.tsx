import Link from "next/link";
import { prisma } from "@mtanda/database";
import { requireSchoolActor } from "@/lib/auth/tenant-actor";
import { listConversationsFor } from "@/lib/messaging/service";

export const dynamic = "force-dynamic";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function humanizeAction(action: string): { text: string; warn: boolean } {
  const pretty = action
    .replace(/^platform\./, "")
    .replace(/^whatsapp\./, "WhatsApp ")
    .replace(/_/g, " ");
  const warn =
    action.includes("fail") ||
    action.includes("expir") ||
    action.includes("suspend") ||
    action.includes("disconnect");
  return { text: pretty.charAt(0).toUpperCase() + pretty.slice(1), warn };
}

function fmtKES(n: number): string {
  return `KSh ${Math.round(n).toLocaleString()}`;
}

export default async function TenantDashboard() {
  const actor = await requireSchoolActor();
  if (!actor.ok) {
    return (
      <div>
        <h1>School Dashboard</h1>
        <p>Sign in to view your school.</p>
      </div>
    );
  }
  const schoolId = actor.schoolId;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    school,
    studentCount,
    studentsNew,
    teacherCount,
    parentCount,
    parentsNew,
    collected,
    pending,
    outstandingCount,
    conversations,
    activity,
    announcements,
    emailVerified,
    subscription,
    feeStructures,
    whatsapp,
  ] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId } }),
    prisma.student.count({ where: { schoolId } }),
    prisma.student.count({ where: { schoolId, createdAt: { gte: monthStart } } }),
    prisma.teacher.count({ where: { schoolId } }),
    prisma.user.count({ where: { schoolId, userType: "PARENT" } }),
    prisma.user.count({ where: { schoolId, userType: "PARENT", createdAt: { gte: monthStart } } }),
    prisma.payment.aggregate({
      where: { schoolId, status: "COMPLETED" },
      _sum: { amount: true },
    }),
    prisma.invoice.aggregate({
      where: { schoolId, status: { notIn: ["PAID", "CANCELLED"] } },
      _sum: { balance: true },
    }),
    prisma.invoice.count({
      where: { schoolId, status: { notIn: ["PAID", "CANCELLED"] } },
    }),
    listConversationsFor({ schoolId, userId: actor.userId, userType: actor.userType }),
    prisma.auditLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.platformAnnouncement.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.user.count({ where: { schoolId, emailVerified: true } }),
    prisma.subscription.findFirst({
      where: { schoolId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.feeStructure.count({ where: { schoolId } }),
    prisma.whatsAppConnection.findUnique({ where: { schoolId } }),
  ]);

  if (!school) {
    return (
      <div>
        <h1>School Dashboard</h1>
        <p>No school is linked to this account.</p>
      </div>
    );
  }

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const unread = conversations.reduce((sum, c) => sum + c.unread, 0);

  const checklist: { label: string; done: boolean }[] = [
    { label: "School profile", done: Boolean(school.county && school.schoolType) },
    { label: "Email verified", done: emailVerified > 0 },
    { label: "Subscription", done: subscription !== null },
    { label: "Academic structure", done: Boolean((school.levelsOffered as string[] | null)?.length) },
    { label: "Teachers added", done: teacherCount > 0 },
    { label: "Students added", done: studentCount > 0 },
    { label: "Parents added", done: parentCount > 0 },
    { label: "Fee structure", done: feeStructures > 0 },
    { label: "WhatsApp connected", done: whatsapp?.status === "CONNECTED" },
    { label: "Report-card preference", done: Boolean(school.reportCardPreference) },
    { label: "M-Pesa", done: false },
    { label: "Email", done: false },
    { label: "Verification documents", done: false },
  ];
  const complete = checklist.filter((i) => i.done).length;
  const setupPct = Math.round((complete / checklist.length) * 100);

  return (
    <div>
      <h1 className="dash-greet">
        {greeting()}, {school.shortName || school.name}
      </h1>
      <p className="dash-sub">
        {today}
        {school.currentTerm ? ` · ${school.currentTerm}` : ""}
        {school.academicYear ? ` · ${school.academicYear}` : ""}
      </p>

      <div className="dash-stats">
        <Link className="dash-stat" href="/students">
          <div className="dash-stat-label">Students</div>
          <div className="dash-stat-value">{studentCount.toLocaleString()}</div>
          <div className="dash-stat-sub">+{studentsNew} this month</div>
        </Link>
        <Link className="dash-stat" href="/teachers">
          <div className="dash-stat-label">Teachers</div>
          <div className="dash-stat-value">{teacherCount.toLocaleString()}</div>
          <div className="dash-stat-sub">{teacherCount === 1 ? "1 on record" : `${teacherCount} on record`}</div>
        </Link>
        <Link className="dash-stat" href="/parents">
          <div className="dash-stat-label">Parents</div>
          <div className="dash-stat-value">{parentCount.toLocaleString()}</div>
          <div className="dash-stat-sub">+{parentsNew} this month</div>
        </Link>
      </div>

      <div className="dash-grid-2">
        <div className="dash-panel">
          <h2>Fees</h2>
          <div className="dash-row">
            <span className="k">Collected</span>
            <span className="v">{fmtKES(Number(collected._sum.amount ?? 0))}</span>
          </div>
          <div className="dash-row">
            <span className="k">Outstanding</span>
            <span className="v">{fmtKES(Number(pending._sum.balance ?? 0))}</span>
          </div>
          <div className="dash-row">
            <span className="k">Unpaid invoices</span>
            <span className="v">{outstandingCount}</span>
          </div>
          <Link className="dash-link" href="/finance">View finance →</Link>
        </div>

        <div className="dash-panel">
          <h2>Messages{unread > 0 ? ` · ${unread} unread` : ""}</h2>
          {conversations.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.92rem" }}>
              No conversations yet. Write to parents from Messages.
            </p>
          ) : (
            conversations.slice(0, 4).map((c) => (
              <div className="dash-row" key={c.id}>
                <span className="k">
                  <Link href={`/messages/${c.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                    {c.unread > 0 ? <strong>{c.title}</strong> : c.title}
                  </Link>
                </span>
                <span className="v" style={{ fontWeight: 400, fontSize: "0.85rem" }}>
                  {c.lastMessagePreview?.slice(0, 40) ?? ""}
                </span>
              </div>
            ))
          )}
          <Link className="dash-link" href="/messages">Open messages →</Link>
        </div>
      </div>

      <div className="dash-grid-2">
        <div className="dash-panel">
          <h2>Recent activity</h2>
          {activity.length === 0 ? (
            <p style={{ color: "var(--muted)", fontSize: "0.92rem" }}>Nothing yet.</p>
          ) : (
            <ul className="dash-activity">
              {activity.map((a) => {
                const { text, warn } = humanizeAction(a.action);
                return (
                  <li key={a.id}>
                    <span className={warn ? "dash-dot warn" : "dash-dot"} />
                    <span>{text}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="dash-panel">
          <h2>
            Getting started · {setupPct}% ({complete}/{checklist.length})
          </h2>
          <ul className="dash-checklist">
            {checklist.map((i) => (
              <li key={i.label} style={{ opacity: i.done ? 1 : 0.7 }}>
                <span>{i.done ? "✓" : "□"}</span> {i.label}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {announcements.length > 0 && (
        <div className="dash-panel">
          <h2>Platform announcements</h2>
          {announcements.map((a) => (
            <div key={a.id} style={{ marginBottom: "0.9rem" }}>
              <strong>{a.title}</strong>
              <p style={{ margin: "0.3rem 0", color: "var(--muted)", fontSize: "0.92rem" }}>{a.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
